# Bitbucket Setup

This guide explains how to integrate Release Suite with Bitbucket Pipelines.

Bitbucket currently has fewer native release APIs than GitHub or GitLab, but the release process still works reliably.

---

# Repository Configuration

Enable:

- Bitbucket Pipelines
- Repository write access for pipelines

---

# Authentication

Use:

- App Password
- SSH deploy key

Required permission:

```
repository:write
```

This allows pipelines to push tags.

---

# Bitbucket Pipelines Example

File:

```
bitbucket-pipelines.yml
```

Example:

```yaml
pipelines:
  branches:
    main:
      - step:
          name: Prepare Release
          image: node:20
          script:
            - npm ci
            - npx rs-version compute > result.json || true
            - cat result.json

      - step:
          name: Publish Release
          image: node:20
          script:
            - npm ci
            - VERSION=$(cat result.json | jq -r '.nextVersion // empty')
            - if [ -z "$VERSION" ]; then echo "no release"; exit 0; fi
            - npm version "$VERSION" --no-git-tag-version
            - npx rs-changelog generate
            - npx rs-release-notes generate
            - git config user.name "bitbucket-pipelines"
            - git config user.email "ci@bitbucket"
            - git tag "$VERSION"
            - git push origin "$VERSION"
```

---

# Release Notes

Because Bitbucket does not expose a release-notes API in this integration, Release Suite will generate a local file:

```
RELEASE_NOTES.md
```

This file can be:

- attached to artifacts
- used when creating releases manually
- consumed by external tooling
