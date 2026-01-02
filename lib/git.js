import { run } from "./utils.js";

/* ===========================
 * Git helpers
 * =========================== */

/**
 * Return the most recent Git tag reachable from HEAD, with a leading "v" prefix removed.
 *
 * Runs `git describe --tags --abbrev=0` in the provided working directory and strips a
 * single leading "v" from the tag name (e.g. "v1.2.3" -> "1.2.3").
 *
 * @param {string} cwd - The working directory in which to run the Git command.
 * @returns {string|null} The most recent tag without a leading "v", or null if no tag is found
 *                        or the Git command fails.
 */
export function getLastTag(cwd) {
  try {
    const tag = run("git describe --tags --abbrev=0", cwd);
    return tag.replace(/^v/, "");
  } catch {
    return null;
  }
}

/**
 * Retrieve commits from Git using a compact, machine-friendly format.
 *
 * Executes `git log <range> --pretty=format:%H%x1f%s%x1f%b` in the given working directory,
 * splits the output by newline, and returns an array of non-empty lines.
 *
 * Each array element is a single string formatted as:
 *   "<commit-hash>\x1F<subject>\x1F<body>"
 * where "\x1F" is the ASCII unit separator (0x1F) used to delimit fields.
 *
 * If the git command fails (e.g., not a repository, invalid range, or other error),
 * an empty array is returned.
 *
 * @param {string} range - The git log range to query (e.g. "HEAD", "v1.0.0..HEAD", "master..feature").
 * @param {string} [cwd] - Optional working directory path in which to run the git command.
 * @returns {string[]} Array of commit entries, each as "<hash>\x1F<subject>\x1F<body>". Empty array on failure.
 *
 * @example
 * // Possible return:
 * // ["a1b2c3d4e5f6g7h8i9j0\u001FAdd feature X\u001FImplementation details...", ...]
 */
export function getCommits(range, cwd) {
  try {
    return run(
      `git log ${range} --pretty=format:%H%x1f%s%x1f%b`,
      cwd
    )
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Parse a commit line encoded with ASCII Unit Separator characters into its parts.
 *
 * The input is expected to contain fields separated by '\x1f' in the order:
 * hash, subject, body. If subject or body are missing, they default to an empty string.
 *
 * @param {string} line - Raw commit line with fields delimited by '\x1f'.
 * @returns {{hash: string, subject: string, body: string}} An object containing the
 *          commit hash, subject, and body.
 */
export function parseCommit(line) {
  const [hash, subject = "", body = ""] = line.split("\x1f");
  return { hash, subject, body };
}