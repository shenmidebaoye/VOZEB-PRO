"use client";

import { localAgentReadiness } from "@/components/admin/admin-generation-settings";
import { useEffect } from "react";

import type { AdminDashboardDataActions } from "./use-admin-dashboard-data-actions";
import type { AdminDashboardSettingsActions } from "./use-admin-dashboard-settings-actions";
import type { AdminDashboardState } from "./use-admin-dashboard-state";

export function useAdminDashboardEffects({ state }: { state: AdminDashboardState; data: AdminDashboardDataActions; settingsActions: AdminDashboardSettingsActions }) {
    const { initialSection, settings, settingsLoading, activeSection, setActiveSection, setAgentReadiness } = state;

    useEffect(() => {
        if (activeSection !== "skills" || settingsLoading) return;
        void fetch("/api/admin/agent-readiness", { cache: "no-store" })
            .then((response) => (response.ok ? response.json() : null))
            .then((payload) => setAgentReadiness(payload?.data || localAgentReadiness(settings)));
    }, [activeSection, settingsLoading]);

    useEffect(() => {
        setActiveSection(initialSection);
    }, [initialSection]);
}
