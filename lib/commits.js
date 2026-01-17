import { COMMIT_RE } from "./constants.js";
import { detectBumpType } from "./versioning.js";

/**
 * Normalize a subject string by removing leading emoji and trimming whitespace.
 *
 * This function:
 * - Strips a leading colon-style emoji shortcode (e.g. ":smile:"). Consecutive shortcodes
 *   without intervening spaces (e.g. ":a::b: ...") are removed as a single leading block.
 * - Removes leading Unicode emoji in the U+1F300–U+1FAFF range (one or more), using a
 *   Unicode-aware match.
 * - Trims surrounding whitespace from the resulting string.
 *
 * @param {string} subject - The input subject (e.g. a commit/PR subject).
 * @returns {string} The normalized subject with any leading emoji/shortcodes removed and trimmed.
 *
 * @example
 * normalizeSubject(':sparkles: Add new feature') // 'Add new feature'
 * @example
 * normalizeSubject('🚀✨  Deploy') // 'Deploy'
 * @example
 * normalizeSubject('  :a::b:Multiple emojis at start  ') // 'Multiple emojis at start'
 */
export function normalizeSubject(subject = "") {
  return subject
    .replace(/^[-*]\s*/, "") // leading list markers
    .replace(/^:\w+:\s*/, "") // :emoji:
    .replace(/^[^\w]+/, "")   // leading symbols
    .replace(/^(?:[\u{1F300}-\u{1FAFF}]+\s*)+/u, "") // leading Unicode emoji
    .trim();
}

export function cleanSubject(subject) {
  const s = normalizeSubject(subject).replace(COMMIT_RE, "");
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function isMergeCommit(commit) {
  return (
    /^merge\b/i.test(commit.subject) ||
    /^merge pull request\b/i.test(commit.subject)
  );
}

export function isValidCommit(commit) {
  return (
    commit.subject &&
    commit.subject.trim().length > 0 &&
    !isMergeCommit(commit)
  );
}

/**
 * Normalize commits produced by squash merges.
 * Ensures commits with multiple bullet points are expanded.
 */
export function normalizeCommits(commits = []) {
  const normalized = [];

  for (const commit of commits) {
    if (!isValidCommit(commit)) continue;

    const lines = commit.subject
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of lines) {
      const subject = normalizeSubject(line.replace(/^[-*]\s*/, ""));
      if (!subject) continue;

      normalized.push({
        ...commit,
        subject,
      });
    }
  }

  return normalized;
}

/**
 * Categorize commits into semantic buckets.
 */
export function categorizeCommits(commits = []) {
  const buckets = {
    breaking: [],
    feat: [],
    fix: [],
    perf: [],
    refactor: [],
    docs: [],
    test: [],
    chore: [],
    ci: [],
    other: [],
  };

  for (const commit of commits) {
    const bump = detectBumpType(commit);
    const rawSubject = normalizeSubject(commit.subject);
    const cleanSubject = cleanSubject(commit.subject);

    const view = {
      ...commit,
      rawSubject,
      subject: cleanSubject,
    };

    if (bump === "major") {
      buckets.breaking.push(view);
      continue;
    }

    if (/^feat(\(|:)/i.test(rawSubject)) {
      buckets.feat.push(view);
    } else if (/^fix(\(|:)/i.test(rawSubject)) {
      buckets.fix.push(view);
    } else if (/^perf(\(|:)/i.test(rawSubject)) {
      buckets.perf.push(view);
    } else if (/^refactor(\(|:)/i.test(rawSubject)) {
      buckets.refactor.push(view);
    } else if (/^docs(\(|:)/i.test(rawSubject)) {
      buckets.docs.push(view);
    } else if (/^test(\(|:)/i.test(rawSubject)) {
      buckets.test.push(view);
    } else if (/^(ci|build)(\(|:)/i.test(rawSubject)) {
      buckets.ci.push(view);
    } else if (/^chore(\(|:)/i.test(rawSubject)) {
      buckets.chore.push(view);
    } else {
      buckets.other.push(view);
    }
  }

  return buckets;
}