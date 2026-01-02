#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeVersion } from "./compute-version.js";

function run(cmd, cwd = process.cwd()) {
  return execSync(cmd, { encoding: "utf8", cwd }).trim();
}

function getAllTags(cwd = process.cwd()) {
  const sortStrategies = [
    "-version:refname",
    "-v:refname",
    "-refname",
    "-creatordate",
  ];

  for (const sort of sortStrategies) {
    try {
      const tags = run(`git tag --sort=${sort}`, cwd)
        .split("\n")
        .map(tag => tag.trim())
        .filter(Boolean);

      if (tags.length) {
        return tags;
      }
    } catch (err) {
      console.debug(`Sort '${sort}' not supported: ${err.message}`);
    }
  }

  return [];
}

function getCommitsBetween(from, to, cwd = process.cwd()) {
  const range = from ? `${from}..${to}` : to;
  try {
    return run(`git log ${range} --pretty=format:%H%x1f%s%x1f%b`, cwd)
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseCommit(line) {
  const [hash, subject = "", body = ""] = line.split("\x1f");
  return { hash, subject: subject.trim(), body: body.trim() };
}

function cleanSubject(subject) {
  let s = subject.replace(/^(:\S+: )?/, "");
  s = s.replace(
    /^(feat|fix|refactor|docs|chore|style|test|build|perf|ci|raw|cleanup|remove)(\(.+\))?(!)?:\s*/i,
    ""
  );
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function categorize(commits) {
  const buckets = {
    breaking: [],
    feat: [],
    fix: [],
    refactor: [],
    chore: [],
    docs: [],
    style: [],
    test: [],
    build: [],
    perf: [],
    ci: [],
    raw: [],
    cleanup: [],
    remove: [],
  };

  const reType =
    /^(:\S+: )?(feat|fix|refactor|docs|chore|style|test|build|perf|ci|raw|cleanup|remove)(\(.+\))?(!)?:/i;

  for (const c of commits) {
    const { subject, body } = c;

    if (/BREAKING CHANGE/i.test(body) || /!:/i.test(subject)) {
      buckets.breaking.push({ desc: cleanSubject(subject), hash: c.hash });
      continue;
    }

    const match = subject.match(reType);
    const desc = cleanSubject(subject);

    if (!match) {
      buckets.chore.push({ desc: desc || subject, hash: c.hash });
      continue;
    }

    const type = match[2].toLowerCase();
    (buckets[type] || buckets.chore).push({ desc, hash: c.hash });
  }

  return buckets;
}

function buildSection(version, buckets) {
  const out = [];
  out.push(`## ${version}\n`);

  const sections = [
    ["breaking", "### 💥 Breaking Changes"],
    ["feat", "### ✨ Features"],
    ["fix", "### 🐛 Fixes"],
    ["refactor", "### ⚙️ Refactor"],
    ["chore", "### 🔧 Chore"],
    ["docs", "### 📚 Docs"],
    ["style", "### 🎨 Style"],
    ["test", "### 🧪 Tests"],
    ["build", "### 🛠 Build"],
    ["perf", "### ⚡ Performance"],
    ["ci", "### 🔁 CI"],
    ["raw", "### 🗃 Raw"],
    ["cleanup", "### 🧹 Cleanup"],
    ["remove", "### 🗑 Remove"],
  ];

  let hasContent = false;

  for (const [key, title] of sections) {
    if (buckets[key].length) {
      hasContent = true;
      out.push(`${title}\n`);
      for (const c of buckets[key]) out.push(`- ${c.desc}`);
      out.push("");
    }
  }

  if (!hasContent) out.push("_No changes._\n");

  return out.join("\n");
}

function changelogHasVersion(file, version, cwd = process.cwd()) {
  const full = path.join(cwd, file);
  if (!fs.existsSync(full)) return false;
  const content = fs.readFileSync(full, "utf8");
  const safe = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^##\\s+${safe}\\b`, "m").test(content);
}

export function generateChangelog({ isPreview = process.env.PREVIEW_MODE === "true", cwd = process.cwd() } = {}) {
  const CHANGELOG_FILE = isPreview ? "CHANGELOG.preview.md" : "CHANGELOG.md";

  const tags = getAllTags(cwd);
  const sections = [];

  const lastTag = tags[0] || null;
  const obj = computeVersion({ cwd }) || "Unreleased";
  const nextVersion = obj.nextVersion || "Unreleased";

  if (nextVersion === "Unreleased" && isPreview) {
    console.log("ℹ No version bump detected, showing Unreleased section.");
  }

  // Always generate the upcoming version (preview & release)
  if (!changelogHasVersion(CHANGELOG_FILE, nextVersion, cwd)) {
    const commits = getCommitsBetween(lastTag, "HEAD", cwd).map(parseCommit);

    if (commits.length) {
      const buckets = categorize(commits);
      sections.push(buildSection(nextVersion, buckets));
    }
  }

  // keep historical tag-based sections
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const previous = tags[i + 1] || null;

    if (changelogHasVersion(CHANGELOG_FILE, tag, cwd)) continue;

    const commits = getCommitsBetween(previous, tag, cwd).map(parseCommit);
    if (!commits.length) continue;

    const buckets = categorize(commits);
    sections.push(buildSection(tag, buckets));
  }

  if (!sections.length) {
    console.log("ℹ No new versions to add.");
    return;
  }

  const targetPath = path.join(cwd, CHANGELOG_FILE);

  if (isPreview) {
    fs.writeFileSync(targetPath, sections.join("\n"), "utf8");
  } else {
    const existing = fs.existsSync(targetPath) ? "\n" + fs.readFileSync(targetPath, "utf8") : "";
    fs.writeFileSync(targetPath, sections.join("\n") + existing, "utf8");
  }

  console.log(isPreview ? "CHANGELOG preview generated." : "CHANGELOG updated.");
}

function main() {
  const isPreview = process.env.PREVIEW_MODE === "true";
  generateChangelog({ isPreview });
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) main();
