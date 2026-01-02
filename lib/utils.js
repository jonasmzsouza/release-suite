import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/* ===========================
 * Utilities
 * =========================== */

/**
 * Execute a shell command synchronously and return its stdout as a trimmed UTF-8 string.
 *
 * @param {string} cmd - The command to execute (passed to child_process.execSync).
 * @param {string} [cwd] - Optional working directory in which to run the command.
 * @returns {string} The command's stdout, decoded as UTF-8 and trimmed of surrounding whitespace.
 * @throws {Error|import('child_process').ExecSyncError} If the command fails or exits with a non-zero status.
 * @see {@link https://nodejs.org/api/child_process.html#child_processexecsynccommand-options|child_process.execSync}
 */
export function run(cmd, cwd) {
  return execSync(cmd, { encoding: "utf8", cwd }).trim();
}

/**
 * Read the "version" field from a package.json file in the given directory.
 *
 * Synchronously reads and parses `<cwd>/package.json` and returns its `version`.
 * Any errors (missing file, invalid JSON, missing `version`, etc.) are caught
 * and a default version string of `"0.0.0"` is returned.
 *
 * @param {string} cwd - Path to the directory containing package.json.
 * @returns {string} The package version, or `"0.0.0"` if it cannot be read.
 *
 * @example
 * // returns "1.2.3" if /my/project/package.json contains { "version": "1.2.3" }
 * const v = readPackageVersion('/my/project');
 */
export function readPackageVersion(cwd) {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(cwd, "package.json"), "utf8")
    );
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}
