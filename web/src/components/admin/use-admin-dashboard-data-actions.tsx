"use client";

import type { AuthSettings } from "@/lib/auth/store";
import { applyPublicSiteSettings, notifyPublicSettingsChanged } from "@/stores/use-public-session-store";
import { applyAdminSettingsSaveSnapshot, beginAdminSettingsSave, createAdminSettingsSaveQueue, createAdminSettingsSaveSnapshot, finishAdminSettingsSave, mergeAdminSettingsSaveResponse, restoreAdminSettingsSaveFailure } from "./admin-settings-save";
import { useRef } from "react";
import type { AdminDashboardState } from "./use-admin-dashboard-state";

export function useAdminDashboardDataActions({ state }: { state: AdminDashboardState }) {
    const settingsSaveCountRef = useRef(0);
    const settingsSaveQueueRef = useRef(createAdminSettingsSaveQueue());
    const { message, setSettings, getSettings, setSettingsLoading } = state;

    const saveSettings = async (input: Partial<AuthSettings> | ((current: AuthSettings) => Partial<AuthSettings>), successText = "设置已保存") => {
        const patch = typeof input === "function" ? input(getSettings()) : input;
        const snapshot = createAdminSettingsSaveSnapshot(patch);
        const current = getSettings();
        const previous = createAdminSettingsSaveSnapshot(Object.fromEntries(snapshot.keys.map((key) => [key, current[key]])) as Partial<AuthSettings>);
        setSettings((current) => applyAdminSettingsSaveSnapshot(current, snapshot));
        settingsSaveCountRef.current = beginAdminSettingsSave(settingsSaveCountRef.current);
        setSettingsLoading(true);
        try {
            const payload = await settingsSaveQueueRef.current.run(async () => {
                const response = await fetch("/api/admin/settings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(patch),
                });
                const result = (await response.json()) as { settings?: AuthSettings; error?: string };
                if (!response.ok || !result.settings) throw new Error(result.error || "更新设置失败");
                return result as { settings: AuthSettings };
            });
            setSettings((current) => mergeAdminSettingsSaveResponse(current, payload.settings!, snapshot));
            if (patch.site) applyPublicSiteSettings(payload.settings.site);
            notifyPublicSettingsChanged();
            message.success(successText);
            return true;
        } catch (error) {
            setSettings((current) => restoreAdminSettingsSaveFailure(current, previous, snapshot));
            message.error(error instanceof Error ? error.message : "更新设置失败");
            return false;
        } finally {
            const settled = finishAdminSettingsSave(settingsSaveCountRef.current);
            settingsSaveCountRef.current = settled.remaining;
            setSettingsLoading(settled.loading);
        }
    };

    return { saveSettings };
}

export type AdminDashboardDataActions = ReturnType<typeof useAdminDashboardDataActions>;
