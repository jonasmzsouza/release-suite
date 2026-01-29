# 🧾 generateChangelog

`generateChangelog()` generates a semantic changelog from Git history, following the same commit analysis rules as `computeVersion()`.

This document defines its **official contract**, covering both **Programmatic API (lib)** and **CLI wrapper (bin)**.

---

## 🧱 Architecture Overview

Release Suite follows a **two-layer model**:

- **Core API:** `lib/changelog.js`
- **CLI wrapper:** `bin/generate-changelog.js`

The CLI performs argument parsing, logging, and exit codes.
All logic lives in `lib/`.

---

## 🎯 Purpose

- Generate a `CHANGELOG.md` (or dry-run)
- Insert new releases above the first `##` section
- Preserve existing content
- Be safe for CI and squash-merge workflows

---

## 🧠 Programmatic API

### Signature

```ts
generateChangelog(options?: {
  cwd?: string;
  dryRun?: boolean;
}): GenerateChangelogResult
```

### Options

| Option   | Description                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------- |
| `cwd`    | Working directory containing the git repository and CHANGELOG file. Defaults to `process.cwd()`    |
| `dryRun` | When true, write output to `CHANGELOG.dry-run.md` and do not consider "already exists" as blocking |

---

## 📜 Official Return Contract (Frozen)

### Type Definition

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
      reason: "no-release" | "already-exists";
      commitsAnalyzed: number;
    };
```

---

## 🖥 CLI Integration

The CLI wrapper (`rs-generate-changelog`) is a thin layer on top of `generateChangelog()`.

### Flags

| Flag        | Description                  |
| ----------- | ---------------------------- |
| `--dry-run` | Write `CHANGELOG.dry-run.md` |

---

## 🚦 CLI Exit Codes (Contract)

| Exit Code | Meaning                |
| --------- | ---------------------- |
| `0`       | Changelog generated    |
| `10`      | No release detected    |
| `11`      | Version already exists |
| `1`       | Unexpected error       |

> CI pipelines **must** rely on exit codes, not stdout parsing.

---

## 🚫 Explicit Non-Goals

`generateChangelog()` does **not**:

- Modify `package.json`
- Create Git tags
- Publish GitHub releases

These responsibilities belong to other tools in Release Suite.
