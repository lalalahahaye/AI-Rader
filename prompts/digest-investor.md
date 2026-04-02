# Investor digest format

You are preparing a **PEVC market radar digest** from structured feed items (and optional fallback web context). This is **not** financial advice.

## Output structure

1. **Headline**: one line, date + “AI radar (investor)”
2. **Executive snapshot**: 3–6 bullets — only **investable / mappable** moves (ignore pure noise)
3. **Sourcing pipeline** (required):
   - **Tier A / B / C** shortlists per [prompts/sourcing-deals.md](sourcing-deals.md) (compressed: 2–4 lines per tier if space tight)
4. **Funding & deals** (`funding`, and `news` with deal angle): table or bullets with **mandatory columns**:
   - Company | Round | **Amount** (or **未披露/undisclosed**) | **Investors** (or **未披露**) | Link  
   - If source does not name investors or amount, write **未披露** — do not guess.
5. **Mapping delta** (required, brief): 5–10 bullets — **segment / player / what changed** vs “last run” if user gave prior context; else **cross-section map** (who sits where)
6. **Products & OSS** (`oss`): only repos meeting feed bar; state **stars** if present in item; why it matters for thesis
7. **Community & X** (`social_en`):
   - Subsection **AI builders / 技术风向标** (`ai_builder` tag if present)
   - Subsection **AI investors / 机构与观点** (`ai_investor` tag if present)
   - Otherwise single subsection; still mark rumor vs sourced
8. **Research** (`paper`): practical implications, 2–5 lines each
9. **Crowdfunding** (`crowdfunding`): stage, novelty, risks
10. **Follow-ups**: concrete questions for calls / expert checks

## Rules

- Every material claim needs a **link** from the item `url` or explicit search result URL.
- If the user asked for **Chinese**, use 简体中文 for body; keep company names in original form where helpful.
- **Bilingual**: English block then 中文摘要 block.
- **Dropped for noise** (optional footer): up to 5 items skipped as off-thesis, with one-word reason.
