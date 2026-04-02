#!/usr/bin/env node
/**
 * Builds feed-investor.json from public APIs only (no reader keys).
 * Source list: ../default-sources.json (optional). If missing, uses built-in defaults.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "feed-investor.json");
const sourcesPath = path.join(root, "default-sources.json");

const UA =
  "pevc-ai-radar-feed-builder/1.0 (+https://github.com/pevc-ai-radar/pevc-ai-radar)";

/** Built-in defaults if default-sources.json is absent */
const BUILTIN_SOURCES = {
  version: 1,
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
  github: {
    enabled: true,
    searchQuery:
      'machine learning OR LLM OR diffusion OR "world model" OR gaussian-splatting',
    perPage: 12,
    sort: "updated",
    order: "desc",
    itemTags: ["oss", "generative"],
  },
  feed: {
    maxTotalItems: 45,
  },
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
      hackerNews: mergeSection(BUILTIN_SOURCES.hackerNews, user.hackerNews),
      reddit: mergeSection(BUILTIN_SOURCES.reddit, user.reddit),
      github: mergeSection(BUILTIN_SOURCES.github, user.github),
      feed: mergeSection(BUILTIN_SOURCES.feed, user.feed),
    };
  } catch (e) {
    if (e.code === "ENOENT") {
      console.warn(
        "default-sources.json not found — using built-in defaults (copy default-sources.json from repo to customize).",
      );
      return structuredClone(BUILTIN_SOURCES);
    }
    throw new Error(`default-sources.json: ${e.message}`);
  }
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, ...headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function hnStories(cfg) {
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
    items.push({
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
    });
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

async function redditAll(cfg) {
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
  return chunks.flat();
}

async function githubRepos(cfg) {
  if (!cfg.enabled) return [];
  const headers = { Accept: "application/vnd.github+json" };
  const q = encodeURIComponent(cfg.searchQuery || "machine learning");
  const perPage = Math.min(100, Math.max(1, cfg.perPage ?? 12));
  const sort = cfg.sort || "updated";
  const order = cfg.order || "desc";
  const url = `https://api.github.com/search/repositories?q=${q}&sort=${sort}&order=${order}&per_page=${perPage}`;
  const data = await fetchJson(url, headers);
  const repos = data.items || [];
  const tags =
    Array.isArray(cfg.itemTags) && cfg.itemTags.length
      ? cfg.itemTags
      : ["oss", "generative"];
  return repos.map((r) => ({
    id: `gh-${r.full_name.replaceAll("/", "-")}`,
    type: "oss",
    title: (r.description
      ? `${r.full_name}: ${r.description}`
      : r.full_name
    ).slice(0, 300),
    url: r.html_url,
    source: "github_search",
    publishedAt: r.pushed_at || r.updated_at,
    summaryHint: `stars ${r.stargazers_count}`,
    tags,
  }));
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

async function main() {
  const config = await loadSourcesConfig();
  const maxTotal = Math.max(1, config.feed?.maxTotalItems ?? 45);

  const [hn, redditItems, gh] = await Promise.all([
    hnStories(config.hackerNews).catch((e) => {
      console.warn("HN:", e.message);
      return [];
    }),
    redditAll(config.reddit),
    githubRepos(config.github).catch((e) => {
      console.warn("GitHub:", e.message);
      return [];
    }),
  ]);

  let items = mergeDedup([hn, redditItems, gh]).slice(0, maxTotal);

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
  console.log(
    `Wrote ${items.length} items to feed-investor.json (sources: ${sourcesPath})`,
  );
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
