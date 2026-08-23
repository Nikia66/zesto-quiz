# Zesto 九部曲销售认证考试 · Netlify 正式发布版

**真后端**：完整题库（含答案）只存在于服务端函数，学员端永远拿不到答案；判分、管理员鉴权、成绩存储全部在服务端完成。可正式上 Netlify 对外发布。

## 架构
- `public/`：纯静态前端（首页 / 考试 / 结果 / 管理员），调用 `/api/*`。
- `netlify/functions/`：后端函数（隐藏答案 + 判分 + 管理员接口）。
  - `bank.js` → `GET /api/bank?lang=zh|pt`（**返回题目已剔除答案/解析**）
  - `submit.js` → `POST /api/submit`（**服务端对照私有题库判分**，仅回传正确答用于学习）
  - `admin/login.js` → `POST /api/admin/login`（HMAC 无状态令牌）
  - `admin/results.js` → `GET /api/admin/results?token=`（成绩列表）
  - `admin/export.js` → `GET /api/admin/export?token=&fmt=csv`（CSV 导出，带 BOM）
  - `admin/logout.js` → `POST /api/admin/logout`（吊销令牌）
- 成绩持久化：生产用 **Netlify Blobs**（自动创建、跨实例共享）；本地验证回退到 `functions/.local-data/`。

## 为什么不能“拖拽上传”部署
拖拽上传只支持**纯静态文件**，跑不了函数。本版是真正的后端，必须用以下任一方式部署（都能在 Netlify 后台看到、可对外访问）：

### 方式 A：连 GitHub 仓库（推荐，最省事）
1. 把本目录推送到一个 GitHub 仓库。
2. Netlify 后台 → **Add new site → Import an existing project** → 选该仓库。
3. Netlify 会自动读取 `netlify.toml`（构建目录 `public`、函数目录 `netlify/functions`），无需改任何设置。
4. 进入 **Site settings → Environment variables**，添加：
   - `ADMIN_PASS` = 你的强密码（**务必设置**，覆盖默认 `zesto2026`）
   - （可选）`ADMIN_USER` = 管理员账号，默认 `admin`
5. 点 **Deploy**。完成后访问 `https://<你的站点>.netlify.app`，管理员页 `https://<站点>/admin.html`。

### 方式 B：netlify-cli 命令行
```bash
npm i -g netlify-cli
netlify login
# 在项目根目录（含 netlify.toml 的目录）：
netlify init          # 首次：连接/创建站点，自动读取 netlify.toml
netlify deploy --prod # 或：netlify deploy --prod --dir=public --functions=netlify/functions
```
部署前同样在 `netlify env:set ADMIN_PASS 你的强密码` 设置密码。

## 本地开发预览
```bash
npm i -g netlify-cli
netlify dev           # 自动启动前端 + 函数，访问 http://localhost:8888
```
（本地无 `NETLIFY` 环境变量时，成绩写入 `functions/.local-data/`，仅用于本地验证。）

## 安全要点（已落实）
- 学员 `GET /api/bank` 返回的题目**不含 `answer` 与 `explanation`**——即便开开发者工具抓包也看不到答案。
- 答案只在服务端函数内，判分在服务端完成，学员无法篡改成绩。
- 管理员令牌为 HMAC 签名（密钥 = `ADMIN_PASS`），有效期 2 小时，登出即吊销；未授权访问一律 401。
- 生产环境建议通过环境变量设置 `ADMIN_PASS`，不要使用默认密码。

## 接口速查
| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/bank?lang=zh` | 抽题（无答案） |
| POST | `/api/submit` | 交卷判分 |
| POST | `/api/admin/login` | 管理员登录 `{user,pass}` |
| GET  | `/api/admin/results?token=` | 成绩列表 |
| GET  | `/api/admin/export?token=&fmt=csv` | CSV 导出 |
| POST | `/api/admin/logout` | 登出吊销 `{token}` |

管理员默认账号：`admin` / 密码 `zesto2026`（生产请改 `ADMIN_PASS`）。
