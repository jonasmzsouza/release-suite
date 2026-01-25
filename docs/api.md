# API Documentation

While the scripts in `bin/*.js` contain only CLI wrappers, the programmatic APIs are exposed in the scripts in `lib/*.js`. This way you can call the core logic directly from Node without generating child processes. This is useful for integration tests, tools, or when you need to orchestrate the actions of another script.

Examples:

```js
import { computeVersion } from "release-suite/lib/compute-version.js";
import { generateChangelog } from "release-suite/lib/changelog.js";
import { generateReleaseNotes } from "release-suite/lib/release-notes.js";

const result = computeVersion({ cwd: process.cwd() });
await generateChangelog({ cwd: process.cwd(), isPreview: true });
await generateReleaseNotes({ cwd: process.cwd(), isPreview: true });
```

Notes:

- `cwd` controls the directory where git/package.json operations run (pass your consumer project's root).
- `isPreview: true` writes preview files (`CHANGELOG.preview.md`, `RELEASE_NOTES.preview.md`) and relaxes some external requirements (e.g., `gh`).

## computeVersion()
 
> See [`compute-version.md`](compute-version.md).

## generateChangelog()

> See [`generate-changelog.md`](generate-changelog.md).

## generateReleaseNotes()

> See [`generate-release-notes.md`](generate-release-notes.md).
