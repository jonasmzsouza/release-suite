# 🧾 generateChangelog

`generateReleaseNotes()` produces **GitHub-native release notes**, using the same logic as the **GitHub UI “Generate release notes” button**.

This document defines its **official contract**, covering both **Programmatic API (lib)** and **CLI wrapper (bin)**.

---

## 🧱 Architecture Overview

Release Suite follows a **two-layer model**:

- **Core API:** `lib/release-notes.js`
- **CLI wrapper:** `bin/generate-release-notes.js`

The core API uses **GitHub APIs** (via GH CLI authentication).

---

## 🎯 Purpose

- Generate GitHub-style release notes
- Match GitHub UI output exactly
- Persist notes to disk
- Support dry-run mode for CI

---

## 🧠 Programmatic API

### Signature

```ts
generateReleaseNotes(options?: {
  cwd?: string;
  dryRun?: boolean;
}): GenerateReleaseNotesResult
```

### Options

| Option   | Description                                                                              |
| -------- | ---------------------------------------------------------------------------------------- |
| `cwd`    | Working directory where Git and `package.json` are resolved. Defaults to `process.cwd()` |
| `dryRun` | If true, generate a local dry-run file and skip calling the GitHub API.                  |

---

## 📜 Official Return Contract (Frozen)

### Type Definition

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

## 🖥 CLI Integration

The CLI wrapper (`rs-generate-release-notes`) is a thin layer on top of `generateReleaseNotes()`.

### Flags

| Flag        | Description                      |
| ----------- | -------------------------------- |
| `--dry-run` | Write `RELEASE_NOTES.dry-run.md` |

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
