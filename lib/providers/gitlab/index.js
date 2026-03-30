import { generateReleaseNotesViaAPI } from "./api.js";

export function gitlabProvider(repo) {
  return {
    buildUrl(ref) {
      if (ref.type === "pr") {
        return `${repo.url}/-/merge_requests/${ref.id}`;
      }
      return `${repo.url}/-/issues/${ref.id}`;
    },

    async generateReleaseNotes({ previousTag, currentTag, token = process.env.GITLAB_TOKEN }) {
      const result = await generateReleaseNotesViaAPI({
        repo,
        previousTag,
        currentTag,
        token
      });

      if (result.ok) {
        return {
          ok: true,
          content: result.content
        };
      }

      return {
        ok: false,
        reason: result.reason,
        status: result.status,
        error: result.error
      };
    }
  };
}
