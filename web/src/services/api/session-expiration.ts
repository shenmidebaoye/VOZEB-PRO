"use client";

import { resetPublicSession } from "@/stores/use-public-session-store";
import { useUserStore } from "@/stores/use-user-store";

let redirecting = false;

export class ClientSessionExpiredError extends Error {
    constructor() {
        super("本机实例未就绪，请完成安装或刷新页面");
        this.name = "ClientSessionExpiredError";
    }
}

export function throwIfClientSessionExpired(response: Response) {
    if (response.status !== 401) return;
    expireClientSession();
    throw new ClientSessionExpiredError();
}

export function expireClientSession() {
    useUserStore.getState().clearSession();
    resetPublicSession();
    if (typeof window === "undefined" || redirecting) return;
    redirecting = true;
    window.location.assign("/");
}

export async function stopIfClientSessionExpired() {
    try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) return false;
        const payload = (await response.json().catch(() => null)) as { user?: unknown } | null;
        if (payload && payload.user) return false;
        expireClientSession();
        return true;
    } catch {
        return false;
    }
}
