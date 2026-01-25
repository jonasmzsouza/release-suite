#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { computeVersion } from "../lib/compute-version.js";

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
