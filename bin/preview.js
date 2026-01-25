#!/usr/bin/env node
import fs from "node:fs";
import { generateChangelog } from "../lib/changelog.js";
import { computeVersion } from "../lib/compute-version.js";
import { generateReleaseNotes } from "../lib/release-notes.js";

/**
 * CLI entrypoint for generating / removing preview artifacts.
 *
 * Purpose:
 *  - When invoked with `create`, computes whether a preview release should be produced and,
 *    if so, writes preview CHANGELOG.preview.md and RELEASE_NOTES.preview.md into the current
 *    working directory (the consuming project).
 *
 *  - When invoked with `remove`, deletes those preview files from the consuming project's cwd.
 *
 * Important notes about path resolution:
 *  - The script calls functions from the package's lib modules (generateChangelog, generateReleaseNotes,
 *    computeVersion) with isPreview=true so those functions can be implemented to respect a `cwd`
 *    argument and create files in the consumer repository.
 *
 * CLI:
 *  - preview.js create  -> generate preview files (exit 0 when generated, 10 if no release)
 *  - preview.js remove  -> remove preview files (exit 0)
 *
 * Environment:
 *  - Sets process.env.PREVIEW_MODE = "true" to hint downstream functions that they should run in preview mode.
 */

process.env.PREVIEW_MODE = "true";

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

  const versionResult = computeVersion({ isPreview: true });

  console.log("🔖 Computed version:");
  console.log(versionResult);

  if (!versionResult.hasRelease) {
    console.log(
      `⚠ No preview generated (${versionResult.reason}). Base version: ${versionResult.baseVersion}`
    );
    process.exit(0);
  }

  generateChangelog({ isPreview: true });
  generateReleaseNotes({ isPreview: true });

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
