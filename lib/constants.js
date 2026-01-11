// Constants used across the release-suite package

// Commit types recognized in Conventional Commits
export const COMMIT_TYPES = [
  'feat',
  'fix',
  'refactor',
  'docs',
  'chore',
  'style',
  'test',
  'build',
  'perf',
  'ci',
  'raw',
  'cleanup',
  'remove',
].join('|');

export const COMMIT_RE = new RegExp(
  `^(${COMMIT_TYPES})(\\(.+\\))?(!)?:\\s*`,
  'i'
);

export const COMMIT_EMOJI_RE = new RegExp(
  `^(:\\S+: )?(${COMMIT_TYPES})(\\(.+\\))?(!)?:`,
  'i'
);
