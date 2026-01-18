import fs from "node:fs";
import path from "node:path";

import { getLastTag } from "./git.js";
import {
  ensureGhCLI,
  getRepoFromGit,
  getDefaultBranch,
  generateReleaseNotesViaAPI,
} from "./github.js";

/* ===========================
 * Programmatic API
 * =========================== */

export function generateReleaseNotes({
  cwd = process.cwd(),
  isPreview = false,
} = {}) {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(cwd, "package.json"), "utf8")
  );

  const version = pkg.version;
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
