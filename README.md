# ClipFlow

A keyboard-first clipboard manager for Linux with an **extensible tools system**.
Works like Spotlight: toggle a centered overlay with a global shortcut, search your
clipboard history, and run **tools** on any clip — decode a JWT, format JSON,
base64-decode, or pipe through any shell command. Tools are user-defined.

## Features

- **Clipboard history** — automatically captures copied text into a local SQLite DB.
- **Spotlight overlay** — `Ctrl+Shift+V` toggles a borderless, always-on-top window.
  Hides on focus loss, `Esc` to dismiss. Lives in the system tray, not the taskbar.
- **Context-aware tools** — content type is detected (JWT, JSON, URL, base64, hash,
  timestamp, color…) and matching tools are surfaced as **suggested**.
- **Custom tools** — create your own from inside the app (the **+ Tool** button). Two kinds:
  - `js` — a transform body that receives `input` and returns a string/object,
    evaluated in-app (no process spawn).
  - `shell` — a command that receives the clip on **stdin** and returns **stdout**
    (reuse `jq`, `openssl`, `base64`, or your own scripts).
- **Local-only** — no account, no network. Everything lives on your machine.

## Keyboard

| Key | Action |
|-----|--------|
| `Ctrl+Shift+V` | Toggle the overlay (global) |
| `↑` / `↓` | Move selection in history |
| `Enter` | Copy selected clip & close |
| `Esc` | Back / hide window |

## Tools

Tools are TOML manifests in `~/.config/clipflow/tools/`. Bundled JWT example:

```toml
id = "jwt-decode"
name = "Decode JWT"
description = "Decode a JWT and pretty-print header + payload"
match = "^eyJ[A-Za-z0-9_-]+\\.eyJ[A-Za-z0-9_-]+\\."
type = "js"
code = "..."   # receives `input`, returns the decoded JSON string
```

`match` is an optional regex; when it matches the selected clip the tool is shown
first as **suggested**. A shell example:

```toml
id = "sha256"
name = "SHA-256"
type = "shell"
run = "sha256sum | cut -d' ' -f1"
```

## Develop

```bash
pnpm install
pnpm tauri dev      # run in dev mode
pnpm tauri build    # produce a release bundle
```

## Stack

Tauri v2 (Rust core) · React 19 + TypeScript · Tailwind CSS v4 · SQLite (rusqlite) · arboard.
# clipflow
