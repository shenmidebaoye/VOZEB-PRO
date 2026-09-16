/** Local studio: owner is always allowed; permission keys are retained only for call-site compatibility. */
export type AdminPermission =
    | "analytics.read"
    | "generation.read"
    | "generation.manage"
    | "upstream.manage"
    | "system.manage"
    | "content.manage"
    | "audit.read";

export type LocalOwnerLike = { status?: unknown } | null | undefined;

export function hasAdminPermission(user: LocalOwnerLike, _permission?: AdminPermission) {
    return Boolean(user && user.status !== "disabled");
}

export function hasAnyAdminPermission(user: LocalOwnerLike, _permissions?: readonly AdminPermission[]) {
    return hasAdminPermission(user);
}
