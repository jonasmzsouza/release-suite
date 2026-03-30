# 🧾 Release Notes

This document defines how **Release Suite** generates release notes across different Git providers.

The system is **provider-aware**, **resilient**, and **fallback-safe**.

---

## 🧱 Architecture Overview

Release Notes functionality follows the standard **two-layer model** used across Release Suite:

- `lib/` → Programmatic API (pure contracts, controlled side effects)
- `bin/` → CLI wrapper (arguments, stdout, exit codes)

### Internal Pipeline

Release notes follow a **provider-based architecture**:

```txt
generateReleaseNotes (core)
   ↓
provider adapter (GitHub / GitLab / Bitbucket)
   ↓
API (if available)
   ↓
fallback (local changelog renderer)`
```

Rules:

- All business logic lives in `lib/`
- CLI is a thin delegation layer
- JSON output is deterministic
- Exit codes are the source of truth for CI

---

## 🎯 Purpose

Release notes answer:

> _What changed in this release in a user-facing format?_

Unlike the changelog, release notes:

- Are optimized for readability
- May use provider APIs (GitHub / GitLab)
- Can fallback to local generation

---

## 🌍 Supported Providers

| Provider  | API Support | Behavior        |
| --------- | ----------- | --------------- |
| GitHub    | ✅          | Uses GitHub API |
| GitLab    | ✅          | Uses GitLab API |
| Bitbucket | ❌          | Fallback only   |

---

## 🔁 Execution Flow

1. Resolve repository info from Git
2. Detect provider (GitHub, GitLab, Bitbucket)
3. Attempt provider API call
4. If successful → use API-generated notes
5. If failed → fallback to local changelog renderer

---

## 🧠 Programmatic API

### generateReleaseNotes()

#### Signature

```ts
generateReleaseNotes(options?: {
  cwd?: string;
  dryRun?: boolean;
}): GenerateReleaseNotesResult
```

#### Behavior

##### Normal Mode

- Reads version from `package.json`
- Detects previous Git tag
- Calls provider API (if available)
- Falls back automatically if needed
- Writes `RELEASE_NOTES.md`

##### Dry-Run Mode

- Computes next version via `computeVersion`
- Skips provider API
- Writes `RELEASE_NOTES.dry-run.md`

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

## 🔌 Provider System

Each provider implements:

```ts
{
  buildUrl(ref);
  generateReleaseNotes(context);
}
```

### Provider contract

Provider adapters must return a normalized result object from `generateReleaseNotes()` with this shape:

```ts
type ProviderGenerateResult =
  | { ok: true; content: string }
  | { ok: false; reason: string; status?: number; error?: string };
```

Common `reason` values returned by providers include:

- `no-repo` — repository info couldn't be resolved (local git issue)
- `missing-token` — required token (e.g. GITLAB_TOKEN) is not provided
- `api-error` — provider API returned an error status
- `not-supported` — provider does not support release-notes generation
- `exception` — an unexpected exception occurred

### GitHub

- Uses GitHub Release Notes API
- Requires `gh` CLI or environment auth
- Fully automated in GitHub Actions

### GitLab

- Uses GitLab Changelog API
- Requires `GITLAB_TOKEN`

### Bitbucket

- No API support
- Always falls back to local generation

---

## 🔁 Fallback Mechanism

Fallback is triggered when:

- No provider detected
- API is not supported
- Token is missing
- API request fails

Fallback uses:

```ts
renderChangelog(...)
```

## 📜 Official Return Contract (Frozen)

### GenerateReleaseNotesResult

```ts
type GenerateReleaseNotesResult =
  | {
      generated: true;
      currentTag: string;
      previousTag: string | null;
      file: string;
      dryRun: boolean;
      // Optional: which source produced the notes (e.g. 'github', 'gitlab', 'local')
      source?: string;
      // If provider failed but we fell back locally, this carries the provider reason
      fallbackReason?: string;
    }
  | {
      generated: false;
      // Standardized non-generated reasons (may include provider reasons)
      reason:
        | "no-release" // no content detected / nothing to release
        | "already-exists" // file or release already exists
        | "no-repo" // unable to resolve repository info
        | "api-error" // provider API failed
        | string; // other provider-specific reasons (e.g. 'missing-token', 'not-supported')
      currentTag: string;
    };
```

---

## 🖥 CLI

The CLI exposes a **single binary** with explicit actions.

```bash
npx rs-release-notes generate [--dry-run]
```

---

### rs-release-notes generate

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

## 🧠 Design Principles

- Design Principles
- Provider abstraction (no lock-in)
- Graceful fallback (always works)
- Deterministic output
- CI-safe behavior

---

## 🔒 Safety Guarantees

- No API dependency required
- No failure blocks release flow
- No hidden side effects

---

## ✅ Summary

Release notes are:

- Smart (API when possible)
- Safe (fallback always works)
- Portable (multi-provider)
- Deterministic (CI-ready)

Release Suite ensures release notes are always generated — regardless of environment.
