use crate::db::Db;
use arboard::{Clipboard, ImageData};
use base64::Engine;
use std::borrow::Cow;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::io::Cursor;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

const DATA_URL_PREFIX: &str = "data:image/png;base64,";

/// Spawn a background thread that polls the system clipboard and persists new
/// text and image entries, emitting `clip-added` so the UI can refresh live.
pub fn start_monitor(app: AppHandle) {
    thread::spawn(move || {
        let mut clipboard = match Clipboard::new() {
            Ok(c) => c,
            Err(e) => {
                eprintln!("[clipflow] clipboard init failed: {e}");
                return;
            }
        };
        let mut last_text = String::new();
        // Hash of the last captured image; 0 means "none seen yet". Hashing the
        // raw pixels lets us skip the (relatively costly) PNG encode unless the
        // image actually changed between polls.
        let mut last_image: u64 = 0;
        loop {
            if let Ok(text) = clipboard.get_text() {
                if !text.is_empty() && text != last_text {
                    last_text = text.clone();
                    insert(&app, &text, "text");
                }
            }

            if let Ok(img) = clipboard.get_image() {
                let h = hash_image(&img);
                if h != 0 && h != last_image {
                    last_image = h;
                    match encode_image(&img) {
                        Ok(url) => insert(&app, &url, "image"),
                        Err(e) => eprintln!("[clipflow] image encode failed: {e}"),
                    }
                }
            }

            thread::sleep(Duration::from_millis(600));
        }
    });
}

/// Persist a clip and notify the UI when a new row was actually added.
fn insert(app: &AppHandle, content: &str, kind: &str) {
    let db = app.state::<Arc<Db>>();
    match db.insert(content, kind) {
        Ok(Some(_)) => {
            let _ = app.emit("clip-added", ());
        }
        Ok(None) => {}
        Err(e) => eprintln!("[clipflow] insert failed: {e}"),
    }
}

/// Write a clip back to the system clipboard. Image clips (stored as a
/// `data:image/…;base64,` URL) are decoded and written as a real image so
/// pasting into other apps yields an image, not a text blob.
pub fn set_clipboard(content: &str) -> anyhow::Result<()> {
    let mut clipboard = Clipboard::new()?;
    if let Some(rest) = content.strip_prefix("data:image/") {
        if let Some(idx) = rest.find(',') {
            let raw = base64::engine::general_purpose::STANDARD.decode(&rest[idx + 1..])?;
            let img = image::load_from_memory(&raw)?.to_rgba8();
            let (w, h) = img.dimensions();
            clipboard.set_image(ImageData {
                width: w as usize,
                height: h as usize,
                bytes: Cow::Owned(img.into_raw()),
            })?;
            return Ok(());
        }
    }
    clipboard.set_text(content.to_string())?;
    Ok(())
}

/// Cheap change-detection hash over an image's dimensions and pixels.
fn hash_image(img: &ImageData) -> u64 {
    let mut h = DefaultHasher::new();
    img.width.hash(&mut h);
    img.height.hash(&mut h);
    img.bytes.hash(&mut h);
    h.finish()
}

/// Encode raw RGBA pixels to a PNG `data:` URL for storage in SQLite.
fn encode_image(img: &ImageData) -> anyhow::Result<String> {
    let buf: image::RgbaImage = image::ImageBuffer::from_raw(
        img.width as u32,
        img.height as u32,
        img.bytes.clone().into_owned(),
    )
    .ok_or_else(|| anyhow::anyhow!("clipboard image buffer had unexpected size"))?;
    let mut png = Vec::new();
    buf.write_to(&mut Cursor::new(&mut png), image::ImageFormat::Png)?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&png);
    Ok(format!("{DATA_URL_PREFIX}{b64}"))
}
