#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { generateChangelog } from "../lib/changelog/generate.js";
import { rebuildChangelog } from "../lib/changelog/rebuild.js";
import { parseFlags } from "../lib/utils.js";

/* ===========================
 * CLI
 * =========================== */

/**
 * Main CLI entrypoint for changelog (generate/rebuild).
 *
 * Behavior:
 *  - Calls generateChangelog({ dryRun: flags.dryRun }).
 *  - Calls rebuildChangelog({ dryRun: flags.dryRun }).
 *
 * Exit codes (contract):
 *  - 0  -> changelog generated/rebuilt
 *  - 10 -> no release/no-tags
 *  - 2  -> no-commits/no-valid-commits
 *  - 11 -> already exists
 *  - 1  -> unexpected error
 */
function main() {
  const action = process.argv[2];
  const flags = parseFlags(process.argv.slice(3), {
    dryRun: "--dry-run",
  });

  if (!["generate", "rebuild"].includes(action)) {
    console.error(
      JSON.stringify(
        {
          error: "invalid-usage",
          message: "Usage: changelog.js [generate|rebuild]",
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  try {

    let result = null;
    if (action === "generate") {
      result = generateChangelog({ dryRun: flags.dryRun });
    }
    else if (action === "rebuild") {
      result = rebuildChangelog({ dryRun: flags.dryRun });
    }

    console.log(JSON.stringify(result, null, 2));

    if (action === "generate") {
      if (result.generated) process.exit(0);
      if (result.reason === "no-release") process.exit(10);
      if (result.reason === "no-commits") process.exit(2);
      if (result.reason === "already-exists") process.exit(11);
    }
    else if (action === "rebuild") {
      if (result.rebuilt) process.exit(0);
      if (result.reason === "no-tags") process.exit(10);
      if (result.reason === "no-valid-commits") process.exit(2);
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

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
}
