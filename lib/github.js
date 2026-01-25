import { run } from "./utils.js";

/* ===========================
 * GitHub helpers
 * =========================== */

/**
 * Verifies that the GitHub CLI ("gh") is installed and available on the system PATH.
 *
 * Attempts to execute `gh --version` and throws if the command cannot be run,
 * indicating that the GitHub CLI is not installed or not accessible.
 *
 * @throws {Error} If the GitHub CLI (gh) is required but not installed or not found on PATH.
 * @returns {void}
 */
export function ensureGhCLI() {
  try {
    run("gh --version");
  } catch {
    throw new Error("GitHub CLI (gh) is required but not installed.");
  }
}

/**
 * Extracts the GitHub repository path (owner/name) from the repository's remote origin URL.
 *
 * The function runs `git config --get remote.origin.url` in the provided working directory
 * and supports both SSH and HTTPS remote formats:
 * - SSH:  "git@github.com:owner/repo.git" -> "owner/repo"
 * - HTTPS: "https://github.com/owner/repo.git" -> "owner/repo"
 *
 * @param {string} cwd - The working directory in which to run the git command.
 * @returns {string} The repository path in the form "owner/repo".
 * @throws {Error} If the remote origin URL cannot be determined or is in an unsupported format.
 * @example
 * // returns "octocat/Hello-World"
 * getRepoFromGit("/path/to/local/repo");
 */
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

/**
 * Get the default branch name for the repository at the given working directory.
 *
 * Attempts to run `git remote show origin` and parse the `HEAD branch: <name>` line.
 * If the command fails or the output does not contain a HEAD branch, this returns `"main"`.
 *
 * @param {string} cwd - Path to the repository working directory where the git command is executed.
 * @returns {string} The default branch name (parsed from origin or `"main"` as a fallback).
 */
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
 * Generate release notes for a repository by invoking the GitHub CLI "generate-notes" API.
 *
 * This function constructs and runs a `gh api` command to create release notes for `currentTag`,
 * optionally using `previousTag` as the comparison base, and targeting `targetBranch`. The command
 * is executed via a helper `run` function in the provided working directory, and the function
 * returns the parsed JSON response from the GitHub API.
 *
 * @param {Object} options - Configuration options.
 * @param {string} options.owner - GitHub repository owner or organization.
 * @param {string} options.repo - Repository name.
 * @param {string} options.currentTag - Tag name for which to generate release notes.
 * @param {string} [options.previousTag] - Optional previous tag name to compare against.
 * @param {string} options.targetBranch - Target commitish (branch or SHA) for the release.
 * @param {string} [options.cwd] - Working directory in which to run the command.
 * @returns {any} Parsed JSON response from the GitHub API containing the generated release notes.
 * @throws {Error} If the underlying command execution fails or the response cannot be parsed as JSON.
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
