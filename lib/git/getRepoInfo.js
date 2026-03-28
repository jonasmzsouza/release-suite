import { execSync } from "node:child_process";

export function getRepoInfo(cwd = process.cwd()) {
  try {
    const raw = execSync("git remote get-url origin", { cwd })
      .toString()
      .trim();

    const normalized = normalizeRepoUrl(raw);

    if (!normalized) return null;

    return {
      url: normalized,
      provider: detectProvider(normalized),
    };
  } catch {
    return null;
  }
}

function normalizeRepoUrl(url) {
  // SSH
  if (url.startsWith("git@")) {
    const match = url.match(/git@(.*?):(.*?)(\.git)?$/);
    if (!match) return null;

    const [, host, repo] = match;
    return `https://${host}/${repo}`;
  }

  // HTTPS
  if (url.startsWith("http")) {
    return url.replace(/\.git$/, "");
  }

  return null;
}

function detectProvider(url) {
  if (url.includes("github.com")) return "github";
  if (url.includes("gitlab.com")) return "gitlab";
  if (url.includes("bitbucket.org")) return "bitbucket";
  return "unknown";
}