use anyhow::Context;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// A color theme. Stored as a TOML file in the themes directory; the field
/// names map 1:1 to the `--cf-*` CSS variables the frontend applies. Values are
/// any valid CSS color (hex, rgb/rgba, etc.).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Theme {
    pub id: String,
    pub name: String,
    /// Panel background.
    pub panel: String,
    /// Secondary surfaces (sidebar, inputs, code blocks).
    pub surface: String,
    /// Primary text.
    pub text: String,
    /// Muted/secondary text.
    pub text_dim: String,
    /// Borders and dividers.
    pub border: String,
    /// Selected / active item background.
    pub selection: String,
    /// Hover background.
    pub hover: String,
    /// Accent color (primary buttons, active ring, tags).
    pub accent: String,
    /// Translucent accent for soft button backgrounds.
    pub accent_soft: String,
    /// Text/icon color shown on accent surfaces.
    pub accent_text: String,
}

/// Returns the themes directory, creating it (and seeding the built-ins as
/// editable examples) if absent.
pub fn themes_dir() -> anyhow::Result<PathBuf> {
    let base = dirs::config_dir().context("no config dir")?;
    let dir = base.join("clipflow").join("themes");
    let first_run = !dir.exists();
    std::fs::create_dir_all(&dir)?;
    if first_run {
        seed_builtins(&dir)?;
    }
    Ok(dir)
}

fn write_example(dir: &PathBuf, file: &str, body: &str) -> anyhow::Result<()> {
    let path = dir.join(file);
    if !path.exists() {
        std::fs::write(path, body)?;
    }
    Ok(())
}

fn seed_builtins(dir: &PathBuf) -> anyhow::Result<()> {
    write_example(
        dir,
        "dark.toml",
        r##"id = "dark"
name = "Dark"
panel = "rgba(24, 24, 27, 0.96)"
surface = "rgba(0, 0, 0, 0.22)"
text = "#f4f4f5"
text_dim = "#a1a1aa"
border = "rgba(255, 255, 255, 0.10)"
selection = "rgba(255, 255, 255, 0.14)"
hover = "rgba(255, 255, 255, 0.06)"
accent = "#6366f1"
accent_soft = "rgba(99, 102, 241, 0.28)"
accent_text = "#c7d2fe"
"##,
    )?;
    write_example(
        dir,
        "light.toml",
        r##"id = "light"
name = "Light"
panel = "rgba(250, 250, 252, 0.98)"
surface = "rgba(0, 0, 0, 0.04)"
text = "#18181b"
text_dim = "#52525b"
border = "rgba(0, 0, 0, 0.12)"
selection = "rgba(0, 0, 0, 0.08)"
hover = "rgba(0, 0, 0, 0.04)"
accent = "#4f46e5"
accent_soft = "rgba(79, 70, 229, 0.14)"
accent_text = "#4338ca"
"##,
    )?;
    write_example(
        dir,
        "dark-green.toml",
        r##"id = "dark-green"
name = "Dark Green"
panel = "rgba(12, 26, 20, 0.96)"
surface = "rgba(0, 0, 0, 0.25)"
text = "#e7f3ec"
text_dim = "#8fb3a1"
border = "rgba(255, 255, 255, 0.08)"
selection = "rgba(16, 185, 129, 0.16)"
hover = "rgba(255, 255, 255, 0.05)"
accent = "#10b981"
accent_soft = "rgba(16, 185, 129, 0.24)"
accent_text = "#a7f3d0"
"##,
    )?;
    write_example(
        dir,
        "dark-blue.toml",
        r##"id = "dark-blue"
name = "Dark Blue"
panel = "rgba(12, 18, 33, 0.96)"
surface = "rgba(0, 0, 0, 0.25)"
text = "#e6edf7"
text_dim = "#93a4c0"
border = "rgba(255, 255, 255, 0.08)"
selection = "rgba(59, 130, 246, 0.18)"
hover = "rgba(255, 255, 255, 0.05)"
accent = "#3b82f6"
accent_soft = "rgba(59, 130, 246, 0.26)"
accent_text = "#bfdbfe"
"##,
    )?;
    Ok(())
}

/// Read all themes from the themes directory (skipping malformed files).
pub fn list_themes() -> anyhow::Result<Vec<Theme>> {
    let dir = themes_dir()?;
    let mut themes = Vec::new();
    for entry in std::fs::read_dir(&dir)? {
        let path = entry?.path();
        if path.extension().and_then(|e| e.to_str()) != Some("toml") {
            continue;
        }
        let raw = std::fs::read_to_string(&path)?;
        match toml::from_str::<Theme>(&raw) {
            Ok(t) => themes.push(t),
            Err(e) => eprintln!("[clipflow] bad theme {:?}: {e}", path),
        }
    }
    themes.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(themes)
}
