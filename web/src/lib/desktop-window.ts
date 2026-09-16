declare global {
    interface Window {
        __VOZEB_DESKTOP__?: boolean;
        __vozebDesktopWindow?: {
            drag: () => void;
            call: (action: string) => Promise<unknown> | unknown;
        };
        __TAURI__?: {
            core?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> };
            window?: {
                getCurrentWindow: () => {
                    startDragging: () => Promise<void>;
                    minimize: () => Promise<void>;
                    toggleMaximize: () => Promise<void>;
                    close: () => Promise<void>;
                    isMaximized: () => Promise<boolean>;
                    onResized?: (handler: () => void) => Promise<() => void>;
                };
            };
        };
    }
}

export type DesktopWindowState = { maximized?: boolean };

function tauriWindow() {
    try {
        return window.__TAURI__?.window?.getCurrentWindow?.() ?? null;
    } catch {
        return null;
    }
}

async function readMaximized(): Promise<boolean | null> {
    const current = tauriWindow();
    if (current?.isMaximized) {
        try {
            return Boolean(await current.isMaximized());
        } catch {
            // fall through
        }
    }
    try {
        const result = await window.__TAURI__?.core?.invoke("desktop_window_control", { action: "state" });
        if (result && typeof result === "object" && "maximized" in result) {
            return Boolean((result as DesktopWindowState).maximized);
        }
    } catch {
        // fall through
    }
    return null;
}

/** Must be called synchronously inside a mousedown handler. */
export function startDesktopWindowDrag() {
    if (window.__vozebDesktopWindow?.drag) {
        window.__vozebDesktopWindow.drag();
        return;
    }
    const current = tauriWindow();
    if (current) {
        void current.startDragging();
        return;
    }
    void window.__TAURI__?.core?.invoke("desktop_window_control", { action: "drag" });
}

export async function callDesktopWindow(action: "minimize" | "maximize" | "close" | "state"): Promise<DesktopWindowState> {
    if (window.__vozebDesktopWindow?.call) {
        const result = await window.__vozebDesktopWindow.call(action);
        if (result && typeof result === "object" && "maximized" in (result as object)) {
            return result as DesktopWindowState;
        }
        if (action === "state" || action === "maximize") {
            const maximized = await readMaximized();
            if (maximized !== null) return { maximized };
        }
        return {};
    }

    const current = tauriWindow();
    if (current) {
        if (action === "minimize") {
            await current.minimize();
            return {};
        }
        if (action === "maximize") {
            await current.toggleMaximize();
            return { maximized: await current.isMaximized() };
        }
        if (action === "close") {
            await current.close();
            return {};
        }
        if (action === "state") {
            return { maximized: await current.isMaximized() };
        }
    }

    try {
        const result = await window.__TAURI__?.core?.invoke("desktop_window_control", { action });
        if (result && typeof result === "object") return result as DesktopWindowState;
    } catch {
        // fall through
    }
    return {};
}

/** Keep maximize/restore button in sync with OS window state. */
export function subscribeDesktopMaximized(onChange: (maximized: boolean) => void): () => void {
    let cancelled = false;
    const sync = async () => {
        const maximized = await readMaximized();
        if (!cancelled && maximized !== null) onChange(maximized);
    };

    void sync();

    const onCustom = (event: Event) => {
        const detail = (event as CustomEvent<{ maximized?: boolean }>).detail;
        if (typeof detail?.maximized === "boolean") onChange(detail.maximized);
        else void sync();
    };
    window.addEventListener("vozeb-desktop-maximized", onCustom);

    let unlistenResized: (() => void) | undefined;
    const current = tauriWindow();
    if (current?.onResized) {
        void current.onResized(() => {
            void sync();
        }).then((unlisten) => {
            if (cancelled) unlisten();
            else unlistenResized = unlisten;
        });
    }

    const onResize = () => {
        void sync();
    };
    window.addEventListener("resize", onResize);

    return () => {
        cancelled = true;
        window.removeEventListener("vozeb-desktop-maximized", onCustom);
        window.removeEventListener("resize", onResize);
        unlistenResized?.();
    };
}
