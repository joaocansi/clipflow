//! Shared result type and error conversion for Tauri commands.

/// Result returned by Tauri commands — errors are surfaced as display strings
/// (Tauri serializes the `Err` variant straight to the frontend).
pub type CmdResult<T> = std::result::Result<T, String>;

/// Convert any `Display` error into the string error commands return.
pub fn e<T, E: std::fmt::Display>(r: std::result::Result<T, E>) -> CmdResult<T> {
    r.map_err(|err| err.to_string())
}
