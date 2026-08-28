# Zesto 九部曲销售认证考试 · 最终部署版

**一句话：** 把文件夹上传到 GitHub 网页 → Netlify 连上 → 设个管理员密码 → 上线。答案藏在服务端，管理员页 `/admin.html` 直接看全部考生成绩。

## 功能清单（与之前要求一致）
| 项目 | 说明 |
|---|---|
| 答案隐藏 | 完整题库（含答案）只在服务端 `netlify/functions/_lib/bank.mjs`，前端拿到的题目已剔除答案 |
| 判分 | 交卷由服务端判分，多选须全对才算对 |
| 双语 | 中文 / 葡语 一键切换 |
| 考试规则 | 30 分钟，50 题随机抽 35，完成率 ≥90%（答对≥32）合格 |
| 不通过提示 | 交卷不合格弹窗提醒 |
| 每题解析 | 交卷后逐题显示正确答案 + 解析 + 薄弱模块分析 |
| 姓名工号 | 首页必填，否则不能开考 |
| Logo | 已用 Zesto Logo |
| 成绩页 | 独立页面 `/admin.html`，登录后看全部考生成绩、搜索、导出 CSV；每行点「查看明细」弹窗看该学员**逐题错题分布**（按九大部曲 + 按题型的错题表 + 错题清单：学员作答 vs 正确答案 + 解析） |
| 个人报告下载 | 学员考完在结果页点「下载成绩报告」，一键下载含**错题分布**（按九大部曲 + 按题型）、薄弱模块、逐题解析的自包含 HTML 报告（可打印成 PDF） |

## 部署（零终端，只需网页点选）
1. **GitHub 网页上传**：进你的仓库 → 绿色 `Add file` → `Upload files` → 把 `zesto-quiz` 文件夹**里面的所有内容**全选拖进虚线框（不是拖整个文件夹本身）→ 填说明 → `Commit changes`
2. **Netlify 连接**：`Add new site` → `Import an existing project` → 选 GitHub 仓库 → `Deploy`（自动读取 `netlify.toml`，无需改设置）
3. **设管理员密码（必做）**：Netlify 站点 → `Site settings` → `Environment variables` → `Add a variable`，加 `ADMIN_PASS` = 你的强密码 → 触发重新部署
4. **设 Netlify 环境变量（必做，否则管理员页读不到成绩）**：
   - 取 **Site ID**：Netlify 站点 → `Site settings` → `Site details` → 复制 **Site ID**（也可从站点 URL `app.netlify.com/sites/<这段就是 site id>` 取得）
   - 取 **PAT**：打开 [Netlify User settings → Applications → Personal access tokens](https://app.netlify.com/user/applications/personal-access-tokens)（右上角头像 → User settings → Applications → Personal access tokens）→ **New access token** → 名称随便填（如 `zesto-quiz`）→ 复制生成的 token
   - 回到站点 → `Site settings` → `Environment variables` → `Add a variable`，依次添加：
     - `NETLIFY_SITE_ID` = 上面的 Site ID
     - `NETLIFY_API_TOKEN` = 上面的 PAT
   - 触发重新部署（改任意环境变量或到 Deploys 页点 **Trigger deploy → Deploy site**）

> 为什么需要这两个变量？管理员页现在**直接通过 Netlify Forms API 内联读取成绩**（学员交卷时成绩已自动写入 Netlify Forms）。读取需要「站点 ID + 个人访问令牌」作为服务端凭证。两者齐全后，全部成绩即可在 `/admin.html` 内联显示，无需跳转到后台。**注意：token 必须作为"站点环境变量"添加，仅在 Netlify 账号里创建 PAT 不算配置完成。**

## 上线后访问
- 考试页：`https://你的站点名.netlify.app`
- 成绩页：`https://你的站点名.netlify.app/admin.html`（用你设的 `ADMIN_PASS` 登录）
- **下载个人报告**：学员交卷后在结果页点「下载成绩报告」（葡语：`Baixar relatório`），浏览器下载一个 `.html` 文件。文件内含：学员信息、成绩概要、错题分布（按九大部曲正确率表 + 按题型错题表）、薄弱模块与学习建议、逐题解析。双击用浏览器打开即可查看，按 `Ctrl/Cmd + P` 可另存为 PDF 分享。

## 怎么进管理员页面（看所有人成绩）
1. 浏览器打开 `https://你的站点名.netlify.app/admin.html`（考试页底部也有「前往考试」旁可直达，或直接改网址路径为 `/admin.html`）。
2. 输入用户名 `admin`、密码 = 你设的 `ADMIN_PASS`（**不是**默认 `zesto2026`，一旦设了环境变量就以你设的为准）。
3. 登录后看到表格：姓名、工号、语言、成绩（答对/总题）、完成率、合格状态、用时、交卷时间、薄弱项。
4. 想看某个学员**具体错在哪**：点该行右侧「查看明细」→ 弹窗显示：
   - 按九大部曲的错题分布（带进度条）
   - 按题型的错题数（单选/多选/判断）
   - 错题清单（题干 + 学员作答 vs 正确答案 + 解析）
5. 顶部「导出 CSV」把所有成绩导出（Excel 中文不乱码）；「刷新」拉最新；「搜索」按姓名/工号过滤。

> 学员考完成绩**自动存服务端**，你无需让他们下载再发给你——直接来 `/admin.html` 看即可。

## 注意
- 本版用 **Netlify Functions**（真后端），**不能拖拽部署**（拖拽只支持纯静态文件，跑不了后端函数）。但部署只需在 GitHub 网页上传一次，不用开终端。
- 上线务必设置 `ADMIN_PASS` 环境变量；不设则用默认密码 `zesto2026`，不安全。
- 成绩存储走 **Netlify Forms**（学员交卷时自动写入），管理页 `/admin.html` 通过服务端 `NETLIFY_SITE_ID` + `NETLIFY_API_TOKEN` 直接**内联读取**全部成绩；两者齐全即生效，无需跳后台。
- 若未设置这两个变量，管理页表格为空，会提示缺哪个变量，并保留「打开 Netlify Forms」按钮可跳后台查看（成绩其实已写入 Forms，只是本页读不出来）。
- 免费版 Netlify Forms 每月 100 条提交，普通培训量足够；超出可升级。
- Blobs 仅作为兜底存储，只在 `NETLIFY_SITE_ID` + `NETLIFY_API_TOKEN` 同时齐全时参与；当前主通路是 Forms。
