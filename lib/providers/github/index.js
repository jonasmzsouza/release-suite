import {
  ensureGhCLI,
  getRepoFromGit,
  getDefaultBranch,
  generateReleaseNotesViaAPI,
} from "./api.js"

export function githubProvider(repo) {
  return {
    buildUrl(ref) {
      if (ref.type === "pr") {
        return `${repo.url}/pull/${ref.id}`;
      }
      return `${repo.url}/issues/${ref.id}`;
    },

    async generateReleaseNotes({
      cwd,
      previousTag,
      currentTag
    }) {
      try {
        ensureGhCLI();

        const repoFull = getRepoFromGit(cwd);
        if (!repoFull) {
          return { ok: false, reason: "no-repo" };
        }

        const [owner, name] = repoFull.split("/");
        const targetBranch = getDefaultBranch(cwd);

        const result = generateReleaseNotesViaAPI({
          owner,
          repo: name,
          previousTag,
          currentTag,
          targetBranch,
          cwd,
        });

        if (!result || !result.body) {
          return { ok: false, reason: "api-error" };
        }

        return {
          ok: true,
          content: result.body
        };

      } catch (err) {
        return {
          ok: false,
          reason: "exception",
          status: err.status,
          error: err.message
        };
      }
    }
  };
}