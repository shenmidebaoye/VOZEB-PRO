"use client";

import type { AgentReadiness } from "@/components/admin/admin-generation-settings";
import { adminSectionHref, type AdminSectionKey } from "@/components/admin/admin-sections";
import { App } from "antd";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useCallback, useRef, useState } from "react";

import type { AuthSettings, PublicUser } from "@/lib/auth/store";
import type { AdminSetupSummary } from "@/lib/server/admin-setup-status";

export type AdminDashboardProps = {
    initialSettings: AuthSettings;
    currentUser: PublicUser;
    initialSection?: AdminSectionKey;
    setupSummary?: AdminSetupSummary;
    headerActions?: ReactNode;
};

export function useAdminDashboardState({ initialSettings, currentUser, initialSection = "channels", setupSummary, headerActions }: AdminDashboardProps) {
    const { message } = App.useApp();
    const logoInputRef = useRef<HTMLInputElement>(null);
    const iconInputRef = useRef<HTMLInputElement>(null);
    const [settings, setSettingsState] = useState(initialSettings);
    const settingsRef = useRef(initialSettings);
    const setSettings = useCallback((update: SetStateAction<AuthSettings>) => {
        const next = typeof update === "function" ? update(settingsRef.current) : update;
        settingsRef.current = next;
        setSettingsState(next);
    }, []) as Dispatch<SetStateAction<AuthSettings>>;
    const getSettings = useCallback(() => settingsRef.current, []);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [fetchingModelId, setFetchingModelId] = useState("");
    const [activeSection, setActiveSectionState] = useState<AdminSectionKey>(initialSection);
    const setActiveSection = useCallback((section: AdminSectionKey) => {
        setActiveSectionState(section);
        window.history.replaceState(window.history.state, "", adminSectionHref(section, window.location.href));
    }, []);
    const [agentReadiness, setAgentReadiness] = useState<AgentReadiness | null>(null);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [desktopNavCollapsed, setDesktopNavCollapsed] = useState(false);
    return {
        currentUser,
        initialSection,
        setupSummary,
        headerActions,
        message,
        logoInputRef,
        iconInputRef,
        settings,
        setSettings,
        getSettings,
        settingsLoading,
        setSettingsLoading,
        fetchingModelId,
        setFetchingModelId,
        activeSection,
        setActiveSection,
        agentReadiness,
        setAgentReadiness,
        mobileNavOpen,
        setMobileNavOpen,
        desktopNavCollapsed,
        setDesktopNavCollapsed,
    };
}

export type AdminDashboardState = ReturnType<typeof useAdminDashboardState>;
