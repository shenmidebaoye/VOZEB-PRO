import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Minus, X } from "lucide-react";

import { callDesktopWindow, startDesktopWindowDrag, subscribeDesktopMaximized } from "@/lib/desktop-window";
import { useThemeStore } from "@/stores/use-theme-store";

declare global {
    interface Window {
        __VOZEB_DESKTOP__?: boolean;
    }
}

function useIsDesktopShell() {
    const [active, setActive] = useState(false);
    useEffect(() => {
        const sync = () => setActive(Boolean(window.__VOZEB_DESKTOP__));
        sync();
        window.addEventListener("vozeb-desktop-ready", sync);
        return () => window.removeEventListener("vozeb-desktop-ready", sync);
    }, []);
    return active;
}

export function DesktopShellFrame({ children }: { children: ReactNode }) {
    const desktop = useIsDesktopShell();
    useEffect(() => {
        document.documentElement.classList.toggle("vozeb-desktop-shell", desktop);
        document.getElementById("vozeb-desktop-chrome")?.remove();
        document.getElementById("vozeb-desktop-chrome-style")?.remove();
        return () => document.documentElement.classList.remove("vozeb-desktop-shell");
    }, [desktop]);

    if (!desktop) return children;

    return (
        <div className="desktop-shell-frame flex min-h-0 w-full flex-col overflow-hidden">
            <DesktopTitleBar />
            <div className="desktop-shell-content min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
        </div>
    );
}

function MaximizeGlyph({ maximized }: { maximized: boolean }) {
    if (maximized) {
        return (
            <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                <path
                    d="M3.5 4.5h5v5h-5zM4.5 2.5h5A1 1 0 0 1 10.5 3.5v5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
            <rect x="2.25" y="2.25" width="7.5" height="7.5" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
        </svg>
    );
}

function DesktopTitleBar() {
    const theme = useThemeStore((state) => state.theme);
    const dark = theme === "dark";
    const [maximized, setMaximized] = useState(false);

    useEffect(() => subscribeDesktopMaximized(setMaximized), []);

    const onDrag = useCallback((event: MouseEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        if ((event.target as HTMLElement | null)?.closest("[data-desktop-no-drag]")) return;
        startDesktopWindowDrag();
    }, []);

    const toggleMaximize = useCallback(async () => {
        const state = await callDesktopWindow("maximize");
        if (typeof state.maximized === "boolean") setMaximized(state.maximized);
        else setMaximized((value) => !value);
    }, []);

    return (
        <header
            id="vozeb-desktop-titlebar"
            className={`flex h-9 shrink-0 select-none items-center border-b ${dark ? "border-[#2b3037] bg-[#111316] text-[#f3f5f7]" : "border-[#e5e8ec] bg-[#fafbfc] text-[#20242a]"}`}
        >
            <div
                className="flex h-full min-w-0 flex-1 items-center gap-2 px-3"
                data-tauri-drag-region
                onMouseDown={onDrag}
                onDoubleClick={() => void toggleMaximize()}
            >
                <img src="/logo.svg" alt="" className="pointer-events-none size-4 shrink-0" draggable={false} />
                <span className="pointer-events-none truncate text-xs font-medium tracking-wide">VOZEB PRO</span>
            </div>
            <div className="flex h-full shrink-0" data-desktop-no-drag>
                <TitleBarButton label="最小化" dark={dark} onClick={() => void callDesktopWindow("minimize")}>
                    <Minus className="size-3.5" strokeWidth={1.75} />
                </TitleBarButton>
                <TitleBarButton label={maximized ? "向下还原" : "最大化"} dark={dark} onClick={() => void toggleMaximize()}>
                    <MaximizeGlyph maximized={maximized} />
                </TitleBarButton>
                <TitleBarButton label="关闭" dark={dark} danger onClick={() => void callDesktopWindow("close")}>
                    <X className="size-3.5" strokeWidth={1.75} />
                </TitleBarButton>
            </div>
        </header>
    );
}

function TitleBarButton({
    label,
    dark,
    danger,
    onClick,
    children,
}: {
    label: string;
    dark: boolean;
    danger?: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    const base = dark ? "text-[#f3f5f7] hover:bg-white/10" : "text-[#20242a] hover:bg-black/5";
    const dangerClass = dark ? "hover:bg-[#c42b1c] hover:text-white" : "hover:bg-[#c42b1c] hover:text-white";
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={`grid h-full w-11 place-items-center transition-colors ${danger ? dangerClass : base}`}
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClick();
            }}
            onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
            }}
        >
            {children}
        </button>
    );
}
