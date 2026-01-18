import { run } from "./utils.js";

/* ===========================
 * GitHub helpers
 * =========================== */

export function ensureGhCLI() {
  try {
    run("gh --version");
  } catch {
    throw new Error("GitHub CLI (gh) is required but not installed.");
  }
}

export function getRepoFromGit(cwd) {
  const url = run("git config --get remote.origin.url", cwd);

  if (url.startsWith("git@")) {
    const [, repo] = url.split(":");
    return repo.replace(".git", "");
  }

  if (url.startsWith("https://")) {
    return url
      .replace("https://github.com/", "")
      .replace(".git", "");
  }

  throw new Error("Unable to determine GitHub repository.");
}

export function getDefaultBranch(cwd) {
  try {
    const out = run("git remote show origin", cwd);
    const m = out.match(/HEAD branch: (\S+)/);
    return (m && m[1]) || "main";
  } catch {
    return "main";
  }
}

/**
 * Call GitHub Release Notes Generator API.
 *
 * Mirrors the "Generate release notes" button behavior.
 */
export function generateReleaseNotesViaAPI({
  owner,
  repo,
  currentTag,
  previousTag,
  targetBranch,
  cwd,
}) {
  let cmd = `
gh api -X POST repos/${owner}/${repo}/releases/generate-notes \
  -f tag_name='${currentTag}' \
  -f target_commitish='${targetBranch}'
`;

  if (previousTag) {
    cmd += ` -f previous_tag_name='${previousTag}'`;
  }

  return JSON.parse(run(cmd, cwd));
}
