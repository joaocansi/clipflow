# ClipFlow

A **keyboard-first clipboard manager for Linux** with an **extensible tools system**
and **custom themes**. It works like Spotlight: a global shortcut toggles a centered
overlay where you search your clipboard history, save snippets, and run **tools** on
any clip — all without touching the mouse.

Local-only: no account, no network. Everything lives on your machine.

## Features

- **Clipboard history** — copied text is captured into a local SQLite database.
  Configurable size limit; pinned items are kept when you clear history.
- **Spotlight overlay** — `Ctrl+Shift+Space` toggles a borderless, centered,
  always-on-top window with a large drop shadow. Hides on focus loss, `Esc` to
  dismiss. Lives in the system tray, not the taskbar.
- **Three sections** (left sidebar, fully keyboard-navigable):
  - **Histórico** — clipboard history, searchable.
  - **Salvos** — snippets saved with a name, description and **tags** (shown as badges).
  - **Configuração** — theme picker, history limit, clear history, app info.
- **Pin / unpin** any clip with `Ctrl+P`.
- **Context-aware tools** — the content type is detected (JWT, JSON, URL, base64,
  hash, timestamp, color…) and matching tools are surfaced as **suggested**.
- **Folder-based tools** — each tool is a folder with a manifest; tools can perform
  a **transformation** (copied back to the clipboard) or just an **action**.
- **Themes** — ships with **Light**, **Dark**, **Dark Green** and **Dark Blue**, and
  you can drop your own into a folder.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Ctrl+Shift+Space` | Toggle the overlay (global) |
| `Ctrl+1` / `Ctrl+2` / `Ctrl+3` | Jump to Histórico / Salvos / Configuração |
| `↑` / `↓` | Move within the current list/section |
| `←` | Step left toward the menu (list → menu, tools → list → menu) |
| `→` / `Enter` | Step right / activate |
| `Enter` | Copy the selected clip (and close) |
| `Ctrl+S` | Save the selected history clip |
| `Ctrl+P` | Pin / unpin the selected clip |
| `Ctrl+T` | Toggle the tools sidebar for the selected clip |
| `Esc` | Close an overlay / sidebar, or hide the window |

## Development

Requires Rust, Node.js + [pnpm](https://pnpm.io/), and the Tauri Linux
dependencies (WebKitGTK 4.1, etc. — see the
[Tauri prerequisites](https://tauri.app/start/prerequisites/)).

```bash
pnpm install
pnpm tauri dev      # run in development
pnpm tauri build    # produce a release bundle
```

Configuration and data live under `~/.config/clipflow/`:

```
~/.config/clipflow/
├── clipflow.db        # SQLite history + saved items + settings
├── tools/             # one folder per tool
└── themes/            # one .toml per theme
```

## Authoring tools

Each tool is a **folder** under `~/.config/clipflow/tools/<id>/` containing a
`manifest.toml`:

```toml
id = "json-pretty"
name = "Format JSON"
description = "Pretty-print JSON with 2-space indent"
match = "^\\s*[\\{\\[]"   # optional regex; matches → tool is "suggested"
run = "python3 run.py"     # runs with the tool folder as the working directory
output_file = "output.json"
```

**Execution contract.** The `run` command receives the clip on **stdin** and in
`$CLIPFLOW_INPUT`, and must write `output_file` (JSON) into its folder:

- `{ "result": <value> }` → **success / transformation** — shown and copyable.
- `{ "error": "..." }` → **failure** — shown to the user.
- `{ "message": "..." }` (or no `result`) → **action-only** — nothing to copy
  (e.g. it sent a notification or wrote a file).

Example `run.py` for the manifest above:

```python
import sys, json
data = sys.stdin.read()
try:
    obj = json.loads(data)
    out = {"result": json.dumps(obj, indent=2, ensure_ascii=False)}
except Exception as e:
    out = {"error": f"JSON inválido: {e}"}
json.dump(out, open("output.json", "w"))
```

Three example tools (`json-pretty`, `uppercase`, action-only `notify`) are seeded
on first run. You can also create a tool's manifest from inside the app via the
**+ Tool** button.

## Authoring themes

Drop a `.toml` file into `~/.config/clipflow/themes/`. Field names map 1:1 to the
`--cf-*` CSS variables; values are any valid CSS color.

```toml
id = "high-contrast"
name = "High Contrast"
panel = "#000000"
surface = "rgba(255, 255, 255, 0.06)"
text = "#ffffff"
text_dim = "#bbbbbb"
border = "rgba(255, 255, 255, 0.25)"
selection = "rgba(255, 255, 255, 0.30)"
hover = "rgba(255, 255, 255, 0.12)"
accent = "#ffd400"
accent_soft = "rgba(255, 212, 0, 0.30)"
accent_text = "#ffe680"
```

The built-in themes are seeded as editable templates; new themes appear in the
picker after the window is reopened.

## Tech stack

- **Tauri v2** (Rust backend, WebKitGTK webview)
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4** (theming via CSS variables)
- **SQLite** via `rusqlite` (bundled), clipboard via `arboard`

## License

MIT
