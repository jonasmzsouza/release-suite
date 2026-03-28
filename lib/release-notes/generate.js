import fs from "node:fs";
import path from "node:path";

import { renderChangelog } from "../changelog/helpers.js";
import { config } from "../config.js";
import { getRepoInfo } from "../git/getRepoInfo.js";
import { getLastTag } from "../git/git.js";
import { getProvider } from "../providers/index.js";
import { computeVersion } from "../version/compute.js";

export async function generateReleaseNotes({
  cwd = process.cwd(),
  dryRun = false,
  buckets
} = {}) {

  let version = "";
  if (dryRun) {
    const compute = computeVersion({ cwd });
    version = compute.nextVersion;
  } else {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(cwd, "package.json"), "utf8")
    );
    version = pkg.version;
  }

  const previousTag = getLastTag(cwd);
  const currentTag = `${config.tag.prefix}${version}`;

  const targetPath = path.join(
    cwd,
    dryRun ? "RELEASE_NOTES.dry-run.md" : "RELEASE_NOTES.md"
  );

  // ---------------------------------
  // Dry-run
  // ---------------------------------
  if (dryRun) {
    const body = `# Release ${currentTag}

> ⚠ Dry-run mode  
> GitHub Release Notes will be generated automatically on publish.

`;

    fs.writeFileSync(targetPath, body, "utf8");

    return {
      generated: true,
      previousTag,
      currentTag,
      file: path.basename(targetPath),
      dryRun: true,
    };
  }

  // ---------------------------------
  // Provider (GitHub, GitLab, etc)
  // ---------------------------------
  const repo = getRepoInfo(cwd);
  const provider = getProvider(repo);

  let content = null;
  let source = "local";
  let fallbackReason = null;

  if (provider?.generateReleaseNotes) {
    const result = await provider.generateReleaseNotes({
      cwd,
      previousTag,
      currentTag
    });

    if (result.ok && result.content) {
      content = result.content;
      source = repo.provider;
    } else {
      fallbackReason = result.reason;
    }
  }

  // ---------------------------------
  // Fallback LOCAL
  // ---------------------------------
  if (!content) {
    if (!buckets) {
      return {
        generated: false,
        reason: "no-release",
        currentTag,
      };
    }

    content = renderChangelog(currentTag, buckets);
  }

  // ---------------------------------
  // Write file
  // ---------------------------------
  if (fs.existsSync(targetPath)) {
    return {
      generated: false,
      reason: "already-exists",
      currentTag,
    };
  }

  fs.writeFileSync(targetPath, content.trim() + "\n", "utf8");

  return {
    generated: true,
    previousTag,
    currentTag,
    file: path.basename(targetPath),
    dryRun: false,
    source,
    fallbackReason
  };
}
