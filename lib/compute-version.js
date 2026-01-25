import { getLastTag, getCommits, parseCommit } from "./git.js";
import { readPackageVersion } from "./utils.js";
import { bumpVersion, detectBumpType } from "./versioning.js";

/* ===========================
 * Core API (Programmatic)
 * =========================== */

/**
 * Analyze the Git history (relative to the repository's last tag or package.json version)
 * and determine whether a release should be produced and, if so, what the next version should be.
 *
 * The function:
 * - Determines a base version: the most recent git tag if present; otherwise the package.json version.
 * - Collects commits from the appropriate range (lastTag..HEAD or HEAD) and parses them.
 * - Scans parsed commits to detect the highest required semantic version bump:
 *   "major" > "minor" > "patch".
 * - If a bump is detected, computes the nextVersion using the detected bump and the baseVersion.
 *
 * @param {Object} [options] - Options object.
 * @param {string} [options.cwd=process.cwd()] - Working directory to use for reading package.json and running git commands.
 *
 * @returns {{
 *   hasRelease: boolean,
 *   reason?: "no-commits" | "no-bump-detected",
 *   baseVersion: string,
 *   nextVersion?: string,
 *   bump?: "major" | "minor" | "patch",
 *   commitsAnalyzed: number
 * }} Result object describing whether a release is needed and details about the analysis.
 *
 * Result details:
 * - hasRelease: true when a bump was detected; false otherwise.
 * - reason: included only when hasRelease is false. Possible values:
 *     - "no-commits": no commits were found in the analyzed range.
 *     - "no-bump-detected": commits exist but none required a version bump.
 * - baseVersion: the semantic version used as the release base (last git tag or package.json version).
 * - bump: when hasRelease is true, the detected bump level ("major", "minor", or "patch").
 * - nextVersion: when hasRelease is true, the resulting semantic version after applying the bump to baseVersion.
 * - commitsAnalyzed: number of commits that were parsed and inspected.
 *
 * @throws {Error} If reading package.json or executing git commands fails (propagates underlying errors).
 */
export function computeVersion({ cwd = process.cwd() } = {}) {
  const pkgVersion = readPackageVersion(cwd);
  const lastTag = getLastTag(cwd);
  const baseVersion = lastTag ?? pkgVersion;

  const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
  const commits = getCommits(range, cwd).map(parseCommit);

  if (commits.length === 0) {
    return {
      hasRelease: false,
      reason: "no-commits",
      baseVersion,
      commitsAnalyzed: 0,
    };
  }

  let bump = null;

  for (const commit of commits) {
    const type = detectBumpType(commit);

    if (type === "major") {
      bump = "major";
      break;
    }
    if (type === "minor" && bump !== "major") bump = "minor";
    if (type === "patch" && !bump) bump = "patch";
  }

  if (!bump) {
    return {
      hasRelease: false,
      reason: "no-bump-detected",
      baseVersion,
      commitsAnalyzed: commits.length,
    };
  }

  return {
    hasRelease: true,
    baseVersion,
    nextVersion: bumpVersion(baseVersion, bump),
    bump,
    commitsAnalyzed: commits.length,
  };
}