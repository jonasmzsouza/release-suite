import fs from "node:fs";
import path from "node:path";
import { computeVersion } from "./compute-version.js";
import { run } from "./utils.js";

/* ===========================
 * Core API (Programmatic)
 * =========================== */

/**
 * Create and push a Git tag.
 *
 * Programmatic API contract:
 * - MAY perform git side effects (unless preview=true)
 * - NEVER logs
 * - NEVER exits the process
 *
 * @param {{
 *   cwd?: string;
 *   compute?: boolean;
 *   isPreview?: boolean;
 * }} options
 *
 * @returns {{
 *   created: boolean;
 *   preview: boolean;
 *   tag?: string;
 *   tagMessage?: string;
 *   reason?: "no-bump" | "already-exists";
 * }}
 */
export function createTag({
  cwd = process.cwd(),
  compute = false,
  isPreview = false,
} = {}) {
  let version;

  if (compute) {
    const result = computeVersion({ cwd });

    if (!result.hasRelease) {
      return {
        created: false,
        preview: isPreview,
        reason: "no-bump",
      };
    }

    version = result.nextVersion;
  } else {
    const pkgPath = path.join(cwd, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    version = pkg.version;
  }

  const tag = version;
  const tagMessage = `Release ${tag}`;

  // Check if tag exists
  try {
    run(`git rev-parse ${tag}`);
    return {
      created: false,
      preview: isPreview,
      reason: "already-exists",
      tag,
    };
  } catch {
    // OK
  }

  if (isPreview) {
    return {
      created: false,
      preview: isPreview,
      tag,
      tagMessage,
    };
  } else {
    run(`git tag -a ${tag} -m "${tagMessage}"`, { captureOutput: false });
    run(`git push origin ${tag}`, { captureOutput: false });

    return {
      created: true,
      preview: isPreview,
      tag,
      tagMessage,
    };
  }
}
