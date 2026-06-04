# 本地运行说明

## 环境要求

- Node.js >= 20
- npm >= 10
- SQLite 本地文件数据库

说明：普通开发机按下列 npm 命令启动即可。若在 Codex 受限 shell 中遇到 `npm` / `npx` 不在 PATH，可使用 Codex bundled Node 直接调用 `node_modules` 下的工具；这属于执行环境差异，不是项目脚本缺失。

## 标准启动流程

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev:backend
npm run dev:frontend
```

默认地址：

- 后端：`http://localhost:3000`
- H5：`http://localhost:5173`
- 健康检查：`http://localhost:3000/api/health`

默认测试账号：

```text
账号：demo_doctor
密码：demo_password
```

## SQLite 初始化兜底

当前环境中 Prisma SQLite migration 可能空报 `Schema engine error`。项目已在 `npm run db:migrate` 中加入兜底：Prisma 失败后会执行已签入 SQL 初始化脚本。

也可以显式执行：

```bash
npm run db:setup:sqlite
```

如果项目路径包含中文或空格，建议使用绝对 SQLite 路径：

```bash
DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-dev.db" npm run db:migrate
DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-dev.db" npm run db:seed
```

## 端口冲突处理

如果 3000 被占用：

```bash
PORT=3010 CORS_ORIGIN=http://localhost:5173 npm run dev:backend
```

如果前端 API 地址也要跟随改动：

```bash
VITE_API_BASE_URL=http://localhost:3010/api npm run dev:frontend
```

## 常用验收命令

```bash
npm run lint
npm run typecheck
npm run build
npm run build:mp-weixin -w frontend
npm test
```

`npm test` 会运行 `scripts/mvp-smoke-test.ts`，使用临时 SQLite 和临时私有存储，不污染本地开发数据库。

## Codex 受限 shell 验证命令

当 `npm` 不可用但依赖已安装时，可用以下形式复核：

```bash
/Users/jiaoyongcheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/prettier/bin/prettier.cjs --check .
/Users/jiaoyongcheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p backend/tsconfig.json --noEmit
/Users/jiaoyongcheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vue-tsc/bin/vue-tsc.js -p frontend/tsconfig.json --noEmit
/Users/jiaoyongcheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --import tsx scripts/mvp-smoke-test.ts
```

如果 smoke test 在沙箱内出现 `listen EPERM 127.0.0.1`，需要在允许本机监听端口的环境中重跑。

## Docker MVP 启动

```bash
npm run docker:up
```

启动后访问：

- H5：`http://localhost:8080`
- API 健康检查：`http://localhost:8080/api/health`

停止：

```bash
npm run docker:down
```

清空验收数据：

```bash
docker compose down -v
npm run docker:up
```
