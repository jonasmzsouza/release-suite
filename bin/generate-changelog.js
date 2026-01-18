#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderChangelog, insertReleaseSection, normalizeLegacyChangelog } from "../lib/changelog.js";
import { normalizeCommits, categorizeCommits } from "../lib/commits.js";
import { computeVersion } from "../lib/compute-version.js";
import { getLastTag, getCommits, parseCommit } from "../lib/git.js";


/* ===========================
 * Core API (Programmatic)
 * =========================== */

/**
 * Generate changelog content and persist it to disk.
 *
 * @returns {object} GenerateChangelogResult
 */
export function generateChangelog({
  cwd = process.cwd(),
  isPreview = false,
} = {}) {
  const versionResult = computeVersion({ cwd });

  if (!versionResult.hasRelease) {
    return {
      generated: false,
      reason: "no-release",
      version: versionResult.baseVersion,
      commitsAnalyzed: versionResult.commitsAnalyzed,
    };
  }

  const version = versionResult.nextVersion;
  const lastTag = getLastTag(cwd);
  const range = lastTag ? `${lastTag}..HEAD` : "HEAD";

  const rawCommits = getCommits(range, cwd).map(parseCommit);

  if (rawCommits.length === 0) {
    return {
      generated: false,
      reason: "no-commits",
      version,
      commitsAnalyzed: 0,
    };
  }

  const commits = normalizeCommits(rawCommits);
  const buckets = categorizeCommits(commits);

  const hasContent = Object.values(buckets).some(
    (list) => list.length > 0
  );

  if (!hasContent) {
    return {
      generated: false,
      reason: "no-commits",
      version,
      commitsAnalyzed: commits.length,
    };
  }

  const sourcePath = path.join(cwd, "CHANGELOG.md");

  const targetPath = path.join(
    cwd,
    isPreview ? "CHANGELOG.preview.md" : "CHANGELOG.md"
  );

  let existing = fs.existsSync(sourcePath)
    ? fs.readFileSync(sourcePath, "utf8")
    : "";

  if (existing) {
    existing = normalizeLegacyChangelog(existing);
  }

  if (existing) {
    existing = normalizeLegacyChangelog(existing);
  }

  if (!isPreview && existing.includes(`## ${version}`)) {
    return {
      generated: false,
      reason: "already-exists",
      version,
      commitsAnalyzed: commits.length,
    };
  }

  const section = renderChangelog(version, buckets);

  const output = insertReleaseSection(existing, section);

  fs.writeFileSync(targetPath, output.trim() + "\n");

  return {
    generated: true,
    version,
    commitsAnalyzed: commits.length,
    file: path.basename(targetPath),
    preview: isPreview,
  };
}

/* ===========================
 * CLI
 * =========================== */

function parseFlags(argv) {
  return {
    preview: argv.includes("--preview"),
    json: argv.includes("--json"),
  };
}

function main() {
  const flags = parseFlags(process.argv.slice(2));
  const result = generateChangelog({ isPreview: flags.preview });

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.generated) {
    console.log(
      `✔ Changelog generated (${result.file}) for version ${result.version}`
    );
  } else {
    console.error(
      `ℹ Changelog not generated (${result.reason}) for version ${result.version}`
    );
  }

  // Exit codes (CONTRACT)
  // 0  -> changelog generated
  // 10 -> no release
  // 11 -> already exists
  // 1  -> unexpected error
  if (result.generated) process.exit(0);
  if (result.reason === "no-release") process.exit(10);
  if (result.reason === "already-exists") process.exit(11);

  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
}
