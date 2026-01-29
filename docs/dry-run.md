# 📦 druRun

The **dryRUn** feature allows consumers to generate or remove _dry-run artifacts_ (CHANGELOG and Release Notes) **before** performing an actual release.

It is designed to be:

- Deterministic
- CI‑friendly
- JSON‑first
- Fully aligned with the Release Suite contracts

Dry-run never creates tags, never publishes releases, and never mutates version state.

---

## 🧱 Architecture Overview

`dryRun` follows the **two-layer model** used across Release Suite::

- `lib/` → Programmatic API (pure contract, side effects allowed)
- `bin/` → CLI (I/O, flags, exit codes)

- **lib/** contains the Programmatic API
- **bin/** contains the CLI wrapper
- The CLI delegates all logic to the Core API

---

## 🎯 Purpose

Dry-run exists to answer a single question:

> _“If I were to release now, what would be released?”_

It does so by:

- Running `computeVersion`
- Determining whether a release would occur
- Generating **dry-run-only artifacts** when applicable

---

## Generated Files

When a dry-run release is detected, the following files are created in the **consumer repository** (current working directory):

- `CHANGELOG.dry-run.md`
- `RELEASE_NOTES.dry-run.md`

These files:

- Are never committed by this tool
- Are safe to generate repeatedly
- Can be freely inspected by humans or CI jobs

---

## 🧠 Programmatic API

### Signature

```ts
dryRun(options?: {
  cwd?: string;
  action: "create" | "remove";
}): DryRunResult
```

### Options

| Option   | Description                                                                              |
| -------- | ---------------------------------------------------------------------------------------- |
| `cwd`    | Working directory where Git and `package.json` are resolved. Defaults to `process.cwd()` |
| `action` | wait for one of the usage options: `create`or `remove`                                   |

---

## 📜 Official Return Contract (Frozen)

### Type Definition

```ts
type DryRunResult =
  | {
      action: string;
      removed: string[];
      generated?: undefined;
      reason?: undefined;
      baseVersion?: undefined;
      commitsAnalyzed?: undefined;
      version?: undefined;
      files?: undefined;
    }
  | {
      action: string;
      generated: boolean;
      reason: string;
      baseVersion: string;
      commitsAnalyzed: number;
      removed?: undefined;
      version?: undefined;
      files?: undefined;
    }
  | {
      action: string;
      generated: boolean;
      version: string | undefined;
      files: {
        changelog: string;
        releaseNotes: string;
      };
      removed?: undefined;
      reason?: undefined;
      baseVersion?: undefined;
      commitsAnalyzed?: undefined;
    };
```

---

### Return Types

### Create — Release detected

```json
{
  "action": "create",
  "generated": true,
  "version": "1.4.0",
  "files": {
    "changelog": "CHANGELOG.dry-run.md",
    "releaseNotes": "RELEASE_NOTES.dry-run.md"
  }
}
```

Exit code: `0`

---

### Create — No release detected

```json
{
  "action": "create",
  "generated": false,
  "reason": "no-release",
  "baseVersion": "1.3.2",
  "commitsAnalyzed": 5
}
```

Exit code: `10`

This condition is **not an error**.

---

### Remove

```json
{
  "action": "remove",
  "removed": ["CHANGELOG.dry-run.md", "RELEASE_NOTES.dry-run.md"]
}
```

Exit code: `0`

---

## 🖥 CLI Integration

The CLI wrapper (`rs-dry-run`) is a thin layer over `dryRun()`.

```bash
npx rs-dry-run create
npx rs-dry-run remove
```

### Commands

| Command  | Description                                          |
| -------- | ---------------------------------------------------- |
| `create` | Generates dry-run artifacts if a release is detected |
| `remove` | Removes dry-run artifacts from the cwd               |

---

## 🚦 CLI Exit Codes (Contract)

| Code | Meaning                                   |
| ---- | ----------------------------------------- |
| `0`  | Dry-run generated or removed successfully |
| `10` | No release detected (create)              |
| `1`  | Invalid usage or unexpected error         |

> CI pipelines **must rely on exit codes**, not stdout parsing.

---

## 🚫 Explicit Non-Goals

Dry-run guarantees that it:

- Never creates Git tags
- Never publishes releases
- Never mutates `package.json`
- Never logs to stdout/stderr (library)
- Never exits the process (library)

All side effects are strictly limited to dry-run files in the provided `cwd`.

---

## Relationship to `computeVersion`

Dry-run delegates **all release decision logic** to `computeVersion`.

If `computeVersion.hasRelease === false`, dry-run artifacts are not generated.

Dry-run does not override or reinterpret versioning rules.

---

## Versioning & Breaking Changes

Dry-run was introduced as part of a **major version** due to:

- New CLI surface
- New JSON contracts
- Explicit separation between CLI and programmatic API

Future changes to dryRun contracts **must** follow semantic versioning.

---

## ✅ Summary

Dry-run is a **safe, inspectable, and deterministic** way to understand what a release _would_ contain — without actually releasing anything.

It exists to support CI pipelines, review flows, and release confidence.
