#!/usr/bin/env node
/**
 * Builds feed-investor.json from public APIs (RSS, HN Algolia, arXiv, Reddit, GitHub, optional X/Kickstarter).
 * Config: ../default-sources.json
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "feed-investor.json");
const sourcesPath = path.join(root, "default-sources.json");

const UA =
  "pevc-ai-radar-feed-builder/1.0 (+https://github.com/pevc-ai-radar/pevc-ai-radar)";

const BUILTIN_SOURCES = {
  version: 1,
  filter: {
    thesis: { orGroups: [] },
    includeKeywords: [],
    excludeKeywords: [],
    requireKeywordMatch: false,
    applyToHackerNews: true,
    applyToReddit: true,
    applyToRss: true,
    applyToGoogleNews: true,
    applyToArxiv: true,
    applyToGithub: true,
    applyToTwitter: true,
    applyToKickstarter: true,
  },
  hackerNews: {
    enabled: true,
    algoliaQueries: [],
    hitsPerQuery: 5,
    firebaseTopStories: false,
    scanTopIds: 15,
    maxStories: 8,
    itemTags: ["generative", "us"],
  },
  googleNews: { enabled: false, feeds: [] },
  arxiv: { enabled: false, queries: [], maxResults: 5 },
  reddit: {
    enabled: true,
    subreddits: [
      { name: "MachineLearning", limit: 5 },
      { name: "LocalLLaMA", limit: 5 },
    ],
    defaultItemTags: ["ai_social"],
  },
  rss: { enabled: false, feeds: [] },
  kickstarter: { enabled: false, discoverUrl: "", maxItems: 8 },
  github: {
    enabled: true,
    searchQuery: "world-model OR nerf OR gaussian-splatting",
    minStars: 0,
    perPage: 12,
    sort: "updated",
    order: "desc",
    itemTags: ["oss", "generative"],
  },
  xTwitter: {
    enabled: false,
    maxAccountsPerRun: 8,
    skipThesisFilter: true,
    apiBase: "",
    aiLeaders: [],
    aiInvestors: [],
  },
  feed: { maxTotalItems: 60, capsByType: {} },
};

const APPLY_FLAG = {
  hn: "applyToHackerNews",
  reddit: "applyToReddit",
  rss: "applyToRss",
  googlenews: "applyToGoogleNews",
  arxiv: "applyToArxiv",
  github: "applyToGithub",
  twitter: "applyToTwitter",
  kickstarter: "applyToKickstarter",
};

function mergeSection(def, over) {
  if (!over || typeof over !== "object") return { ...def };
  return { ...def, ...over };
}

function mergeFilter(def, user) {
  const base = mergeSection(def, user);
  if (user?.thesis || def.thesis) {
    base.thesis = mergeSection(def.thesis || { orGroups: [] }, user?.thesis || {});
  }
  return base;
}

async function loadSourcesConfig() {
  try {
    const raw = await fs.readFile(sourcesPath, "utf8");
    const user = JSON.parse(raw);
    const xTwitter = mergeSection(BUILTIN_SOURCES.xTwitter, user.xTwitter);
    const filter = mergeFilter(BUILTIN_SOURCES.filter, user.filter || {});
    filter.skipThesisForTwitter = xTwitter.skipThesisFilter !== false;
    return {
      version: user.version ?? BUILTIN_SOURCES.version,
      filter,
      hackerNews: mergeSection(BUILTIN_SOURCES.hackerNews, user.hackerNews),
      googleNews: mergeSection(BUILTIN_SOURCES.googleNews, user.googleNews),
      arxiv: mergeSection(BUILTIN_SOURCES.arxiv, user.arxiv),
      reddit: mergeSection(BUILTIN_SOURCES.reddit, user.reddit),
      rss: mergeSection(BUILTIN_SOURCES.rss, user.rss),
      kickstarter: mergeSection(BUILTIN_SOURCES.kickstarter, user.kickstarter),
      github: mergeSection(BUILTIN_SOURCES.github, user.github),
      xTwitter,
      feed: mergeSection(BUILTIN_SOURCES.feed, user.feed),
    };
  } catch (e) {
    if (e.code === "ENOENT") {
      console.warn(
        "default-sources.json not found — using built-in defaults.",
      );
      const c = structuredClone(BUILTIN_SOURCES);
      c.filter.skipThesisForTwitter = c.xTwitter.skipThesisFilter !== false;
      return c;
    }
    throw new Error(`default-sources.json: ${e.message}`);
  }
}

function textVal(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (v["#text"] != null) return String(v["#text"]);
    if (v["@_href"]) return String(v["@_href"]);
  }
  return String(v);
}

function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function itemTextForFilter(item) {
  return [item.title, item.summaryHint || "", ...(item.tags || [])]
    .join(" ")
    .toLowerCase();
}

/**
 * Positive gate: allowlist-first.
 * - If `includeKeywords` is non-empty: item must match **at least one** (substring, case-insensitive). Everything else is noise.
 * - Else if `thesis.orGroups` is non-empty: legacy OR-of-groups match.
 * - Else: pass (no positive gate).
 */
function passesPositiveThesis(item, filter) {
  const text = itemTextForFilter(item);
  const inc = filter.includeKeywords || [];
  if (Array.isArray(inc) && inc.length > 0) {
    return inc.some((kw) => kw && text.includes(String(kw).toLowerCase()));
  }
  const groups = filter.thesis?.orGroups;
  if (Array.isArray(groups) && groups.length > 0) {
    return groups.some(
      (group) =>
        Array.isArray(group) &&
        group.some(
          (kw) => kw && text.includes(String(kw).toLowerCase()),
        ),
    );
  }
  return true;
}

function passesExcludeOnly(item, filter) {
  if (!filter) return true;
  const text = itemTextForFilter(item);
  for (const kw of filter.excludeKeywords || []) {
    if (kw && text.includes(String(kw).toLowerCase())) return false;
  }
  return true;
}

function passesPevcFilter(item, filter) {
  if (!filter) return true;
  const text = itemTextForFilter(item);
  for (const kw of filter.excludeKeywords || []) {
    if (kw && text.includes(String(kw).toLowerCase())) return false;
  }
  return passesPositiveThesis(item, filter);
}

function filterForSource(item, filter, kind) {
  if (!filter) return true;
  const flag = APPLY_FLAG[kind];
  if (flag && filter[flag] === false) return true;
  if (kind === "twitter" && filter.skipThesisForTwitter) {
    return passesExcludeOnly(item, filter);
  }
  return passesPevcFilter(item, filter);
}

/** RSS / Google News only: if title+summary looks like a funding item, set type funding and copy verbatim round/amount snippets when regex matches. Never invent investors. */
const FUNDING_SIGNAL_RES = [
  /\bseries\s+[a-z]\b/i,
  /\b(pre-)?seed\b/i,
  /\braised\b/i,
  /\bfunding\s+round\b/i,
  /\bcloses?\s+\$[\d.,]/i,
  /融资/,
  /领投/,
  /跟投/,
  /战略投资/,
  /完成.{0,12}轮/,
  /获.{0,20}投资/,
  /亿元|千万|百万|万美元/,
];

function applyFundingHeuristic(item) {
  if (item.type !== "news" && item.type !== "funding") return item;
  const blob = `${item.title} ${item.summaryHint || ""}`;
  const hit = FUNDING_SIGNAL_RES.some((re) => re.test(blob));
  if (!hit) return item;
  const out = {
    ...item,
    type: "funding",
    tags: Array.from(new Set([...(item.tags || []), "deal_signal"])),
  };
  const roundM = blob.match(
    /\b(?:Series\s+[A-Z]|Pre-[A-Z]|Seed|Pre-Seed)\b|(?:天使|种子|战略)轮|[ABCDE]轮融资?/i,
  );
  if (roundM) out.round = roundM[0].trim();
  const usd = blob.match(/\$\s*[\d.,]+\s*[MmBbKk](?:illion)?/i);
  if (usd) out.amount = usd[0].replace(/\s+/g, " ").trim();
  else {
    const cny = blob.match(/[\d.,]+\s*(?:亿|千万|百万|万)元?/);
    if (cny) out.amount = cny[0].replace(/\s+/g, "").trim();
  }
  return out;
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, ...headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function fetchText(url, accept) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept:
        accept ||
        "application/rss+xml, application/atom+xml, text/xml, application/xml, */*",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

function idHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  htmlEntities: true,
});

function parseRssItems(xml, feedMeta) {
  const j = xmlParser.parse(xml);
  const out = [];
  if (j.rss?.channel) {
    let items = j.rss.channel.item;
    if (!items) return out;
    if (!Array.isArray(items)) items = [items];
    for (const it of items) {
      const title = stripTags(textVal(it.title)).slice(0, 300);
      let link = textVal(it.link);
      if (!link && it.guid) link = textVal(it.guid);
      const pub = it.pubDate || it["dc:date"] || new Date().toISOString();
      const desc = stripTags(textVal(it.description || it["content:encoded"])).slice(
        0,
        400,
      );
      if (!title || !link) continue;
      out.push({
        id: `rss-${feedMeta.sourceLabel}-${idHash(link)}`,
        type: feedMeta.mapToType === "funding" ? "funding" : "news",
        title,
        url: link.startsWith("http") ? link : `https:${link}`,
        source: feedMeta.sourceLabel,
        publishedAt: new Date(pub).toISOString(),
        summaryHint: desc || undefined,
        tags: Array.isArray(feedMeta.itemTags) ? [...feedMeta.itemTags] : [],
      });
    }
    return out;
  }
  if (j.feed?.entry) {
    let entries = j.feed.entry;
    if (!Array.isArray(entries)) entries = [entries];
    for (const e of entries) {
      const title = stripTags(textVal(e.title)).slice(0, 300);
      let link = "";
      const L = e.link;
      if (typeof L === "string") link = L;
      else if (L?.["@_href"]) link = L["@_href"];
      else if (Array.isArray(L)) link = L[0]?.["@_href"] || L[0];
      if (!link && e.id) link = stripTags(textVal(e.id));
      const pub = e.published || e.updated || new Date().toISOString();
      const desc = stripTags(textVal(e.summary || e.content)).slice(0, 400);
      if (!title || !link) continue;
      out.push({
        id: `atom-${feedMeta.sourceLabel}-${idHash(link)}`,
        type: feedMeta.mapToType === "funding" ? "funding" : "news",
        title,
        url: link,
        source: feedMeta.sourceLabel,
        publishedAt: new Date(pub).toISOString(),
        summaryHint: desc || undefined,
        tags: Array.isArray(feedMeta.itemTags) ? [...feedMeta.itemTags] : [],
      });
    }
  }
  return out;
}

async function rssFeedsBlock(cfg, filter, kind) {
  if (!cfg.enabled) return [];
  const feeds = Array.isArray(cfg.feeds) ? cfg.feeds : [];
  const all = [];
  for (const f of feeds) {
    if (!f?.url || !f.sourceLabel) continue;
    const maxItems = Math.max(1, f.maxItems ?? 8);
    const mapToType = f.mapToType === "funding" ? "funding" : "news";
    try {
      const xml = await fetchText(f.url);
      const items = parseRssItems(xml, {
        sourceLabel: f.sourceLabel,
        mapToType,
        itemTags: f.itemTags,
      }).slice(0, maxItems);
      for (const it of items) {
        if (!filterForSource(it, filter, kind)) continue;
        all.push(
          kind === "rss" || kind === "googlenews"
            ? applyFundingHeuristic(it)
            : it,
        );
      }
    } catch (e) {
      console.warn(`RSS ${f.sourceLabel}:`, e.message);
    }
  }
  return all;
}

async function hnFirebaseTop(cfg, filter) {
  if (!cfg.enabled || !cfg.firebaseTopStories) return [];
  const scan = Math.max(1, cfg.scanTopIds ?? 15);
  const maxStories = Math.max(1, cfg.maxStories ?? 8);
  const tags = Array.isArray(cfg.itemTags) ? cfg.itemTags : ["generative", "us"];

  const ids = await fetchJson(
    "https://hacker-news.firebaseio.com/v0/topstories.json",
  );
  const items = [];
  for (const id of ids.slice(0, scan)) {
    const it = await fetchJson(
      `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
    );
    if (!it || it.type !== "story" || !it.url) continue;
    const row = {
      id: `hn-${id}`,
      type: "news",
      title: it.title,
      url: it.url,
      source: "hacker_news",
      publishedAt: it.time
        ? new Date(it.time * 1000).toISOString()
        : new Date().toISOString(),
      summaryHint:
        it.score != null
          ? `HN score ${it.score}, ${it.descendants ?? 0} comments`
          : undefined,
      tags,
    };
    if (filterForSource(row, filter, "hn")) items.push(row);
    if (items.length >= maxStories) break;
  }
  return items;
}

async function hnAlgolia(cfg, filter) {
  if (!cfg.enabled) return [];
  const queries = Array.isArray(cfg.algoliaQueries) ? cfg.algoliaQueries : [];
  if (queries.length === 0) return [];
  const perQ = Math.max(1, cfg.hitsPerQuery ?? 5);
  const items = [];
  const seenUrl = new Set();

  for (const q of queries) {
    if (!q || !String(q).trim()) continue;
    const url = `https://hn.algolia.com/api/v1/search?tags=story&query=${encodeURIComponent(String(q).trim())}&hitsPerPage=${perQ}`;
    try {
      const data = await fetchJson(url);
      for (const hit of data.hits || []) {
        const storyUrl =
          hit.url ||
          (hit.objectID
            ? `https://news.ycombinator.com/item?id=${hit.objectID}`
            : null);
        if (!hit.title || !storyUrl) continue;
        const dedupe = storyUrl;
        if (seenUrl.has(dedupe)) continue;
        seenUrl.add(dedupe);
        const ts =
          hit.created_at_i != null
            ? new Date(Number(hit.created_at_i) * 1000)
            : hit.created_at
              ? new Date(hit.created_at)
              : new Date();
        const row = {
          id: `hn-alg-${hit.objectID || idHash(dedupe)}`,
          type: "news",
          title: stripTags(String(hit.title)).slice(0, 300),
          url: storyUrl,
          source: "hacker_news_algolia",
          publishedAt: Number.isNaN(ts.getTime())
            ? new Date().toISOString()
            : ts.toISOString(),
          summaryHint:
            hit.points != null ? `HN points ${hit.points}` : undefined,
          tags: Array.isArray(cfg.itemTags) ? [...cfg.itemTags] : ["generative"],
        };
        if (filterForSource(row, filter, "hn")) items.push(row);
      }
    } catch (e) {
      console.warn(`HN Algolia "${q}":`, e.message);
    }
  }
  return items;
}

async function hnFetchAll(cfg, filter) {
  if (!cfg.enabled) return [];
  const algoliaItems = await hnAlgolia(cfg, filter);
  const topItems = await hnFirebaseTop(cfg, filter);
  return [...algoliaItems, ...topItems];
}

async function arxivFetch(cfg, filter) {
  if (!cfg.enabled) return [];
  const queries = Array.isArray(cfg.queries) ? cfg.queries : [];
  const maxR = Math.min(50, Math.max(1, cfg.maxResults ?? 5));
  const items = [];
  const seen = new Set();

  for (const q of queries) {
    const sq = q?.searchQuery;
    if (!sq) continue;
    const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(sq)}&start=0&max_results=${maxR}&sortBy=submittedDate&sortOrder=descending`;
    try {
      const xml = await fetchText(url);
      const parsed = parseRssItems(xml, {
        sourceLabel: `arxiv_${idHash(sq).slice(0, 8)}`,
        mapToType: "news",
        itemTags: ["paper", ...(Array.isArray(q.itemTags) ? q.itemTags : [])],
      });
      for (const it of parsed) {
        const row = { ...it, type: "paper", source: "arxiv" };
        row.id = `arxiv-${idHash(row.url)}`;
        if (seen.has(row.url)) continue;
        seen.add(row.url);
        if (filterForSource(row, filter, "arxiv")) items.push(row);
      }
    } catch (e) {
      console.warn(`arXiv "${sq}":`, e.message);
    }
  }
  return items;
}

async function redditSub(sub, limit, defaultTags) {
  const url = `https://www.reddit.com/r/${sub}/hot.json?limit=${limit + 2}`;
  const data = await fetchJson(url);
  const children = data?.data?.children || [];
  const tags =
    Array.isArray(defaultTags) && defaultTags.length ? defaultTags : ["ai_social"];
  return children
    .map((c) => c.data)
    .filter((d) => d && !d.stickied && d.title)
    .slice(0, limit)
    .map((d) => ({
      id: `reddit-${d.id}`,
      type: "social_en",
      title: d.title.slice(0, 300),
      url: `https://www.reddit.com${d.permalink}`,
      source: `reddit_r_${sub}`,
      publishedAt: d.created_utc
        ? new Date(d.created_utc * 1000).toISOString()
        : new Date().toISOString(),
      summaryHint: d.selftext?.slice(0, 240) || undefined,
      tags,
    }));
}

async function redditAll(cfg, filter) {
  if (!cfg.enabled) return [];
  const subs = Array.isArray(cfg.subreddits) ? cfg.subreddits : [];
  const defaultTags = cfg.defaultItemTags ?? ["ai_social"];
  const tasks = subs
    .filter((s) => s && s.name)
    .map((s) =>
      redditSub(String(s.name).replace(/^r\//, ""), Math.max(1, s.limit ?? 5), defaultTags).catch(
        (e) => {
          console.warn(`Reddit r/${s.name}:`, e.message);
          return [];
        },
      ),
    );
  const chunks = await Promise.all(tasks);
  return chunks.flat().filter((it) => filterForSource(it, filter, "reddit"));
}

async function githubRepos(cfg, filter) {
  if (!cfg.enabled) return [];
  const headers = { Accept: "application/vnd.github+json" };
  let q = cfg.searchQuery || "machine learning";
  const minStars = Math.max(0, cfg.minStars ?? 0);
  if (minStars > 0) q = `${q} stars:>${minStars}`;
  const qEnc = encodeURIComponent(q);
  const perPage = Math.min(100, Math.max(1, cfg.perPage ?? 12));
  const sort = cfg.sort || "updated";
  const order = cfg.order || "desc";
  const url = `https://api.github.com/search/repositories?q=${qEnc}&sort=${sort}&order=${order}&per_page=${perPage}`;
  const data = await fetchJson(url, headers);
  const repos = data.items || [];
  const tags =
    Array.isArray(cfg.itemTags) && cfg.itemTags.length
      ? cfg.itemTags
      : ["oss", "generative"];
  const out = [];
  for (const r of repos) {
    const stars = r.stargazers_count ?? 0;
    if (minStars > 0 && stars < minStars) continue;
    const row = {
      id: `gh-${r.full_name.replaceAll("/", "-")}`,
      type: "oss",
      title: (r.description
        ? `${r.full_name}: ${r.description}`
        : r.full_name
      ).slice(0, 300),
      url: r.html_url,
      source: "github_search",
      publishedAt: r.pushed_at || r.updated_at,
      summaryHint: `stars ${stars}`,
      tags,
      stars,
    };
    if (filterForSource(row, filter, "github")) out.push(row);
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const X_USER_BATCH = 100;
const X_TIMELINE_MIN_RESULTS = 5;

async function twitterResolveUsers(apiBase, headers, handles) {
  const map = new Map();
  for (let i = 0; i < handles.length; i += X_USER_BATCH) {
    const chunk = handles.slice(i, i + X_USER_BATCH);
    const q = chunk.map((h) => h.trim()).join(",");
    const url = `${apiBase}/users/by?usernames=${encodeURIComponent(q)}&user.fields=id,username,name`;
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.warn(`X users/by batch ${i}: HTTP ${res.status}`);
        continue;
      }
      const j = await res.json();
      for (const u of j.data || []) {
        const un = (u.username || "").toLowerCase();
        if (un)
          map.set(un, {
            id: u.id,
            username: u.username,
            name: u.name || u.username,
          });
      }
      if (j.errors?.length) {
        for (const er of j.errors) {
          console.warn("X users/by:", er.detail || er.title || er);
        }
      }
    } catch (e) {
      console.warn(`X users/by batch ${i}:`, e.message);
    }
    await sleep(400);
  }
  return map;
}

async function twitterFetch(cfg, filter) {
  if (!cfg?.enabled) return [];
  const token =
    process.env.TWITTER_BEARER_TOKEN || process.env.X_BEARER_TOKEN;
  if (!token) {
    console.warn(
      "xTwitter.enabled but TWITTER_BEARER_TOKEN / X_BEARER_TOKEN unset — skipping X (set GitHub Actions secret).",
    );
    return [];
  }
  const apiBase = String(cfg.apiBase || "").replace(/\/$/, "") ||
    "https://api.twitter.com/2";
  const headers = { Authorization: `Bearer ${token}` };
  const leaders = (cfg.aiLeaders || []).map((x) => ({
    handle: String(x.handle || "").replace(/^@/, "").toLowerCase(),
    maxTweets: Math.min(10, Math.max(1, x.maxTweets ?? 3)),
    role: "leader",
  }));
  const investors = (cfg.aiInvestors || []).map((x) => ({
    handle: String(x.handle || "").replace(/^@/, "").toLowerCase(),
    maxTweets: Math.min(10, Math.max(1, x.maxTweets ?? 3)),
    role: "investor",
  }));
  const accounts = [...leaders, ...investors].filter((a) => a.handle);
  const maxRun = Math.max(1, cfg.maxAccountsPerRun ?? 8);
  const slice = accounts.slice(0, maxRun);
  const uniqueHandles = [...new Set(slice.map((a) => a.handle))];
  const userMap = await twitterResolveUsers(apiBase, headers, uniqueHandles);
  const items = [];

  for (const acc of slice) {
    try {
      const meta = userMap.get(acc.handle);
      if (!meta?.id) {
        console.warn(`X @${acc.handle}: user not found in batch lookup`);
        continue;
      }
      const maxResults = Math.min(
        100,
        Math.max(X_TIMELINE_MIN_RESULTS, acc.maxTweets),
      );
      const tr = await fetch(
        `${apiBase}/users/${meta.id}/tweets?max_results=${maxResults}&tweet.fields=created_at,public_metrics&exclude=retweets,replies`,
        { headers },
      );
      if (!tr.ok) {
        console.warn(`X @${acc.handle} tweets: HTTP ${tr.status}`);
        continue;
      }
      const tj = await tr.json();
      const tweets = (tj.data || []).slice(0, acc.maxTweets);
      const displayUser = meta.username || acc.handle;
      for (const tw of tweets) {
        const text = (tw.text || "").replace(/\s+/g, " ").trim().slice(0, 280);
        if (!text) continue;
        const roleTag = acc.role === "investor" ? "ai_investor" : "ai_builder";
        const row = {
          id: `tw-${tw.id}`,
          type: "social_en",
          title: text,
          url: `https://x.com/${displayUser}/status/${tw.id}`,
          source: `twitter_${displayUser}`,
          authorHandle: displayUser,
          authorName: meta.name,
          publishedAt: tw.created_at || new Date().toISOString(),
          summaryHint: tw.public_metrics
            ? `likes ${tw.public_metrics.like_count ?? 0}`
            : undefined,
          tags: ["ai_social", roleTag],
        };
        if (filterForSource(row, filter, "twitter")) items.push(row);
      }
      await sleep(900);
    } catch (e) {
      console.warn(`X @${acc.handle}:`, e.message);
    }
  }
  return items;
}

async function kickstarterFetch(cfg, filter) {
  if (!cfg?.enabled) return [];
  const discoverUrl =
    cfg.discoverUrl ||
    "https://www.kickstarter.com/discover/advanced?sort=newest&term=AI%20game";
  const maxItems = Math.max(1, cfg.maxItems ?? 8);
  try {
    const res = await fetch(discoverUrl, {
      headers: { "User-Agent": UA, Accept: "text/html" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const urls = new Set();
    const re =
      /href="(https:\/\/www\.kickstarter\.com\/projects\/[^"?]+)"/gi;
    let m;
    while ((m = re.exec(html)) !== null && urls.size < maxItems * 3) {
      urls.add(m[1].split("?")[0]);
    }
    const items = [];
    let i = 0;
    for (const u of urls) {
      if (i >= maxItems) break;
      const parts = u.split("/").filter(Boolean);
      const titleGuess =
        parts.length >= 4 ? decodeURIComponent(parts[3].replace(/-/g, " ")) : "Kickstarter project";
      const row = {
        id: `ks-${idHash(u)}`,
        type: "crowdfunding",
        title: titleGuess.slice(0, 200),
        url: u,
        source: "kickstarter_discover",
        publishedAt: new Date().toISOString(),
        summaryHint: "From public discover page; verify on site.",
        tags: ["crowdfunding"],
      };
      if (filterForSource(row, filter, "kickstarter")) {
        items.push(row);
        i++;
      }
    }
    return items;
  } catch (e) {
    console.warn("Kickstarter:", e.message);
    return [];
  }
}

function mergeDedup(groups) {
  const seen = new Set();
  const out = [];
  for (const group of groups) {
    for (const item of group) {
      const key = item.url || item.id;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function applyCapsAndLimit(items, feedCfg) {
  const maxTotal = Math.max(1, feedCfg.maxTotalItems ?? 60);
  const caps = feedCfg.capsByType || {};
  const typeOrder = [
    "funding",
    "news",
    "oss",
    "social_en",
    "paper",
    "crowdfunding",
    "social_cn",
  ];
  const byType = {};
  for (const it of items) {
    const t = it.type || "news";
    if (!byType[t]) byType[t] = [];
    byType[t].push(it);
  }
  for (const t of Object.keys(byType)) {
    byType[t].sort(
      (a, b) =>
        new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0),
    );
  }
  const pickedIds = new Set();
  const result = [];
  for (const t of typeOrder) {
    const cap = caps[t] !== undefined ? Math.max(0, caps[t]) : 99999;
    const list = byType[t] || [];
    let taken = 0;
    for (const it of list) {
      if (result.length >= maxTotal) break;
      if (taken >= cap) break;
      if (pickedIds.has(it.id)) continue;
      pickedIds.add(it.id);
      result.push(it);
      taken++;
    }
  }
  for (const t of Object.keys(byType)) {
    if (typeOrder.includes(t)) continue;
    const list = byType[t] || [];
    for (const it of list) {
      if (result.length >= maxTotal) break;
      if (pickedIds.has(it.id)) continue;
      pickedIds.add(it.id);
      result.push(it);
    }
  }
  if (result.length < maxTotal) {
    const rest = items
      .filter((it) => !pickedIds.has(it.id))
      .sort(
        (a, b) =>
          new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0),
      );
    for (const it of rest) {
      if (result.length >= maxTotal) break;
      pickedIds.add(it.id);
      result.push(it);
    }
  }
  return result.slice(0, maxTotal);
}

async function main() {
  const config = await loadSourcesConfig();
  const filter = config.filter;

  const [
    hnItems,
    redditItems,
    rssItems,
    gnItems,
    arxivItems,
    gh,
    tw,
    ksItems,
  ] = await Promise.all([
    hnFetchAll(config.hackerNews, filter).catch((e) => {
      console.warn("HN:", e.message);
      return [];
    }),
    redditAll(config.reddit, filter),
    rssFeedsBlock(config.rss, filter, "rss"),
    rssFeedsBlock(config.googleNews, filter, "googlenews"),
    arxivFetch(config.arxiv, filter).catch((e) => {
      console.warn("arXiv:", e.message);
      return [];
    }),
    githubRepos(config.github, filter).catch((e) => {
      console.warn("GitHub:", e.message);
      return [];
    }),
    twitterFetch(config.xTwitter, filter),
    kickstarterFetch(config.kickstarter, filter),
  ]);

  let items = mergeDedup([
    hnItems,
    redditItems,
    rssItems,
    gnItems,
    arxivItems,
    gh,
    tw,
    ksItems,
  ]);
  items.sort(
    (a, b) =>
      new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0),
  );
  items = applyCapsAndLimit(items, config.feed);

  if (items.length === 0) {
    items = [
      {
        id: "build-empty-fallback",
        type: "news",
        title: "Feed builder returned no items (check network or API limits)",
        url: "https://github.com/",
        source: "build_feed_fallback",
        publishedAt: new Date().toISOString(),
        summaryHint: "Re-run workflow or inspect Actions logs.",
        tags: [],
      },
    ];
  }

  const feed = {
    version: 1,
    updatedAt: new Date().toISOString(),
    items,
  };

  await fs.writeFile(outPath, JSON.stringify(feed, null, 2) + "\n", "utf8");
  console.log(`Wrote ${items.length} items to feed-investor.json`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
