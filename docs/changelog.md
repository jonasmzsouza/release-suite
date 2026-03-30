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

### Internal Pipeline

```txt
git log
   ↓
parseCommit
   ↓
normalizeCommits
   ↓
createReferenceClassifier
   ↓
classifyReferences  ← dedupe + priority
   ↓
categorizeCommits
   ↓
renderChangelog
```

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

See [`docs/config.md`](config.md) for changelog customization options such as emoji rendering, tag prefixes, and release rule behavior.

- PR references (`#123`)
- Issue references (`#456`)
- Multi-reference support
- Provider-aware links

Example:

```md
- feat: add login ([#34](...), [#12](...))
```

Supported providers:

- GitHub
- GitLab
- Bitbucket

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
- Enriches commits with references and links
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

- Reads all Git tags
- Reconstructs releases from commit history
- Applies normalization + enrichment
- Removes invalid or empty content
- Preserves only header and intro

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

- No implicit destructive actions
- Rebuild is always explicit
- No Git mutations
- CI-safe behavior

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

- Git-first
- Provider-aware
- Deterministic
- CI-safe
- Extensible

Changelog generation is predictable, enriched, and platform-agnostic.
