import { normalizeSubject } from "./commits.js";
import { config } from "./config.js";
import { COMMIT_RE } from "./constants.js";

/* ===========================
 * Semver detection
 * =========================== */

/**
 * Determine the semantic version bump type for a commit message.
 *
 * The function inspects a commit subject and body (e.g. Conventional Commit format)
 * and returns the appropriate release bump type:
 * - Normalizes the subject via normalizeSubject(subject) before analysis.
 * - If the normalized subject begins with "revert" (case-insensitive), returns "none".
 * - Attempts to parse the subject with COMMIT_RE to extract the commit type and
 *   optional breaking "!" indicator.
 * - Considers the body for a "BREAKING CHANGE" token (case-insensitive).
 * - If a breaking change is detected (body token or "!" marker), returns "major".
 * - If the subject does not match COMMIT_RE, returns "none".
 * - Otherwise, looks up the parsed commit type in config.releaseRules and returns
 *   the configured rule value; if none exists, returns "none".
 *
 * Note: This function depends on external symbols: normalizeSubject, COMMIT_RE and config.
 *
 * @param {Object} options - Commit data to analyze.
 * @param {string} options.subject - Commit subject/header.
 * @param {string} [options.body] - Commit body/description (optional).
 * @returns {string} The release bump type ("major", a value from config.releaseRules, or "none").
 */
export function detectBumpType({ subject, body }) {
  const normalizedSubject = normalizeSubject(subject);

  if (/^revert\b/i.test(normalizedSubject)) return "none";

  const match = normalizedSubject.match(COMMIT_RE);

  const breaking = /BREAKING CHANGE/i.test(body) || (match && match[3] === "!");

  if (breaking) return "major";
  if (!match) return "none";

  const type = match[1].toLowerCase();

  const rule = config.releaseRules?.[type];

  return rule ?? "none";
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
  const [major, minor, patch] = base.split(".").map((n) => parseInt(n, 10) || 0);

  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}
