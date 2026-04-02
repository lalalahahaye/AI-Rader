#!/usr/bin/env node
/**
 * Builds feed-investor.json from public APIs (+ optional RSS, X with Bearer token).
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
    includeKeywords: [],
    excludeKeywords: [],
    requireKeywordMatch: false,
    applyToHackerNews: true,
    applyToReddit: true,
    applyToRss: true,
    applyToGithub: false,
    applyToTwitter: true,
  },
  hackerNews: {
    enabled: true,
    scanTopIds: 15,
    maxStories: 8,
    itemTags: ["generative", "us"],
  },
  reddit: {
    enabled: true,
    subreddits: [
      { name: "MachineLearning", limit: 5 },
      { name: "LocalLLaMA", limit: 5 },
    ],
    defaultItemTags: ["ai_social"],
  },
  rss: {
    enabled: false,
    feeds: [],
  },
  github: {
    enabled: true,
    searchQuery:
      'machine learning OR LLM OR diffusion OR "world model" OR gaussian-splatting',
    minStars: 0,
    perPage: 12,
    sort: "updated",
    order: "desc",
    itemTags: ["oss", "generative"],
  },
  xTwitter: {
    enabled: false,
    maxAccountsPerRun: 8,
    aiLeaders: [],
    aiInvestors: [],
  },
  feed: {
    maxTotalItems: 60,
    capsByType: {},
  },
};

const APPLY_FLAG = {
  hn: "applyToHackerNews",
  reddit: "applyToReddit",
  rss: "applyToRss",
  github: "applyToGithub",
  twitter: "applyToTwitter",
};

function mergeSection(def, over) {
  if (!over || typeof over !== "object") return { ...def };
  return { ...def, ...over };
}

async function loadSourcesConfig() {
  try {
    const raw = await fs.readFile(sourcesPath, "utf8");
    const user = JSON.parse(raw);
    return {
      version: user.version ?? BUILTIN_SOURCES.version,
      filter: mergeSection(BUILTIN_SOURCES.filter, user.filter),
      hackerNews: mergeSection(BUILTIN_SOURCES.hackerNews, user.hackerNews),
      reddit: mergeSection(BUILTIN_SOURCES.reddit, user.reddit),
      rss: mergeSection(BUILTIN_SOURCES.rss, user.rss),
      github: mergeSection(BUILTIN_SOURCES.github, user.github),
      xTwitter: mergeSection(BUILTIN_SOURCES.xTwitter, user.xTwitter),
      feed: mergeSection(BUILTIN_SOURCES.feed, user.feed),
    };
  } catch (e) {
    if (e.code === "ENOENT") {
      console.warn(
        "default-sources.json not found — using built-in defaults.",
      );
      return structuredClone(BUILTIN_SOURCES);
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

function passesPevcFilter(item, filter) {
  if (!filter) return true;
  const text = itemTextForFilter(item);
  for (const kw of filter.excludeKeywords || []) {
    if (kw && text.includes(String(kw).toLowerCase())) return false;
  }
  const inc = filter.includeKeywords || [];
  if (filter.requireKeywordMatch && inc.length > 0) {
    const hit = inc.some((kw) => kw && text.includes(String(kw).toLowerCase()));
    if (!hit) return false;
  }
  return true;
}

function filterForSource(item, filter, kind) {
  if (!filter) return true;
  const flag = APPLY_FLAG[kind];
  if (flag && filter[flag] === false) return true;
  return passesPevcFilter(item, filter);
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, ...headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/rss+xml, application/atom+xml, text/xml, */*" },
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

async function rssAll(cfg, filter) {
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
        if (filterForSource(it, filter, "rss")) all.push(it);
      }
    } catch (e) {
      console.warn(`RSS ${f.sourceLabel}:`, e.message);
    }
  }
  return all;
}

async function hnStories(cfg, filter) {
  if (!cfg.enabled) return [];
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
  const flat = chunks.flat();
  return flat.filter((it) => filterForSource(it, filter, "reddit"));
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

async function twitterFetch(cfg, filter) {
  if (!cfg?.enabled) return [];
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) {
    console.warn(
      "xTwitter.enabled but TWITTER_BEARER_TOKEN unset — skipping X (set GitHub Actions secret).",
    );
    return [];
  }
  const headers = { Authorization: `Bearer ${token}` };
  const leaders = (cfg.aiLeaders || []).map((x) => ({
    handle: String(x.handle || "").replace(/^@/, ""),
    maxTweets: Math.min(10, Math.max(1, x.maxTweets ?? 3)),
    role: "leader",
  }));
  const investors = (cfg.aiInvestors || []).map((x) => ({
    handle: String(x.handle || "").replace(/^@/, ""),
    maxTweets: Math.min(10, Math.max(1, x.maxTweets ?? 3)),
    role: "investor",
  }));
  const accounts = [...leaders, ...investors].filter((a) => a.handle);
  const maxRun = Math.max(1, cfg.maxAccountsPerRun ?? 8);
  const slice = accounts.slice(0, maxRun);
  const items = [];

  for (const acc of slice) {
    try {
      const ur = await fetch(
        `https://api.twitter.com/2/users/by/username/${encodeURIComponent(acc.handle)}?user.fields=id,username`,
        { headers },
      );
      if (!ur.ok) {
        console.warn(`Twitter @${acc.handle} user lookup: ${ur.status}`);
        continue;
      }
      const uj = await ur.json();
      const uid = uj.data?.id;
      if (!uid) continue;

      const tr = await fetch(
        `https://api.twitter.com/2/users/${uid}/tweets?max_results=${acc.maxTweets}&tweet.fields=created_at,public_metrics&exclude=retweets,replies`,
        { headers },
      );
      if (!tr.ok) {
        console.warn(`Twitter @${acc.handle} tweets: ${tr.status}`);
        continue;
      }
      const tj = await tr.json();
      const tweets = tj.data || [];
      for (const tw of tweets) {
        const text = (tw.text || "").replace(/\s+/g, " ").trim().slice(0, 280);
        if (!text) continue;
        const roleTag = acc.role === "investor" ? "ai_investor" : "ai_builder";
        const row = {
          id: `tw-${tw.id}`,
          type: "social_en",
          title: text,
          url: `https://twitter.com/${acc.handle}/status/${tw.id}`,
          source: `twitter_${acc.handle}`,
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
      console.warn(`Twitter @${acc.handle}:`, e.message);
    }
  }
  return items;
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

  const [hn, redditItems, rssItems, gh, tw] = await Promise.all([
    hnStories(config.hackerNews, filter).catch((e) => {
      console.warn("HN:", e.message);
      return [];
    }),
    redditAll(config.reddit, filter),
    rssAll(config.rss, filter),
    githubRepos(config.github, filter).catch((e) => {
      console.warn("GitHub:", e.message);
      return [];
    }),
    twitterFetch(config.xTwitter, filter),
  ]);

  let items = mergeDedup([hn, redditItems, rssItems, gh, tw]);
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
