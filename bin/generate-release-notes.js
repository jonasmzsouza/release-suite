#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";

const run = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();

const isPreview = process.env.PREVIEW_MODE === "true";
const RELEASE_NOTES_FILE = isPreview
  ? "RELEASE_NOTES.preview.md"
  : "RELEASE_NOTES.md";

function ensureGhCLI() {
  try {
    run("gh --version");
  } catch {
    console.error("❌ GitHub CLI (gh) is required but not installed.");
    console.error("   Install: https://cli.github.com/");
    process.exit(2);
  }
}

function getDefaultBranch() {
  try {
    return run("git remote show origin | sed -n 's/.*HEAD branch: //p'");
  } catch {
    return "main";
  }
}

function normalizeRepoURL(url) {
  if (!url) return null;
  url = url.replace(/\.git$/, "");
  if (url.startsWith("git@")) {
    const m = url.match(/^git@(.*?):(.*)$/);
    if (m) return `https://${m[1]}/${m[2]}`;
  }
  return url;
}

if (!isPreview) {
  ensureGhCLI();
} else {
  console.log("ℹ Preview mode: GH CLI not required.");
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const version = pkg.version;
const repoURL = normalizeRepoURL(pkg.repository?.url);

let lastTag = "";
try {
  lastTag = run("git describe --tags --abbrev=0");
} catch {
  console.log("⚠ No previous tags found — first release?");
  lastTag = "";
}

console.log("Last tag:", lastTag || "(none)");

const baseBranch = getDefaultBranch();

let prList = [];

if (!isPreview) {
  let prQuery =
    `gh pr list --state merged --base ${baseBranch} ` +
    `--json number,title,author,url`;

  if (lastTag) prQuery += ` --search "merged:>${lastTag}"`;

  try {
    prList = JSON.parse(run(prQuery));
  } catch {
    prList = [];
  }
}

let notes = `# What's Changed\n\n`;

if (!prList.length) {
  notes += "_No changes since last release._\n\n";
}

for (const pr of prList) {
  notes += `- ${pr.title} by @${pr.author.login} in ${pr.url}\n`;

  let messages = [];
  if (!isPreview) {
    try {
      messages = run(
        `gh pr view ${pr.number} --json commits --jq '.commits[].messageHeadline'`
      )
        .split("\n")
        .filter(Boolean);
    } catch (err) {
      console.error(`⚠ Could not fetch commits for PR #${pr.number}: ${err && err.message ? err.message : err}`);
    }
  }

  for (const msg of messages) {
    notes += `  - ${msg}\n`;
  }

  notes += "\n";
}

const compareLink = repoURL
  ? lastTag
    ? `${repoURL}/compare/${lastTag}...${version}`
    : repoURL
  : "";

if (compareLink) {
  notes += `**Full Changelog**: ${compareLink}\n`;
}

fs.writeFileSync(RELEASE_NOTES_FILE, notes, "utf8");

console.log(
  isPreview
    ? "✔ Generated RELEASE_NOTES.preview.md"
    : "✔ Generated RELEASE_NOTES.md"
);
