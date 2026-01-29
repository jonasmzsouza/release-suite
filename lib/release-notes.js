import fs from "node:fs";
import path from "node:path";

import { computeVersion } from "./compute-version.js";
import { getLastTag } from "./git.js";
import {
  ensureGhCLI,
  getRepoFromGit,
  getDefaultBranch,
  generateReleaseNotesViaAPI,
} from "./github.js";

/* ===========================
 * Core API (Programmatic)
 * =========================== */

/**
 * Generate release notes for the package in the specified working directory.
 *
 * This function:
 * - Reads package.json in cwd to determine the current version.
 * - Determines the previous tag using getLastTag(cwd).
 * - If dryRun is true, writes a small dry-run file (RELEASE_NOTES.dry-run.md)
 *   and does not call the GitHub API.
 * - Otherwise, ensures the GitHub CLI is available, resolves the repository from
 *   the local git config, determines the default branch, and requests generated
 *   release notes from the GitHub Release Notes API via generateReleaseNotesViaAPI.
 * - Handles error/edge cases and writes the final RELEASE_NOTES.md when successful.
 *
 * Note: This function uses synchronous fs operations and may throw for I/O errors
 * or if package.json is missing/invalid.
 *
 * @param {Object} [options] - Options object.
 * @param {string} [options.cwd=process.cwd()] - Working directory containing package.json and the git repository.
 * @param {boolean} [options.dryRun=false] - If true, generate a local dry-run file and skip calling the GitHub API.
 *
 * @returns {{
 *  generated: boolean,
 *  version: string,
 *  previousTag: string|null,
 *  file?: string,
 *  dryRun?: boolean,
 *  reason?: 'no-repo' | 'api-failed' | 'already-exists'
 * }} Result object describing the outcome:
 *  - generated: true when release notes were generated and written; false otherwise.
 *  - version: the version read from package.json.
 *  - previousTag: the previous git tag or null if none.
 *  - file: when generated is true, the basename of the file written (RELEASE_NOTES.md or RELEASE_NOTES.dry-run.md).
 *  - dryRun: when generated is true, indicates whether dry-run mode was used.
 *  - reason: when generated is false, indicates the reason for failure; one of "no-repo","api-failed', or "already-exists".
 * 
 * @throws {Error} If I/O operations fail unexpectedly.
 */
export function generateReleaseNotes({
  cwd = process.cwd(),
  dryRun = false,
} = {}) {
  let version = "";
  if (dryRun) {
    const compute = computeVersion({ cwd });
    version = compute.nextVersion
  } else {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(cwd, "package.json"), "utf8")
    );
    version = pkg.version;
  }

  const previousTag = getLastTag(cwd);

  const targetPath = path.join(
    cwd,
    dryRun ? "RELEASE_NOTES.dry-run.md" : "RELEASE_NOTES.md"
  );

  /* ---------------------------------
   * Dry-run mode (NO GitHub API)
   * --------------------------------- */
  if (dryRun) {
    const body = `# Release ${version}

> ⚠ Dry-run mode  
> GitHub Release Notes will be generated automatically on publish.

`;

    fs.writeFileSync(targetPath, body, "utf8");

    return {
      generated: true,
      version,
      previousTag,
      file: path.basename(targetPath),
      dryRun: true,
    };
  }

  /* ---------------------------------
   * Real release (GitHub API)
   * --------------------------------- */
  ensureGhCLI();

  const repoFull = getRepoFromGit(cwd);
  if (!repoFull) {
    return {
      generated: false,
      reason: "no-repo",
      version,
    };
  }

  const [owner, repo] = repoFull.split("/");
  const targetBranch = getDefaultBranch(cwd);

  const result = generateReleaseNotesViaAPI({
    owner,
    repo,
    currentTag: version,
    previousTag,
    targetBranch,
    cwd,
  });

  if (!result || !result.body) {
    return {
      generated: false,
      reason: "api-failed",
      version,
    };
  }

  if (fs.existsSync(targetPath)) {
    return {
      generated: false,
      reason: "already-exists",
      version,
    };
  }

  fs.writeFileSync(targetPath, result.body.trim() + "\n", "utf8");

  return {
    generated: true,
    version,
    previousTag,
    file: path.basename(targetPath),
    dryRun: false,
  };
}
