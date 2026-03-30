# 🎉 Release Suite

Semantic versioning and release automation toolkit for Git-based projects.

> Designed for safe, predictable, and fully automated releases across multiple Git providers.

---

## 🚀 Features

### Core

- Automatic version bump based on commit messages
- Conventional commit parsing (customizable)
- Deterministic changelog generation
- Create an annotated Git tag for a release
- Release notes generation with provider APIs
- Dry-run mode for safe previews

### 🌍 Multi-Provider Support

| Provider  | Changelog | Release Notes |
| --------- | --------- | ------------- |
| GitHub    | ✅        | ✅ API        |
| GitLab    | ✅        | ✅ API        |
| Bitbucket | ✅        | ⚠ Fallback    |

### 🔗 Smart Changelog

- PR + Issue detection (`#123`)
- Multiple references per commit
- Automatic link generation
- Provider-aware URLs

Example:

```md
- feat: add login ([#34](...), [#12](...))
```

### 🧠 Release Notes Engine

- Uses provider APIs when available
- Automatic fallback to local generation
- Zero configuration required

### ⚙️ Architecture

```txt
Core Engine
   ↓
Provider Adapter (GitHub / GitLab / Bitbucket)
   ↓
API (optional)
   ↓
Fallback (always available)
```

See [`docs/architecture.md`](docs/architecture.md) for a detailed design overview of the core engine, provider adapters, and fallback strategy.

---

## ⚡ Quick Start

```bash
npm install release-suite --save-dev
```

Add to your project's `package.json`:

```json
{
  "scripts": {
    "dry-run": "rs-dry-run create",
    "dry-run:clean": "rs-dry-run remove",
    "version:compute": "rs-version compute",
    "changelog": "rs-changelog generate",
    "release-notes": "rs-release-notes generate",
    "tag:create": "rs-tag create"
  }
}
```

Generate dry-run files without touching your real changelog:

```bash
npm run dry-run
```

Remove dry-run files:

```bash
npm run dry-run:clean
```

---

## ⚙️ Configuration

Release Suite can be configured using a `release.config.js` file.

This file controls:

- Git tag prefix (`v1.2.3` vs `1.2.3`)
- Emoji usage in changelog rendering
- Commit-to-version mapping (via `releaseRules`)

See [`docs/config.md`](docs/config.md) for full documentation.

---

## 🖥️ CLI Commands

| Command                     | Description                                                |
| --------------------------- | ---------------------------------------------------------- |
| `rs-version compute`        | Computes next semantic version based on git commits        |
| `rs-changelog generate`     | Generates a new changelog entry for the next release       |
| `rs-changelog rebuild` ⚠️   | Fully rebuilds CHANGELOG.md from git history (Danger Zone) |
| `rs-release-notes generate` | Generates RELEASE_NOTES.md                                 |
| `rs-dry-run create`         | Generates dry-run changelog & release notes                |
| `rs-dry-run remove`         | Removes dry-run changelog & release notes                  |
| `rs-tag create`             | Creates and pushes a git tag                               |

Each command follows a strict and predictable CLI contract (exit codes, stdout, JSON mode).

> 💡 **Note about execution**
>
> ⚠️ `rs-changelog rebuild` is a destructive operation.
> Always use `--dry-run` first.
>
> - When using these commands via `npm run`, they can be referenced directly (`rs-*`).
> - In CI/CD environments (e.g. GitHub Actions), always invoke them using `npx`
>   (e.g. `npx rs-changelog generate`) to ensure proper binary resolution.

---

## 🔁 Release Flow

This project uses an automated, PR-based release strategy
designed for safety and traceability.

See [Release Process](docs/release-process.md) for details.

---

## 🤖 CI/CD

> ℹ️ In CI/CD environments, always use `npx` when invoking `rs-*` commands.

This project is designed to be used in automated pipelines.

👉 See full examples in [`docs/ci.md`](docs/ci.md).

---

## 🧩 Programmatic API

Release Suite also exposes a programmatic API for advanced use cases
(integration tests, custom tooling, orchestration).

👉 See full API documentation in [`docs/api.md`](docs/api.md)

---

## 🛠 Development (Maintainers)

When working inside the `release-suite` repository itself, the CLI binaries
are **not available via npm or npx**, since they are not installed as a dependency.

In this case, run the scripts directly with Node.js:

```bash
node bin/version.js compute
node bin/changelog.js generate
node bin/release-notes.js generate
node bin/dry-run.js create
node bin/tag.js create
```

To test the CLI as a real consumer, you can use:

```bash
npm link
# or
npm install ../release-suite
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## ✨ Author

<table>
  <tr>
    <td align="center">
      <a href="https://jonasmzsouza.github.io/">
         <img style="border-radius: 50%;" src="https://avatars.githubusercontent.com/u/61324433?v=4" width="100px;" alt=""/>
         <br />
         <sub><b>Jonas Souza</b></sub>
      </a>
    </td>
  </tr>
</table>
 
💼 [LinkedIn](https://linkedin.com/in/jonasmzsouza)
💻 [GitHub](https://github.com/jonasmzsouza)
