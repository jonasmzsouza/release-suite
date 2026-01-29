import fs from "node:fs";
import path from "node:path";

import { generateChangelog } from "./changelog.js";
import { computeVersion } from "./compute-version.js";
import { generateReleaseNotes } from "./release-notes.js";

/* ===========================
 * Core API (Programmatic)
 * =========================== */

/**
 * Generate or remove preview artifacts.
 *
 * Programmatic API contract:
 * - MAY write/remove preview files
 * - NEVER logs
 * - NEVER exits the process
 *
 * @param {{
 *   cwd?: string;
 *   action: "create" | "remove";
 * }} options
 */
export function preview({
  cwd = process.cwd(),
  action,
} = {}) {
  const files = {
    changelog: path.join(cwd, "CHANGELOG.preview.md"),
    releaseNotes: path.join(cwd, "RELEASE_NOTES.preview.md"),
  };

  if (action === "remove") {
    const removed = [];

    for (const file of Object.values(files)) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        removed.push(path.basename(file));
      }
    }

    return {
      action: "remove",
      removed,
    };
  }

  if (action !== "create") {
    throw new Error(`Invalid preview action: ${action}`);
  }

  const compute = computeVersion({ cwd });

  if (!compute.hasRelease) {
    return {
      action: "create",
      generated: false,
      reason: "no-release",
      baseVersion: compute.baseVersion,
      commitsAnalyzed: compute.commitsAnalyzed,
    };
  }

  generateChangelog({ cwd, isPreview: true });
  generateReleaseNotes({ cwd, isPreview: true });

  return {
    action: "create",
    generated: true,
    version: compute.nextVersion,
    files: {
      changelog: path.basename(files.changelog),
      releaseNotes: path.basename(files.releaseNotes),
    },
  };
}
