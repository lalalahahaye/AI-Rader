# 中文 digest 版式（对齐 follow-builders 阅读体验）

在遵守 [digest-investor.md](digest-investor.md) 的**强制顺序**前提下（当前为：**投融资 → 技术进展 → Sourcing → Mapping → …**），**正文语言与局部排版**采用本文件的「分节 + 结论 + 要点」风格（简体中文）。

**密度**：与 `digest-investor.md` 一致 — **少废话、多事实**；每个信源至少露脸一次（有条目时），见该文件 **Full source coverage**。

## 总标题

`AI 创投雷达 — YYYY年M月D日`（或用户在 config 里指定的名称）。

## 上半：PEVC 核心（顺序不变）

1. **融资与交易**（表格）：列名与 `digest-investor.md` 一致。  
2. **Sourcing 分层**（Tier A / B / C）。  
3. **Mapping 增量**。  
4. **执行摘要**（3–6 条 bullet）。  
5. **开源与产品**（`oss`）。  
6. **研究与论文**（`paper`，2–4 条，thesis 相关）。  
7. **众筹**（若有）。  
8. **Dropped**。

## 中文分节标题（大写英文可改为全角中文标题）

在**上述块之间或之后**，用清晰分节，例如：

- **「X / 推特」**：仅使用 `type: social_en` 且来自 X 的条目（`source` 以 `twitter_` 开头或 `url` 含 `x.com`）。  
- **「社区 / Reddit」**：其它 `social_en`（如 Reddit）。  
- **「播客」**：**当前中央 feed 默认不含播客源**。若 `items` 中**没有任何**带 `podcast` 相关 tag 或约定类型的播客条目，**不要写「播客」空节**（省略整节）。日后若维护者接入播客 RSS，再输出该节。

## 「X / 推特」区块内每条结构

对**每一条**推文条目，按 [summarize-x-builders-zh.md](summarize-x-builders-zh.md) 输出：

1. **一行抬头**：`**显示名**（@`authorHandle`）` — 若 feed 有 `authorName` / `authorHandle` 优先用；否则从 `source` 推断。  
2. **综述**：1–3 句中文复述帖子在说什么（可合并多条链接推文为一段）。  
3. **一句话结论**：以 `**一句话结论：**` 开头，单独一行或紧跟一段。  
4. **关键要点**：`关键要点：` 下接 3–5 条 `-` bullet， actionable 或认知向均可。  
5. **链接**：正文末给出 `item.url`（可多行多个链接）。

机构号（`ai_investor`）与人物号（`ai_builder`）可分两个小标题，也可在同一「X / 推特」下用加粗标签区分。

## 语气

- 专业、简洁；避免机翻腔。  
- 不编造 feed 中没有的事实；区分 **事实 / 观点 / 传言**。
