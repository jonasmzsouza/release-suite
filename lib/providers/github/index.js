export function githubProvider(repo) {
  return {
    buildUrl(ref) {
      if (ref.type === "pr") {
        return `${repo.url}/pull/${ref.id}`;
      }
      return `${repo.url}/issues/${ref.id}`;
    }
  };
}