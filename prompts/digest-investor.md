# Investor digest format

You are preparing a **PEVC market radar digest** from structured feed items (and optional web context after fetch). This is **not** financial advice.

**Thesis scope (strict)**: Use **`filter.includeKeywords`** as ground truth for relevance. Off-thesis items → **Dropped** (one-word reason). Feed is pre-filtered in CI; still drop obvious mismatches.

---

## Density (mandatory — no fluff)

- **No** long scene-setting paragraphs, **no** repeated definitions of “world model” or the thesis, **no** “本期我们将…” meta text.
- Prefer **tables + bullets**; each bullet **one line**, facts only; **no** filler transitions (“此外值得注意的是”).
- If the user uses **Chinese**, keep the same density: 简体，短句，数据优先.

---

## Full source coverage (mandatory)

After loading `items`:

1. Build the set of unique **`source`** values (e.g. `36kr`, `jiqizhixin`, `qbitai`, `techcrunch_ai`, `github_search`, `hacker_news_algolia`, `reddit_r_*`, `twitter_*`, `arxiv`, `google_news_*`, …).
2. **Do not** summarize only a random subset. Walk **all** items in the feed (subject to reasonable output length): group mentally by `source` and `type`, then allocate space so **every `source` that has at least one item** appears at least once (e.g. one dense line, or one table row, or one bullet with `source` tag). If a source has many items, cover **top by `publishedAt`** until space runs out, then say `…共 N 条，此处列最近 K 条` for that source.
3. **Never** silently skip entire buckets (e.g. all Reddit or all CN RSS). If a bucket is empty in JSON, one line: `reddit：本窗口无条目`.

---

## Output structure (order is mandatory)

### 1. Headline

One line: date + title (e.g. `AI 创投雷达 — YYYY-MM-DD`).

### 2. 近期投融资与交易（最高优先级 · 高密度）

- Include **every** `type: funding` and **news** items that are clearly financings / M&A / strategic investment (use `deal_signal` when present).
- **Per event** (table row **or** tight bullet block), **all** of the following when known from feed or **enriched** pages (no fabrication):
  - **公司/项目**
  - **做什么**（核心亮点 2–4 个短语：赛道、产品、差异化，来自 title/summary/打开的页面）
  - **轮次** | **金额** | **领投/跟投/投资方**
  - **链接**（`url`）
- Unknown → **未披露**. Enrich from public pages when the workflow allows (see SKILL).

### 3. 技术进展（第二块：GitHub / 论文 / 技术向信源）

- **`oss`**: **each** repo — `full_name` 或 title、**stars**、**一句话技术点**（从 description/title）、**thesis 相关性** 半句、**链接**. Do not skip repos to save space without stating truncation.
- **`paper`**: up to **6** lines total (not 6 papers × long text) — only thesis-tied arXiv items; **标题 + 一句贡献 + 链接** each.
- **`news` / HN** 中非纯融资、偏技术/产品的条目：在此节用 **短 bullet** 汇总（带 `source`），避免只在融资表出现一次就丢。
- **`social_en`** 里偏技术/builder 的（`ai_builder`）：可 **最多 3–5 条** 极短技术信号，附链接；机构号观点不放这里（放下一节或压缩）。

### 4. Sourcing 分层（压缩）

Tier A / B / C per [sourcing-deals.md](sourcing-deals.md) — **每 tier 最多 3–6 行**，每行 **一行一事 + 链接**，无展开废话。

### 5. Mapping 增量（压缩）

**5–8 bullets**，每 bullet **一行**：segment / player / what changed。无开场段。

### 6. 执行摘要（可选 · 极短）

**0–3 bullets**；若与 Mapping 重复则 **省略本节**。

### 7. 社媒与 X（压缩）

- `social_en` / `social_cn`：分 builder / investor 若有 tags；**每条 2–4 句当量** 或改用 [digest-layout-builders-zh.md](digest-layout-builders-zh.md) 的 X 样式（中文用户）。
- 必须 **带链接**；标注 fact / opinion / rumor。

### 8. 众筹

若有 `crowdfunding`：每项目 **一行**。

### 9. Follow-ups

**3–5** 条可执行下一步（核实、约访、二次源）。

### 10. Dropped

最多 **8** 条 off-thesis，**一词原因**。

---

## Rules

- Every material claim needs a **link** from `item.url` or an explicit URL from enrichment.
- **Chinese**: 简体；公司名保留原文；X 区块遵守 [digest-layout-builders-zh.md](digest-layout-builders-zh.md) + [summarize-x-builders-zh.md](summarize-x-builders-zh.md).
- **Bilingual** when requested: English block then 中文摘要（同样高密度）.
