// 成绩存储：生产环境优先用 Netlify Blobs（线上持久化、跨实例共享）。
// Netlify Functions v2 本应自动注入 Blobs 运行上下文，但部分站点/账号下该上下文缺失，
// 导致 getStore('store') 抛出 MissingBlobsEnvironmentError。因此这里采用三层策略：
// 1) 自动上下文；2) 显式 API 凭证（NETLIFY_SITE_ID + NETLIFY_API_TOKEN）；3) 本地文件回退。
// 本地运行或 Blobs 不可用时，回退到 os.tmpdir() 下的本地文件。
import { promises as fs } from 'fs';
import { join } from 'path';
import os from 'os';
import { getStore } from '@netlify/blobs';

const LOCAL_DIR = process.env.NETLIFY_LOCAL_DATA_DIR || join(os.tmpdir(), 'zesto-local-data');
const STORE = 'zesto-quiz-results';
const REVOKED_KEY = 'revoked-tokens';

function siteId() {
  return process.env.NETLIFY_SITE_ID || process.env.SITE_ID || process.env.NETLIFY_SITE_ID || '';
}

function apiToken() {
  return process.env.NETLIFY_API_TOKEN || process.env.NETLIFY_PAT || process.env.NETLIFY_TOKEN || '';
}

async function getBlobStore() {
  const sid = siteId();
  const token = apiToken();

  // 1) 若显式凭证齐全，优先用显式凭证（绕过缺失的自动上下文，这才是用户配置的 token 生效路径）
  if (sid && token) {
    try {
      return getStore({ name: STORE, siteID: sid, token, consistency: 'strong' });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('[store] explicit API getStore failed:', err && err.message ? err.message : err);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log('[store] explicit API credentials missing. sid=', Boolean(sid), 'token=', Boolean(token));
  }

  // 2) 再试自动上下文（Functions v2 / Edge Functions / CLI 关联站点时生效）
  try {
    return getStore(STORE);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('[store] auto-context getStore failed:', err && err.message ? err.message : err);
  }

  return null;
}

export async function writeResult(key, value) {
  const store = await getBlobStore();
  if (store) {
    try {
      await store.setJSON(key, value);
      return;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('[store] setJSON failed, falling back to local:', err && err.message ? err.message : err);
    }
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(join(LOCAL_DIR, `${key}.json`), JSON.stringify(value));
}

export async function listResults() {
  const store = await getBlobStore();
  if (store) {
    try {
      const { blobs } = await store.list();
      const items = [];
      for (const b of blobs) {
        try {
          const d = await store.getJSON(b.key);
          if (d) items.push(d);
        } catch {
          /* skip corrupt */
        }
      }
      return items;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('[store] list failed, falling back to local:', err && err.message ? err.message : err);
    }
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  const files = (await fs.readdir(LOCAL_DIR)).filter((f) => f.endsWith('.json') && f !== 'revoked.json');
  const items = [];
  for (const f of files) {
    try {
      items.push(JSON.parse(await fs.readFile(join(LOCAL_DIR, f), 'utf8')));
    } catch {
      /* skip corrupt */
    }
  }
  return items;
}

// 轻量令牌吊销（登出）
export async function addRevoked(token) {
  try {
    const store = await getBlobStore();
    if (store) {
      try {
        const arr = (await store.getJSON(REVOKED_KEY)) || [];
        if (!arr.includes(token)) {
          arr.push(token);
          await store.setJSON(REVOKED_KEY, arr);
        }
      } catch {
        /* best effort */
      }
      return;
    }
    const p = join(LOCAL_DIR, 'revoked.json');
    await fs.mkdir(LOCAL_DIR, { recursive: true });
    let arr = [];
    try {
      arr = JSON.parse(await fs.readFile(p, 'utf8'));
    } catch {
      /* noop */
    }
    if (!arr.includes(token)) {
      arr.push(token);
      await fs.writeFile(p, JSON.stringify(arr));
    }
  } catch {
    /* best effort */
  }
}

export async function isRevoked(token) {
  try {
    const store = await getBlobStore();
    if (store) {
      try {
        const arr = (await store.getJSON(REVOKED_KEY)) || [];
        return arr.includes(token);
      } catch {
        return false;
      }
    }
    const p = join(LOCAL_DIR, 'revoked.json');
    try {
      const arr = JSON.parse(await fs.readFile(p, 'utf8'));
      return arr.includes(token);
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}
