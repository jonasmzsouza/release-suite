#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { createTag } from "../lib/create-tag.js";
import { parseFlags } from "../lib/utils.js";

/* ===========================
 * CLI
 * =========================== */

/**
 * Exit codes (CONTRACT):
 *
 * 0  -> tag created
 * 10 -> no version bump detected
 * 11 -> tag already exists
 * 1  -> unexpected error
 */
function main() {

  const flags = parseFlags(process.argv.slice(2), {
    dryRun: "--dry-run",
  });

  let result;
  try {
    result = createTag({
      dryRun: flags.dryRun,
    });
  } catch (err) {
    console.error(
      JSON.stringify(
        {
          error: "unexpected-error",
          message: err?.message || String(err),
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));

  if (result.created) process.exit(0);
  if (result.reason === "no-bump") process.exit(10);
  if (result.reason === "already-exists") process.exit(11);

  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
}
