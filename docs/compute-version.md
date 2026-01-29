# 📦 computeVersion

`computeVersion()` is the core engine of **Release Suite**.  
It is responsible for analyzing Git history and determining whether a new semantic version should be released.

This document defines its **official, immutable contract**, covering both **Programmatic API (lib)** and **CLI wrapper (bin)**.

---

## 🧱 Architecture Overview

Release Suite follows a **two-layer model**:

- `lib/` → Programmatic API (pure, deterministic, side-effect free)
- `bin/` → CLI wrapper (I/O, logs, exit codes)

`computeVersion()` lives in `lib/compute-version.js`
The CLI command `rs-compute-version` lives in `bin/compute-version.js`

---

## 🎯 Purpose

- Analyze Git commits since the last release
- Detect semantic version bumps (`major`, `minor`, `patch`)
- Decide **if** a release should happen
- Provide deterministic, machine-readable output

`computeVersion()` **never mutates files**, **never prints logs**, and **never exits the process**.

---

## 🧠 Programmatic API

### Signature

```ts
computeVersion(options?: {
  cwd?: string;
}): ComputeVersionResult
```

### Options

| Option | Description                                                                              |
| ------ | ---------------------------------------------------------------------------------------- |
| `cwd`  | Working directory where Git and `package.json` are resolved. Defaults to `process.cwd()` |

---

## 📜 Official Return Contract (Frozen)

### Type Definition

```ts
type ComputeVersionResult =
  | {
      hasRelease: true;
      baseVersion: string;
      nextVersion: string;
      bump: "major" | "minor" | "patch";
      commitsAnalyzed: number;
    }
  | {
      hasRelease: false;
      baseVersion: string;
      reason: "no-bump-detected" | "no-commits";
      commitsAnalyzed: number;
    };
```

---

## 🟢 Release Detected

Returned when at least one commit implies a semantic bump.

Example:

```json
{
  "hasRelease": true,
  "baseVersion": "1.4.2",
  "nextVersion": "1.5.0",
  "bump": "minor",
  "commitsAnalyzed": 8
}
```

---

## 🟡 No Release Detected

### No commits since last release

```json
{
  "hasRelease": false,
  "reason": "no-commits",
  "baseVersion": "1.4.2",
  "commitsAnalyzed": 0
}
```

### Commits found, but no semantic bump

```json
{
  "hasRelease": false,
  "reason": "no-bump-detected",
  "baseVersion": "1.4.2",
  "commitsAnalyzed": 5
}
```

---

## 🧪 Semantic Bump Rules

The highest bump found **wins**:

| Commit Type                | Bump    |
| -------------------------- | ------- |
| `feat!`, `BREAKING CHANGE` | `major` |
| `feat`                     | `minor` |
| `fix`, `perf`, `refactor`  | `patch` |

Custom prefixes and emojis are supported as long as they resolve to these semantic meanings.

---

## 🔀 Squash & Merge Strategy

`computeVersion()` works in **both**:

- Full commit history (merge commits)
- Squash & merge workflows

### ⚠️ Important Recommendation

If your repository uses **Squash & Merge**, configure GitHub to:

> **“Use Pull request title and commit details”**

And enforce **Conventional Commits** in PR titles:

```text
fix: normalize path resolution
feat!: drop legacy API support
```

This ensures `computeVersion()` can reliably detect semantic intent.

---

## 🖥 CLI Integration

The CLI wrapper (`rs-compute-version`) is a thin layer on top of `computeVersion()`.

---

## 🚦 CLI Exit Codes (Contract)

| Exit Code | Meaning                       |
| --------- | ----------------------------- |
| `0`       | Release generated             |
| `10`      | No bump detected              |
| `2`       | No commits since last release |
| `1`       | Unexpected error              |

> CI pipelines **must** rely on exit codes, not stdout parsing.

---

## 🚫 Explicit Non-Goals

`computeVersion()` does **not**:

- Modify `package.json`
- Create Git tags
- Generate changelogs
- Access GitHub APIs
- Enforce commit conventions

These responsibilities belong to other tools in Release Suite.

---

## 🧊 Contract Stability

This contract is considered **stable and frozen**.

Any breaking change requires:

- Major version bump of `release-suite`
- Explicit migration notes
- CI-safe transition plan

---

## ✅ Summary

- Deterministic
- Side-effect free
- CI-safe
- Fully testable
- Explicit failure modes

`computeVersion()` is designed to be boring — and reliable.
