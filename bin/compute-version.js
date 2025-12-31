#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

function run(cmd, cwd = process.cwd()) {
  return execSync(cmd, { encoding: "utf8", cwd }).trim();
}

export function getPackageVersion(cwd = process.cwd()) {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(`${cwd}/package.json`, "utf8")
    );
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}

function getLastTag(isPreview, cwd = process.cwd()) {
  try {
    const tag = run("git describe --tags --abbrev=0", cwd);
    return tag.replace(/^v/, "");
  } catch {
    const pkgVersion = getPackageVersion(cwd);
    if (isPreview) {
      console.log(
        `⚠ No previous tag found. Using package.json version (${pkgVersion}) as base.`
      );
    }
    return pkgVersion;
  }
}

function getCommitsSince(version, cwd = process.cwd()) {
  try {
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
      `git log ${range} --pretty=format:%H%x1f%s%x1f%b`,
      cwd
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
  const isBreaking = /BREAKING CHANGE/i.test(body) || (m && m[4] === "!");

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
    .map((n) => parseInt(n, 10) || 0);

  if (type === "major") return `${major + 1}.0.0`;
  if (type === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

export function computeVersion({ isPreview = process.env.PREVIEW_MODE === "true", cwd = process.cwd() } = {}) {
  const baseVersion = getLastTag(isPreview, cwd);
  const commits = getCommitsSince(baseVersion, cwd).map(parseCommitLine);

  if (!commits.length) {
    if (isPreview) console.log("ℹ No commits to analyze.");
    return null;
  }

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
    return null;
  }

  const nextVersion = bumpVersion(bump, baseVersion);

  if (isPreview) {
    console.log("Mode: PREVIEW");
    console.log("Base version:", baseVersion);
    console.log("Commits analyzed:", commits.length);
    console.log("Highest bump detected:", bump);
    console.log("Next version:", nextVersion);
  }

  return nextVersion;
}

function main() {
  const isPreview = process.env.PREVIEW_MODE === "true";
  const v = computeVersion({ isPreview });
  if (isPreview) process.exit(0);
  if (!v) process.exit(0);
  console.log(v);
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) main();
