#!/usr/bin/env node
/**
 * Fetches public feed-investor.json via GET. No API keys.
 * Usage:
 *   FEED_URL=https://raw.githubusercontent.com/<OWNER>/<REPO>/main/feed-investor.json node fetch-feed.mjs
 *   node fetch-feed.mjs path/to/local/feed-investor.json
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localFeed = path.join(__dirname, "..", "feed-investor.json");

const defaultUrl =
  process.env.FEED_URL ||
  "https://raw.githubusercontent.com/<OWNER>/<REPO>/main/feed-investor.json";

const arg = process.argv[2];

async function main() {
  let text;
  if (arg && (arg.startsWith("http://") || arg.startsWith("https://"))) {
    const res = await fetch(arg);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${arg}`);
    text = await res.text();
  } else if (arg) {
    const fs = await import("node:fs/promises");
    text = await fs.readFile(arg, "utf8");
  } else {
    const fs = await import("node:fs/promises");
    try {
      text = await fs.readFile(localFeed, "utf8");
    } catch {
      const res = await fetch(defaultUrl);
      if (!res.ok)
        throw new Error(
          `HTTP ${res.status} — set FEED_URL, pass a URL/path, or place feed-investor.json next to SKILL.md.`,
        );
      text = await res.text();
    }
  }
  const data = JSON.parse(text);
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});


