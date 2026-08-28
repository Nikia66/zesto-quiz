// 管理员鉴权：无状态 HMAC 令牌（跨 serverless 实例有效，无需共享内存）。
// 登录成功签发 token；每次管理员接口校验签名 + 有效期 + 吊销列表。
import crypto from 'crypto';
import { addRevoked, isRevoked } from './store.js';

const SECRET = process.env.ADMIN_PASS || 'zesto2026';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const TTL = 2 * 60 * 60 * 1000; // 令牌有效期 2 小时

function b64url(s) {
  return Buffer.from(s).toString('base64url');
}

export function signToken(user) {
  const payload = b64url(JSON.stringify({ user, exp: Date.now() + TTL }));
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
  if (!data.exp || data.exp < Date.now()) return null;
  return data;
}

export async function checkAdmin(token) {
  const data = verifyToken(token);
  if (!data) return false;
  if (await isRevoked(token)) return false;
  return data.user === (process.env.ADMIN_USER || 'admin');
}

export function adminUser() {
  return ADMIN_USER;
}

export async function revokeToken(token) {
  if (token) await addRevoked(token);
}
