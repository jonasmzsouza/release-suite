#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { preview } from "../lib/preview.js";

/* ===========================
 * CLI
 * =========================== */

function main() {
  const action = process.argv[2];

  if (!["create", "remove"].includes(action)) {
    console.error(
      JSON.stringify(
        {
          error: "invalid-usage",
          message: "Usage: preview.js [create|remove]",
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  try {
    const result = preview({ action });

    console.log(JSON.stringify(result, null, 2));

    if (action === "create" && result.generated === false) {
      process.exit(10);
    }

    process.exit(0);
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
