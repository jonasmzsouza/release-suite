import fs from "node:fs";
import path from "node:path";

import { categorizeCommits, normalizeCommits } from "../commits.js";
import { computeVersion } from "../compute-version.js";
import { config } from "../config.js";
import { getLastTag, getCommits, parseCommit } from "../git.js";
import {
  hasAnyContent,
  insertReleaseSection,
  normalizeLegacyChangelog,
  renderChangelog
} from "./helpers.js";

/* ===========================
 * Core API (Programmatic)
 * =========================== */

/**
 * Generate a changelog entry for the next release and write it to disk.
 *
 * The function:
 * - Determines whether a release is required via computeVersion({ cwd }).
 * - If no release is required, returns early with generated: false and reason "no-release".
 * - Computes the git range from the last tag to HEAD and parses commits in that range.
 * - If there are no commits (or no categorized content after normalization), returns generated: false and reason "no-commits".
 * - Reads an existing CHANGELOG.md (if present) and normalizes legacy formatting.
 * - If not in dry-run mode and the existing changelog already contains the computed version header, returns generated: false and reason "already-exists".
 * - Otherwise renders a new changelog section and inserts it into the existing content, then writes the result to:
 *     - CHANGELOG.dry-run.md when dryRun === true
 *     - CHANGELOG.md when dryRun === false
 *
 * Side effects:
 * - Reads git metadata via computeVersion, getLastTag, and getCommits.
 * - Reads and writes files under the provided cwd using fs.existsSync, fs.readFileSync and fs.writeFileSync.
 *
 * @param {Object} [options]
 * @param {string} [options.cwd=process.cwd()] - Working directory containing the git repository and CHANGELOG file.
 * @param {boolean} [options.dryRun=false] - When true, write output to CHANGELOG.dry-run.md and do not consider "already exists" as blocking.
 * @returns {{
 *   generated: boolean,
 *   version: string,
 *   commitsAnalyzed: number,
 *   reason?: "no-release" | "no-commits" | "already-exists",
 *   file?: string,
 *   dryRun?: boolean
 * }} Result object describing the outcome:
 *   - generated: true when a changelog was written, false otherwise.
 *   - version: the computed next version (or baseVersion when no release).
 *   - commitsAnalyzed: number of commits analyzed.
 *   - reason: present when generated is false; one of "no-release", "no-commits", "already-exists".
 *   - file: basename of the written file (when generated is true).
 *   - dryRun: echoes the dryRun flag (when generated is true).
 * @throws {Error} May throw errors originating from helper functions (computeVersion, getLastTag, getCommits, renderChangelog, insertReleaseSection) or file system operations.
 * @example
 * // Write actual changelog
 * const result = generateChangelog({ cwd: '/path/to/repo' });
 * if (result.generated) {
 *   console.log(`Wrote ${result.file} for version ${result.version}`);
 * } else {
 *   console.log(`No changelog generated: ${result.reason}`);
 * }
 */
export function generateChangelog({
  cwd = process.cwd(),
  dryRun = false,
} = {}) {
  const compute = computeVersion({ cwd });

  if (!compute.hasRelease) {
    return {
      generated: false,
      reason: "no-release",
      version: compute.baseVersion,
      commitsAnalyzed: compute.commitsAnalyzed,
    };
  }

  const version = `${config.tag.prefix}${compute.nextVersion}`;
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

  const hasContent = hasAnyContent(buckets);

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
    dryRun ? "CHANGELOG.dry-run.md" : "CHANGELOG.md"
  );

  let existing = fs.existsSync(sourcePath)
    ? fs.readFileSync(sourcePath, "utf8")
    : "";

  if (existing) {
    existing = normalizeLegacyChangelog(existing);
  }

  if (!dryRun && existing.includes(`## ${version}`)) {
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
    dryRun,
  };
}
