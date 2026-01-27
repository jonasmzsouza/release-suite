# 📦 Release Process

This document describes how releases are created, reviewed and published in this project.

The goal is to ensure:

- Clean `main` history
- Predictable semantic versioning
- Secure publishing (no secrets)
- Fully automated, auditable releases

---

## 🔁 High-level Flow

1. A **Feature / Fix PR** is merged into main
2. The workflow evaluates whether a release is needed
3. If yes, a **Release PR** is automatically created
4. The Release PR is auto-merged
5. A Git tag is created
6. The package is published
7. A GitHub Release is generated

---

## 🧱 Why a Release PR exists

The Release PR is intentional and critical.

It allows:

- A clean, squash-based history on `main`
- Explicit visibility of release changes
- Separation between **product changes** and **release artifacts**
- Safe automation on protected branches

No direct commits are ever pushed to `main`.

---

## 🔀 Types of Pull Requests

**Feature / Fix PR**

- Authored by humans
- Contains application logic
- Reviewed manually
- Merged into `main`
- May or may not trigger a release

**Release PR (release/x.y.z)**

- Created by automation
- Contains only:
  - `package.json` version bump
  - `package-lock.json`
  - `CHANGELOG.md`
  - `dist/` (if applicable)
- Uses a fixed commit convention
- Is auto-merged

---

## 🧠 Release Decision Logic

The workflow runs on:

- `pull_request.closed` (merged into `main`)
- workflow_dispatch

The release decision is computed by:

```bash
node bin/compute-version.js
```

If no semantic change is detected:

- No Release PR is created
- The workflow exits successfully

This allows documentation, CI or refactor PRs to merge without producing releases.

---

## 🔐 Security Model

**npm Publishing**

- Uses **Trusted Publishing (OIDC)**
- No npm tokens are stored
- The GitHub Actions runner is authenticated at runtime
- npm provenance is automatically generated

**GitHub Access**

- Uses **GITHUB_TOKEN**
- Scoped permissions
- No Personal Access Tokens required

---

## 🏷️ Git Tags

- Tags are created **after** the Release PR is merged
- Tags are immutable
- Tags always match the published version

---

## 📝 Commit Convention

Release commits follow a strict format:

```bash
:bricks: chore(release): x.y.z
```

This is used to:

- Validate merge correctness
- Prevent accidental publishes
- Avoid CI loops (`[skip ci]`)

## ⚠️ Branch Protection & Auto-merge

If the repository requires pull request approvals on `main`,
the automated Release PR may not be auto-merged using `GITHUB_TOKEN`.

Recommended approaches:

- Do not require reviews for release-only changes
- Require reviews only for source code paths via CODEOWNERS
- Approve Release PRs manually when necessary

Advanced setups may use a GitHub App or PAT with caution.

### Required Checks and Auto-merge

Release PRs may be subject to required status checks
(e.g. GitGuardian security scans).

When auto-merge is enabled, GitHub will automatically
merge the PR as soon as all required checks succeed,
regardless of how long they take to complete.

---

## ⚙️ Repository Configuration

### Branch Protection (`main`)

- Require pull request before merging
- Allow auto-merge
- Allow GitHub Actions to bypass PR requirements

### GitHub Actions

- Workflow permissions: Read & Write
- Allow Actions to create and approve PRs

### npm

- Trusted Publishing enabled
- No `NPM_TOKEN` is used

---
