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
 * - If isPreview is true, writes a small preview file (RELEASE_NOTES.preview.md)
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
 * @param {boolean} [options.isPreview=false] - If true, generate a local preview file and skip calling the GitHub API.
 *
 * @returns {{
 *  generated: boolean,
 *  version: string,
 *  previousTag: string|null,
 *  file?: string,
 *  preview?: boolean,
 *  reason?: 'no-repo' | 'api-failed' | 'already-exists'
 * }} Result object describing the outcome:
 *  - generated: true when release notes were generated and written; false otherwise.
 *  - version: the version read from package.json.
 *  - previousTag: the previous git tag or null if none.
 *  - file: when generated is true, the basename of the file written (RELEASE_NOTES.md or RELEASE_NOTES.preview.md).
 *  - preview: when generated is true, indicates whether preview mode was used.
 *  - reason: when generated is false, indicates the reason for failure; one of "no-repo","api-failed', or "already-exists".
 * 
 * @throws {Error} If I/O operations fail unexpectedly.
 */
export function generateReleaseNotes({
  cwd = process.cwd(),
  isPreview = false,
} = {}) {
  let version = "";
  if (isPreview) {
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
    isPreview ? "RELEASE_NOTES.preview.md" : "RELEASE_NOTES.md"
  );

  /* ---------------------------------
   * Preview mode (NO GitHub API)
   * --------------------------------- */
  if (isPreview) {
    const body = `# Release ${version}

> ⚠ Preview mode  
> GitHub Release Notes will be generated automatically on publish.

`;

    fs.writeFileSync(targetPath, body, "utf8");

    return {
      generated: true,
      version,
      previousTag,
      file: path.basename(targetPath),
      preview: true,
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
    preview: false,
  };
}
