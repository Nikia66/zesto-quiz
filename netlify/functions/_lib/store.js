// 成绩存储：生产环境用 Netlify Blobs（线上持久化、跨实例共享）；
// 本地未部署（NETLIFY 未注入）时自动回退到 .local-data 目录（仅本地验证用）。
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCAL_DIR = join(__dirname, '..', '.local-data');
const STORE = 'zesto-quiz-results';
const REVOKED_KEY = 'revoked-tokens';

async function getBlobStore() {
  // 仅在 Netlify 运行环境（NETLIFY=true）或显式 USE_BLOBS=true 时使用 Blobs。
  // 生产环境若初始化失败，错误会向上抛出（避免静默回退到只读文件系统导致提交 500）。
  if (process.env.NETLIFY === 'true' || process.env.USE_BLOBS === 'true') {
    const { getStore } = await import('@netlify/blobs');
    return getStore({ name: STORE });
  }
  return null;
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
    const { blobs } = await store.list();
    const items = [];
    for (const b of blobs) {
      const d = await store.getJSON(b.key);
      if (d) items.push(d);
    }
    return items;
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  const files = (await fs.readdir(LOCAL_DIR)).filter((f) => f.endsWith('.json'));
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

// 轻量令牌吊销（登出）：生产用 Blobs 单键 JSON 数组；本地回退文件
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
