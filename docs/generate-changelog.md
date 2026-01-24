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

- Generate a `CHANGELOG.md` (or preview)
- Insert new releases above the first `##` section
- Preserve existing content
- Be safe for CI and squash-merge workflows

---

## 🧠 Programmatic API

### Signature

```ts
generateChangelog(options?: {
  cwd?: string;
  isPreview?: boolean;
}): GenerateChangelogResult
```

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
      preview: boolean;
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
| `--json`    | Output result as JSON        |
| `--preview` | Write `CHANGELOG.preview.md` |

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
