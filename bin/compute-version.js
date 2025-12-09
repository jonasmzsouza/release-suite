#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

const isPreview = process.env.PREVIEW_MODE === "true";

function getPackageVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}

function getLastTag() {
  try {
    const tag = run("git describe --tags --abbrev=0");
    return tag.replace(/^v/, "");
  } catch {
    const pkgVersion = getPackageVersion();
    if (isPreview) {
      console.log(
        `⚠ No previous tag found. Using package.json version (${pkgVersion}) as base.`
      );
    }
    return pkgVersion;
  }
}

function getCommitsSince(version) {
  try {
    // If version came from package.json (no tag), include all commits
    const hasTag = (() => {
      try {
        run("git describe --tags --abbrev=0");
        return true;
      } catch {
        return false;
      }
    })();

    const range = hasTag ? `${version}..HEAD` : "HEAD";

    return run(
      `git log ${range} --pretty=format:%H%x1f%s%x1f%b`
    )
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseCommitLine(line) {
  const [hash, subject = "", body = ""] = line.split("\x1f");
  return { hash, subject, body };
}

function detectType(subject, body) {
  const re =
    /^(:\S+: )?(feat|fix|refactor|docs|chore|style|test|build|perf|ci|raw|cleanup|remove)(\(.+\))?(!)?:/i;

  const m = subject.match(re);
  const isBreaking =
    /BREAKING CHANGE/i.test(body) || (m && m[4] === "!");

  if (isBreaking) return "major";
  if (m) {
    const t = m[2].toLowerCase();
    if (t === "feat") return "minor";
    if (t === "fix") return "patch";
  }
  return "none";
}

function bumpVersion(type, version) {
  const [major, minor, patch] = version
    .split(".")
    .map(n => parseInt(n, 10) || 0);

  if (type === "major") return `${major + 1}.0.0`;
  if (type === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function main() {
  const baseVersion = getLastTag();
  const commits = getCommitsSince(baseVersion).map(parseCommitLine);

  if (!commits.length) process.exit(0);

  let bump = null;

  for (const c of commits) {
    const t = detectType(c.subject, c.body);
    if (t === "major") {
      bump = "major";
      break;
    }
    if (t === "minor" && bump !== "major") bump = "minor";
    if (t === "patch" && !bump) bump = "patch";
  }

  if (!bump) {
    if (isPreview) {
      console.log("Mode: PREVIEW");
      console.log("Base version:", baseVersion);
      console.log("Commits analyzed:", commits.length);
      console.log("No version bump detected.");
    }
    process.exit(0);
  }

  const nextVersion = bumpVersion(bump, baseVersion);

  if (isPreview) {
    console.log("Mode: PREVIEW");
    console.log("Base version:", baseVersion);
    console.log("Commits analyzed:", commits.length);
    console.log("Highest bump detected:", bump);
    console.log("Next version:", nextVersion);
  } else {
    console.log(nextVersion);
  }
}

main();
