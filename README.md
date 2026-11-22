# 校园生活小站 · 纯静态版

一个不需要后端、不需要构建、不需要数据库的校园生活小站。打开网页就能用，数据保存在当前浏览器的 `localStorage` 里，关掉电脑后重新打开也还在。

部署到 GitHub Pages 后，别人在任何网络下都可以通过一个固定网址访问。电脑关机不影响网站运行。

## 功能

- **课表**：10 节 × 7 天网格、周次切换、当前周高亮、点课程编辑、增删改。
- **DDL 待办**：今天 / 本周 / 逾期 / 已完成筛选，完成打勾，删除确认。
- **记账**：月度预算、本月支出进度、逐笔明细、日期与分类，删除确认。
- **取件码**：待取 / 已取分区、一键复制、已取划线沉底、可恢复。
- **吃什么**：自定义店名、滚动转盘、单店直接出结果、尊重「减少动态效果」设置。
- **宿舍值日 + AA**：按名单顺序自动轮值、今日高亮、人均金额与分币差额提示。
- **便利贴墙**：黄 / 红两色、置顶、完成划线、点卡片切换状态、删除确认。
- **心情打卡**：6 个表情、每天一条、同日覆盖、最近 14 天时间轴。
- **深浅主题**：跟随系统，也可手动切换，刷新不闪白。
- **备份**：设置页可导出 / 导入 JSON；兼容旧全栈站备份结构。

## 目录结构

```text
campus-static/
├── .nojekyll              # 告诉 GitHub Pages 不要用 Jekyll 处理
├── README.md              # 本文件
├── favicon.svg
├── index.html             # 唯一页面，含主题防闪烁内联脚本
├── css/
│   ├── tokens.css         # 深 / 浅两套设计令牌
│   ├── base.css           # 重置、布局、顶栏、导航、弹层
│   └── components.css     # 各功能组件样式
└── js/
    ├── app.js             # 主题、概览统计、弹层、设置页
    ├── core/
    │   ├── store.js       # localStorage 封装、节流、坏数据兜底
    │   ├── backup.js      # 导入 / 导出、旧数据迁移
    │   └── router.js      # Hash 路由
    └── modules/
        ├── parcel.js
        ├── food.js
        ├── dorm.js
        ├── notes.js
        ├── mood.js
        ├── schedule.js
        ├── tasks.js
        └── money.js
```

没有 `package.json`，没有构建步骤，没有 CDN 依赖。所有资源都用 `./` 相对路径，整目录放到任何静态服务器都能跑。

## 本地预览

方式一：直接双击 `index.html`。经典脚本不受 `file://` 的模块限制，功能可以正常使用。

方式二：起一个本地静态服务器（推荐，行为更接近线上）：

```powershell
cd D:\作业\web\test\campus-static
python -m http.server 8899
```

然后打开 `http://127.0.0.1:8899/`。

> 开发机的上级目录还带了一个 `tools\static-server.mjs`（不随站点部署）。如果本机有 Node，也可以在 `D:\作业\web\test` 下运行 `node tools\static-server.mjs 8899`，效果相同。

> 本地 `file://` 和线上 `https://` 的 `localStorage` 不互通。本地录入的测试数据不会自动带到线上，正式使用前请在线上重新录入，或用「设置 → 导出备份 / 导入备份」迁移。

## 数据与隐私

- 所有业务数据集中在 `localStorage` 的 `campus.v1` 一个键里；主题单独存在 `campus.theme`。
- 数据只属于当前浏览器、当前站点地址。换浏览器、换电脑、换域名都不会自动同步。
- 仓库里只有代码，没有你的课程、账目或心情数据。部署到公开仓库也不会泄露这些内容。
- 清理浏览器站点数据会清空记录。重要数据请定期到「设置」导出 JSON 备份。
- 无痕模式或浏览器禁用本地存储时，站点会降级为「内存模式」：当前页面能用，刷新即丢失，并会给出提示。

## 部署到 GitHub Pages（第四步）

### 0. 上线前先确认三件事

1. **仓库是否公开**：免费账号想用 GitHub Pages，建议把仓库设为 **Public**。
2. **仓库名**：例如 `campus-static`。仓库名只影响最终网址，不影响代码；所有路径都是相对的，**不需要改 `base` 或任何资源路径**。
3. **Pages 发布目录**：推荐把 `campus-static` 里的内容直接放在仓库根目录，Pages 选择 `main` / `(root)`。

最终网址规则：

```text
https://<你的 GitHub 用户名>.github.io/<仓库名>/
```

例如仓库叫 `campus-static`：

```text
https://yourname.github.io/campus-static/
```

### 1. 创建 GitHub 仓库

1. 登录 GitHub，右上角 **+ → New repository**。
2. Repository name 填 `campus-static`（或你喜欢的名字）。
3. Visibility 选 **Public**。
4. **不要勾选** Add a README、Add .gitignore、Choose a license，先建一个空仓库，避免第一次推送冲突。
5. 点 **Create repository**。

### 2. 把 `campus-static` 的内容推上去

先确认当前目录就是站点根目录（里面能直接看到 `index.html`、`css`、`js`）：

```powershell
cd D:\作业\web\test\campus-static
dir
```

第一次使用 Git 的话，先设置提交身份（只做一次）：

```powershell
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

初始化并推送：

```powershell
git init
git add .
git commit -m "feat: campus static site"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

把 `<你的用户名>` 和 `<仓库名>` 换成实际值。例如：

```powershell
git remote add origin https://github.com/yourname/campus-static.git
```

推送时如果弹出登录：

- 最简单：用 **GitHub Desktop** 打开这个目录，点 Publish / Push，按浏览器提示登录。
- 命令行：GitHub 已不接受账号密码，需要使用 Personal Access Token（Settings → Developer settings → Personal access tokens），或改用 SSH。
- 不要把 Token 写进代码、README 或提交记录里。

**不要**把整个 `D:\作业\web\test` 推上去。那会把旧全栈站、`server`、`data/campus.db`、测试截图一起传上去，而且 `index.html` 不在仓库根目录，Pages 会找不到首页。只推 `campus-static` 里的内容。

如果更习惯网页上传：进入空仓库 → **Add file → Upload files**，把 `campus-static` **里面的文件和文件夹**（不是 `campus-static` 这一层文件夹）拖进去 → Commit。注意 `.nojekyll` 是隐藏文件，网页上传容易漏；漏了也能用，但建议用 Git 命令确保它在仓库根目录。

推送完成后，在仓库首页应该能直接看到 `index.html`、`css/`、`js/` 和 `.nojekyll`。如果看到的是一个 `campus-static/` 子文件夹，说明上传层级错了，Pages 首页会 404。

### 3. 打开 GitHub Pages

1. 进入仓库 → **Settings**。
2. 左侧选 **Pages**。
3. **Build and deployment → Source** 选 **Deploy from a branch**。
4. **Branch** 选 `main`，目录选 **`/(root)`**，点 **Save**。
5. 等待 1–3 分钟。Pages 页面顶部会出现：

```text
Your site is live at https://yourname.github.io/campus-static/
```

第一次部署有时会跑 `pages build and deployment` 工作流，等它变绿再访问。

### 4. 上线验证清单

打开 `https://<用户名>.github.io/<仓库名>/`，依次检查：

- [ ] 首页正常显示，不是 404，也不是 GitHub 的 404 页面。
- [ ] 点底部「课表 / 待办 / 记账 / 更多」，地址栏变成 `#/schedule`、`#/tasks`、`#/money` 等，视图正常切换。
- [ ] 在课表页加一门课，刷新页面后还在。
- [ ] 切到浅色主题，刷新后仍是浅色。
- [ ] 取件码页点「复制取件码」，HTTPS 下能复制成功。
- [ ] 手机打开同一网址，布局是单列，没有横向溢出。
- [ ] F12 → Console 没有红色报错；Network 里没有 404 的 `css` / `js` 文件。

Hash 路由不会向服务器发请求，所以 `#/schedule` 这类地址不需要额外的 `404.html` 或重写规则。

### 5. 以后怎么更新

改完本地文件后：

```powershell
cd D:\作业\web\test\campus-static
git status
git add .
git commit -m "update: 改了什么"
git push
```

推送后 GitHub Pages 会自动重建，通常 1–2 分钟生效。如果页面还是旧的，按 `Ctrl + F5` 强制刷新，或等几分钟；CDN 有缓存。

### 6. 自定义域名（可选）

不买域名可以跳过。

1. 在仓库 **Settings → Pages → Custom domain** 填入域名，例如 `campus.example.com`。
2. 到域名服务商处加一条 CNAME 记录，指向 `<你的用户名>.github.io`。
3. GitHub 会自动申请 HTTPS 证书，生效可能需要几分钟到几小时。
4. 如果使用自定义域名，建议在仓库根目录放一个 `CNAME` 文件，内容只有一行域名；GitHub 设置页也会自动帮你创建。
5. 换域名后，旧域名下的 `localStorage` 数据不会跟过来；需要重新导入备份。

## 上线到底还需要改什么配置？

**代码本身不需要改。** 全站使用相对路径 + Hash 路由，放在仓库根目录或项目页路径下都能运行。

真正需要你决定的只有平台侧配置：

| 配置项 | 推荐值 | 说明 |
| --- | --- | --- |
| 仓库可见性 | Public | 免费账号使用 Pages 的稳妥选择 |
| 仓库名 | `campus-static` 或自定义 | 只决定访问网址，不影响代码 |
| Pages Source | Deploy from a branch | 不需要 GitHub Actions |
| 分支 / 目录 | `main` / `(root)` | `index.html` 必须在仓库根目录 |
| 自定义域名 | 可留空 | 需要时再加 `CNAME` |
| `base` / 资源前缀 | 不设置 | 所有引用已是 `./` 相对路径 |

唯一容易踩的坑是**上传层级**：仓库根目录必须直接是 `index.html`，不能是 `campus-static/index.html`。如果你确实想保留子目录，Pages 的目录要改成 `/docs`，并把内容放到 `docs/`；但当前项目没必要这么做。

## 常见问题

**打开是 GitHub 404**

- 检查仓库 **Settings → Pages** 是否已经 Save，Source 是否是 `main` / `(root)`。
- 检查仓库根目录有没有 `index.html`。
- 第一次部署等 1–3 分钟；看 Actions 里的 `pages build and deployment` 是否成功。
- 确认访问的是 `https://<用户名>.github.io/<仓库名>/`，末尾斜杠别丢。

**页面白屏，Console 有 404**

- 看 Network 里哪个文件 404。多数是 `css/`、`js/` 没传上去，或者传成了 `campus-static/css/...` 多一层。
- GitHub Pages 区分大小写：`js/core/store.js` 不能写成 `JS/Core/Store.js`。
- 确认 `.nojekyll` 在仓库根目录。它不是必须的，但能避免 Jekyll 处理静态文件。

**本地双击能开，线上打不开**

- 本地是 `file://`，线上是 `https://`，两者路径解析和 `localStorage` 都不同。
- 检查 `index.html` 里资源是否都写成 `./css/...`、`./js/...`，不要出现 `C:\...` 或 `/css/...` 这类绝对路径。

**线上数据是空的**

- 正常。数据存在浏览器本地，不会跟着代码上传。
- 在旧站「设置」导出 JSON，再到线上「设置 → 导入备份」；`backup.js` 已兼容旧结构 `{ courses, tasks, expenses, gpa, kv }`。
- 也可以在线上重新录入。

**手机能开、电脑打不开，或反过来**

- 确认两台设备访问的是同一个协议 + 域名 + 路径。`http` 与 `https`、带不带 `www` 都算不同站点，`localStorage` 不共享。

**改了代码但线上没变化**

- 确认 `git push` 成功，Actions 里部署完成。
- `Ctrl + F5` 强刷；iOS Safari 可在设置里清除网站数据后再试。
- 检查是不是改了另一个目录，或推送到了别的分支。

**取件码复制失败**

- `navigator.clipboard` 只在 HTTPS 或 `localhost` 可用。GitHub Pages 是 HTTPS，正常。
- 局域网 HTTP 下会自动降级为 `textarea + execCommand`；再失败会提示长按手动复制，这是预期行为。

## 技术说明

- 原生 HTML + 经典 JavaScript（IIFE 挂 `Campus` 命名空间），全部 `defer` 加载，不用框架、不用打包。
- Hash 路由：`#/home`、`#/schedule`、`#/tasks`、`#/money`、`#/parcel`、`#/food`、`#/dorm`、`#/notes`、`#/mood`、`#/settings` 等。
- 写入 `localStorage` 有 180ms 节流，页面隐藏 / 关闭时强制落盘；坏数据会留档到 `campus.v1.corrupt.<时间戳>`，不会静默覆盖。
- 主题键为 `campus.theme`，`index.html` 头部有内联防闪烁脚本。
- 支持 `prefers-reduced-motion`：转盘、淡入等动画会自动降级。
- 适配 360px 起的手机宽度；≥900px 时底部导航变为左侧竖栏。

## 许可

个人自用项目，未附加开源许可证。若要公开分发，请自行补充 License。
