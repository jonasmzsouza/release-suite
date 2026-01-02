#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const run = (cmd, cwd = process.cwd()) => execSync(cmd, { encoding: "utf8", cwd }).trim();

function ensureGhCLI() {
  try {
    run("gh --version");
  } catch {
    throw new Error("GitHub CLI (gh) is required but not installed.");
  }
}

function getDefaultBranch(cwd = process.cwd()) {
  try {
    const out = run("git remote show origin", cwd);
    const m = out.match(/HEAD branch: (\S+)/);
    return (m && m[1]) || "main";
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

export function generateReleaseNotes({ isPreview = process.env.PREVIEW_MODE === "true", cwd = process.cwd() } = {}) {
  if (!isPreview) {
    try {
      ensureGhCLI();
    } catch (err) {
      console.error(`❌ ${err.message}`);
      console.error("❌ GitHub CLI (gh) is required but not installed.");
      console.error("   Install: https://cli.github.com/");
      process.exit(2);
    }
  } else {
    console.log("ℹ Preview mode: GH CLI not required.");
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
  const version = pkg.version;
  const repoURL = normalizeRepoURL(pkg.repository?.url);

  let lastTag = "";
  try {
    lastTag = run("git describe --tags --abbrev=0", cwd);
  } catch {
    console.log("⚠ No previous tags found — first release?");
    lastTag = "";
  }

  console.log("Last tag:", lastTag || "(none)");

  const baseBranch = getDefaultBranch(cwd);

  let prList = [];

  if (!isPreview) {
    let prQuery =
      `gh pr list --state merged --base ${baseBranch} ` +
      `--json number,title,author,url`;

    if (lastTag) prQuery += ` --search "merged:>${lastTag}"`;

    try {
      prList = JSON.parse(run(prQuery, cwd));
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
          `gh pr view ${pr.number} --json commits --jq '.commits[].messageHeadline'`,
          cwd
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

  const target = path.join(cwd, isPreview ? "RELEASE_NOTES.preview.md" : "RELEASE_NOTES.md");
  fs.writeFileSync(target, notes, "utf8");

  console.log(isPreview ? "✔ Generated RELEASE_NOTES.preview.md" : "✔ Generated RELEASE_NOTES.md");
}

function main() {
  const isPreview = process.env.PREVIEW_MODE === "true";
  generateReleaseNotes({ isPreview });
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) main();
