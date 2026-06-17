//! Overlay window lifecycle: show / hide / toggle, plus the X11/mutter focus
//! workarounds needed for a transparent, globally-toggled Spotlight-style panel.

use tauri::{AppHandle, Emitter, Manager};

/// Debounce + explicit visibility state for the toggle shortcut.
/// X11 can deliver a grabbed key more than once, and `is_visible()` reflects
/// the async X11 map/unmap state (racy right after show/hide), so we track the
/// intended visibility ourselves instead of querying the window.
pub struct WinState {
    last_toggle: std::sync::Mutex<std::time::Instant>,
    visible: std::sync::atomic::AtomicBool,
}

impl WinState {
    /// Start with the last-toggle timestamp one second in the past (so the very
    /// first toggle is not debounced) and the window marked hidden.
    pub fn new() -> Self {
        let initial = std::time::Instant::now()
            .checked_sub(std::time::Duration::from_secs(1))
            .unwrap_or_else(std::time::Instant::now);
        Self {
            last_toggle: std::sync::Mutex::new(initial),
            visible: std::sync::atomic::AtomicBool::new(false),
        }
    }
}

impl Default for WinState {
    fn default() -> Self {
        Self::new()
    }
}

/// Hide the window and record the intended state so the next toggle knows the
/// window is hidden (Esc / blur / scrim-click all funnel through here).
fn do_hide(app: &AppHandle) {
    if let Some(st) = app.try_state::<WinState>() {
        st.visible.store(false, std::sync::atomic::Ordering::SeqCst);
    }
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.hide();
    }
}

#[tauri::command]
pub fn hide_window(app: AppHandle, reason: Option<String>) {
    eprintln!(
        "[clipflow] hide_window CMD (reason={})",
        reason.as_deref().unwrap_or("?")
    );
    do_hide(&app);
}

/// Present the GTK window using the **X11 server time**, which is the timestamp
/// mutter's focus-stealing-prevention compares against. `set_focus()` sends a
/// zero (`CurrentTime`) timestamp that mutter ignores on every activation after
/// the first — that is why focus was lost on the 2nd+ open. Must run on the GTK
/// main thread.
#[cfg(target_os = "linux")]
fn present_now(gtk_win: &gtk::ApplicationWindow) {
    use gtk::prelude::{BinExt, Cast, GtkWindowExt, WidgetExt};
    let ts = gtk_win
        .window()
        .and_then(|gdk_win| gdk_win.downcast::<gdkx11::X11Window>().ok())
        .map(|x11_win| gdkx11::functions::x11_get_server_time(&x11_win))
        .unwrap_or(0);
    gtk_win.present_with_time(ts);
    // Presenting focuses the WINDOW, but the embedded WebKitWebView widget also
    // needs GTK focus or the page receives no key events until the user's first
    // keystroke routes focus into it (the "press a key once before it works"
    // bug). Grab focus on the window's child widget (the webview container) so
    // keystrokes reach the DOM immediately on open.
    if let Some(child) = gtk_win.child() {
        child.grab_focus();
    }
}

#[cfg(target_os = "linux")]
fn force_present(w: &tauri::WebviewWindow) {
    let w = w.clone();
    let _ = w.clone().run_on_main_thread(move || {
        if let Ok(gtk_win) = w.gtk_window() {
            present_now(&gtk_win);
            // Re-assert once more after the WM has actually mapped the window.
            let gw = gtk_win.clone();
            gtk::glib::timeout_add_local_once(std::time::Duration::from_millis(80), move || {
                use gtk::prelude::WidgetExt;
                // Don't resurrect a window that was closed in the meantime.
                if gw.is_visible() {
                    present_now(&gw);
                }
            });
        }
    });
}

/// Logical window size: the 920×560 panel plus an even 100px margin on every
/// side for its drop shadow. Keeping the size (and the margin) even means the
/// panel always lands on whole pixels.
const WIN_W: f64 = 1120.0;
const WIN_H: f64 = 760.0;

fn show_and_focus(w: &tauri::WebviewWindow) {
    let _ = w.unminimize();
    // Size the window to the panel + shadow margin and center it on the active
    // monitor at INTEGER physical coordinates. Covering the whole monitor and
    // centering the fixed-size panel in CSS instead lands the panel on a
    // half-pixel (odd viewport / fractional DPI scale), which smears all text.
    let _ = w.set_size(tauri::LogicalSize::new(WIN_W, WIN_H));
    if let Ok(Some(monitor)) = w.current_monitor() {
        let scale = monitor.scale_factor();
        let win_w = (WIN_W * scale) as i32;
        let win_h = (WIN_H * scale) as i32;
        let size = monitor.size();
        let pos = monitor.position();
        let x = pos.x + (size.width as i32 - win_w) / 2;
        let y = pos.y + (size.height as i32 - win_h) / 2;
        let _ = w.set_position(tauri::PhysicalPosition::new(x, y));
    }
    let _ = w.show();
    let _ = w.set_focus();
    #[cfg(target_os = "linux")]
    force_present(w);
}

/// Show the window if hidden, hide it if shown. Triggered by the global
/// shortcut and the tray icon.
pub fn toggle_window(app: &AppHandle) {
    // Debounce: X11 can deliver the grabbed shortcut more than once (double
    // delivery and/or key auto-repeat while held), which would hide() then
    // show() again ("closes and reopens"). We bump the timestamp on EVERY
    // activation — including ignored ones — so a whole burst of repeated keys
    // collapses into a single toggle: a new toggle only fires after the keys
    // have been idle for the debounce window.
    let Some(st) = app.try_state::<WinState>() else {
        return;
    };
    let elapsed_ms = {
        let mut last = st.last_toggle.lock().unwrap();
        let elapsed = last.elapsed();
        *last = std::time::Instant::now();
        elapsed.as_millis()
    };
    let was_visible = st.visible.load(std::sync::atomic::Ordering::SeqCst);
    if elapsed_ms < 300 {
        eprintln!("[clipflow] toggle IGNORED (elapsed={elapsed_ms}ms, visible={was_visible})");
        return;
    }
    // Flip the intended visibility deterministically (don't query is_visible()).
    let next_visible = !was_visible;
    st.visible
        .store(next_visible, std::sync::atomic::Ordering::SeqCst);
    eprintln!("[clipflow] toggle FIRE (elapsed={elapsed_ms}ms, {was_visible} -> {next_visible})");
    if next_visible {
        if let Some(w) = app.get_webview_window("main") {
            show_and_focus(&w);
            let _ = app.emit_to("main", "window-shown", ());
        }
    } else {
        do_hide(app);
    }
}
