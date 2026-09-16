"use client";

import { adminSections } from "@/components/admin/admin-section-nav";
import type { AdminDashboardState } from "./use-admin-dashboard-state";

export function useAdminDashboardTableModel({ state }: { state: AdminDashboardState }) {
    const { setupSummary, activeSection } = state;
    const activeSectionInfo = adminSections.find((section) => section.key === activeSection) || adminSections[0];
    const nextSetupStep = setupSummary?.steps.find((step) => step.status !== "done") || setupSummary?.steps[setupSummary.steps.length - 1];
    return { activeSectionInfo, nextSetupStep };
}

export type AdminDashboardTableModel = ReturnType<typeof useAdminDashboardTableModel>;
