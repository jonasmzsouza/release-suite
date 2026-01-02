/* ===========================
 * Semver detection
 * =========================== */

const COMMIT_RE =
  /^(:\S+: )?(feat|fix|refactor|docs|chore|style|test|build|perf|ci|cleanup|remove)(\(.+\))?(!)?:/i;

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
  const match = subject.match(COMMIT_RE);
  const breaking =
    /BREAKING CHANGE/i.test(body) || (match && match[4] === "!");

  if (breaking) return "major";
  if (!match) return "none";

  const type = match[2].toLowerCase();
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
