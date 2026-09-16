"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { Keyboard, Settings2 } from "lucide-react";
import Link from "next/link";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { cn } from "@/lib/utils";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import { useUserStore, type LocalUser } from "@/stores/use-user-store";

type UserStatusActionsProps = {
    variant?: "default" | "canvas";
    onOpenShortcuts?: () => void;
    initialUser?: LocalUser;
};

export function UserStatusActions({ variant = "default", onOpenShortcuts, initialUser }: UserStatusActionsProps) {
    const [isCompactViewport, setIsCompactViewport] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const storeUser = useUserStore((state) => state.user);
    const user = storeUser || initialUser || null;
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const canvasTheme = canvasThemes[theme];
    const defaultControlClass =
        "inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-[#e6e9ed] bg-white text-sm font-medium text-[#59616c] transition hover:border-[#d9dde3] hover:bg-[#f3f5f7] hover:text-[#20242a] dark:border-[#2c3138] dark:bg-[#181b20] dark:text-[#b7bec8] dark:hover:border-[#3b424c] dark:hover:bg-[#22262c] dark:hover:text-white";
    const canvasControlClass =
        "inline-flex h-9 shrink-0 items-center justify-center rounded-xl border px-2.5 text-sm font-medium shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/35 [&_svg]:size-4";
    const canvasIconClass = cn(canvasControlClass, "w-9 px-0");
    const canvasControlStyle: CSSProperties | undefined =
        variant === "canvas"
            ? {
                  background: canvasTheme.toolbar.panel,
                  borderColor: canvasTheme.toolbar.border,
                  boxShadow: theme === "dark" ? "0 10px 30px rgba(0,0,0,.28)" : "0 10px 24px rgba(28,25,23,.08)",
                  color: canvasTheme.toolbar.item,
              }
            : undefined;
    const naturalIconClass = variant === "canvas" ? canvasIconClass : cn(defaultControlClass, "w-8 px-0 [&_svg]:size-4");
    const iconStyle: CSSProperties | undefined = variant === "canvas" ? canvasControlStyle : undefined;

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 520px)");
        const syncViewport = () => setIsCompactViewport(mediaQuery.matches);
        syncViewport();
        mediaQuery.addEventListener("change", syncViewport);
        return () => mediaQuery.removeEventListener("change", syncViewport);
    }, []);

    return (
        <div ref={rootRef} className={cn("user-status-actions inline-flex max-w-full items-center gap-1.5 sm:gap-2", variant === "canvas" ? "canvas-user-status-actions shrink-0" : "app-user-status-actions min-w-0")}>
            <AnimatedThemeToggler
                theme={theme}
                onThemeChange={setTheme}
                className={cn(naturalIconClass, variant === "canvas" && "canvas-theme-action")}
                style={iconStyle}
                aria-label={theme === "dark" ? "切换到浅色主题" : "切换到浅色主题"}
                title={theme === "dark" ? "切换到浅色主题" : "切换到浅色主题"}
            />
            {user ? (
                <Link
                    href="/settings"
                    className={cn(naturalIconClass, variant === "canvas" && "canvas-settings-action")}
                    style={iconStyle}
                    aria-label="设置"
                    title={isCompactViewport ? "设置" : "渠道与系统设置"}
                >
                    <Settings2 className="size-4" />
                </Link>
            ) : null}
            {onOpenShortcuts ? (
                <button type="button" className={cn(naturalIconClass, variant === "canvas" && "canvas-shortcuts-action")} style={iconStyle} onClick={onOpenShortcuts} aria-label="快捷键" title="快捷键">
                    <Keyboard className="size-4" />
                </button>
            ) : null}
        </div>
    );
}
