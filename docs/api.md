# API Documentation

Each `bin/*.js` script now also exposes a programmatic API so you can call
the core logic directly from Node without spawning child processes. This
is useful for integration tests, tooling, or when you need to orchestrate
the actions from another script.

Examples:

```js
import { computeVersion } from "release-suite/bin/compute-version.js";
import { generateChangelog } from "release-suite/bin/generate-changelog.js";
import { generateReleaseNotes } from "release-suite/bin/generate-release-notes.js";

const result = computeVersion({ cwd: process.cwd() });
await generateChangelog({ isPreview: true, cwd: process.cwd() });
await generateReleaseNotes({ isPreview: true, cwd: process.cwd() });
```

Notes:

- `cwd` controls the directory where git/package.json operations run (pass your consumer project's root).
- `isPreview: true` writes preview files (`CHANGELOG.preview.md`, `RELEASE_NOTES.preview.md`) and relaxes some external requirements (e.g., `gh`).

## computeVersion()

> ℹ️ `computeVersion()` follows a strict, immutable contract.  
> See [`compute-version.md`](compute-version.md).
