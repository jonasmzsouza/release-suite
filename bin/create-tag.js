#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";

function run(cmd, silent = false) {
  return execSync(cmd, {
    stdio: silent ? "pipe" : "inherit",
    encoding: "utf8",
  }).trim();
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const USE_COMPUTED = args.includes("--compute");

let version;

if (USE_COMPUTED) {
  console.log("🔢 Computing version dynamically...");
  try {
    version = run("node bin/compute-version.js", true);
  } catch {
    console.error("❌ Failed to compute version.");
    process.exit(1);
  }

  if (!version) {
    console.log("ℹ No version bump detected. Skipping tag creation.");
    process.exit(0);
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

if (DRY_RUN) {
  console.log("🧪 Dry-run mode enabled.");
  console.log(`Would create and push tag: ${tag}`);
  console.log(`VERSION=${tag}`);
  process.exit(0);
}

run(`git tag ${tag}`);
run(`git push origin ${tag}`);

console.log(`✔ Tag ${tag} created and pushed`);
