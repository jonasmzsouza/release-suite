import fs from "node:fs";
import path from "node:path";

import { config } from "../config.js";
import { run } from "../utils.js";
import { computeVersion } from "../version/compute.js";

/* ===========================
 * Core API (Programmatic)
 * =========================== */

/**
 * Create and push a Git tag.
 *
 * Programmatic API contract:
 * - MAY perform git side effects (unless dryRun=true)
 * - NEVER logs
 * - NEVER exits the process
 *
 * @param {{
 *   cwd?: string;
 *   dryRun?: boolean;
 * }} options
 *
 * @returns {{
 *   created: boolean,
 *   dryRun: boolean,
 *   tag?: string,
 *   tagMessage?: string,
 *   reason?: "no-bump" | "already-exists",
 * }}
 */
export function createTag({
  cwd = process.cwd(),
  dryRun = false,
} = {}) {
  let version;

  if (dryRun) {
    const compute = computeVersion({ cwd });

    if (!compute.hasRelease) {
      return {
        created: false,
        dryRun: dryRun,
        reason: "no-bump",
      };
    }

    version = compute.nextVersion;
  } else {
    const pkgPath = path.join(cwd, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    version = pkg.version;
  }

  const tag = `${config.tag.prefix}${version}`;
  const tagMessage = `Release ${tag}`;

  // Check if tag exists
  try {
    run(`git rev-parse ${tag}`);
    return {
      created: false,
      dryRun: dryRun,
      reason: "already-exists",
      tag,
    };
  } catch {
    // OK
  }

  if (dryRun) {
    return {
      created: false,
      dryRun: dryRun,
      tag,
      tagMessage,
    };
  } else {
    run(`git tag -a ${tag} -m "${tagMessage}"`, { captureOutput: false });
    run(`git push origin ${tag}`, { captureOutput: false });

    return {
      created: true,
      dryRun: dryRun,
      tag,
      tagMessage,
    };
  }
}
