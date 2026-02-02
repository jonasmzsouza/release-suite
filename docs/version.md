# 📦 Version

This document defines the **official contract** for version calculation in **Release Suite**.

It covers:

- Programmatic APIs
- CLI commands and exit codes

The contract is **stable, deterministic, and CI-safe**.

---

## 🧱 Architecture Overview

Version functionality follows the standard **two-layer model** used across Release Suite:

- `lib/` → Programmatic API (pure contracts, controlled side effects)
- `bin/` → CLI wrapper (arguments, stdout, exit codes)

Rules:

- All business logic lives in `lib/`
- CLI is a thin delegation layer
- JSON output is deterministic
- Exit codes are the source of truth for CI

---

## 🎯 Purpose

- Analyze Git commits since the last release
- Detect semantic version bumps (`major`, `minor`, `patch`)
- Decide **if** a release should happen
- Provide deterministic, machine-readable output

Version **never mutates files**, **never prints logs**, and **never exits the process**.

---

## 🧠 Programmatic API

### computeVersion()

#### Signature

```ts
computeVersion(options?: {
  cwd?: string;
}): ComputeVersionResult
```

## 📜 Official Return Contract (Frozen)

### ComputeVersionResult

```ts
type ComputeVersionResult =
  | {
      hasRelease: true;
      baseVersion: string;
      nextVersion: string;
      bump: "major" | "minor" | "patch";
      commitsAnalyzed: number;
      tagPrefix: string;
    }
  | {
      hasRelease: false;
      baseVersion: string;
      reason: "no-bump-detected" | "no-commits";
      commitsAnalyzed: number;
      tagPrefix: string;
    };
```

---

## 🖥 CLI

The CLI exposes a **single binary** with explicit actions.

```bash
npx rs-version compute
```

---

### rs-version compute

Calculates a version based on **semantic commits**.

Example:

```bash
npx rs-version compute
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

## 🚦 CLI Exit Codes (Contract)

| Exit Code | Meaning                       |
| --------- | ----------------------------- |
| `0`       | Release generated             |
| `10`      | No bump detected              |
| `2`       | No commits since last release |
| `1`       | Unexpected error              |

> CI pipelines **must rely on exit codes**, not stdout parsing.

---

## 🚫 Explicit Non-Goals

### computeVersion()

Does **not**:

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
