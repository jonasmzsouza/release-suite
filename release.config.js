// release.config.js
export default {
  tag: {
    prefix: "",
  },

  changelog: {
    emojis: true,
  },

  releaseRules: {
    docs: "patch",
    ci: "patch",
    refactor: "patch",
    perf: "patch",
  }
};
