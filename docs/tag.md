# 📦 Tag

This document defines the **official contract** for tag creation in **Release Suite**.

It covers:

- Programmatic APIs
- CLI commands and exit codes
- Dry-run behavior

The contract is **stable, deterministic, and CI-safe**.

---

## 🧱 Architecture Overview

Tag functionality follows the standard **two-layer model** used across Release Suite:

- `lib/` → Programmatic API (pure contracts, controlled side effects)
- `bin/` → CLI wrapper (arguments, stdout, exit codes)

Rules:

- All business logic lives in `lib/`
- CLI is a thin delegation layer
- JSON output is deterministic
- Exit codes are the source of truth for CI

---

## 🎯 Purpose

- Create an annotated Git tag for a release
- Apply tag formatting rules from `release.config.js`
- Support dry-run execution
- Provide deterministic JSON output for CI pipelines

---

## ⚙️ Configuration

`createTag` consumes the shared Release Suite configuration file:

```bash
release.config.js
```

Relevant options:

```javascript
export default {
  tag: {
    prefix: "v" // "v" | ""
  }
};
```

### Tag resolution logic

- `createTag` applies `tag.prefix` when building the final Git tag

| Version | Prefix | Final tag |
| ------- | ------ | --------- |
| `1.2.3` | `"v"`  | `v1.2.3`  |
| `1.2.3` | `""`   | `1.2.3`   |

If the config file or property is missing, defaults are applied silently.

---

## 🧠 Programmatic API

### createTag()

#### Signature

```ts
createTag(options?: {
  cwd?: string;
  dryRun?: boolean;
}): CreateTagResult
```

#### Options

| Option   | Description                                                                              |
| -------- | ---------------------------------------------------------------------------------------- |
| `cwd`    | Working directory where Git and `package.json` are resolved. Defaults to `process.cwd()` |
| `dryRun` | dry-run mode. No git side effects should be executed by the caller                       |

---

## 📜 Official Return Contract (Frozen)

### CreateTagResult

```ts
type CreateTagResult =
  | {
      created: true;
      dryRun: boolean;
      tag: string;
      tagMessage: string;
    }
  | {
      created: false;
      dryRun: boolean;
      reason: "no-bump" | "already-exists";
      tag?: string;
      tagMessage?: string;
    };
```

---

## 🖥 CLI

The CLI exposes a **single binary** with explicit actions.

```bash
npx rs-tag create [--dry-run]
```

---

### rs-tag create

Creates a tag based on `package.json`. In dry-run mode, uses `computeVersion()`.

Example:

```bash
npx rs-tag create --dry-run
```

Dry-run mode represents a `dry-run intent`, not a separate execution path.

- `dryRun: true` is always reflected in the return object
- No Git side effects are performed
- `created` is always `false` in dry-run

---

## 🚦 CLI Exit Codes (Contract)

| Exit Code | Meaning            |
| --------- | ------------------ |
| `0`       | Tag created        |
| `10`      | No version bump    |
| `11`      | Tag already exists |
| `1`       | Unexpected error   |

> CI pipelines **must rely on exit codes**, not stdout parsing.

---

## 🚫 Explicit Non-Goals

### computeVersion()

Does **not**:

- Modify `package.json`
- Generate changelogs
- Create GitHub releases
- Authenticate GitHub
- Print logs or exit the process

These concerns belong to other tools in Release Suite.

---

## 🧊 Contract Stability

This contract is **stable and frozen**.

Any breaking change requires:

- Major version bump
- Migration notes
- CI-safe transition plan

---

## ✅ Summary

- Deterministic
- CI-safe
- JSON-first
- Dry-run-aware
- Side effects explicitly scoped

`createTag()` does exactly one thing — and does it predictably.
