# Release configuration

The Release Suite can be configured via a `release.config.js` file placed at the **root of the consuming project**.

This configuration centralizes decisions that affect **all scripts**, avoiding CLI flag pollution and keeping workflows clean and consistent.

---

## 📁 Location

- The file always belongs to the consumer project
- It must be in the root of the repository
- Release Suite automatically loads it using `process.cwd()`
- No need to pass flags or environment variables

```
release.config.js
```

It is optional. If it does not exist, default values are applied automatically.

---

## 📦 Format

The file uses **ESM** and must export a default object:

```js
// release.config.js
export default {
  tag: {
    prefix: "v"
  },

  changelog: {
    emojis: false
  },

  releaseRules: {
    docs: "patch",
    ci: "patch"
  }
};
```

---

## ⚙️ Available options

---

### `tag.prefix`

Controls the prefix used in Git tags and release identifiers.

| Value   | Behavior                         |
| ------- | -------------------------------- |
| `"v"`   | Tags are generated as `v1.2.3`   |
| `""`    | Tags are generated as `1.2.3`    |
| custom  | Tags are generated as `x1.2.3`   |

**Default:**

```js
{
  tag: {
    prefix: "v";
  }
}
```

**Notes:**

- `computeVersion` always returns the **pure semantic version** (`1.2.3`)
- The prefix is applied only by consumers (create-tag, release-notes, workflows)
- Any string value is accepted and treated as user responsibility

---

### `changelog.emojis`

Controls whether emojis are used in `CHANGELOG.md` rendering.

| Value   | Behavior                             |
| ------- | ------------------------------------ |
| `true`  | Sections with emojis (✨ 🐛 ♻️ etc.) |
| `false` | Clean changelog, no emojis           |

**Default:**

```js
{
  changelog: {
    emojis: false;
  }
}
```

**Notes:**

- Plain-text changelogs are considered best practice for long-term maintenance
- Emojis remain fully supported and opt-in
- Non-boolean values fall back to `false`

---

### `releaseRules`

Controls how commit types map to semantic version bumps.

```js
releaseRules: {
  docs: "patch",
  ci: "patch",
  refactor: "patch",
  perf: "patch"
}
```

| Value   | Meaning                    |
| ------- | -------------------------- |
| major   | Breaking change            |
| minor   | New feature                |
| patch   | Fix or non-breaking change |
| none    | Ignored for versioning     |

**Default:**

```js
{
  releaseRules: {
    feat: "minor",
    fix: "patch"
  }
}
```

**Behavior:**

- Rules are **merged with defaults**
- Missing types fall back to default behavior
- Unknown types are allowed
- Invalid values throw an error

**Protected types:**

The following commit types **cannot be overridden**:

```
feat → always minor
fix  → always patch
```

Any attempt to override them is ignored.

**Example:**

```js
releaseRules: {
  docs: "patch",
  ci: "patch",
  test: "none"
}
```

Result:

```js
{
  feat: "minor",
  fix: "patch",
  docs: "patch",
  ci: "patch",
  test: "none"
}
```

---

## 🛡️ Defaults & fallback behavior

If `release.config.js` does not exist, or if properties are missing:

```js
{
  tag: { prefix: "v" },
  changelog: { emojis: false },
  releaseRules: {
    feat: "minor",
    fix: "patch"
  }
}
```

**Rules:**

- Missing fields → fallback to defaults
- Partial configs → merged safely
- Invalid values → throw explicit error (releaseRules)
- No silent misconfiguration

---

## 🔄 How configuration is consumed

| Module          | Uses config                                  |
| --------------- | -------------------------------------------- |
| `version`       | Applies `releaseRules` and exposes tagPrefix |
| `create-tag`    | Applies `tag.prefix` when creating Git tags  |
| `changelog`     | Renders emojis based on `changelog.emojis`   |
| `release-notes` | Uses the same tag format                     |
| `dry-run`       | Passes config consistently to all generators |

---

## 🎨 Design principles

- Single source of truth
- No duplicated CLI flags
- Predictable defaults
- Safe merging strategy
- Explicit validation
- User-controlled extensibility

---

## 📚 Versioning

This configuration system was introduced in **Release Suite v3.0.0**
and extended with `releaseRules` in later versions.
