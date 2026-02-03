# 🧾 Release Notes

This document defines the **official contract** for changelog generation in **Release Suite**.

It covers:

- Programmatic APIs
- CLI commands and exit codes
- Dry-run behavior

The contract is **stable, deterministic, and CI-safe**.

---

## 🧱 Architecture Overview

Release Notes functionality follows the standard **two-layer model** used across Release Suite:

- `lib/` → Programmatic API (pure contracts, controlled side effects)
- `bin/` → CLI wrapper (arguments, stdout, exit codes)

Rules:

- All business logic lives in `lib/`
- CLI is a thin delegation layer
- JSON output is deterministic
- Exit codes are the source of truth for CI

---

## 🎯 Purpose

- Generate GitHub-style release notes
- Match GitHub UI output exactly
- Persist notes to disk
- Support dry-run mode for CI

---

## 🧠 Programmatic API

### Signature

#### generateReleaseNotes()

```ts
generateReleaseNotes(options?: {
  cwd?: string;
  dryRun?: boolean;
}): GenerateReleaseNotesResult
```

#### Behavior

- Get the version from `package.json`
- Get the previous release tag
- Extracts the GitHub repository path (owner/name)
- Get the default branch name
- Generate release notes via the GitHub API

#### Output files

| Mode    | File written               |
| ------- | -------------------------- |
| normal  | `RELEASE_NOTES.md`         |
| dry-run | `RELEASE_NOTES.dry-run.md` |

#### Options

| Option   | Description                                                                              |
| -------- | ---------------------------------------------------------------------------------------- |
| `cwd`    | Working directory where Git and `package.json` are resolved. Defaults to `process.cwd()` |
| `dryRun` | dry-run mode. No git side effects should be executed by the caller                       |

---

## 📜 Official Return Contract (Frozen)

### GenerateReleaseNotesResult

```ts
type GenerateReleaseNotesResult =
  | {
      generated: boolean;
      currentTag: any;
      previousTag: string | null;
      file: string;
      dryRun: boolean;
      reason?: undefined;
    }
  | {
      generated: boolean;
      reason: string;
      currentTag: any;
      previousTag?: undefined;
      file?: undefined;
      dryRun?: undefined;
    };
```

---

## 🖥 CLI

The CLI exposes a **single binary** with explicit actions.

```bash
npx rs-release-notes generate [--dry-run]
```

---

### rs-tag create

Generates a release notes using the official GitHub API, just like GitHub's “Generate release notes” button (UI).
In dry-run mode, it only uses `computeVersion()`, but does not show details.

Example:

```bash
npx rs-release-notes generate --dry-run
```

---

## 🚦 CLI Exit Codes (Contract)

| Exit Code | Meaning                 |
| --------- | ----------------------- |
| `0`       | Release notes generated |
| `10`      | No release detected     |
| `11`      | Version already exists  |
| `2`       | Missing gh / repo       |
| `1`       | Unexpected error        |

> CI pipelines **must** rely on exit codes, not stdout parsing.

---

## ⚠️ Requirements

- GitHub CLI (`gh`) must be installed
- Repository must be authenticated (`gh auth status`)

---

## 🧊 Contract Stability

This contract is **stable** and aligned with GitHub’s release notes API behavior.
