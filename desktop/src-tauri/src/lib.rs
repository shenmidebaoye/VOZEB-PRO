use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use serde::Deserialize;
use serde_json::json;
use tauri::http;
use tauri::webview::PageLoadEvent;
use tauri::window::Color;
use tauri::{AppHandle, Manager, RunEvent, Theme, Url, WindowEvent};

struct SidecarState(Mutex<Option<Child>>);

#[derive(Debug, Deserialize)]
struct StudioEvent {
    event: String,
    url: Option<String>,
    message: Option<String>,
}

const DESKTOP_BOOTSTRAP_JS: &str = r##"(function () {
  window.__VOZEB_DESKTOP__ = true;
  try { window.dispatchEvent(new Event("vozeb-desktop-ready")); } catch (_) {}

  function tauriWindow() {
    try { return window.__TAURI__ && window.__TAURI__.window && window.__TAURI__.window.getCurrentWindow ? window.__TAURI__.window.getCurrentWindow() : null; } catch (_) { return null; }
  }
  function invoke(action) {
    try {
      if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
        return window.__TAURI__.core.invoke("desktop_window_control", { action: action });
      }
    } catch (_) {}
    return Promise.resolve({});
  }
  window.__vozebDesktopWindow = {
    drag: function () {
      var current = tauriWindow();
      if (current && current.startDragging) { try { current.startDragging(); return; } catch (_) {} }
      invoke("drag");
    },
    call: function (action) {
      var current = tauriWindow();
      if (current) {
        if (action === "minimize" && current.minimize) return current.minimize();
        if (action === "maximize" && current.toggleMaximize) {
          return current.toggleMaximize().then(function () {
            return current.isMaximized().then(function (maximized) {
              var next = !!maximized;
              window.__vozebDesktopWindow.setMaximized(next);
              return { maximized: next };
            });
          });
        }
        if (action === "close" && current.close) return current.close();
        if (action === "state" && current.isMaximized) return current.isMaximized().then(function (maximized) { return { maximized: !!maximized }; });
      }
      return invoke(action).then(function (result) {
        if (result && typeof result.maximized === "boolean") window.__vozebDesktopWindow.setMaximized(result.maximized);
        return result || {};
      });
    },
    setMaximized: function (maximized) {
      try {
        window.dispatchEvent(new CustomEvent("vozeb-desktop-maximized", { detail: { maximized: !!maximized } }));
      } catch (_) {}
      var button = document.querySelector("[data-desktop-maximize]");
      if (!button) return;
      button.setAttribute("data-maximized", maximized ? "1" : "0");
      button.setAttribute("aria-label", maximized ? "向下还原" : "最大化");
      button.title = maximized ? "向下还原" : "最大化";
      button.innerHTML = maximized
        ? '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3.5 4.5h5v5h-5zM4.5 2.5h5A1 1 0 0 1 10.5 3.5v5" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/></svg>'
        : '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><rect x="2.25" y="2.25" width="7.5" height="7.5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.25"/></svg>';
    }
  };

  if (document.getElementById("vozeb-desktop-titlebar") || document.getElementById("vozeb-desktop-chrome")) return;
  var bar = document.createElement("header");
  bar.id = "vozeb-desktop-chrome";
  bar.style.cssText = "position:fixed;inset:0 0 auto 0;z-index:2147483646;display:flex;align-items:center;height:36px;border-bottom:1px solid;user-select:none;-webkit-user-select:none;";
  function paint() {
    var dark = document.documentElement.classList.contains("dark") || document.documentElement.style.colorScheme === "dark";
    bar.style.background = dark ? "#111316" : "#fafbfc";
    bar.style.color = dark ? "#f3f5f7" : "#20242a";
    bar.style.borderBottomColor = dark ? "#2b3037" : "#e5e8ec";
  }
  paint();
  try {
    new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
  } catch (_) {}
  var title = document.createElement("div");
  title.setAttribute("data-tauri-drag-region", "");
  title.style.cssText = "flex:1;min-width:0;height:100%;display:flex;align-items:center;padding:0 12px;font:500 12px/1 Segoe UI,PingFang SC,Microsoft YaHei,sans-serif;letter-spacing:.02em;";
  title.textContent = "VOZEB PRO";
  title.addEventListener("mousedown", function (event) {
    if (event.button !== 0) return;
    window.__vozebDesktopWindow.drag();
  });
  title.addEventListener("dblclick", function () { window.__vozebDesktopWindow.call("maximize"); });
  var actions = document.createElement("div");
  actions.setAttribute("data-desktop-no-drag", "1");
  actions.style.cssText = "display:flex;height:100%;";
  [["minimize","─"],["maximize",""],["close","×"]].forEach(function (item) {
    var button = document.createElement("button");
    button.type = "button";
    if (item[0] === "maximize") button.setAttribute("data-desktop-maximize", "1");
    button.textContent = item[1];
    button.style.cssText = "width:44px;height:100%;border:0;background:transparent;color:inherit;cursor:default;font:16px/1 sans-serif;display:grid;place-items:center;";
    button.addEventListener("mouseenter", function () {
      button.style.background = item[0] === "close" ? "#c42b1c" : "rgba(127,127,127,.18)";
      if (item[0] === "close") button.style.color = "#fff";
    });
    button.addEventListener("mouseleave", function () {
      button.style.background = "transparent";
      button.style.color = "inherit";
    });
    button.addEventListener("mousedown", function (event) { event.preventDefault(); event.stopPropagation(); });
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      window.__vozebDesktopWindow.call(item[0]);
    });
    actions.appendChild(button);
  });
  bar.appendChild(title);
  bar.appendChild(actions);
  document.documentElement.classList.add("vozeb-desktop-shell");
  (document.body || document.documentElement).appendChild(bar);
  window.__vozebDesktopWindow.setMaximized(false);
  var current = tauriWindow();
  if (current && current.isMaximized) {
    current.isMaximized().then(function (maximized) { window.__vozebDesktopWindow.setMaximized(!!maximized); });
  } else {
    invoke("state").then(function (result) {
      if (result && typeof result.maximized === "boolean") window.__vozebDesktopWindow.setMaximized(result.maximized);
    });
  }
  var style = document.createElement("style");
  style.id = "vozeb-desktop-chrome-style";
  style.textContent = [
    "html.vozeb-desktop-shell{--vozeb-desktop-titlebar-height:36px;--vozeb-viewport-height:calc(100dvh - 36px);}",
    "html.vozeb-desktop-shell body:has(#vozeb-desktop-chrome){padding-top:36px;box-sizing:border-box;}",
    "html.vozeb-desktop-shell body:has(#vozeb-desktop-chrome) .h-dvh,",
    "html.vozeb-desktop-shell body:has(#vozeb-desktop-chrome) .min-h-dvh,",
    "html.vozeb-desktop-shell body:has(#vozeb-desktop-chrome) .h-screen,",
    "html.vozeb-desktop-shell body:has(#vozeb-desktop-chrome) .min-h-screen{height:calc(100dvh - 36px)!important;max-height:calc(100dvh - 36px)!important;min-height:0!important;}",
    "html.vozeb-desktop-shell body:has(#vozeb-desktop-chrome) .app-scroll-page{height:calc(100dvh - 36px);max-height:calc(100dvh - 36px);}"
  ].join("");
  document.documentElement.appendChild(style);
})();"##;

const THEME_OBSERVER_JS: &str = r#"(function () {
  if (window.__vozebTitlebarThemeSync) return;
  window.__vozebTitlebarThemeSync = true;
  var last = "";
  function endpoints(theme) {
    return [
      "http://vozeb-theme.localhost/" + theme,
      "https://vozeb-theme.localhost/" + theme,
      "vozeb-theme://localhost/" + theme
    ];
  }
  function sync() {
    var theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    if (theme === last) return;
    last = theme;
    endpoints(theme).forEach(function (url) {
      try {
        fetch(url, { method: "GET", cache: "no-store", mode: "cors" }).catch(function () {});
      } catch (_) {}
    });
  }
  try {
    new MutationObserver(sync).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"]
    });
  } catch (_) {}
  sync();
})();"#;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(SidecarState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![desktop_window_control])
        .register_uri_scheme_protocol("vozeb-theme", |ctx, request| {
            let theme = request
                .uri()
                .path()
                .trim_matches('/')
                .split('/')
                .next()
                .unwrap_or("light");
            apply_window_theme(ctx.app_handle(), theme);
            empty_cors_response(204, None)
        })
        .register_uri_scheme_protocol("vozeb-window", |ctx, request| {
            let action = request
                .uri()
                .path()
                .trim_matches('/')
                .split('/')
                .next()
                .unwrap_or("");
            handle_window_action(ctx.app_handle(), action)
        })
        .on_page_load(|webview, payload| {
            if payload.event() != PageLoadEvent::Finished {
                return;
            }
            if let Err(error) = webview.eval(DESKTOP_BOOTSTRAP_JS) {
                eprintln!("[desktop] chrome bootstrap inject failed: {error}");
            }
            let host = payload.url().host_str().unwrap_or_default();
            if host == "127.0.0.1" || host == "localhost" {
                if let Err(error) = webview.eval(THEME_OBSERVER_JS) {
                    eprintln!("[desktop] theme observer inject failed: {error}");
                }
            }
        })
        .setup(|app| {
            let handle = app.handle().clone();
            let data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
            std::fs::create_dir_all(&data_dir).map_err(|error| error.to_string())?;

            if let Some(window) = handle.get_webview_window("main") {
                // Match splash / default app theme until the page reports otherwise.
                apply_window_theme(&handle, "light");
                let event_window = window.clone();
                window.on_window_event(move |event| {
                    if !matches!(event, WindowEvent::Resized(_)) {
                        return;
                    }
                    let maximized = event_window.is_maximized().unwrap_or(false);
                    let script = format!(
                        r#"(function(m){{try{{window.dispatchEvent(new CustomEvent("vozeb-desktop-maximized",{{detail:{{maximized:m}}}}));}}catch(e){{}}if(window.__vozebDesktopWindow&&window.__vozebDesktopWindow.setMaximized)window.__vozebDesktopWindow.setMaximized(m);}})({});"#,
                        if maximized { "true" } else { "false" }
                    );
                    let _ = event_window.eval(&script);
                });
            }

            let web_root = resolve_web_root()?;
            let script = web_root.join("scripts").join("start-desktop.mjs");
            if !script.is_file() {
                return Err(format!("找不到桌面启动脚本：{}", script.display()).into());
            }

            // Windows canonicalize() yields \\?\ paths; Node rejects them as EISDIR on `D:`.
            let web_root = strip_extended_path(web_root);
            let script = strip_extended_path(script);
            let data_dir = strip_extended_path(data_dir);
            let ready_file = data_dir.join("desktop-ready.json");
            let _ = std::fs::remove_file(&ready_file);

            let mut child = Command::new("node")
                .arg(script.as_os_str())
                .current_dir(&web_root)
                .env("VOZEB_PRO_DATA_DIR", &data_dir)
                .env("VOZEB_PRO_DESKTOP", "1")
                .stdout(Stdio::piped())
                .stderr(Stdio::inherit())
                .spawn()
                .map_err(|error| format!("无法启动 Node 桌面服务：{error}"))?;

            let stdout = child
                .stdout
                .take()
                .ok_or_else(|| "无法读取桌面服务输出".to_string())?;

            {
                let state = app.state::<SidecarState>();
                *state
                    .0
                    .lock()
                    .map_err(|_| "无法锁定桌面服务状态".to_string())? = Some(child);
            }

            let navigated = Arc::new(AtomicBool::new(false));
            let stdout_flag = Arc::clone(&navigated);
            let file_flag = Arc::clone(&navigated);
            let file_handle = handle.clone();
            let ready_path = ready_file.clone();

            thread::spawn(move || watch_sidecar(handle, stdout, stdout_flag));
            thread::spawn(move || poll_ready_file(file_handle, ready_path, file_flag));
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building VOZEB PRO desktop")
        .run(|app_handle, event| {
            if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
                stop_sidecar(app_handle);
            }
        });
}

fn watch_sidecar(handle: AppHandle, stdout: impl std::io::Read + Send + 'static, navigated: Arc<AtomicBool>) {
    let reader = BufReader::new(stdout);
    let started = Instant::now();
    for line in reader.lines().map_while(Result::ok) {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if let Some(url) = extract_ready_url(trimmed) {
            if navigated.swap(true, Ordering::SeqCst) {
                continue;
            }
            navigate_main(&handle, &url);
            eprintln!(
                "[desktop] studio ready in {}ms -> {url}",
                started.elapsed().as_millis()
            );
            continue;
        }
        match serde_json::from_str::<StudioEvent>(trimmed) {
            Ok(event) if event.event == "studio.error" => {
                eprintln!(
                    "[desktop] studio error: {}",
                    event.message.unwrap_or_else(|| "unknown".into())
                );
            }
            Ok(event) => {
                eprintln!(
                    "[desktop] {}: {}",
                    event.event,
                    event.message.unwrap_or_default()
                );
            }
            Err(_) => eprintln!("[desktop-sidecar] {trimmed}"),
        }
    }
}

fn poll_ready_file(handle: AppHandle, ready_file: PathBuf, navigated: Arc<AtomicBool>) {
    let started = Instant::now();
    while started.elapsed() < Duration::from_secs(180) {
        if navigated.load(Ordering::SeqCst) {
            return;
        }
        if let Ok(raw) = std::fs::read_to_string(&ready_file) {
            let trimmed = raw.trim();
            if !trimmed.is_empty() {
                if let Ok(event) = serde_json::from_str::<StudioEvent>(trimmed) {
                    if event.event == "studio.ready" || event.url.is_some() {
                        if let Some(url) = event.url {
                            if !navigated.swap(true, Ordering::SeqCst) {
                                navigate_main(&handle, &url);
                                eprintln!(
                                    "[desktop] studio ready via file in {}ms -> {url}",
                                    started.elapsed().as_millis()
                                );
                            }
                            return;
                        }
                    }
                }
            }
        }
        thread::sleep(Duration::from_millis(200));
    }
    if !navigated.load(Ordering::SeqCst) {
        eprintln!("[desktop] timed out waiting for studio.ready");
    }
}

#[tauri::command]
fn desktop_window_control(app: AppHandle, action: String) -> Result<serde_json::Value, String> {
    apply_window_action(&app, action.as_str())
}

fn apply_window_action(handle: &AppHandle, action: &str) -> Result<serde_json::Value, String> {
    let window = handle
        .get_webview_window("main")
        .ok_or_else(|| "main window missing".to_string())?;
    match action {
        "minimize" => {
            window.minimize().map_err(|error| error.to_string())?;
            Ok(json!({ "ok": true }))
        }
        "maximize" => {
            let maximized = window.is_maximized().unwrap_or(false);
            if maximized {
                window.unmaximize().map_err(|error| error.to_string())?;
            } else {
                window.maximize().map_err(|error| error.to_string())?;
            }
            Ok(json!({ "maximized": !maximized }))
        }
        "close" => {
            window.close().map_err(|error| error.to_string())?;
            Ok(json!({ "ok": true }))
        }
        "drag" => {
            window.start_dragging().map_err(|error| error.to_string())?;
            Ok(json!({ "ok": true }))
        }
        "state" => {
            let maximized = window.is_maximized().unwrap_or(false);
            Ok(json!({ "maximized": maximized }))
        }
        _ => Err(format!("unknown window action: {action}")),
    }
}

fn handle_window_action(handle: &AppHandle, action: &str) -> http::Response<Vec<u8>> {
    match apply_window_action(handle, action) {
        Ok(value) => empty_cors_response(200, Some(value.to_string().into_bytes())),
        Err(_) => empty_cors_response(404, Some(br#"{"ok":false}"#.to_vec())),
    }
}

fn empty_cors_response(status: u16, body: Option<Vec<u8>>) -> http::Response<Vec<u8>> {
    let bytes = body.unwrap_or_default();
    let mut builder = http::Response::builder()
        .status(status)
        .header("Access-Control-Allow-Origin", "*")
        .header("Access-Control-Allow-Methods", "GET, OPTIONS")
        .header("Cache-Control", "no-store");
    if !bytes.is_empty() {
        builder = builder.header("Content-Type", "application/json; charset=utf-8");
    }
    builder.body(bytes).unwrap()
}

fn apply_window_theme(handle: &AppHandle, theme: &str) {
    let dark = theme.eq_ignore_ascii_case("dark");
    let next = if dark { Theme::Dark } else { Theme::Light };
    // App-wide + window: Windows title bar uses immersive dark mode via set_theme.
    handle.set_theme(Some(next));
    if let Some(window) = handle.get_webview_window("main") {
        if let Err(error) = window.set_theme(Some(next)) {
            eprintln!("[desktop] set_theme failed: {error}");
        }
        let bg = if dark {
            Color(0x11, 0x13, 0x16, 255) // #111316
        } else {
            Color(0xfa, 0xfb, 0xfc, 255) // #fafbfc
        };
        if let Err(error) = window.set_background_color(Some(bg)) {
            eprintln!("[desktop] set_background_color failed: {error}");
        }
    }
    eprintln!("[desktop] window theme -> {}", if dark { "dark" } else { "light" });
}

fn extract_ready_url(line: &str) -> Option<String> {
    let json = if line.starts_with('{') {
        line
    } else if let Some(index) = line.find("{\"event\":") {
        &line[index..]
    } else {
        return None;
    };
    let event: StudioEvent = serde_json::from_str(json).ok()?;
    if event.event == "studio.ready" {
        event.url
    } else {
        None
    }
}

fn navigate_main(handle: &AppHandle, url: &str) {
    let Ok(parsed) = Url::parse(url) else {
        eprintln!("[desktop] invalid studio url: {url}");
        return;
    };
    let Some(window) = handle.get_webview_window("main") else {
        eprintln!("[desktop] main window missing");
        return;
    };
    if let Err(error) = window.navigate(parsed) {
        eprintln!("[desktop] navigate failed: {error}");
    } else {
        let _ = window.eval(DESKTOP_BOOTSTRAP_JS);
        let _ = window.eval(THEME_OBSERVER_JS);
    }
}

fn stop_sidecar(app_handle: &AppHandle) {
    let Some(state) = app_handle.try_state::<SidecarState>() else {
        return;
    };
    let Ok(mut guard) = state.0.lock() else {
        return;
    };
    let Some(mut child) = guard.take() else {
        return;
    };
    let pid = child.id();
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    #[cfg(not(windows))]
    {
        let _ = child.kill();
    }
    let _ = child.wait();
    thread::sleep(Duration::from_millis(50));
}

fn resolve_web_root() -> Result<PathBuf, String> {
    if let Ok(configured) = std::env::var("VOZEB_PRO_WEB_ROOT") {
        let path = strip_extended_path(PathBuf::from(configured));
        if path.is_dir() {
            return Ok(path);
        }
        return Err(format!("VOZEB_PRO_WEB_ROOT 无效：{}", path.display()));
    }

    let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    let candidates = [
        manifest_dir.join("../../web"),
        manifest_dir.join("../../../web"),
        manifest_dir.join("../resources/web"),
    ];
    for candidate in candidates {
        if let Ok(path) = candidate.canonicalize() {
            let path = strip_extended_path(path);
            if path.join("scripts").join("start-desktop.mjs").is_file() {
                return Ok(path);
            }
        }
    }
    Err("无法定位 web 目录，请设置 VOZEB_PRO_WEB_ROOT".into())
}

fn strip_extended_path(path: PathBuf) -> PathBuf {
    let text = path.to_string_lossy();
    if let Some(rest) = text.strip_prefix(r"\\?\UNC\") {
        PathBuf::from(format!(r"\\{rest}"))
    } else if let Some(rest) = text.strip_prefix(r"\\?\") {
        PathBuf::from(rest)
    } else {
        path
    }
}
