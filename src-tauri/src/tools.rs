use anyhow::Context;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

/// A user-defined tool. Each tool lives in its own folder under the tools
/// directory, described by a `manifest.toml`. The tool's `run` command receives
/// the clip on stdin (and in `$CLIPFLOW_INPUT`) and must write `output_file`
/// (JSON) into its folder:
///   - `{ "result": <value> }`  → success; `result` is copied to the clipboard
///   - `{ "error":  "msg" }`    → failure; shown to the user
///   - `{ "message": "msg" }` or no `result` → an action-only tool (nothing to
///     copy), e.g. it sent a notification or wrote a file.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tool {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    /// Optional regex; when it matches the clip the tool is suggested first.
    #[serde(rename = "match", default)]
    pub match_pattern: String,
    /// Shell command run with the tool's folder as the working directory.
    pub run: String,
    /// File the command writes its JSON output to (relative to the tool folder).
    #[serde(default = "default_output_file")]
    pub output_file: String,
}

fn default_output_file() -> String {
    "output.json".to_string()
}

/// Outcome of running a tool, returned to the frontend.
#[derive(Debug, Serialize)]
pub struct ToolRun {
    pub ok: bool,
    /// The transformation to copy to the clipboard (success with output).
    pub result: Option<String>,
    /// Info message for action-only tools (success, nothing to copy).
    pub message: Option<String>,
    /// Error message (failure).
    pub error: Option<String>,
}

/// Returns the tools directory, creating it (and seeding examples) if absent.
pub fn tools_dir() -> anyhow::Result<PathBuf> {
    let base = dirs::config_dir().context("no config dir")?;
    let dir = base.join("clipflow").join("tools");
    std::fs::create_dir_all(&dir)?;
    // Seed the examples when there are no folder-format tools yet (covers both a
    // fresh install and an upgrade from the old flat *.toml layout).
    if !has_folder_tool(&dir) {
        seed_examples(&dir)?;
    }
    Ok(dir)
}

/// True if at least one subfolder with a `manifest.toml` exists.
fn has_folder_tool(dir: &PathBuf) -> bool {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return false;
    };
    for entry in entries.flatten() {
        let p = entry.path();
        if p.is_dir() && p.join("manifest.toml").exists() {
            return true;
        }
    }
    false
}

/// Write a single example tool folder (manifest + an optional script file).
fn write_example(
    base: &PathBuf,
    id: &str,
    manifest: &str,
    script: Option<(&str, &str)>,
) -> anyhow::Result<()> {
    let dir = base.join(id);
    if dir.exists() {
        return Ok(());
    }
    std::fs::create_dir_all(&dir)?;
    std::fs::write(dir.join("manifest.toml"), manifest)?;
    if let Some((file, body)) = script {
        std::fs::write(dir.join(file), body)?;
    }
    Ok(())
}

fn seed_examples(dir: &PathBuf) -> anyhow::Result<()> {
    // Transformation tool: pretty-print JSON.
    write_example(
        dir,
        "json-pretty",
        r#"id = "json-pretty"
name = "Format JSON"
description = "Pretty-print JSON with 2-space indent"
match = "^\\s*[\\{\\[]"
run = "python3 run.py"
output_file = "output.json"
"#,
        Some((
            "run.py",
            r#"import sys, json
data = sys.stdin.read()
try:
    obj = json.loads(data)
    out = {"result": json.dumps(obj, indent=2, ensure_ascii=False)}
except Exception as e:
    out = {"error": f"JSON invalido: {e}"}
json.dump(out, open("output.json", "w"))
"#,
        )),
    )?;

    // Transformation tool: UPPERCASE the clip.
    write_example(
        dir,
        "uppercase",
        r#"id = "uppercase"
name = "UPPERCASE"
description = "Transform the clip to upper case"
match = ""
run = "python3 run.py"
output_file = "output.json"
"#,
        Some((
            "run.py",
            r#"import sys, json
data = sys.stdin.read()
json.dump({"result": data.upper()}, open("output.json", "w"))
"#,
        )),
    )?;

    // Action-only tool: send a desktop notification with the clip.
    write_example(
        dir,
        "notify",
        r#"id = "notify"
name = "Notify"
description = "Send a desktop notification with the clip (action only)"
match = ""
run = "python3 run.py"
output_file = "output.json"
"#,
        Some((
            "run.py",
            r#"import sys, json, subprocess
data = sys.stdin.read()
try:
    subprocess.run(["notify-send", "ClipFlow", data[:200]], check=False)
    out = {"message": "Notificacao enviada"}
except Exception as e:
    out = {"error": str(e)}
json.dump(out, open("output.json", "w"))
"#,
        )),
    )?;

    Ok(())
}

/// Read every tool (one per subfolder containing a `manifest.toml`).
pub fn list_tools() -> anyhow::Result<Vec<Tool>> {
    let dir = tools_dir()?;
    let mut tools = Vec::new();
    for entry in std::fs::read_dir(&dir)? {
        let path = entry?.path();
        if !path.is_dir() {
            continue;
        }
        let manifest = path.join("manifest.toml");
        if !manifest.exists() {
            continue;
        }
        let raw = std::fs::read_to_string(&manifest)?;
        match toml::from_str::<Tool>(&raw) {
            Ok(t) => tools.push(t),
            Err(e) => eprintln!("[clipflow] bad tool {:?}: {e}", manifest),
        }
    }
    tools.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(tools)
}

/// Create/update a tool's folder + manifest.
pub fn save_tool(tool: &Tool) -> anyhow::Result<()> {
    if tool.id.trim().is_empty() {
        anyhow::bail!("tool id is required");
    }
    let dir = tools_dir()?.join(&tool.id);
    std::fs::create_dir_all(&dir)?;
    let body = toml::to_string_pretty(tool)?;
    std::fs::write(dir.join("manifest.toml"), body)?;
    Ok(())
}

/// Delete a tool's entire folder.
pub fn delete_tool(id: &str) -> anyhow::Result<()> {
    let dir = tools_dir()?.join(id);
    if dir.exists() {
        std::fs::remove_dir_all(dir)?;
    }
    Ok(())
}

/// Run a tool against the clip: pipe `input` to its command (cwd = tool folder),
/// then read and interpret the JSON output file.
pub fn run_tool(id: &str, input: &str) -> anyhow::Result<ToolRun> {
    let dir = tools_dir()?.join(id);
    let manifest = dir.join("manifest.toml");
    let raw = std::fs::read_to_string(&manifest)
        .with_context(|| format!("tool '{id}' not found"))?;
    let tool: Tool = toml::from_str(&raw)?;
    let out_path = dir.join(&tool.output_file);

    // Clear any stale output so we never read a previous run's result.
    let _ = std::fs::remove_file(&out_path);

    let mut child = Command::new("sh")
        .arg("-c")
        .arg(&tool.run)
        .current_dir(&dir)
        .env("CLIPFLOW_INPUT", input)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .context("failed to spawn tool")?;
    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(input.as_bytes());
    }
    let out = child.wait_with_output()?;

    // The output file is the source of truth when present.
    if let Ok(content) = std::fs::read_to_string(&out_path) {
        return Ok(parse_output(&content));
    }

    // No output file: a clean exit means an action-only tool that wrote nothing;
    // a non-zero exit is an error (surface stderr).
    if out.status.success() {
        Ok(ToolRun {
            ok: true,
            result: None,
            message: Some("Concluído".to_string()),
            error: None,
        })
    } else {
        let err = String::from_utf8_lossy(&out.stderr).to_string();
        Ok(ToolRun {
            ok: false,
            result: None,
            message: None,
            error: Some(if err.trim().is_empty() {
                format!("Tool falhou ({})", out.status)
            } else {
                err
            }),
        })
    }
}

/// Interpret an `output.json` body into a `ToolRun`.
fn parse_output(content: &str) -> ToolRun {
    let value: serde_json::Value = match serde_json::from_str(content) {
        Ok(v) => v,
        Err(e) => {
            return ToolRun {
                ok: false,
                result: None,
                message: None,
                error: Some(format!("output.json inválido: {e}")),
            }
        }
    };

    if let Some(err) = value.get("error").and_then(|v| v.as_str()) {
        return ToolRun {
            ok: false,
            result: None,
            message: None,
            error: Some(err.to_string()),
        };
    }

    if let Some(result) = value.get("result") {
        let text = match result {
            serde_json::Value::String(s) => s.clone(),
            other => serde_json::to_string_pretty(other).unwrap_or_default(),
        };
        return ToolRun {
            ok: true,
            result: Some(text),
            message: None,
            error: None,
        };
    }

    // Action-only success: optional human-readable message.
    let message = value
        .get("message")
        .and_then(|v| v.as_str())
        .unwrap_or("Concluído")
        .to_string();
    ToolRun {
        ok: true,
        result: None,
        message: Some(message),
        error: None,
    }
}
