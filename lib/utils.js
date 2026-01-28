import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/* ===========================
 * Utilities
 * =========================== */

/**
 * Execute a shell command synchronously.
 *
 * Backward compatible with:
 *   run(cmd)
 *   run(cmd, cwd)
 *   run(cmd, { captureOutput, cwd })
 *
 * @param {string} cmd
 * @param {string | {
 *   captureOutput?: boolean;
 *   cwd?: string;
 * }} [arg]
 * @returns {string}
 */
export function run(cmd, arg) {
  let captureOutput = true;
  let cwd;

  if (typeof arg === "string") {
    // run(cmd, cwd)
    cwd = arg;
  } else if (typeof arg === "object" && arg !== null) {
    // run(cmd, { captureOutput, cwd })
    ({ captureOutput = true, cwd } = arg);
  }

  if (captureOutput) {
    return execSync(cmd, {
      encoding: "utf8",
      cwd,
      stdio: "pipe",
    }).trim();
  }

  execSync(cmd, {
    cwd,
    stdio: "inherit",
  });

  return "";
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
