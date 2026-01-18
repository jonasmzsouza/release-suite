import fs from "node:fs";
import path from "node:path";

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
 * Rendering
 * =========================== */

/**
 * Render a single changelog section for a given version.
 *
 * @param {string} version
 * @param {object} buckets - Categorized commits
 * @returns {string}
 */
export function renderChangelog(version, buckets) {
  const sections = [];

  sections.push(`## ${version}\n`);

  pushSection(sections, "💥 Breaking Changes", buckets.breaking);
  pushSection(sections, "✨ Features", buckets.feat);
  pushSection(sections, "🐛 Fixes", buckets.fix);
  pushSection(sections, "⚡ Performance", buckets.perf);
  pushSection(sections, "♻ Refactors", buckets.refactor);
  pushSection(sections, "📚 Documentation", buckets.docs);
  pushSection(sections, "🧪 Tests", buckets.test);
  pushSection(sections, "🔧 Chores", buckets.chore);
  pushSection(sections, "🤖 CI", buckets.ci);
  pushSection(sections, "📦 Other", buckets.other);

  return sections.join("\n").trim() + "\n";
}

/**
 * Insert a release section before the first existing release (##).
 *
 * Preserves:
 * - Header (# Changelog)
 * - Introductory paragraphs
 * - Full history
 */
export function insertReleaseSection(existing, newSection) {
  if (!existing.trim()) {
    return `# Changelog\n\n${newSection}\n`;
  }

  if (!existing.startsWith("# Changelog")) {
    throw new Error(
      "Invalid CHANGELOG.md format: missing '# Changelog' header"
    );
  }

  const lines = existing.split("\n");
  const firstReleaseIndex = lines.findIndex((l) =>
    l.startsWith("## ")
  );

  // No previous releases → append after header & intro
  if (firstReleaseIndex === -1) {
    return (
      existing.trimEnd() +
      "\n\n" +
      newSection.trim() +
      "\n"
    );
  }

  const before = lines
    .slice(0, firstReleaseIndex)
    .join("\n")
    .trimEnd();

  const after = lines
    .slice(firstReleaseIndex)
    .join("\n")
    .trimStart();

  return (
    before +
    "\n\n" +
    newSection.trim() +
    "\n\n" +
    after
  );
}

export function normalizeLegacyChangelog(existing) {
  const trimmed = existing.trimStart();

  if (trimmed.startsWith("# Changelog")) {
    return existing;
  }

  if (trimmed.startsWith("## ")) {
    return `# Changelog\n\n${existing.trimStart()}`;
  }

  throw new Error(
    "Invalid CHANGELOG.md format: unable to normalize legacy file"
  );
}

/* ===========================
 * Internal helpers
 * =========================== */

function pushSection(target, title, commits = []) {
  if (!commits.length) return;

  target.push(`### ${title}`);
  for (const commit of commits) {
    target.push(`- ${commit.subject}`);
  }
  target.push("");
}
