export function gitlabProvider(repo) {
  return {
    buildUrl(ref) {
      if (ref.type === "pr") {
        return `${repo.url}/-/merge_requests/${ref.id}`;
      }
      return `${repo.url}/-/issues/${ref.id}`;
    }
  };
}