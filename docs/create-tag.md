# 📦 createTag

`createTag()` is responsible for creating and pushing Git tags in a controlled, contract-driven way.
It supports **computed releases**, **dry-run execution**, and **CI-safe exit signaling**.

This document defines its **official, immutable contract**, covering both **Programmatic API (lib)** and **CLI wrapper (bin)**.

---

## 🧱 Architecture Overview

`create-tag` follows the **two-layer model** used across Release Suite::

- `lib/` → Programmatic API (pure contract, side effects allowed)
- `bin/` → CLI (I/O, flags, exit codes)

- **lib/** contains the Programmatic API
- **bin/** contains the CLI wrapper
- The CLI delegates all logic to the Core API

---

## 🎯 Purpose

- Create an annotated Git tag for a release
- Optionally compute the next version using `computeVersion`
- Support dry-run execution
- Provide deterministic JSON output for CI pipelines

---

## 🧠 Programmatic API

### Signature

```ts
createTag(options?: {
  cwd?: string;
  compute?: boolean;
  dryRun?: boolean;
}): CreateTagResult
```

### Options

| Option    | Description                                                                              |
| --------- | ---------------------------------------------------------------------------------------- |
| `cwd`     | Working directory where Git and `package.json` are resolved. Defaults to `process.cwd()` |
| `compute` | If true, computes the next version using `computeVersion()`                              |
| `dryRun`  | dry-run mode. No git side effects should be executed by the caller                       |

---

## 📜 Official Return Contract (Frozen)

### Type Definition

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

## 🟢 Tag Created

Returned when a tag is successfully created and pushed.

Example:

```json
{
  "created": true,
  "dryRun": false,
  "tag": "2.0.0",
  "tagMessage": "Release 2.0.0"
}
```

---

## 🟡 No Tag Created

### No version bump detected (`--compute`)

```json
{
  "created": false,
  "dryRun": false,
  "reason": "no-bump"
}
```

### Tag already exists

```json
{
  "created": false,
  "dryRun": false,
  "reason": "already-exists",
  "tag": "1.2.3",
  "tagMessage": "Release 1.2.3"
}
```

---

## 🧪 Dry-run Mode

Dry-run mode represents a `dry-run intent`, not a separate execution path.

- `dryRun: true` is always reflected in the return object
- The CLI decides how to interpret dryRun results
- The Core API does not branch logic based on dryRun flags
- Can be used in conjunction with the `--compute` flag

Example:

```bash
node bin/create-tag.js --compute --dry-run
```

```json
{
  "created": false, //reflects false because of the dryRun, even though it has compute
  "dryRun": true,
  "tag": "1.4.0",
  "tagMessage": "Release 1.4.0"
}
```

---

## 🖥 CLI Integration

The CLI wrapper (`rs-create-tag`) is a thin layer over `createTag()`.

### Flags

| Flag        | Description  |
| ----------- | ------------ |
| `--dry-run` | Dry-run mode |

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

`createTag()` does **not**:

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
