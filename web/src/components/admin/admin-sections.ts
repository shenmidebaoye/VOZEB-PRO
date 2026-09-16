export const ADMIN_SECTION_KEYS = ["channels", "skills", "site", "settings", "mediaStorage", "externalStorage", "backup", "updates"] as const;

export type AdminSectionKey = (typeof ADMIN_SECTION_KEYS)[number];

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

export function canAccessAdminSection(_user: { status?: unknown } | null | undefined, _section: AdminSectionKey) {
    return true;
}

export function resolveAdminSection(user: { status?: unknown } | null | undefined, preferred: AdminSectionKey) {
    if (canAccessAdminSection(user, preferred)) return preferred;
    return ADMIN_SECTION_KEYS.find((section) => canAccessAdminSection(user, section)) || null;
}
