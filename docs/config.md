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
  }
};
```

---

## ⚙️ Available options

### `tag.prefix`

Controls whether Git tags and release identifiers use a `v` prefix.

| Value | Behavior                       |
| ----- | ------------------------------ |
| `"v"` | Tags are generated as `v1.2.3` |
| `""`  | Tags are generated as `1.2.3`  |

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
- Any value other than `"v"` falls back to `""`

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

## 🛡️ Defaults & fallback behavior

If `release.config.js` does not exist, or if properties are missing or invalid, the following defaults apply:

```js
{
  tag: { prefix: "v" },
  changelog: { emojis: false }
}
```

Invalid values **never throw errors** and **never propagate downstream**.

---

## 🔄 How configuration is consumed

| Module                   | Uses config                                  |
| ------------------------ | -------------------------------------------- |
| `compute-version`        | Exposes `tagPrefix` in JSON output           |
| `create-tag`             | Applies `tag.prefix` when creating Git tags  |
| `changelog`              | Renders emojis based on `changelog.emojis`   |
| `generate-release-notes` | Uses the same tag format                     |
| `dry-run`                | Passes config consistently to all generators |

---

## 🎨 Design principles

- Single source of truth
- No duplicated CLI flags
- Predictable defaults
- Silent and safe fallback
- Config validated at load time

---

## 📚 Versioning

This configuration system was introduced in **Release Suite v3.0.0**
and is considered a breaking change due to behavioral differences.
