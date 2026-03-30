import fs from "node:fs";
import path from "node:path";

import { hasAnyContent, renderChangelog } from "../changelog/helpers.js";
import { categorizeCommits, normalizeCommits } from "../commits.js";
import { config } from "../config.js";
import { getRepoInfo } from "../git/getRepoInfo.js";
import { getCommits, getLastTag, parseCommit } from "../git/git.js";
import { getProvider } from "../providers/index.js";
import { computeVersion } from "../version/compute.js";

export async function generateReleaseNotes({
  cwd = process.cwd(),
  dryRun = false,
  buckets: providedBuckets
} = {}) {
  let buckets = providedBuckets;
  let version = "";
  if (dryRun) {
    const compute = computeVersion({ cwd });
    version = compute.nextVersion;
  } else {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
    version = pkg.version;
  }

  const previousTag = getLastTag(cwd);
  const currentTag = `${config.tag.prefix}${version}`;

  const targetPath = path.join(cwd, dryRun ? "RELEASE_NOTES.dry-run.md" : "RELEASE_NOTES.md");

  // ---------------------------------
  // Dry-run
  // ---------------------------------
  if (dryRun) {
    const body = `# Release ${currentTag}

> ⚠ Dry-run mode  
> Release Notes will be generated automatically on publish.

`;

    fs.writeFileSync(targetPath, body, "utf8");

    return {
      generated: true,
      previousTag,
      currentTag,
      file: path.basename(targetPath),
      dryRun: true
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
      const compute = computeVersion({ cwd });
      if (!compute.hasRelease) {
        return { generated: false, reason: "no-release", currentTag };
      }

      const lastTag = getLastTag(cwd);
      const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
      const rawCommits = getCommits(range, cwd).map(parseCommit);
      const commits = normalizeCommits(rawCommits);
      buckets = categorizeCommits(commits);

      if (!hasAnyContent(buckets)) {
        return { generated: false, reason: "no-release", currentTag };
      }
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
      currentTag
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
