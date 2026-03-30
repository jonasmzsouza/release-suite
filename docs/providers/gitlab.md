# GitLab Setup

This guide explains how to use Release Suite with GitLab CI.

GitLab provides a powerful CI system but requires slightly different configuration.

---

## Repository Configuration

Recommended settings:

- Protect `main`
- Require merge requests
- Allow CI to push tags

---

## Required CI Variables

Create:

```
GITLAB_TOKEN
```

Recommended scopes:

```
api
read_repository
write_repository
```

This token is used for:

- GitLab API calls
- changelog generation
- optional release creation

---

## Example GitLab CI

File:

```
.gitlab-ci.yml
```

Example pipeline:

```yaml
stages:
  - prepare
  - release

compute:
  image: node:24
  stage: prepare
  script:
    - npm ci
    - npx rs-version compute > result.json || true
    - cat result.json
  artifacts:
    paths:
      - result.json

publish:
  image: node:24
  stage: release
  needs: [compute]
  script:
    - npm ci
    - VERSION=$(cat result.json | jq -r '.nextVersion // empty')
    - if [ -z "$VERSION" ]; then echo "No release required"; exit 0; fi
    - npm version "$VERSION" --no-git-tag-version
    - npx rs-changelog generate
    - npx rs-release-notes generate
    - git config user.name "gitlab-ci"
    - git config user.email "ci@gitlab"
    - git tag "$VERSION"
    - git push origin "$VERSION"
```

## Notes

If `GITLAB_TOKEN` is not available:

Release Suite automatically falls back to local release notes generation.
