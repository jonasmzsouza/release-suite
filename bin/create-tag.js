#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import { computeVersion } from "./compute-version.js";

function run(cmd, captureOutput = true) {
  if (captureOutput) {
    const output = execSync(cmd, { encoding: "utf8", stdio: "pipe" });
    return output ? output.trim() : "";
  } else {
    execSync(cmd, { stdio: "inherit" });
  }
  return "";
}

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
