#!/usr/bin/env node
import { dryRun } from "../lib/dry-run.js";

/* ===========================
 * CLI
 * =========================== */

export function main() {
  const action = process.argv[2];

  if (!["create", "remove"].includes(action)) {
    console.error(
      JSON.stringify(
        {
          error: "invalid-usage",
          message: "Invalid action. Usage: npx rs-dry-run [create|remove]"
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const result = dryRun({ action });

  console.log(JSON.stringify(result, null, 2));

  if (action === "create" && result.generated === false) {
    process.exit(10);
  }

  process.exit(0);
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
