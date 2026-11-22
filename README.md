# 校园生活小站 · 纯静态版

潍坊理工学院 2026 级数据升 2601 班个人校园工作台。课表、DDL、记账、专注、绩点、学习资源、官网动态全部保留；前端是纯静态文件，可以直接放 GitHub Pages。

这一版不再要求本地 Node 服务常驻：

- **浏览器本地数据**：课表、DDL、记账、专注、绩点等继续写 `localStorage`，断网也能用。
- **Cloudflare Worker**：只负责代取学习通页面，解决 GitHub Pages 不能跨域的问题。
- **GitHub Actions**：每 2 小时抓一次潍坊理工学院官网要闻 / 通知，生成 `data/news.json` 并自动提交。
- **GitHub Pages**：托管 `index.html`、CSS、JS、PDF，无需构建。

> 数据是按浏览器域名隔离的。旧版本 `127.0.0.1:8787` 里的数据不会自动出现在 `github.io` 页面里；请在旧站底部「导出备份」，再到新站「导入备份」。

## 一、目录结构

```
.
├─ index.html                     # 页面入口（原 校园生活小站.html）
├─ styles.css                     # 样式
├─ app.js                         # 全部前端业务逻辑
├─ js/
│  └─ static-adapter.js           # 把旧 /api/* 改成 localStorage + 静态 JSON + Worker
├─ assets/
│  └─ vendor/qrcode.min.js        # 本地二维码库，不依赖 CDN
├─ library/
│  ├─ manifest.json               # 离线资料清单
│  ├─ hello-algo-zh-python.pdf    # Hello 算法（Python 版）
│  └─ progit-zh.pdf               # Pro Git 中文版
├─ worker/
│  ├─ index.js                    # 学习通代理 Worker
│  └─ wrangler.toml               # Wrangler 配置
├─ scripts/
│  └─ crawl-news.js               # 官网要闻 / 通知爬虫
├─ data/
│  └─ news.json                   # 爬虫产物，前端直接 fetch
├─ .github/
│  └─ workflows/
│     └─ update-news.yml          # 每 2 小时抓官网并自动提交
├─ .nojekyll                      # 0 字节，告诉 Pages 不要用 Jekyll
├─ package.json
├─ package-lock.json
└─ README.md
```

部署时，根目录这些文件都要在仓库里；本地的 `data/campus.db`、`backup/`、`shots/`、`node_modules/` 不要提交。

## 二、第一步：先部署 Worker，拿到 URL

因为 `app.js` 里的学习通代取需要 Worker 地址，建议先做这一步。

### 方式 A：Cloudflare 控制台（推荐，不用装命令行）

1. 登录 <https://dash.cloudflare.com/>。
2. 左侧 **Workers & Pages** → **Create** → **Create Worker**。
3. 名字填 `campus-chaoxing-proxy`，点 **Deploy**。
4. 进入在线编辑器，把 `worker/index.js` 的全部内容粘贴进去，覆盖默认代码。
5. 点 **Deploy**，记下形如 `https://campus-chaoxing-proxy.你的子域.workers.dev` 的地址。
6. 打开 `https://你的Worker地址/health`，看到 `{"ok":true,...}` 就说明活了。
7. 如果需要限制来源，在 Worker 的 **Settings → Variables** 里改：
   - `ALLOW_ORIGIN`：生产环境填你的 Pages 域名，例如 `https://finding-lb.github.io`；不确定就先留 `*`。
   - `PROXY_TOKEN`：可选。设置后，前端 `index.html` 的 `CAMPUS_PROXY_TOKEN` 要填同一个口令。
8. 打开 `index.html`，找到页面底部这段，把空字符串换成 Worker 地址：

```html
<script>
  window.CAMPUS_WORKER_URL = "https://campus-chaoxing-proxy.xxx.workers.dev";
  window.CAMPUS_PROXY_TOKEN = "";
</script>
```

也可以直接改 `app.js` 顶部的 `const WORKER_URL = '';`。两处填一处即可，`index.html` 优先。

### 方式 B：Wrangler 命令行

```bash
npm install -g wrangler
cd worker
wrangler login
wrangler deploy
```

`wrangler.toml` 里已经写好 `name`、`main`、`compatibility_date`。要加口令：

```bash
wrangler secret put PROXY_TOKEN
```

然后把同一个口令填进 `index.html` 的 `CAMPUS_PROXY_TOKEN`。

### Worker 的安全边界

- 只允许 `https://*.chaoxing.com`，不会变成可以抓任意网站、任意内网地址的开放代理。
- 只支持 GET / POST，Cookie 只随单次请求转发，不写入日志、不落盘。
- 默认 CORS 是 `*`，但目标域名白名单已经收窄；生产建议把 `ALLOW_ORIGIN` 改成你的 Pages 域名。
- 不要把 Cookie 发给陌生站点；本项目的 Cookie 只存在你自己的浏览器 localStorage，可随时在「DDL → 学习通」里清除。

## 三、推送到 GitHub 并开启 Pages

1. 在 GitHub 新建仓库，例如 `campus-life`，不要勾选自动生成 README。
2. 在项目根目录执行：

```bash
git init
git add .
git commit -m "feat: static campus life site"
git branch -M main
git remote add origin https://github.com/你的用户名/campus-life.git
git push -u origin main
```

3. 仓库 **Settings → Pages**：
   - **Source** 选 `Deploy from a branch`
   - **Branch** 选 `main`
   - 目录选 `/(root)`
   - 点 **Save**
4. 等 1–3 分钟，访问：

```text
https://你的用户名.github.io/campus-life/
```

注意末尾的 `/` 不能少。`https://你的用户名.github.io/` 是账号根地址，不是这个项目。

5. 如果样式或 JS 仍是旧的：
   - 先 `Ctrl + F5` 强制刷新；
   - GitHub Pages 的 HTML / CSS / JS 有约 10 分钟缓存，普通刷新最多等 10 分钟；
   - 确认 `index.html` 里的 `styles.css`、`app.js`、`static-adapter.js` 都是 `./` 开头；
   - 确认仓库根目录有 0 字节的 `.nojekyll`。

## 四、开启 Actions 自动提交

1. 仓库 **Settings → Actions → General**。
2. 找到 **Workflow permissions**，选 **Read and write permissions**，保存。
3. 打开 **Actions** 标签，左侧选「更新官网动态快照」。
4. 点 **Run workflow** 手动跑一次，确认变绿。
5. 成功后仓库里会多一条 `chore: update campus news snapshot` 提交，`data/news.json` 更新。

工作流默认每 2 小时的第 10 分钟运行（UTC），即北京时间约 `:10` 一次。也可以在 Actions 页面随时手动触发。

本地想先试爬虫：

```bash
npm ci
npm run crawl:news
```

它会写入 `data/news.json`；前端打开页面时直接读这个文件，不再请求任何后端。

## 五、前端怎么对接

`js/static-adapter.js` 在 `app.js` 之前加载，接管所有 `/api/*`：

| 原接口 | 静态版行为 |
| --- | --- |
| `/api/state` | 读写 `localStorage.campusLife.v3` |
| `/api/news` | `fetch('./data/news.json')`，失败时回退 `localStorage.campusNews` |
| `/api/library` | `fetch('./library/manifest.json')`，生成 PDF 站内阅读地址 |
| `/api/backup` / `/api/restore` | 浏览器内导出 / 导入 JSON |
| `/api/chaoxing/cookie` | Cookie 存 `localStorage`，可清除 |
| `/api/chaoxing/sync` | POST 到 Worker `/fetch`，解析返回 HTML |
| `/api/chaoxing/import` | 去重后写入 `localStorage` 的 DDL |
| `/api/net` | 返回当前页面地址，用于分享二维码 |

所以 GitHub Pages 上不需要 Node、SQLite、隧道，也不会白屏。

## 六、首次打开与旧数据恢复

1. 打开 `https://你的用户名.github.io/campus-life/`。
2. 如果概览全是 0：这是新域名的空 localStorage，不是页面坏了。
3. 回到旧站（本地服务版），底部点「导出备份」，下载 JSON。
4. 在新站底部点「导入备份」，选那个 JSON，确认覆盖。
5. 刷新后课表、DDL、账目、专注、绩点都会回来。

备份导入只影响当前浏览器；换电脑、换浏览器要重新导入一次。

## 七、常见问题

**页面能开但按钮没反应 / 样式全丢**
检查 `index.html` 的引用是不是 `./styles.css`、`./app.js`、`./js/static-adapter.js`；再确认 `.nojekyll` 在仓库根目录且大小 0 字节。

**官网动态是空的**
打开 `https://你的站点/data/news.json` 看有没有文件。没有就到 Actions 手动跑一次；有文件但页面仍旧，强刷或等缓存。

**学习通抓取报「还没有配置 WORKER_URL」**
`index.html` 的 `CAMPUS_WORKER_URL` 还是空字符串，填入 Worker 地址后重新提交。

**学习通报「登录态已失效」**
重新登录学习通，复制新的完整 Cookie，在 DDL 页保存后再抓。不要把 Cookie 发到群里。

**Worker 报 `bad_target`**
只接受 `https://*.chaoxing.com` 的地址；把学习通页面地址换对，别填学校官网或别的域名。

**Actions 报 403 / 不能 push**
Settings → Actions → General → Workflow permissions 改成 **Read and write**，再重跑。

**仓库太大**
`library/` 里两份 PDF 约 36 MB，是刻意放进仓库让 Pages 直接托管离线资料的。若仓库配额紧张，可以把 PDF 放到 Releases 或对象存储，再改 `library/manifest.json` 的 `url`；但这样就不再是「断网可读」的完整离线版。

## 八、现在先做什么

按这个顺序：

1. 先部署 Worker，拿到 `https://...workers.dev` 地址；
2. 把地址填进 `index.html` 的 `CAMPUS_WORKER_URL`；
3. 推送仓库，开启 Pages；
4. 开启 Actions 的 Read and write 权限，手动跑一次「更新官网动态快照」；
5. 打开 Pages 地址，强刷一次，再从旧站导入备份。

做完第 1、2 步，学习通代取就能用；第 3 步之后，整站和官网动态才完整上线。
