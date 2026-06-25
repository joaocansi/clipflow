mod clipboard;
mod commands;
mod db;
mod error;
mod themes;
mod tools;
mod window;

use db::Db;
use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use window::{toggle_window, WinState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let toggle_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if shortcut == &toggle_shortcut && event.state() == ShortcutState::Pressed {
                        toggle_window(app);
                    }
                })
                .build(),
        )
        .setup(move |app| {
            // Database lives in the app data dir.
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db = Arc::new(Db::open(&data_dir.join("clipflow.db"))?);
            app.manage(db);

            // Toggle debounce + visibility state.
            app.manage(WinState::new());

            // Register the toggle shortcut. Non-fatal: during dev hot-reload a
            // stale instance may still hold the grab momentarily.
            if let Err(e) = app.global_shortcut().register(toggle_shortcut) {
                eprintln!("[clipflow] failed to register shortcut: {e}");
            }

            // Tray icon with a context menu.
            let show = MenuItem::with_id(app, "show", "Show / Hide", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("ClipFlow — Ctrl+Shift+Space")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, ev| match ev.id.as_ref() {
                    "show" => toggle_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, ev| {
                    use tauri::tray::{MouseButton, TrayIconEvent};
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = ev
                    {
                        toggle_window(tray.app_handle());
                    }
                })
                .build(app)?;

            // Hide on focus loss is handled in the frontend (window `blur`),
            // which only fires once the webview has truly held focus — this
            // avoids a transient unfocused state hiding the window on show.

            // Start the clipboard monitor.
            clipboard::start_monitor(app.handle().clone());

            // Ensure tools + themes dirs (and their examples) exist on first launch.
            let _ = tools::tools_dir();
            let _ = themes::themes_dir();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_clips,
            commands::search_clips,
            commands::delete_clip,
            commands::clear_clips,
            commands::toggle_pin,
            commands::copy_clip,
            commands::list_saved,
            commands::search_saved,
            commands::save_item,
            commands::update_saved,
            commands::delete_saved,
            commands::set_saved_folder,
            commands::list_folders,
            commands::create_folder,
            commands::rename_folder,
            commands::delete_folder,
            commands::get_setting,
            commands::set_setting,
            commands::app_version,
            commands::list_tools,
            commands::save_tool,
            commands::delete_tool,
            commands::run_tool,
            commands::list_themes,
            window::hide_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
