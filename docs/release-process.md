# 📦 Release Process

This document describes how releases are created, reviewed and published in this project.

The goal is to ensure:

- Clean `main` history
- Predictable semantic versioning
- Secure publishing
- Fully automated and auditable releases
- Provider-agnostic release logic

This document explains the **release model and philosophy**, independent of CI providers.

Provider-specific CI implementations are documented separately.

---

# 🔁 High-level Flow

1. A **Feature / Fix PR** is merged into `main`
2. CI evaluates whether a release is required
3. If needed, a **Release PR** is automatically created
4. The Release PR is merged
5. A Git tag is created
6. The package is published
7. Release notes are generated

This flow guarantees that **all releases are reproducible and traceable**.

---

# 🧱 Why a Release PR Exists

The Release PR is a deliberate design decision.

It provides:

- Clean history on `main`
- Explicit visibility of release artifacts
- Separation between **product changes** and **release mechanics**
- Compatibility with protected branches
- Safe automation

No automation ever pushes directly to `main`.

All changes must go through a pull request.

---

# 🔀 Types of Pull Requests

## Feature / Fix PR

Created by developers.

Contains:

- Product changes
- Bug fixes
- Refactors
- Documentation updates

Characteristics:

- Reviewed manually
- Merged into `main`
- May or may not trigger a release

---

## Release PR (`release/x.y.z`)

Created automatically by CI.

Contains only release artifacts:

- `package.json` version bump
- `package-lock.json`
- `CHANGELOG.md`
- `dist/` (if applicable)

Release PRs follow a strict commit convention.

Example:

```
:bricks: chore(release): 3.1.0
```

---

# 🧠 Release Decision Logic

The release decision is computed automatically.

Example command:

```
npx rs-version compute
```

The command analyzes commit history and determines whether a release is required.

Possible outcomes:

| Result              | Behavior                    |
| ------------------- | --------------------------- |
| No semantic changes | Workflow exits successfully |
| Patch change        | Patch release               |
| Feature             | Minor release               |
| Breaking change     | Major release               |

---

# 🏷️ Git Tags

Tags are created **after the Release PR is merged**.

Rules:

- Tags are immutable
- Tags match the published version
- Tags are the source of truth for releases

Example:

```
v3.1.0
```

---

# 📝 Commit Convention

Release commits follow a strict format:

```
:bricks: chore(release): x.y.z
```

This is used to:

- Detect valid release commits
- Avoid accidental publishes
- Prevent CI loops (`[skip ci]`)

---

# 🔐 Security Model

The release system avoids long-lived credentials whenever possible.

## Package Publishing

Preferred method:

**Trusted Publishing (OIDC)**

Benefits:

- No npm tokens stored
- Temporary credentials
- Provenance metadata automatically generated

---

## Repository Access

CI platforms authenticate using their native tokens:

Examples:

- GitHub → `GITHUB_TOKEN`
- GitLab → `CI_JOB_TOKEN` / `GITLAB_TOKEN`
- Bitbucket → App Password / SSH key

---

# ⚠️ Branch Protection

This workflow is designed for **protected branches**.

Recommended settings:

- Require pull requests
- Disallow direct pushes
- Require status checks
- Allow CI automation

---

# ⏭️ Manual Releases

Releases may also be triggered manually.

Typical reasons:

- Re-running a failed publish
- Infrastructure recovery
- Configuration updates

The same release logic still applies.

If no semantic change is detected, the workflow exits safely.

---

# ⚙️ CI Implementations

Provider-specific CI implementations are documented here:

- [GitHub Actions](providers/github.md)
- [GitLab CI](providers/gitlab.md)
- [Bitbucket Pipelines](providers/bitbucket.md)

Each provider requires slightly different repository configuration and CI setup.
