#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function getAllTags() {
  try {
    return run("git tag --sort=-creatordate")
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getCommitsBetween(from, to) {
  const range = from ? `${from}..${to}` : to;
  try {
    return run(`git log ${range} --pretty=format:%H%x1f%s%x1f%b`)
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

function changelogHasVersion(file, version) {
  if (!fs.existsSync(file)) return false;
  const content = fs.readFileSync(file, "utf8");
  const safe = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^##\\s+${safe}\\b`, "m").test(content);
}

function main() {
  const isPreview = process.env.PREVIEW_MODE === "true";
  const CHANGELOG_FILE = isPreview
    ? "CHANGELOG.preview.md"
    : "CHANGELOG.md";

  const tags = getAllTags();
  const sections = [];

  if (tags.length === 0) {
    const pkgVersion = (() => {
      try {
        const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
        return pkg.version || "0.1.0";
      } catch {
        return "0.1.0";
      }
    })();

    if (!changelogHasVersion(CHANGELOG_FILE, pkgVersion)) {
      const commits = getCommitsBetween(null, "HEAD").map(parseCommit);
      const buckets = categorize(commits);
      sections.push(buildSection(pkgVersion, buckets));
    }
  } else {
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const previous = tags[i + 1] || null;

      if (changelogHasVersion(CHANGELOG_FILE, tag)) continue;

      const commits = getCommitsBetween(previous, tag).map(parseCommit);
      const buckets = categorize(commits);
      sections.push(buildSection(tag, buckets));
    }
  }

  if (!sections.length) {
    console.log("ℹ No new versions to add.");
    return;
  }

  if (isPreview) {
    fs.writeFileSync(CHANGELOG_FILE, sections.join("\n"), "utf8");
  } else {
    const existing = fs.existsSync(CHANGELOG_FILE)
      ? "\n" + fs.readFileSync(CHANGELOG_FILE, "utf8")
      : "";
    fs.writeFileSync(
      CHANGELOG_FILE,
      sections.join("\n") + existing,
      "utf8"
    );
  }

  console.log(
    isPreview ? "CHANGELOG preview generated." : "CHANGELOG updated."
  );
}

main();
