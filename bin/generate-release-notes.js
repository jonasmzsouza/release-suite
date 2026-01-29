#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { generateReleaseNotes } from "../lib/release-notes.js";

/* ===========================
 * CLI
 * =========================== */

/**
 * Parse CLI flags for the release-notes generator.
 *
 * Recognized flags:
 *  - --preview : generate preview release notes (writes to RELEASE_NOTES.preview.md)
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
 * Main CLI entrypoint for release-notes generation.
 *
 * Behavior:
 *  - Calls generateReleaseNotes({ isPreview: flags.preview }).
 *  - If --json is passed, prints the full result as JSON (pretty).
 *  - Maps generator result.reason -> process.exit codes according to the contract below.
 *
 * Exit codes (contract):
 *  - 0  -> release notes generated
 *  - 10 -> no release (no notes)
 *  - 11 -> already exists
 *  - 2  -> missing gh / repo
 *  - 1  -> unexpected error
 */
function main() {
  const flags = parseFlags(process.argv.slice(2));
  const result = generateReleaseNotes({
    isPreview: flags.preview,
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.generated) process.exit(0);
  if (result.reason === "no-release") process.exit(10);
  if (result.reason === "already-exists") process.exit(11);
  if (result.reason === "no-repo") process.exit(2);

  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
}
