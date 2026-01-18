import { getLastTag, getCommits, parseCommit } from "./git.js";
import { readPackageVersion } from "./utils.js";
import { bumpVersion, detectBumpType } from "./versioning.js";

/* ===========================
 * Core API (Programmatic)
 * =========================== */

/**
 * Analyze commits since the last tag (or since package.json version) and compute whether a release
 * is needed and what the next semantic version should be.
 *
 * The function:
 * - Determines a base version from the latest git tag (if any) or the package.json version.
 * - Collects commits in the range (lastTag..HEAD or HEAD) and parses them.
 * - Detects a bump type ('major' | 'minor' | 'patch') from the commits using conventional-commit style rules.
 * - Returns either a release plan (nextVersion + bump) or a reason why no release is required.
 *
 * @param {Object} [options] - Options object.
 * @param {string} [options.cwd=process.cwd()] - Working directory to run git/package lookups in.
 *
 * @returns {{
 *   hasRelease: boolean,
 *   // Present when hasRelease === false:
 *   reason?: 'no-commits' | 'no-bump-detected',
 *   // Always present:
 *   baseVersion: string,
 *   commitsAnalyzed: number,
 *   // Present when hasRelease === true:
 *   nextVersion?: string,
 *   bump?: 'major' | 'minor' | 'patch'
 * }}
 *
 * Examples:
 * // No commits since last tag
 * // { hasRelease: false, reason: 'no-commits', baseVersion: '1.2.3', commitsAnalyzed: 0 }
 *
 * // Commits analyzed but none imply a version bump
 * // { hasRelease: false, reason: 'no-bump-detected', baseVersion: '1.2.3', commitsAnalyzed: 5 }
 *
 * // Bump detected (e.g. minor)
 * // { hasRelease: true, baseVersion: '1.2.3', nextVersion: '1.3.0', bump: 'minor', commitsAnalyzed: 4 }
 *
 * @throws {Error} If reading package version or git data fails (propagates errors from helper utilities).
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