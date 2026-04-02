# PEVC AI Radar（Cursor / Agent Skill）

面向 **PEVC** 的 **AI 市场雷达**：融资、新闻、Reddit/X、GitHub、论文、可选众筹等。**阅读端零 API Key**，思路对齐 [follow-builders](https://github.com/zarazhangrui/follow-builders)。

**中央 feed**：Actions 在 `scripts/` 下 **`npm install`** 后运行 [`scripts/build-feed.mjs`](scripts/build-feed.mjs)（见 [`.github/workflows/update-feed.yml`](.github/workflows/update-feed.yml)）。**Path A** 仅公开接口：**RSS**（含 36氪、机器之心、量子位等，URL 需自行验证）、**Google News RSS**、**HN Algolia**、**arXiv**、**Reddit**、**GitHub Search**（`searchQuery` + **`minStars`**）、可选 **Kickstarter**（默认关）、可选 **X**（仓库 Secret **`TWITTER_BEARER_TOKEN`**）。**赛道过滤**：[`default-sources.json`](default-sources.json) 里 **`filter.includeKeywords`**（允许列表，至少命中一词）+ 少量 **`excludeKeywords`** + **`feed.capsByType`**。

**边界**：无商业库 key 不能自动同步 IT 桔子 / 企名片 / 天眼查等全库；微信、小红书无稳定 CI 匿名 API。见 [`sources.md`](sources.md)、[`SKILL.md`](SKILL.md)。

**Agent**：[`SKILL.md`](SKILL.md) 与 [`prompts/`](prompts/) — sourcing、mapping、融资表 **未披露** 规则。

## 安装（Cursor）

```powershell
git clone https://github.com/<OWNER>/<REPO>.git "$env:USERPROFILE\.cursor\skills\pevc-ai-radar"
```

macOS / Linux：`~/.cursor/skills/pevc-ai-radar`。

## OpenClaw + 飞书

1. 按 OpenClaw 文档把本仓库装到其技能目录（通常 `git clone`）。
2. 配置 **每日定时**：拉中央 JSON → `prompts/` 摘要 → 飞书发正文。
3. 飞书侧只需公开 **`FEED_URL`**，不需要各数据源 API Key。

## 中央 feed

`https://raw.githubusercontent.com/<OWNER>/<REPO>/main/feed-investor.json`

可选环境变量 **`FEED_URL`**。本地：

```bash
cd scripts && node fetch-feed.mjs ../feed-investor.json
node scripts/build-feed.mjs
```

在 GitHub **Actions** 中启用工作流；需要时可手动跑一次 **Update feed (daily)** 刷新 `feed-investor.json`。

## 使用

对话：**「运行今日 PEVC 雷达摘要」** 或 **「配置 pevc-ai-radar」**。首次配置后会立刻出一期；每日由 OpenClaw 或系统计划任务触发。

## 许可

MIT — [LICENSE](LICENSE)。
