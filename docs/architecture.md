# 🏗 Architecture

This document describes the internal architecture of **Release Suite**.

The system is designed to be:

- Deterministic
- Extensible
- Provider-agnostic
- CI-safe

---

## 🧱 High-Level Overview

```txt
Git Repository
   ↓
Core Engine (lib/)
   ↓
Providers Layer
   ↓
CLI Layer (bin/)
```

---

## 📦 Layers

1. Core Engine (lib/)

Contains all business logic:

- Version computation
- Commit parsing
- Changelog generation
- Release notes orchestration

Rules:

- No CLI logic
- No side effects beyond controlled I/O
- Deterministic output

---

2. Providers Layer

Abstracts external platforms:

```txt
providers/
  github/
  gitlab/
  bitbucket/
```

Each provider implements:

- URL building
- Release notes generation
- API integration (optional)

---

3. CLI Layer (`bin/`)

Thin wrapper responsible for:

- Parsing arguments
- Executing commands
- Handling exit codes

---

## 🔁 Core Pipelines

### Versioning

```txt
git commits → computeVersion → next version
```

### Changelog

```txt
git commits
   ↓
parseCommit
   ↓
normalizeCommits
   ↓
categorizeCommits
   ↓
renderChangelog
```

### Tag
```
next version → create tag
```

### Release Notes

```txt
generateReleaseNotes
   ↓
provider adapter
   ↓
API OR fallback
```

---

## 🔌 Provider Pattern

Release Suite uses a **provider pattern**:

```txt
core → provider → api (optional)
```

Benefits:

- Multi-platform support
- Easy extensibility
- No vendor lock-in

---

## 🔁 Fallback Strategy

All external dependencies are optional.

If any provider fails:

```txt
→ fallback to local implementation
```

This ensures:

- Reliability
- Offline support
- CI safety

---

## 🧠 Design Principles

### Determinism

Same input → same output

### Explicitness

No hidden behaviors:

- No implicit rebuilds
- No silent mutations

### Separation of Concerns

| Layer      | Responsibility       |
| ---------- | -------------------- |
| lib/       | Business logic       |
| providers/ | External integration |
| bin/       | CLI interface        |

### Extensibility

New providers can be added without modifying the core:

```txt
gitlabProvider
bitbucketProvider
customProvider
```

---

## 🔒 Safety Model

- No destructive operations without explicit command
- No automatic rebuilds
- No dependency on external APIs

---

## 🚀 Scalability

The architecture supports:

- Additional providers
- Hybrid strategies (future)
- Custom renderers
- Plugin system (future)

---

## ✅ Summary

Release Suite architecture is:

- Modular
- Provider-agnostic
- Fault-tolerant
- CI-first

Designed to scale from small projects to enterprise workflows.
