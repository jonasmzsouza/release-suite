import fs from "node:fs";
import path from "node:path";

import { generateChangelog } from "./changelog/generate.js";
import { computeVersion } from "./compute-version.js";
import { config } from "./config.js";
import { generateReleaseNotes } from "./release-notes.js";

/* ===========================
 * Core API (Programmatic)
 * =========================== */

/**
 * Generate or remove dry-run artifacts.
 *
 * Programmatic API contract:
 * - MAY write/remove dry-run files
 * - NEVER logs
 * - NEVER exits the process
 *
 * @param {{
 *   cwd?: string;
 *   action: "create" | "remove";
 * }} options
 */
export function dryRun({
  cwd = process.cwd(),
  action,
} = {}) {
  const files = {
    changelog: path.join(cwd, "CHANGELOG.dry-run.md"),
    releaseNotes: path.join(cwd, "RELEASE_NOTES.dry-run.md"),
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
    throw new Error(`Invalid dry-run action: ${action}`);
  }

  const compute = computeVersion({ cwd });

  if (!compute.hasRelease) {
    return {
      action: "create",
      generated: false,
      reason: "no-release",
      baseVersion: `${config.tag.prefix}${compute.baseVersion}`,
      commitsAnalyzed: compute.commitsAnalyzed,
    };
  }

  generateChangelog({ cwd, dryRun: true });
  generateReleaseNotes({ cwd, dryRun: true });

  return {
    action: "create",
    generated: true,
    version: `${config.tag.prefix}${compute.nextVersion}`,
    files: {
      changelog: path.basename(files.changelog),
      releaseNotes: path.basename(files.releaseNotes),
    },
  };
}
