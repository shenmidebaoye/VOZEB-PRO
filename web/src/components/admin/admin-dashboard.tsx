"use client";

import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import type { AdminSectionKey } from "@/components/admin/admin-sections";
import { ArrowRight, Menu, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import type { AuthSettings, PublicUser } from "@/lib/auth/store";
import type { AdminSetupSummary } from "@/lib/server/admin-setup-status";
import { useAdminDashboardController } from "./use-admin-dashboard-controller";

type AdminDashboardProps = {
    initialSettings: AuthSettings;
    currentUser: PublicUser;
    initialSection?: AdminSectionKey;
    setupSummary?: AdminSetupSummary;
    headerActions?: ReactNode;
};
const loadSiteSection = () => import("./admin-configuration-sections").then((module) => module.AdminSiteSection);
const loadSettingsSection = () => import("./admin-configuration-sections").then((module) => module.AdminSettingsSection);
const loadMediaStorageSection = () => import("./admin-system-sections").then((module) => module.AdminMediaStorageSection);
const loadExternalStorageSection = () => import("./admin-system-sections").then((module) => module.AdminExternalStorageSection);
const loadBackupSection = () => import("./admin-system-sections").then((module) => module.AdminBackupSection);
const loadUpdatesSection = () => import("./admin-system-sections").then((module) => module.AdminUpdatesSection);
const loadChannelsSection = () => import("./admin-upstream-sections").then((module) => module.AdminChannelsSection);
const loadSkillsSection = () => import("./admin-upstream-sections").then((module) => module.AdminSkillsSection);

const sectionLoaders: Partial<Record<AdminSectionKey, () => Promise<unknown>>> = {
    site: loadSiteSection,
    settings: loadSettingsSection,
    mediaStorage: loadMediaStorageSection,
    externalStorage: loadExternalStorageSection,
    backup: loadBackupSection,
    updates: loadUpdatesSection,
    channels: loadChannelsSection,
    skills: loadSkillsSection,
};

const AdminSiteSection = dynamic(loadSiteSection, { loading: AdminSectionLoading });
const AdminSettingsSection = dynamic(loadSettingsSection, { loading: AdminSectionLoading });
const AdminBackupSection = dynamic(loadBackupSection, { loading: AdminSectionLoading });
const AdminExternalStorageSection = dynamic(loadExternalStorageSection, { loading: AdminSectionLoading });
const AdminMediaStorageSection = dynamic(loadMediaStorageSection, { loading: AdminSectionLoading });
const AdminUpdatesSection = dynamic(loadUpdatesSection, { loading: AdminSectionLoading });
const AdminChannelsSection = dynamic(loadChannelsSection, { loading: AdminSectionLoading });
const AdminSkillsSection = dynamic(loadSkillsSection, { loading: AdminSectionLoading });

function AdminSectionLoading() {
    return <div className="flex min-h-36 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">正在加载分区...</div>;
}

export function AdminDashboard(props: AdminDashboardProps) {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    const controller = useAdminDashboardController(props);
    const {
        currentUser,
        setupSummary,
        headerActions,
        logoInputRef,
        iconInputRef,
        activeSection,
        setActiveSection,
        mobileNavOpen,
        setMobileNavOpen,
        desktopNavCollapsed,
        setDesktopNavCollapsed,
        uploadSiteLogo,
        uploadSiteIcon,
        activeSectionInfo,
        nextSetupStep,
    } = controller;
    return (
        <div data-hydrated={hydrated ? "true" : "false"} className={`admin-mobile-safe admin-dashboard-shell min-h-dvh w-full min-w-0 ${desktopNavCollapsed ? "is-sidebar-collapsed" : ""}`}>
            {mobileNavOpen ? <button type="button" className="admin-section-nav-backdrop lg:hidden" aria-label="收起设置侧边栏" onClick={() => setMobileNavOpen(false)} /> : null}
            <AdminSectionNav
                activeKey={activeSection}
                currentUser={currentUser}
                onChange={setActiveSection}
                onIntent={(section) => void sectionLoaders[section]?.()}
                mobileOpen={mobileNavOpen}
                desktopCollapsed={desktopNavCollapsed}
                onDesktopToggle={() => setDesktopNavCollapsed((collapsed) => !collapsed)}
                onMobileToggle={() => setMobileNavOpen((open) => !open)}
                onMobileClose={() => setMobileNavOpen(false)}
            />
            <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                <header className="admin-dashboard-header sticky top-0 z-20 border-b border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6 lg:px-5">
                    <div className="admin-dashboard-header-inner mx-auto flex min-h-9 w-full max-w-[1600px] min-w-0 items-center justify-between gap-3">
                        <div className="admin-dashboard-title-row flex min-w-0 items-center gap-3">
                            <button
                                type="button"
                                className="admin-mobile-menu-trigger flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 lg:hidden"
                                aria-label="展开设置侧边栏"
                                onClick={() => setMobileNavOpen(true)}
                            >
                                <Menu className="size-4" />
                            </button>
                            <div className="min-w-0 items-center gap-2 text-xs text-zinc-400 lg:flex">
                                <span>设置</span>
                                <span>/</span>
                                <strong className="truncate font-medium text-zinc-700 dark:text-zinc-300">{activeSectionInfo.label}</strong>
                            </div>
                        </div>
                        <div className="admin-dashboard-actions flex min-w-0 items-center gap-2 sm:justify-end">
                            {setupSummary && nextSetupStep ? (
                                <Link
                                    href={nextSetupStep.href}
                                    title={`下一项：${nextSetupStep.title}`}
                                    className="admin-dashboard-setup-pill group flex min-w-0 items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-left transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                                >
                                    <span className="admin-dashboard-setup-icon grid size-5 shrink-0 place-items-center text-zinc-500 dark:text-zinc-400">
                                        <Sparkles className="size-3.5" />
                                    </span>
                                    <span className="admin-dashboard-setup-copy flex min-w-0 items-center gap-2">
                                        <span className="admin-dashboard-setup-title flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-zinc-700 dark:text-zinc-200">
                                            初始化 {setupSummary.percent}%
                                            <ArrowRight className="admin-dashboard-setup-arrow size-3 text-zinc-400 transition group-hover:translate-x-0.5" />
                                        </span>
                                        <span className="admin-dashboard-setup-track block h-1 w-16 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                            <span className="admin-dashboard-setup-progress block h-full rounded-full bg-zinc-700 dark:bg-zinc-300" style={{ width: `${setupSummary.percent}%` }} />
                                        </span>
                                    </span>
                                </Link>
                            ) : null}
                            {headerActions ? <div className="admin-dashboard-header-actions flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">{headerActions}</div> : null}
                        </div>
                    </div>
                </header>

                <div className="mx-auto w-full max-w-[1600px] min-w-0 space-y-3 px-3 py-3 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8 xl:px-9 xl:py-7">
                    <section className="border-b border-zinc-200 pb-3 sm:pb-5 dark:border-zinc-800">
                        <h1 className="text-lg font-semibold text-zinc-950 sm:text-xl dark:text-zinc-100">{activeSectionInfo.label}</h1>
                        <div className="mt-1 line-clamp-2 max-w-3xl text-xs leading-5 text-zinc-500 sm:mt-1.5 sm:line-clamp-none sm:text-sm sm:leading-6 dark:text-zinc-400">{activeSectionInfo.description}</div>
                    </section>

                    {activeSection === "site" ? <AdminSiteSection controller={controller} /> : null}
                    {activeSection === "settings" ? <AdminSettingsSection controller={controller} /> : null}
                    {activeSection === "mediaStorage" ? <AdminMediaStorageSection controller={controller} /> : null}
                    {activeSection === "externalStorage" ? <AdminExternalStorageSection controller={controller} /> : null}
                    {activeSection === "backup" ? <AdminBackupSection controller={controller} /> : null}
                    {activeSection === "updates" ? <AdminUpdatesSection controller={controller} /> : null}
                    {activeSection === "channels" ? <AdminChannelsSection controller={controller} /> : null}
                    {activeSection === "skills" ? <AdminSkillsSection controller={controller} /> : null}
                </div>
            </div>
            <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={(event) => {
                    uploadSiteLogo(event.target.files?.[0]);
                    event.target.value = "";
                }}
            />
            <input
                ref={iconInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
                className="hidden"
                onChange={(event) => {
                    uploadSiteIcon(event.target.files?.[0]);
                    event.target.value = "";
                }}
            />
        </div>
    );
}
