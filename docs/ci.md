# ⚙️ CI/CD Overview

This document explains how Release Suite integrates with CI systems.

The CI pipeline is responsible for orchestrating the release lifecycle.

Typical pipeline stages:

1. Compute next version
2. Generate release artifacts
3. Create Release PR
4. Merge Release PR
5. Create Git tag
6. Publish package
7. Generate release notes

---

# 🧠 Core CI Responsibilities

Regardless of CI provider, the pipeline must perform the following steps.

## Version Computation

```
npx rs-version compute
```

Determines whether a release is required.

Outputs:

- next version
- tag prefix
- release type

---

## Generate Changelog

```
npx rs-changelog generate
```

Updates the project's `CHANGELOG.md`.

---

## Generate Release Notes

```
npx rs-release-notes generate
```

Produces a `RELEASE_NOTES.md` file used for platform releases.

---

## Tag Creation

```
npx rs-tag create
```

Creates the git tag matching the computed version.

---

# 🔒 Security Considerations

CI environments should avoid storing long-lived credentials.

Recommended approaches:

| Provider  | Authentication               |
| --------- | ---------------------------- |
| GitHub    | OIDC + GITHUB_TOKEN          |
| GitLab    | CI_JOB_TOKEN / Project Token |
| Bitbucket | App Password / SSH key       |

---

# 📦 Publishing to npm (Trusted Publishing)

Publishing typically occurs **after the tag is created**.

For npm packages:

```
npm publish
```

With [Trusted Publishing](https://docs.npmjs.com/trusted-publishers), CI runners authenticate automatically.

---

# 📚 Provider-specific Implementations

The CI configuration varies by platform.

Complete examples are provided here:

- [GitHub Actions](providers/github.md)
- [GitLab CI](providers/gitlab.md)
- [Bitbucket Pipelines](providers/bitbucket.md)

Each guide includes:

- Repository configuration
- Required permissions
- Complete CI workflow examples
