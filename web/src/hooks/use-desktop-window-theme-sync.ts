"use client";

import { useEffect } from "react";

import { useThemeStore } from "@/stores/use-theme-store";

function desktopThemeEndpoints(theme: "light" | "dark") {
    return [
        `http://vozeb-theme.localhost/${theme}`,
        `https://vozeb-theme.localhost/${theme}`,
        `vozeb-theme://localhost/${theme}`,
        "/api/desktop/window-theme",
    ] as const;
}

/** Sync OS title bar with the in-app light/dark theme in the Tauri desktop shell. */
export function useDesktopWindowThemeSync() {
    const theme = useThemeStore((state) => state.theme);

    useEffect(() => {
        let cancelled = false;
        const sync = async () => {
            // Prefer the Tauri custom protocol so title-bar sync works even when
            // the Next standalone build is stale and missing the desktop API route.
            for (const endpoint of desktopThemeEndpoints(theme)) {
                if (cancelled) return;
                try {
                    if (endpoint.startsWith("/api/")) {
                        await fetch(endpoint, {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ theme }),
                            cache: "no-store",
                        });
                    } else {
                        await fetch(endpoint, { method: "GET", cache: "no-store", mode: "cors" });
                    }
                    return;
                } catch {
                    // Try the next transport.
                }
            }
        };
        void sync();
        return () => {
            cancelled = true;
        };
    }, [theme]);
}
