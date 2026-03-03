#!/usr/bin/env node
import { computeVersion } from "../lib/version/compute.js";

/* ===========================
 * CLI
 * =========================== */

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
 * @see computeVersion
 */
export function main() {
  const action = process.argv[2];

  if (!["compute"].includes(action)) {
    console.error(
      JSON.stringify(
        {
          "error": "invalid-usage",
          "message": "Invalid action. Usage: npx rs-version compute"
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  try {

    let result = null;
    if (action === "compute") {
      result = result = computeVersion();
    }

    console.log(JSON.stringify(result, null, 2));

    if (action === "compute") {
      if (result.hasRelease) process.exit(0);
      if (result.reason === "no-bump-detected") process.exit(10);
      if (result.reason === "no-commits") process.exit(2);
    }

    process.exit(1);
  } catch (err) {
    console.error(
      JSON.stringify(
        {
          error: "unexpected-error",
          message: err.message || String(err),
        },
        null,
        2
      )
    );
    process.exit(1);
  }
}

main();
