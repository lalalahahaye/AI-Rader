# PEVC AI Radar（Cursor / Agent Skill）

面向 **PEVC** 的 **AI 市场雷达**：融资、新闻、Reddit/X、中文社交（通过中央 feed 策展）、GitHub、论文、众筹等。**阅读端零 API Key**，思路对齐 [follow-builders](https://github.com/zarazhangrui/follow-builders)。

**中央 feed**：本仓库通过 **GitHub Actions**（[`.github/workflows/update-feed.yml`](.github/workflows/update-feed.yml)）在 **每日定时**、你在 `main` 上 **修改** [`default-sources.json`](default-sources.json) 或 `build-feed.mjs`、以及 **手动运行** workflow 时执行 [`scripts/build-feed.mjs`](scripts/build-feed.mjs)，从 **Hacker News**、**Reddit**、**GitHub Search** 聚合刷新 [`feed-investor.json`](feed-investor.json)。**改订阅源不用改代码**：只编辑根目录的 **`default-sources.json`**（子版块、GitHub 搜索词、条数上限等）。若文件缺失，脚本使用内置默认。X / 微信 / 小红书等仍需维护端策展或密钥扩展。

## 安装（Cursor）

**分享给别人的主链接**：GitHub 仓库地址，例如 `https://github.com/<OWNER>/<REPO>.git` — 对方 **git clone** 到技能目录即可（没有单独的「技能直链」，与仓库同源）。

**Windows（PowerShell）**

```powershell
git clone https://github.com/<OWNER>/<REPO>.git "$env:USERPROFILE\.cursor\skills\pevc-ai-radar"
```

**macOS / Linux**

```bash
git clone https://github.com/<OWNER>/<REPO>.git ~/.cursor/skills/pevc-ai-radar
```

将 `<OWNER>/<REPO>` 换成你发布后的 GitHub 路径。

## OpenClaw + 飞书

1. 按 **OpenClaw 文档** 将本仓库安装到其全局技能目录（通常仍是 **git clone** 上述仓库 URL；若路径与 Cursor 不同，以 OpenClaw 为准）。
2. 在 OpenClaw 配置 **每日定时**，触发本 skill 的 digest：拉取中央 JSON → 用 `prompts/` 摘要 → **在飞书会话中发出正文**。
3. 飞书侧用户 **只需** 公开的 `FEED_URL`，**不需要** X/GitHub/新闻等数据源 API Key。

## 中央 feed

发布后默认：

`https://raw.githubusercontent.com/<OWNER>/<REPO>/main/feed-investor.json`

可选环境变量 `FEED_URL` 指向任意 **公开 HTTPS** 的 JSON。

本地调试：

```bash
cd scripts && node fetch-feed.mjs ../feed-investor.json
```

维护者本地重建 feed：

```bash
node scripts/build-feed.mjs
```

## 使用方式

对话中说：**「运行今日 PEVC 雷达摘要」** 或 **「配置 pevc-ai-radar」**。

- **首次配置**后会 **立刻** 出第一期摘要，再按 **每日**（由 OpenClaw 或系统计划任务触发；纯 Cursor IDE 无内置定时）。

## 上传到 GitHub

### 方式 A：用 Git（长期维护更省事）

1. 在 GitHub 新建 **空仓库**（不要自带 README）。
2. 在本目录执行：

```bash
git init -b main
git add .
git commit -m "Initial commit: PEVC AI Radar skill"
git remote add origin https://github.com/<OWNER>/<REPO>.git
git push -u origin main
```

### 方式 B：不装 Git，网页上传整个文件夹

**可以。** 新建空仓库后，在网页上 **Add file → Upload files**，把本地 **整个项目**（含子文件夹里的文件）拖进去上传即可；GitHub 会按路径保存。**注意**：文件很多时要分批或压缩上传视界面而定；日常小改可用网页编辑 `default-sources.json`。**GitHub Actions** 仍会在云端跑定时任务并 **自动提交** 更新后的 `feed-investor.json`，你可能 **不需要** 在本机装 Git。

3. 将文档中的 `<OWNER>/<REPO>` 换成真实路径。
4. 在仓库 **Actions** 中允许工作流，并手动运行一次 **Update feed (daily)** 生成最新 `feed-investor.json`。

## 给朋友用

- Fork / clone 到各自的技能目录。  
- 可改用你维护的 `FEED_URL`。  
- **勿** 把 Bot Token 等提交到 Git。

## 许可

MIT — 见 [LICENSE](LICENSE)。
