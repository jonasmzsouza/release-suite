# CI/CD Examples

## `create-release-pr.yml`

```yml
name: Create Release PR

on:
  pull_request:
    types: [closed]
    branches:
      - main

permissions:
  contents: write
  pull-requests: write

concurrency:
  group: release-pr-${{ github.ref }}
  cancel-in-progress: true

jobs:
  release-pr:
    # Only runs when:
    # - The PR has been merged
    # - The PR does NOT have the "release" label
    if: >
      github.event.pull_request.merged == true &&
      !contains(join(github.event.pull_request.labels.*.name, ','), 'release')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      # Avoids loops: ignores commits created by bots
      - name: Skip if last commit is from bot
        run: |
          last_author="$(git log -1 --pretty=format:'%an')"
          echo "Last author: $last_author"
          if [[ "$last_author" == *"github-actions"* ]]; then
            echo "Commit created by bot. Canceling workflow."
            exit 0
          fi

      - uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Install dependencies
        run: npm ci

      - name: Install release-suite locally (self usage)
        run: npm install .

      # Compute next version to release
      - name: Compute next version
        id: compute
        run: |
          set +e
          RESULT=$(npx rs-compute-version --ci --json)
          STATUS=$?
          VERSION=$(echo "$RESULT" | jq -r '.nextVersion // empty')

          echo "$RESULT"
          echo "status=$STATUS" >> $GITHUB_OUTPUT
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Bump package.json
        if: steps.compute.outputs.status == '0' && steps.compute.outputs.version != ''
        run: npm version ${{ steps.compute.outputs.version }} --no-git-tag-version

      - name: Build
        run: npm run build --if-present

      - name: Generate changelog
        if: steps.compute.outputs.status == '0' && steps.compute.outputs.version != ''
        run: npx rs-generate-changelog

      - name: Detect dist directory
        id: dist
        run: |
          if [ -d dist ]; then
            echo "exists=true" >> "$GITHUB_OUTPUT"
          else
            echo "exists=false" >> "$GITHUB_OUTPUT"
          fi

      # Automatically create branches, commits, and PRs with peter-evans
      - name: Create Release PR
        if: steps.compute.outputs.status == '0' && steps.compute.outputs.version != ''
        uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: ":bricks: chore(release): prepare version ${{ steps.compute.outputs.version }} [skip ci]"
          branch: release/${{ steps.compute.outputs.version }}
          title: ":bricks: chore(release): ${{ steps.compute.outputs.version }}"
          body: |
            This PR contains the release artifacts:

            - Updated `package.json` and `package-lock.json` with version ${{ steps.compute.outputs.version }}
            - Updated `CHANGELOG.md` with latest changes
            - Generated `/dist` directory with build files (if applicable)

            Upon approving & merging, the publish will run automatically.
          labels: |
            release
          add-paths: |
            package.json
            CHANGELOG.md
            ${{ steps.dist.outputs.exists == 'true' && 'dist/**' || '' }}

```

## `publish-on-merge.yml`

```yml
name: Publish Release

on:
  pull_request:
    types: [closed]
    branches:
      - main

permissions:
  contents: write
  id-token: write # 🔐 REQUIRED for OIDC
  packages: write
  pull-requests: write

concurrency:
  group: publish-release
  cancel-in-progress: false

jobs:
  publish:
    # Only runs when:
    # - The PR has been merged
    # - The PR has the "release" label
    # - The PR title starts with ":bricks: chore(release):"
    # - The PR was created by a bot
    if: >
      github.event.pull_request.merged == true &&
      startsWith(github.event.pull_request.title, ':bricks: chore(release):') &&
      contains(join(github.event.pull_request.labels.*.name, ','), 'release') &&
      github.event.pull_request.user.type == 'Bot'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          registry-url: https://registry.npmjs.org/

      - name: Install dependencies
        run: npm ci

      - name: Install release-suite locally (self usage)
        run: npm install .

      - name: Create Git Tag
        id: tag
        run: |
          set +e
          RESULT=$(npx create-tag)
          STATUS=$?
          TAG=$(echo "$RESULT" | jq -r '.tag // empty')

          echo "$RESULT"
          echo "status=$STATUS" >> $GITHUB_OUTPUT
          echo "tag=$TAG" >> $GITHUB_OUTPUT

      # Publish to npm using Trusted Publishing (OIDC)
      - name: Publish to npm (Trusted Publishing)
        if: steps.tag.outputs.status == '0' && steps.tag.outputs.tag != ''
        run: npm publish

      # Generate release notes for GitHub Release
      - name: Generate GitHub Release Notes
        if: steps.tag.outputs.status == '0' && steps.tag.outputs.tag != ''
        run: npx rs-generate-release-notes
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # Create GitHub Release with notes and attach built assets
      - name: Create GitHub Release + Tag
        if: steps.tag.outputs.status == '0' && steps.tag.outputs.tag != ''
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          VERSION=$(node -p "require('./package.json').version")

          ASSETS=()
          if [ -d dist ]; then
            ASSETS=(dist/**)
          fi

          gh release create "$VERSION" \
            --title "$VERSION" \
            --notes-file RELEASE_NOTES.md \
            "${ASSETS[@]}"

```
