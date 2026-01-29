#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { generateReleaseNotes } from "../lib/release-notes.js";
import { parseFlags } from "../lib/utils.js";

/* ===========================
 * CLI
 * =========================== */

/**
 * Main CLI entrypoint for release-notes generation.
 *
 * Behavior:
 *  - Calls generateReleaseNotes({ dryRun: flags.dryRun }).
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
  const flags = parseFlags(process.argv.slice(2), {
    dryRun: "--dry-run",
  });
  const result = generateReleaseNotes({
    dryRun: flags.dryRun,
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
