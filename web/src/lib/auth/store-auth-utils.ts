export function normalizeDisplayName(value: string) {
    return value.trim().slice(0, 40);
}

export function normalizeUserBio(value: unknown) {
    return typeof value === "string" ? value.trim().slice(0, 160) : "";
}
