#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";

process.env.PREVIEW_MODE = "true";

const run = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();

const filesMap = {
  changelog: "CHANGELOG.preview.md",
  notes: "RELEASE_NOTES.preview.md",
};

const action = process.argv[2];

if (!["create", "remove"].includes(action)) {
  console.log("Usage: preview.js [create|remove]");
  process.exit(1);
}

if (action === "create") {
  console.log("🔧 Generating preview files...");

  const versionOutput = run("node bin/compute-version.js");

  if (versionOutput) {
    console.log("🔖 Computed version:");
    console.log(versionOutput);
  }

  run("node bin/generate-changelog.js");
  run("node bin/generate-release-notes.js");

  console.log("✅ Preview ready:");
  console.log(" -", filesMap.changelog);
  console.log(" -", filesMap.notes);
  process.exit(0);
}

if (action === "remove") {
  console.log("🧹 Removing preview files...");
  for (const f of Object.values(filesMap)) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  console.log("✔ Preview cleared.");
  process.exit(0);
}
