#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { generateChangelog } from "../lib/changelog.js";

/* ===========================
 * CLI
 * =========================== */

/**
 * Parse CLI flags for the changelog generator.
 *
 * Recognized flags:
 *  - --preview : generate preview changelog (writes to CHANGELOG.preview.md)
 *  - --json    : print JSON result object instead of human messages
 *
 * @param {string[]} argv - CLI args (e.g. process.argv.slice(2))
 * @returns {{preview:boolean, json:boolean}}
 */
function parseFlags(argv) {
  return {
    preview: argv.includes("--preview"),
    json: argv.includes("--json"),
  };
}

/**
 * Main CLI entrypoint for changelog generation.
 *
 * Behavior:
 *  - Calls generateChangelog({ isPreview: flags.preview }).
 *  - If --json is passed, prints the full result as JSON (pretty).
 *  - Prints a human-readable message on success/failure otherwise.
 *
 * Exit codes (contract):
 *  - 0  -> changelog generated
 *  - 10 -> no release
 *  - 11 -> already exists
 *  - 1  -> unexpected error
 */
function main() {
  const flags = parseFlags(process.argv.slice(2));
  const result = generateChangelog({ isPreview: flags.preview });

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.generated) {
    console.log(
      `✔ Changelog generated (${result.file}) for version ${result.version}`
    );
  } else {
    console.error(
      `ℹ Changelog not generated (${result.reason}) for version ${result.version}`
    );
  }

  if (result.generated) process.exit(0);
  if (result.reason === "no-release") process.exit(10);
  if (result.reason === "already-exists") process.exit(11);

  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
}
