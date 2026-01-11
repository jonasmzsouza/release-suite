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
