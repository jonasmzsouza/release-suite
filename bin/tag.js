#!/usr/bin/env node
import { createTag } from "../lib/tag/create.js";
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
export function main() {
  const action = process.argv[2];
  const flags = parseFlags(process.argv.slice(3), {
    dryRun: "--dry-run"
  });

  if (!["create"].includes(action)) {
    console.error(
      JSON.stringify(
        {
          error: "invalid-usage",
          message: "Invalid action. Usage: npx rs-tag create"
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  let result = null;
  if (action === "create") {
    result = createTag({ dryRun: flags.dryRun });
  }

  console.log(JSON.stringify(result, null, 2));

  if (action === "create") {
    if (result.created) process.exit(0);
    if (result.reason === "no-bump") process.exit(10);
    if (result.reason === "already-exists") process.exit(11);
  }

  process.exit(1);
}

main().catch((err) => {
  console.error(
    JSON.stringify(
      {
        error: "unexpected-error",
        message: err?.message || String(err)
      },
      null,
      2
    )
  );
  process.exit(1);
});
