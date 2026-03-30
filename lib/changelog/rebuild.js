import fs from "node:fs";
import path from "node:path";

import { categorizeCommits, isValidCommit, normalizeCommits } from "../commits.js";
import { config } from "../config.js";
import { getAllTagsSorted, getCommits, parseCommit } from "../git/git.js";
import { extractChangelogHeader, hasAnyContent, renderChangelog } from "./helpers.js";

export function rebuildChangelog({ cwd = process.cwd(), dryRun = true } = {}) {
  const tags = getAllTagsSorted(cwd);

  if (!tags.length) {
    return {
      rebuilt: false,
      reason: "no-tags",
      commitsAnalyzed: 0
    };
  }

  const sections = [];
  let commitsAnalyzed = 0;

  // oldest -> newest
  for (let i = 0; i < tags.length; i++) {
    const current = tags[i];
    const previous = tags[i - 1];

    const range = previous ? `${previous}..${current}` : current;

    const commits = getCommits(range, cwd).map(parseCommit).filter(isValidCommit);

    if (!commits.length) continue;

    commitsAnalyzed += commits.length;

    const normalized = normalizeCommits(commits);
    const buckets = categorizeCommits(normalized);

    if (!hasAnyContent(buckets)) continue;

    const version = `${config.tag.prefix}${current}`;
    sections.push(renderChangelog(version, buckets));
  }

  if (!sections.length) {
    return {
      rebuilt: false,
      reason: "no-valid-commits",
      commitsAnalyzed
    };
  }

  const sourcePath = path.join(cwd, "CHANGELOG.md");

  const header = fs.existsSync(sourcePath)
    ? extractChangelogHeader(fs.readFileSync(sourcePath, "utf8"))
    : "# Changelog\n\n";

  const output = header + sections.reverse().join("\n");

  const file = dryRun ? "CHANGELOG.rebuild.dry-run.md" : "CHANGELOG.md";

  fs.writeFileSync(path.join(cwd, file), output.trim() + "\n");

  return {
    rebuilt: true,
    tagsAnalyzed: tags.length,
    commitsAnalyzed,
    file,
    dryRun
  };
}
