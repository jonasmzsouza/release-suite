export function bitbucketProvider(repo) {
  return {
    buildUrl(ref) {
      if (ref.type === "pr") {
        return `${repo.url}/pull-requests/${ref.id}`;
      }
      return `${repo.url}/issues/${ref.id}`;
    }
  };
}