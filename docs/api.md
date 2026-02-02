# API Documentation

While the scripts in `bin/*.js` contain only CLI wrappers, the programmatic APIs are exposed in the scripts in `lib/*.js`. This way you can call the core logic directly from Node without generating child processes. This is useful for integration tests, tools, or when you need to orchestrate the actions of another script.

Examples:

```js
import { computeVersion } from "release-suite/lib/version/compute.js";
import { generateChangelog } from "release-suite/lib/changelog/generate.js";
import { rebuildChangelog } from "release-suite/lib/changelog/rebuild.js";
import { generateReleaseNotes } from "release-suite/lib/release-notes.js";
import { createTag } from "release-suite/lib/create-tag.js";
import { dryRun } from "release-suite/lib/dry-run.js";

const result = computeVersion({ cwd: process.cwd() });
await generateChangelog({ cwd: process.cwd(), dryRun: true });
await rebuildChangelog({ cwd: process.cwd(), dryRun: true });
await generateReleaseNotes({ cwd: process.cwd(), dryRun: true });
await createTag({ cwd: process.cwd(), compute: true, dryRun: true });
await dryRun({ cwd: process.cwd(), action: "create" });
```

Notes:

- `cwd` controls the directory where git/package.json operations run (pass your consumer project's root).
- `dryRun: true` writes dry-run files (`CHANGELOG.dry-run.md`, `RELEASE_NOTES.dry-run.md`) and relaxes some external requirements (e.g., `gh`).

## computeVersion()

> See [`version.md`](version.md).

## generateChangelog() || rebuildChangelog() ⚠️

> See [`changelog.md`](changelog.md).

## generateReleaseNotes()

> See [`generate-release-notes.md`](generate-release-notes.md).

## createTag()

> See [`create-tag.md`](create-tag.md).

## dryRun()

> See [`dry-run.md`](dry-run.md).
