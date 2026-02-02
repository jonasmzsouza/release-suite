# 📦 Changelog

This document defines the **official contract** for changelog generation in **Release Suite**.

It covers:

- Programmatic APIs
- CLI commands and exit codes
- Dry-run behavior
- The ⚠️ **Danger Zone** rebuild operation

The contract is **stable, deterministic, and CI-safe**.

---

## 🧱 Architecture Overview

Changelog functionality follows the standard **two-layer model** used across Release Suite:

- `lib/` → Programmatic API (pure contracts, controlled side effects)
- `bin/` → CLI wrapper (arguments, stdout, exit codes)

Rules:

- All business logic lives in `lib/`
- CLI is a thin delegation layer
- JSON output is deterministic
- Exit codes are the source of truth for CI

---

## 🎯 Purpose

The changelog system exists to answer two distinct questions:

1. **Generate** — _What should be added to the changelog for the next release?_
2. **Rebuild** — _What should the changelog look like if rebuilt entirely from Git history?_

These concerns are intentionally separated.


### Release commits

- All semantic decisions about commits should be made on the normalized subject
- Squash commits are rendered as a single changelog entry.
- Commits whose sole purpose is to create or publish a release (e.g.
chore(release): 2.0.0) are intentionally excluded from the changelog.
- The changelog describes what changed, not that a release happened.

---

## 🧠 Programmatic API

### generateChangelog()

Generates a changelog entry **for the next release only** and inserts it into an existing `CHANGELOG.md`.

#### Signature

```ts
generateChangelog(options?: {
  cwd?: string;
  dryRun?: boolean;
}): GenerateChangelogResult
```

#### Behavior

- Delegates release decision to `computeVersion({ cwd })`
- Analyzes commits since the last Git tag
- Categorizes commits using semantic rules
- Inserts a new release section at the top of the changelog
- Preserves existing content and formatting

#### Output files

| Mode    | File written           |
| ------- | ---------------------- |
| normal  | `CHANGELOG.md`         |
| dry-run | `CHANGELOG.dry-run.md` |

---

### rebuildChangelog() ⚠️

Completely **rebuilds the changelog from Git history**.

This API **ignores all existing release sections** and treats Git as the **single source of truth**.

#### Signature

```ts
rebuildChangelog(options?: {
  cwd?: string;
  dryRun?: boolean;
}): RebuildChangelogResult
```

#### Behavior

- Reads **all Git tags**, sorted by version
- Reads **all commits per tag range**
- Filters invalid or non-semantic commits
- Recreates **all release sections**
- Eliminates:
  - empty sections
  - legacy garbage
  - commits without subjects
- Preserves only:
  - `# Changelog` title
  - introductory paragraphs below the title

#### Output files

| Mode    | File written                   |
| ------- | ------------------------------ |
| normal  | `CHANGELOG.md`                 |
| dry-run | `CHANGELOG.rebuild.dry-run.md` |

---

## 📜 Official Return Contracts (Frozen)

### GenerateChangelogResult

```ts
type GenerateChangelogResult =
  | {
      generated: true;
      version: string;
      commitsAnalyzed: number;
      file: string;
      dryRun: boolean;
    }
  | {
      generated: false;
      version: string;
      commitsAnalyzed: number;
      reason: "no-release" | "no-commits" | "already-exists";
    };
```

---

### RebuildChangelogResult

```ts
type RebuildChangelogResult =
  | {
      rebuilt: true;
      tagsAnalyzed: number;
      file: string;
      dryRun: boolean;
    }
  | {
      rebuilt: false;
      reason: "no-tags" | "no-valid-commits";
      commitsAnalyzed?: number;
    };
```

---

## 🖥 CLI

The CLI exposes a **single binary** with explicit actions.

```bash
npx rs-changelog generate [--dry-run]
npx rs-changelog rebuild  [--dry-run]
```

---

### rs-changelog generate

Generates a changelog entry for the **next release only**.

Example:

```bash
npx rs-changelog generate --dry-run
```

---

### rs-changelog rebuild ⚠️

⚠️ **Danger Zone**

This command will **completely rewrite your `CHANGELOG.md`**.

Example:

```bash
npx rs-changelog rebuild --dry-run
```

#### Safe workflow (recommended)

```bash
npx rs-changelog rebuild --dry-run
# review CHANGELOG.rebuild.dry-run.md

npx rs-changelog rebuild
```

This command:

- Never runs automatically
- Is not triggered by CI
- Must be invoked explicitly

---

## 🚦 CLI Exit Codes (Contract)

| Code | Meaning                                   |
| ---- | ----------------------------------------- |
| `0`  | Changelog generated or rebuilt            |
| `10` | No release detected / no tags found       |
| `2`  | No commits / no valid semantic commits    |
| `11` | Changelog entry already exists (generate) |
| `1`  | Invalid usage or unexpected error         |

> CI pipelines **must rely on exit codes**, not stdout parsing.

---

## 🔒 Safety Guarantees

- `rebuildChangelog` is **never executed implicitly**
- Dry-run must be explicitly requested
- No Git tags are created
- No versions are mutated
- No releases are published

---

## Relationship to Git & computeVersion

- `generateChangelog` delegates release decision to `computeVersion`
- `rebuildChangelog` **does not** use `computeVersion`
- Git history is the **only source of truth** for rebuild

---

## Versioning & Breaking Changes

- `rebuildChangelog` was introduced as part of a **major version**
- Any breaking change to these contracts requires:
  - Major version bump
  - Migration notes
  - CI-safe transition plan

---

## ✅ Summary

- Deterministic
- Git-first
- CI-safe
- Explicitly destructive when rebuilding
- No hidden side effects

The changelog system does exactly two things — and does them predictably.
