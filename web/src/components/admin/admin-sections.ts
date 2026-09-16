import { hasAnyAdminPermission, type AdminPermission } from "@/lib/admin-permissions";

export const ADMIN_SECTION_KEYS = ["channels", "skills", "site", "settings", "mediaStorage", "externalStorage", "backup", "updates"] as const;

export type AdminSectionKey = (typeof ADMIN_SECTION_KEYS)[number];

export const ADMIN_SECTION_PERMISSIONS: Record<AdminSectionKey, readonly AdminPermission[]> = {
    channels: [],
    skills: [],
    site: [],
    settings: [],
    mediaStorage: [],
    externalStorage: [],
    backup: [],
    updates: [],
};

const adminSectionKeys = new Set<AdminSectionKey>(ADMIN_SECTION_KEYS);

export function parseAdminSection(value: string | string[] | undefined): AdminSectionKey {
    const section = Array.isArray(value) ? value[0] : value;
    return adminSectionKeys.has(section as AdminSectionKey) ? (section as AdminSectionKey) : "channels";
}

export function adminSectionHref(section: AdminSectionKey, currentHref = "/settings") {
    const url = new URL(currentHref, "http://localhost");
    if (section === "channels") url.searchParams.delete("section");
    else url.searchParams.set("section", section);
    return `${url.pathname}${url.search}${url.hash}`;
}

export function canAccessAdminSection(_user: { role?: unknown; status?: unknown; adminPermissions?: unknown }, _section: AdminSectionKey) {
    return true;
}

export function resolveAdminSection(user: { role?: unknown; status?: unknown; adminPermissions?: unknown }, preferred: AdminSectionKey) {
    if (canAccessAdminSection(user, preferred)) return preferred;
    return ADMIN_SECTION_KEYS.find((section) => canAccessAdminSection(user, section)) || null;
}

export function hasAdminSectionPermission(user: { role?: unknown; status?: unknown; adminPermissions?: unknown }, permissions: readonly AdminPermission[]) {
    return permissions.length ? hasAnyAdminPermission(user, permissions) : true;
}
