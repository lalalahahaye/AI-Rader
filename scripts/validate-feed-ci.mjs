#!/usr/bin/env node
/**
 * CI validation for feed-investor.json + optional default-sources.json.
 * Strips UTF-8 BOM (common on Windows) before JSON.parse.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function readJsonFile(relPath, required) {
  const full = path.join(root, relPath);
  if (!fs.existsSync(full)) {
    if (required) {
      console.error(`Missing required file: ${relPath}`);
      process.exit(1);
    }
    return null;
  }
  let text = fs.readFileSync(full, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`Invalid JSON in ${relPath}: ${e.message}`);
    process.exit(1);
  }
}

const feedPath = "feed-investor.json";
const feed = readJsonFile(feedPath, true);
for (const k of ["version", "updatedAt", "items"]) {
  if (!(k in feed)) {
    console.error(`feed-investor.json missing top-level key: ${k}`);
    process.exit(1);
  }
}
if (!Array.isArray(feed.items)) {
  console.error("feed-investor.json: items must be an array");
  process.exit(1);
}
console.log(`OK: ${feedPath} (${feed.items.length} items)`);

const ds = readJsonFile("default-sources.json", false);
if (ds) {
  console.log("OK: default-sources.json");
} else {
  console.log("WARN: default-sources.json missing — build-feed.mjs will use built-in defaults");
}
