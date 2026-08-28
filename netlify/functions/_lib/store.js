// 成绩存储：生产环境优先用 Netlify Blobs（线上持久化、跨实例共享）。
// Netlify Functions 使用 Lambda 兼容模式（event/statusCode/body）时，必须在 getStore 之前调用 connectLambda(event)。
// 本地运行或 Blobs 不可用时，回退到 os.tmpdir() 下的本地文件。
import { promises as fs } from 'fs';
import { join } from 'path';
import os from 'os';
import { connectLambda, getStore } from '@netlify/blobs';

const LOCAL_DIR = process.env.NETLIFY_LOCAL_DATA_DIR || join(os.tmpdir(), 'zesto-local-data');
const STORE = 'zesto-quiz-results';
const REVOKED_KEY = 'revoked-tokens';

// 在每个 handler 入口调用一次，把 Lambda event 的 Blobs 上下文连上。
export function initStore(event) {
  if (!event) return;
  try {
    connectLambda(event);
  } catch {
    // 非 Lambda 环境会抛错，忽略即可
  }
}

async function getBlobStore() {
  try {
    return getStore(STORE);
  } catch {
    return null;
  }
}

export async function writeResult(key, value) {
  const store = await getBlobStore();
  if (store) {
    await store.setJSON(key, value);
    return;
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
        const d = await store.getJSON(b.key);
        if (d) items.push(d);
      }
      return items;
    } catch {
      // Blobs 列表失败时回退本地
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
      let arr = [];
      try {
        arr = (await store.getJSON(REVOKED_KEY)) || [];
      } catch {
        /* noop */
      }
      if (!arr.includes(token)) {
        arr.push(token);
        await store.setJSON(REVOKED_KEY, arr);
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
