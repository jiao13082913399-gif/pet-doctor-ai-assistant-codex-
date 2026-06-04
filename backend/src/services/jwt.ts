import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

export interface JwtPayload {
  sub: string;
  username: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

function parseExpiresIn(value: string): number {
  const matched = value.match(/^(\d+)([smhd])$/);

  if (!matched) {
    const seconds = Number(value);
    if (Number.isInteger(seconds) && seconds > 0) {
      return seconds;
    }

    throw new Error('JWT_EXPIRES_IN must be seconds or a value like 7d');
  }

  const amount = Number(matched[1]);
  const unit = matched[2] as 's' | 'm' | 'h' | 'd';
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  return amount * multipliers[unit];
}

function signValue(value: string): string {
  return createHmac('sha256', env.jwtSecret).update(value).digest('base64url');
}

export function signJwtToken(user: { id: string; username: string }): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: user.id,
    username: user.username,
    iat: now,
    exp: now + parseExpiresIn(env.jwtExpiresIn),
  };

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(`${header}.${body}`);

  return `${header}.${body}.${signature}`;
}

export function verifyJwtToken(token: string): JwtPayload {
  const [header, body, signature] = token.split('.');

  if (!header || !body || !signature) {
    throw new Error('Invalid token');
  }

  const expectedSignature = signValue(`${header}.${body}`);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid token signature');
  }

  const decodedHeader = JSON.parse(base64UrlDecode(header).toString('utf8')) as { alg?: string };
  if (decodedHeader.alg !== 'HS256') {
    throw new Error('Invalid token algorithm');
  }

  const payload = JSON.parse(base64UrlDecode(body).toString('utf8')) as JwtPayload;
  const now = Math.floor(Date.now() / 1000);

  if (!payload.sub || payload.exp <= now) {
    throw new Error('Token expired');
  }

  return payload;
}
