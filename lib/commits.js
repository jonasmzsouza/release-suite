import { COMMIT_RE } from "./constants.js";
import { getRepoInfo } from "./git/getRepoInfo.js";
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

/**
 * Normalize and clean a commit subject line.
 *
 * This function first normalizes the provided subject via `normalizeSubject`,
 * removes any substrings that match the `COMMIT_RE` pattern, and then
 * capitalizes the first character of the resulting string (if any).
 *
 * @param {string} [subject=""] - The commit subject to clean.
 * @returns {string} The cleaned subject with its first character uppercased,
 *                   or an empty string if no content remains after cleaning.
 */
export function cleanSubject(subject = "") {
  const s = normalizeSubject(subject).replace(COMMIT_RE, "");
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Determine whether a commit represents a merge commit by inspecting its subject line.
 *
 * A commit is considered a merge commit if the subject starts with "merge"
 * or "merge pull request" (case-insensitive).
 *
 * @param {Object} commit - The commit object to check.
 * @param {string} commit.subject - The commit subject line.
 * @returns {boolean} True if the commit is a merge commit; otherwise false.
 */
export function isMergeCommit(commit) {
  return (
    /^merge\b/i.test(commit.subject) ||
    /^merge pull request\b/i.test(commit.subject)
  );
}

/**
 * Check whether a commit object represents a valid non-merge commit.
 *
 * A commit is considered valid when:
 * - it has a `subject` property that is a non-empty string after trimming, and
 * - it is not identified as a merge commit by `isMergeCommit(commit)`.
 *
 * @param {Object} commit - The commit object to validate.
 * @param {string} [commit.subject] - The commit message subject line.
 * @returns {boolean} True if the commit has a non-empty trimmed subject and is not a merge commit; otherwise false.
 */
export function isValidCommit(commit) {
  if (!commit.subject || !commit.subject.trim()) return false;
  if (isMergeCommit(commit)) return false;

  const normalized = normalizeSubject(commit.subject);

  // ignore release/version commits
  if (
    /^chore\(release\)/i.test(normalized) ||
    /^release[:\s]/i.test(normalized) ||
    /^\d+\.\d+\.\d+/.test(normalized)
  ) {
    return false;
  }

  return true;
}

function extractReferences(text = "") {
  const refs = [];

  // (#123), #123
  const regex = /#(\d+)/g;
  let match;

  while ((match = regex.exec(text))) {
    refs.push(Number(match[1]));
  }

  return refs;
}

function detectMergePR(subject = "", body = "") {
  // Merge pull request #34 from ...
  const match = `${subject}\n${body}`.match(/pull request #(\d+)/i);
  return match ? Number(match[1]) : null;
}

export function normalizeCommits(commits = [], { cwd } = {}) {
  const normalized = [];
  const repo = getRepoInfo(cwd);

  for (const commit of commits) {
    if (!isValidCommit(commit)) continue;

    const lines = commit.subject
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of lines) {
      const subject = normalizeSubject(line.replace(/^[-*]\s*/, ""));
      if (!subject) continue;

      // extract refs
      const refsFromSubject = extractReferences(subject);
      const refsFromBody = extractReferences(commit.body);

      const mergePR = detectMergePR(subject, commit.body);

      const allRefs = Array.from(
        new Set([
          ...refsFromSubject,
          ...refsFromBody,
          ...(mergePR ? [mergePR] : [])
        ])
      );

      // generate links
      const links = allRefs.map((id) => {
        if (!repo) return { id };

        const base =
          repo.provider === "github"
            ? `${repo.url}/pull/${id}`
            : repo.provider === "gitlab"
              ? `${repo.url}/-/merge_requests/${id}`
              : repo.provider === "bitbucket"
                ? `${repo.url}/pull-requests/${id}`
                : null;

        return {
          id,
          url: base
        };
      });

      normalized.push({
        ...commit,
        subject,
        references: allRefs,
        links,
      });
    }
  }

  return normalized;
}

/**
 * Categorize an array of commit objects into conventional changelog buckets.
 *
 * @param {Array<Object>} [commits=[]] - Array of commit objects to categorize.
 *   Each commit object is expected to include at least:
 *     - {string} subject - the raw commit subject line used for type detection.
 *   Other properties (e.g. hash, body, author) are permitted and preserved in the output.
 *
 * @returns {Object} buckets - An object containing categorized commit arrays:
 *   @property {Array<Object>} breaking - Commits that trigger a "major" bump (breaking changes).
 *   @property {Array<Object>} feat     - Feature commits (type: "feat").
 *   @property {Array<Object>} fix      - Bugfix commits (type: "fix").
 *   @property {Array<Object>} perf     - Performance improvement commits (type: "perf").
 *   @property {Array<Object>} refactor - Refactor commits (type: "refactor").
 *   @property {Array<Object>} docs     - Documentation commits (type: "docs").
 *   @property {Array<Object>} test     - Test-related commits (type: "test").
 *   @property {Array<Object>} chore    - Chore/maintenance commits (type: "chore").
 *   @property {Array<Object>} ci       - CI/build-related commits (types: "ci" or "build").
 *   @property {Array<Object>} other    - Commits that do not match any conventional type.
 *
 * Each returned commit object (view) is a shallow copy of the original commit with two
 * additional properties:
 *   - {string} rawSubject - the normalized subject used for regex/type detection.
 *   - {string} subject    - the cleaned subject intended for display.
 *
 * Behavior details:
 * - If detectBumpType(commit) returns "major", the commit is always placed in `breaking`.
 * - Otherwise, the function matches rawSubject (case-insensitive) against conventional commit
 *   type patterns (e.g. /^feat(\(|:)/i) to determine the appropriate bucket.
 * - Commits that don't match any known type are placed in `other`.
 *
 * Notes:
 * - If no argument is provided, an empty array is used and all buckets will be empty arrays.
 * - The function relies on external helpers: detectBumpType, normalizeSubject, and cleanSubject.
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
    const clearedSubject = cleanSubject(commit.subject);

    const view = {
      ...commit,
      rawSubject,
      subject: clearedSubject,
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