/* ===========================
 * Semver detection
 * =========================== */

const COMMIT_RE =
  /^(feat|fix|refactor|docs|chore|style|test|build|perf|ci|cleanup|remove)(\(.+\))?(!)?:/i;

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
function normalizeSubject(subject) {
  return subject
    // remove emoji at start
    .replace(/^:\S+:\s*/, "")
    // remove unicode emoji at start
    .replace(/^[\u{1F300}-\u{1FAFF}]+\s*/u, "")
    .trim();
}

/**
 * Determine the semantic version bump implied by a commit message.
 *
 * The function inspects the commit subject and body using a conventional-commit
 * pattern (COMMIT_RE) and the presence of "BREAKING CHANGE":
 * - Returns "major" if the body contains "BREAKING CHANGE" (case-insensitive)
 *   or the commit header contains the conventional "!" breaking-change marker.
 * - Returns "minor" if the header matches COMMIT_RE and the commit type is "feat".
 * - Returns "patch" if the header matches COMMIT_RE and the commit type is "fix".
 * - Returns "none" if no relevant indicators are present.
 *
 * @param {Object} params - Destructured input object.
 * @param {string} params.subject - Commit subject/summary line to be matched against COMMIT_RE.
 * @param {string} params.body - Commit body text used to detect "BREAKING CHANGE".
 * @returns {'major'|'minor'|'patch'|'none'} The semantic version bump type.
 */
export function detectBumpType({ subject, body }) {
  const cleanSubject = normalizeSubject(subject);

  // Ignore revert commits entirely
  if (/^revert\b/i.test(cleanSubject)) return "none";

  const match = cleanSubject.match(COMMIT_RE);

  const breaking =
    /BREAKING CHANGE/i.test(body) || (match && match[3] === "!");

  if (breaking) return "major";
  if (!match) return "none";

  const type = match[1].toLowerCase();
  if (type === "feat") return "minor";
  if (type === "fix") return "patch";

  return "none";
}

/**
 * Increment a semantic version string.
 *
 * Given a version string in the form "major.minor.patch", this function
 * parses the numeric components (non-numeric or missing parts are treated as 0)
 * and returns a new version string with the requested part bumped:
 * - "major": increments major, resets minor and patch to 0
 * - "minor": increments minor, resets patch to 0
 * - any other value (including omitted): increments patch
 *
 * Parsing details:
 * - Each segment is parsed with parseInt(..., 10); if parsing yields NaN,
 *   that segment is treated as 0.
 *
 * @param {string} base - The base version string (e.g. "1.2.3").
 * @param {string} [bump] - The part to bump: "major", "minor", or "patch".
 *                          If omitted or any other value, the patch is bumped.
 * @returns {string} The new version string in "major.minor.patch" format.
 *
 * @example
 * bumpVersion("1.2.3", "patch"); // => "1.2.4"
 * @example
 * bumpVersion("1.2.3", "minor"); // => "1.3.0"
 * @example
 * bumpVersion("1.2.3", "major"); // => "2.0.0"
 * @example
 * bumpVersion("1", "patch");     // => "1.0.1"  (missing parts treated as 0)
 * @example
 * bumpVersion("a.b.c", "minor"); // => "0.1.0"  (non-numeric parts treated as 0)
 */
export function bumpVersion(base, bump) {
  const [major, minor, patch] = base.split(".").map(n => parseInt(n, 10) || 0);

  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}
