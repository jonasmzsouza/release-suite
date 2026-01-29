import fs from "node:fs";
import path from "node:path";

import { normalizeCommits, categorizeCommits } from "../lib/commits.js";
import { computeVersion } from "../lib/compute-version.js";
import { getLastTag, getCommits, parseCommit } from "../lib/git.js";

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
 * - If not in preview mode and the existing changelog already contains the computed version header, returns generated: false and reason "already-exists".
 * - Otherwise renders a new changelog section and inserts it into the existing content, then writes the result to:
 *     - CHANGELOG.preview.md when isPreview === true
 *     - CHANGELOG.md when isPreview === false
 *
 * Side effects:
 * - Reads git metadata via computeVersion, getLastTag, and getCommits.
 * - Reads and writes files under the provided cwd using fs.existsSync, fs.readFileSync and fs.writeFileSync.
 *
 * @param {Object} [options]
 * @param {string} [options.cwd=process.cwd()] - Working directory containing the git repository and CHANGELOG file.
 * @param {boolean} [options.isPreview=false] - When true, write output to CHANGELOG.preview.md and do not consider "already exists" as blocking.
 * @returns {{
 *   generated: boolean,
 *   version: string,
 *   commitsAnalyzed: number,
 *   reason?: "no-release" | "no-commits" | "already-exists",
 *   file?: string,
 *   preview?: boolean
 * }} Result object describing the outcome:
 *   - generated: true when a changelog was written, false otherwise.
 *   - version: the computed next version (or baseVersion when no release).
 *   - commitsAnalyzed: number of commits analyzed.
 *   - reason: present when generated is false; one of "no-release", "no-commits", "already-exists".
 *   - file: basename of the written file (when generated is true).
 *   - preview: echoes the isPreview flag (when generated is true).
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
  isPreview = false,
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

  const version = compute.nextVersion;
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
 * Render a markdown changelog for a given version from categorized "buckets" of changes.
 *
 * The function builds a sections array, inserts a version heading, and appends
 * predefined sections (breaking, features, fixes, etc.) by delegating to
 * pushSection for each bucket. The final string is the joined sections,
 * trimmed and guaranteed to end with a single newline.
 *
 * @param {string} version - Version label to use as the top-level heading (e.g. "v1.2.3").
 * @param {Object} buckets - Map of category keys to arrays of change entries.
 * @param {(Array<string|Object>)} [buckets.breaking] - Breaking changes.
 * @param {(Array<string|Object>)} [buckets.feat] - New features.
 * @param {(Array<string|Object>)} [buckets.fix] - Bug fixes.
 * @param {(Array<string|Object>)} [buckets.perf] - Performance improvements.
 * @param {(Array<string|Object>)} [buckets.refactor] - Refactors.
 * @param {(Array<string|Object>)} [buckets.docs] - Documentation changes.
 * @param {(Array<string|Object>)} [buckets.test] - Test-related changes.
 * @param {(Array<string|Object>)} [buckets.chore] - Chores/maintenance items.
 * @param {(Array<string|Object>)} [buckets.ci] - CI configuration changes.
 * @param {(Array<string|Object>)} [buckets.other] - Any other uncategorized changes.
 * @returns {string} Markdown-formatted changelog for the version (trimmed, with a trailing newline).
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
 * Insert a release section into an existing CHANGELOG.md content.
 *
 * @param {string} existing - The current contents of CHANGELOG.md. May be an empty or whitespace-only string.
 * @param {string} newSection - The release section text to insert (e.g. a "## [version]" heading plus release notes). This value will be trimmed before insertion.
 * @returns {string} The updated changelog contents with the newSection inserted. The function ensures proper spacing and a trailing newline.
 * @throws {Error} If `existing` is non-empty and does not start with the required "# Changelog" header.
 *
 * Behavior:
 * - If `existing` is empty/whitespace: returns a new changelog beginning with "# Changelog\n\n" followed by `newSection` and a trailing newline.
 * - If `existing` does not contain any release headings (no line starting with "## "): appends `newSection` after the header/intro, preserving surrounding whitespace semantics.
 * - If `existing` contains one or more release headings: inserts `newSection` immediately before the first release heading.
 * - `newSection` is trimmed and inserted with exactly one blank line separating it from the content before and after, and the final result ends with a single newline.
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

/**
 * Normalize a legacy CHANGELOG.md content to ensure it begins with a top-level
 * "# Changelog" heading.
 *
 * The function trims leading whitespace from the input and:
 * - returns the original content unchanged if it already starts with "# Changelog";
 * - prepends "# Changelog\n\n" if the content starts with a secondary "## " heading;
 * - throws an Error if the content does not match either expected legacy format.
 *
 * @param {string} existing - The original changelog content to normalize.
 * @returns {string} The normalized changelog content that begins with "# Changelog".
 * @throws {Error} If the input does not start with "# Changelog" or "## ".
 */
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

/**
 * Append a changelog section to a target array of lines.
 *
 * Adds a markdown level-3 heading (`### {title}`), a list item (`- {subject}`) for each commit in `commits`,
 * and a trailing blank line. If `commits` is empty or not provided, the `target` array is left unmodified.
 *
 * @param {string[]} target - Array of strings representing the changelog lines; mutated in place.
 * @param {string} title - Section title to add (used as a "###" markdown heading).
 * @param {Array<{subject: string}>} [commits=[]] - Array of commit objects; each object should have a `subject` string.
 * @returns {void} Does not return a value; modifies `target` by pushing lines.
 *
 * @example
 * const lines = [];
 * pushSection(lines, 'Features', [{ subject: 'Add login' }, { subject: 'Improve UI' }]);
 * // lines -> ["### Features", "- Add login", "- Improve UI", ""]
 */
function pushSection(target, title, commits = []) {
  if (!commits.length) return;

  target.push(`### ${title}`);
  for (const commit of commits) {
    target.push(`- ${commit.subject}`);
  }
  target.push("");
}
