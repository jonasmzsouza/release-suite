import { config } from "../config.js";

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

  const { emojis } = config.changelog;

  pushSection(sections, emojis ? "💥 Breaking Changes" : "Breaking Changes", buckets.breaking);
  pushSection(sections, emojis ? "✨ Features" : "Features", buckets.feat);
  pushSection(sections, emojis ? "🐛 Fixes" : "Fixes", buckets.fix);
  pushSection(sections, emojis ? "⚡ Performance" : "Performance", buckets.perf);
  pushSection(sections, emojis ? "♻ Refactors" : "Refactors", buckets.refactor);
  pushSection(sections, emojis ? "📚 Documentation" : "Documentation", buckets.docs);
  pushSection(sections, emojis ? "🧪 Tests" : "Tests", buckets.test);
  pushSection(sections, emojis ? "🔧 Chores" : "Chores", buckets.chore);
  pushSection(sections, emojis ? "🤖 CI" : "CI", buckets.ci);
  pushSection(sections, emojis ? "📦 Other" : "Other", buckets.other);

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

/**
 * Extract the header/introduction section from an existing CHANGELOG.md content.
 * @param {*} existing 
 * @returns 
 */
export function extractChangelogHeader(existing = "") {
  if (!existing.trim()) {
    return "# Changelog\n\n";
  }

  const lines = existing.split("\n");

  if (!lines[0].startsWith("# Changelog")) {
    throw new Error(
      "Invalid CHANGELOG.md format: missing '# Changelog' header"
    );
  }

  const firstReleaseIndex = lines.findIndex((l) =>
    l.startsWith("## ")
  );

  // No releases yet → keep entire file
  if (firstReleaseIndex === -1) {
    return existing.trimEnd() + "\n\n";
  }

  return (
    lines
      .slice(0, firstReleaseIndex)
      .join("\n")
      .trimEnd() + "\n\n"
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

export function hasAnyContent(buckets) {
  return Object.values(buckets).some(
    (list) => Array.isArray(list) && list.length > 0
  );
}