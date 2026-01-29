#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { generateChangelog } from "../lib/changelog.js";
import { parseFlags } from "../lib/utils.js";

/* ===========================
 * CLI
 * =========================== */

/**
 * Main CLI entrypoint for changelog generation.
 *
 * Behavior:
 *  - Calls generateChangelog({ dryRun: flags.dryRun }).
 *
 * Exit codes (contract):
 *  - 0  -> changelog generated
 *  - 10 -> no release
 *  - 11 -> already exists
 *  - 1  -> unexpected error
 */
function main() {
  const flags = parseFlags(process.argv.slice(2), {
    dryRun: "--dry-run",
  });
  const result = generateChangelog({ dryRun: flags.dryRun });

  console.log(JSON.stringify(result, null, 2));

  if (result.generated) process.exit(0);
  if (result.reason === "no-release") process.exit(10);
  if (result.reason === "already-exists") process.exit(11);

  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
}
