#!/usr/bin/env node
import fs from "node:fs";
import { generateChangelog } from "../lib/changelog.js";
import { computeVersion } from "../lib/compute-version.js";
import { generateReleaseNotes } from "./generate-release-notes.js";

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
