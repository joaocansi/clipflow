# Foco da janela no X11/GNOME (overlay estilo Spotlight)

Este documento registra um problema não óbvio que enfrentamos e como foi resolvido,
para que ninguém precise redescobrir tudo no futuro.

## O sintoma

A janela é um overlay borderless, `alwaysOnTop`, que começa oculta (`visible: false`)
e é mostrada via atalho global (`Ctrl+Shift+Space`). O comportamento observado foi:

1. **1ª abertura**: tudo funcionava — a janela abria **com foco de teclado**, dava pra
   digitar na busca, `Esc` fechava e clicar fora fechava.
2. **2ª abertura em diante**: a janela **aparecia, mas sem foco**. Não dava pra digitar,
   `Esc` não fechava e clicar fora não fechava. Era como se a janela estivesse "morta".

O detalhe importante: `Esc`, clicar-fora e foco do input **todos dependem da janela ter
foco do SO**. `Esc` e o fechar-ao-clicar-fora são handlers de teclado/`blur` no webview —
se a janela não está ativa no nível do window manager, o webview não recebe eventos e
nada disso dispara. Ou seja, os três sintomas eram **uma única causa**: a janela não
estava recebendo foco de teclado a partir da 2ª abertura.

## A causa raiz: focus-stealing-prevention do mutter

O GNOME (mutter) no X11 tem *focus-stealing-prevention*: ele evita que uma janela
"roube" o foco da janela ativa quando ela é mostrada/ativada programaticamente.

A decisão de conceder ou negar o foco é baseada em **timestamps do servidor X11**.
Quando um app pede ativação (`_NET_ACTIVE_WINDOW`), o mutter compara o **timestamp do
pedido** com o `_NET_WM_USER_TIME` da janela atualmente focada:

- Se o timestamp do pedido for **mais novo**, o mutter concede o foco.
- Se for **mais velho** (ou `0` / `CurrentTime`), o mutter **nega** e apenas marca a
  janela como "urgente" (ela aparece, mas sem foco).

O `WebviewWindow::set_focus()` do Tauri, no Linux, mapeia para
`gtk_window_present()` — que usa timestamp **`0` (`CurrentTime`)**. Na 1ª ativação o
mutter é permissivo (não há "user time" relevante ainda) e concede. Da 2ª vez em diante,
como o usuário já interagiu com outras janelas, o pedido com timestamp `0` é tratado
como "antigo" e **negado**. Daí o foco só funcionar uma vez.

## Tentativas que NÃO resolveram (e por quê)

1. **Re-chamar `set_focus()` algumas vezes com `sleep`** — continua mandando timestamp
   `0`; o mutter ignora igual.
2. **`present_with_time()` com relógio de parede** (`SystemTime::now()` em ms truncado
   pra `u32`) — o timestamp existe, mas está numa **base de tempo diferente** da do
   servidor X11. O `_NET_WM_USER_TIME` é medido em "ms desde que o X subiu", não em
   epoch. Como os dois não são comparáveis, o valor caía como "mais velho" e o mutter
   negava.

## A solução

Apresentar a janela via GTK usando o **timestamp real do servidor X11**, que é
exatamente o relógio contra o qual o mutter decide. Isso é feito no Rust, na thread
principal do GTK.

### 1. Pegar o tempo do servidor X11 e presentar com ele

`src-tauri/src/lib.rs`:

```rust
// Apresenta a janela GTK usando o timestamp do SERVIDOR X11 — que é o relógio
// que o focus-stealing-prevention do mutter compara. set_focus() manda 0
// (CurrentTime), ignorado em toda ativação após a primeira. Roda na thread
// principal do GTK.
#[cfg(target_os = "linux")]
fn present_now(gtk_win: &gtk::ApplicationWindow) {
    use gtk::prelude::{Cast, GtkWindowExt, WidgetExt};
    let ts = gtk_win
        .window()                                              // gdk::Window (precisa estar realizada)
        .and_then(|gdk_win| gdk_win.downcast::<gdkx11::X11Window>().ok())
        .map(|x11_win| gdkx11::functions::x11_get_server_time(&x11_win))
        .unwrap_or(0);
    gtk_win.present_with_time(ts);
}

#[cfg(target_os = "linux")]
fn force_present(w: &tauri::WebviewWindow) {
    let w = w.clone();
    let _ = w.clone().run_on_main_thread(move || {
        if let Ok(gtk_win) = w.gtk_window() {
            present_now(&gtk_win);
            // Re-afirma uma vez depois que o WM realmente mapeou a janela.
            let gw = gtk_win.clone();
            gtk::glib::timeout_add_local_once(std::time::Duration::from_millis(80), move || {
                use gtk::prelude::WidgetExt;
                // Não ressuscita uma janela que foi fechada nesse meio tempo.
                if gw.is_visible() {
                    present_now(&gw);
                }
            });
        }
    });
}
```

Pontos sutis:

- **`run_on_main_thread`**: chamadas GTK/GDK só podem rodar na thread principal do GTK.
  O handler do atalho global roda em outra thread, então marshalamos pra main.
- **`x11_get_server_time`** vive em `gdkx11::functions::` e recebe um **`&X11Window`**
  (não um `gdk::Window`). Por isso o `downcast::<gdkx11::X11Window>()` — no X11 a
  `gdk::Window` é, na prática, uma `X11Window`.
- **Re-present com 80ms**: na hora do `show()` a janela pode ainda não estar mapeada;
  presentar de novo logo depois garante o foco. O guard `gw.is_visible()` evita que esse
  timer reabra/refoque uma janela que o usuário já fechou nesse intervalo.

Dependências adicionadas em `src-tauri/Cargo.toml` (apenas Linux):

```toml
[target.'cfg(target_os = "linux")'.dependencies]
gtk = "0.18"
gdkx11 = "0.18"
```

### 2. Mostrar a janela e disparar o force_present

```rust
fn show_and_focus(w: &tauri::WebviewWindow) {
    let _ = w.unminimize();
    let _ = w.center();
    let _ = w.show();
    let _ = w.set_focus();        // 1ª abertura / fallback (não-Linux)
    #[cfg(target_os = "linux")]
    force_present(w);             // garante foco da 2ª em diante no X11/GNOME
}
```

### 3. Fechar-ao-clicar-fora vem do frontend, não do Rust

Inicialmente o "esconder ao perder foco" estava num `WindowEvent::Focused(false)` no
Rust. Removemos isso e passamos a usar o evento `blur` do `window` no frontend
(`src/App.tsx`):

```ts
useEffect(() => {
  const onBlur = () => api.hideWindow();
  window.addEventListener("blur", onBlur);
  // ...
}, []);
```

Motivo: o `blur` do frontend só dispara **depois que o webview de fato segurou o foco**.
Isso evita uma corrida em que um estado "sem foco" transitório (durante o `show()` +
`present`) escondia a janela na hora errada. Como agora o foco funciona de verdade, o
`blur` passa a disparar corretamente em toda abertura.

### 4. Foco do input com retry

Mesmo com a janela focada, no X11 o webview pode levar alguns frames pra aceitar foco.
O frontend tenta focar o input de busca repetidamente por alguns frames
(`focusSearch` em `src/App.tsx`), e refoca sempre que a janela ganha foco (`focus` event)
na view de lista.

## Bônus: o toggle "fechava e reabria"

Depois que o foco passou a funcionar, apareceu outro problema: apertar o atalho pra
**fechar** às vezes fechava e reabria. Causa: no X11 o `XGrabKey` pode **entregar a
tecla duas vezes**, então `toggle` rodava `hide()` e logo em seguida `show()`.

Solução: **debounce** no `toggle_window`, ignorando repetições em menos de 250ms,
usando um estado guardado no Tauri:

```rust
struct WinState {
    last_toggle: std::sync::Mutex<std::time::Instant>,
}

fn toggle_window(app: &AppHandle) {
    if let Some(st) = app.try_state::<WinState>() {
        let mut last = st.last_toggle.lock().unwrap();
        if last.elapsed() < std::time::Duration::from_millis(250) {
            return; // ignora o disparo duplicado do X11
        }
        *last = std::time::Instant::now();
    }
    // ... hide() se visível, senão show_and_focus()
}
```

## Bônus 2: registro do atalho não-fatal

Durante o `pnpm tauri dev` com hot-reload, uma instância antiga pode ainda segurar o
grab do atalho quando a nova sobe, causando `HotKey already registered` e **panic** no
setup. Tornamos o registro não-fatal (loga em vez de propagar o erro), pra não derrubar
o app por um grab residual transitório.

## Bônus 3: o scrim fullscreen e a janela que "fechava sozinha"

Depois adicionamos um **scrim/dim fullscreen** atrás do painel (estilo Spotlight). Em
vez de fullscreen do SO (que *unredirect*a a janela e mata a transparência), o
`show_and_focus` redimensiona/posiciona a janela pra cobrir o monitor inteiro via
`current_monitor()`, e o frontend desenha um fundo escuro (`bg-black/40`) com o painel
(760×540) centralizado por cima. Clicar no escuro (scrim) fecha.

Isso introduziu uma regressão chata: a janela **abria e se fechava sozinha ~1,5s
depois**. Sintomas: "não fica aberta", "não consigo fechar", "`Esc` só na 2ª vez".

### Como diagnosticamos (parar de chutar)

Instrumentamos com `eprintln!`: cada `toggle_window` logava `FIRE`/`IGNORED` com o
estado, e o comando `hide_window` passou a receber um `reason` do frontend. O log foi
decisivo:

```
toggle FIRE (false -> true)            ← abriu
hide_window CMD (reason=blur+1570ms)   ← um blur fechou, 1570ms após o show
toggle FIRE (false -> true)            ← abriu de novo
```

Ou seja: a janela **perdia o foco sozinha** ~1,5s após abrir (provavelmente o monitor
de clipboard tocando nas seleções do X11 a cada 600ms, e/ou o mutter mexendo no foco da
janela fullscreen `alwaysOnTop`), e o handler `blur` do frontend tratava isso como
"clicou fora" e escondia.

### A correção

1. **`blur` não esconde mais na hora.** Ele ignora blur nos primeiros 600ms após
   `window-shown` e, depois disso, **adia ~250ms e só esconde se `document.hasFocus()`
   continuar `false`**. Um blur transitório recupera o foco logo e é ignorado; uma troca
   real de aplicação fica sem foco e aí sim esconde.

   ```ts
   const onBlur = () => {
     const sinceShown = Date.now() - shownAtRef.current;
     if (sinceShown < 600) return;                 // transiente do show
     window.setTimeout(() => {
       if (!document.hasFocus()) api.hideWindow();  // foco realmente foi embora
     }, 250);
   };
   ```

2. **Clicar-fora não depende mais do `blur`.** Como o scrim cobre a tela toda, o
   `onMouseDown` do scrim (com guard `target === currentTarget`) já fecha ao clicar fora
   do painel. O `blur` ficou só pro caso de trocar de app.

3. **Estado de visibilidade explícito.** O `toggle_window` parou de consultar
   `is_visible()` (que reflete o map/unmap assíncrono do X11 e é racy logo após
   show/hide) e passou a usar um `AtomicBool` em `WinState`. `do_hide()` — por onde
   passam Esc, blur, scrim e copy — mantém o flag em sincronia. O debounce do toggle
   também subiu pra 300ms e passou a **bumpar o timestamp em todo disparo** (inclusive os
   ignorados), pra um burst de teclas (double-emit/auto-repeat) virar um único toggle.

## Resumo

| Problema | Causa | Solução |
|----------|-------|---------|
| Sem foco da 2ª abertura | mutter nega ativação com timestamp `0`/relógio-de-parede | `present_with_time` com **server time do X11** (`gdkx11`) |
| `Esc`/clicar-fora morrem junto | dependem do foco do SO, que não vinha | resolvido junto com o foco |
| Esconder na hora errada | corrida com `Focused(false)` do Rust | usar `blur` do frontend |
| Toggle fecha e reabre | `XGrabKey` entrega a tecla 2x / auto-repeat | debounce 300ms que bumpa em todo disparo + estado explícito (`AtomicBool`) |
| Panic no hot-reload | grab residual de instância antiga | registro do atalho não-fatal |
| Janela fecha sozinha ~1,5s após abrir (scrim fullscreen) | blur transitório (clipboard monitor / mutter) tratado como click-away | `blur` adia e checa `document.hasFocus()`; click-fora via scrim, não via blur |
