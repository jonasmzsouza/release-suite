#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { getLastTag, getCommits, parseCommit } from "../lib/git.js";
import { readPackageVersion } from "../lib/utils.js";
import { bumpVersion, detectBumpType } from "../lib/versioning.js";

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

/* ===========================
 * CLI
 * =========================== */

/**
 * Parses an array of command-line arguments and returns which known flags are present.
 *
 * Recognized flags:
 *  - "--ci"
 *  - "--json"
 *  - "--preview"
 *
 * @param {string[]} argv - Array of command-line arguments (e.g. process.argv.slice(2)).
 * @returns {{ci: boolean, json: boolean, preview: boolean}} An object with boolean properties indicating presence of each flag.
 */
function parseFlags(argv) {
  return {
    ci: argv.includes("--ci"),
    json: argv.includes("--json"),
    preview: argv.includes("--preview"),
  };
}

/**
 * Main CLI entrypoint that computes the next release version, prints the result,
 * and exits the process according to a predetermined contract.
 *
 * Behavior:
 * - Reads CLI flags via parseFlags(process.argv.slice(2)).
 * - Calls computeVersion() to obtain an object describing the base version,
 *   whether a release should be generated, the next version, and a reason code.
 * - If the parsed flags include `json`, writes the full computeVersion result as
 *   pretty-printed JSON to stdout.
 * - Otherwise, if a release was generated (`result.hasRelease`), writes
 *   `result.nextVersion` to stdout.
 * - If no release was generated, writes an explanatory error to stderr that
 *   includes `result.reason` and `result.baseVersion`.
 *
 * Exit codes (contract):
 *   0  -> release generated
 *   10 -> no bump detected
 *   2  -> no commits
 *   1  -> unexpected error
 *
 * Side effects:
 * - Prints to stdout/stderr.
 * - Terminates the Node.js process via process.exit(...) using the codes above.
 *
 * @function main
 * @returns {void} This function does not return; it exits the process.
 * @see parseFlags
 * @see computeVersion
 */
function main() {
  const flags = parseFlags(process.argv.slice(2));
  const result = computeVersion();

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.hasRelease) {
    console.log(result.nextVersion);
  } else {
    console.error(
      `No release generated (${result.reason}). Base version: ${result.baseVersion}`
    );
  }

  if (result.hasRelease) process.exit(0);
  if (result.reason === "no-bump-detected") process.exit(10);
  if (result.reason === "no-commits") process.exit(2);

  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
}
