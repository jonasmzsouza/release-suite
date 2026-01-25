#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import { computeVersion } from "./compute-version.js";

/**
 * Execute a shell command.
 *
 * - If captureOutput is true, runs the command and returns trimmed stdout as string.
 * - If captureOutput is false, streams stdio to the current process (used for git push/tag).
 *
 * Notes:
 * - Uses execSync for simplicity and to preserve the original synchronous behavior.
 * - Throws when the command returns non-zero; callers should catch exceptions.
 *
 * @param {string} cmd - Shell command to execute.
 * @param {boolean} [captureOutput=true] - Whether to capture and return stdout.
 * @returns {string} Trimmed stdout when captureOutput=true, otherwise empty string.
 */
function run(cmd, captureOutput = true) {
  if (captureOutput) {
    const output = execSync(cmd, { encoding: "utf8", stdio: "pipe" });
    return output ? output.trim() : "";
  } else {
    execSync(cmd, { stdio: "inherit" });
  }
  return "";
}

/**
 * Script behavior / CLI contract:
 *
 * Flags:
 *  - --dry-run   : Do not create or push the tag, print planned actions and exit code 5.
 *  - --compute   : Compute the next version dynamically using computeVersion({ cwd: process.cwd() }).
 *                  If no nextVersion is found, exits with code 10 (no bump).
 *
 * Exit codes:
 *  - 0  : Tag created and pushed successfully.
 *  - 5  : Dry-run (planned actions printed).
 *  - 10 : No version bump detected when using --compute (nothing to tag).
 *  - 1  : Generic failure (I/O, git error, missing package.json, etc.).
 *
 * Behavior:
 *  - When not using --compute, the script reads package.json from the current working directory.
 *  - When using --compute, computeVersion is run with cwd equal to process.cwd() so it operates
 *    on the consumer repository, not on the package internals.
 */
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const USE_COMPUTED = args.includes("--compute");

let version;

if (USE_COMPUTED) {
  console.log("🔢 Computing version dynamically...");
  try {
    const obj = computeVersion({ cwd: process.cwd() });
    version = obj.nextVersion;
  } catch {
    console.error("❌ Failed to compute version.");
    process.exit(1);
  }

  if (!version) {
    console.log("ℹ No version bump detected. Skipping tag creation.");
    process.exit(10);
  }
} else {
  console.log("📦 Using version from package.json...");
  try {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    version = pkg.version;
  } catch {
    console.error("❌ Failed to read package.json version.");
    process.exit(1);
  }
}

const tag = version;
console.log(`🔖 Release version: ${tag}`);

// check if tag exists
try {
  run(`git rev-parse ${tag}`, true);
  console.error(`❌ Tag ${tag} already exists.`);
  process.exit(1);
} catch {
  // OK
}

const tagMessage = `Release ${tag}`;

if (DRY_RUN) {
  console.log("🧪 Dry-run mode enabled.");
  console.log(`Would create annotated tag: ${tag}`);
  console.log(`Message: "${tagMessage}"`);
  console.log(`VERSION=${tag}`);
  process.exit(5);
}

try {
  run(`git tag -a ${tag} -m "${tagMessage}"`, false);
  run(`git push origin ${tag}`, false);
  console.log(JSON.stringify({ tag, tagMessage }, null, 2));
  process.exit(0);
} catch (err) {
  console.error("❌ Failed to create or push tag.", err);
  process.exit(1);
}
