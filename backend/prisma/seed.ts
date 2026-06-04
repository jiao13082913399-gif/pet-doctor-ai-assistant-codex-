import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const keyLength = 64;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, keyLength)) as Buffer;

  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
});

const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const demoPasswordHash = await hashPassword('demo_password');

  const store = await prisma.store.upsert({
    where: {
      code: 'DEMO_STORE_001',
    },
    update: {
      name: '宠一科技测试门店',
      city: '宁波',
      status: 'active',
    },
    create: {
      name: '宠一科技测试门店',
      code: 'DEMO_STORE_001',
      city: '宁波',
      address: '测试地址',
      phone: '0574-00000000',
      status: 'active',
    },
  });

  const user = await prisma.user.upsert({
    where: {
      username: 'demo_doctor',
    },
    update: {
      nickname: '测试医生',
      passwordHash: demoPasswordHash,
      currentStoreId: store.id,
      status: 'active',
    },
    create: {
      username: 'demo_doctor',
      passwordHash: demoPasswordHash,
      phone: '18800000000',
      nickname: '测试医生',
      role: 'doctor',
      position: '主治医生',
      city: '宁波',
      currentStoreId: store.id,
      isDirector: false,
      status: 'active',
    },
  });

  await prisma.userStoreRelation.upsert({
    where: {
      userId_storeId: {
        userId: user.id,
        storeId: store.id,
      },
    },
    update: {
      role: 'doctor',
      position: '主治医生',
      isDefault: true,
      status: 'active',
    },
    create: {
      userId: user.id,
      storeId: store.id,
      role: 'doctor',
      position: '主治医生',
      isDefault: true,
      status: 'active',
    },
  });

  console.log(`Seed completed: user=${user.username}, store=${store.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
