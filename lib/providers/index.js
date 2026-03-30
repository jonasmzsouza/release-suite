import { bitbucketProvider } from "./bitbucket/index.js";
import { githubProvider } from "./github/index.js";
import { gitlabProvider } from "./gitlab/index.js";

export function getProvider(repo) {
  switch (repo?.provider) {
    case "github":
      return githubProvider(repo);
    case "gitlab":
      return gitlabProvider(repo);
    case "bitbucket":
      return bitbucketProvider(repo);
    default:
      return null;
  }
}
