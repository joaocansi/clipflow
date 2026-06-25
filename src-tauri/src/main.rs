// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // WebKitGTK 2.42+ defaults to a DMA-BUF renderer that corrupts rendering
    // (smeared / ghosted / duplicated text and images, "out of nowhere") on
    // many Linux GPU+driver setups — markedly worse on transparent windows
    // like ours. Disabling it falls back to a reliable software path. Must be
    // set before the webview (GTK/WebKit) initializes, so do it here first.
    #[cfg(target_os = "linux")]
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");

    clipflow_lib::run()
}
