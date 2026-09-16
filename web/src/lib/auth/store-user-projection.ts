import { userAvatarUrl } from "@/lib/user-avatar";

import { type PublicUser, type PublicUserSummary, type StoredUser, type UserRole, type UserStatus } from "./store-types";

export function toPublicUser(user: StoredUser): PublicUser {
    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio || undefined,
        avatarUrl: user.avatarStorageKey ? userAvatarUrl(user.id, user.updatedAt) : undefined,
        status: user.status,
        accountId: user.accountId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

export function matchesPublicUser(user: PublicUser | StoredUser, input: { keyword: string; role?: UserRole; status?: UserStatus }) {
    if (input.status && user.status !== input.status) return false;
    if (!input.keyword) return true;
    const accountId = "accountId" in user ? user.accountId || "" : "";
    return [accountId, user.displayName, user.username, user.status, user.status === "active" ? "可用" : "禁用"].some((value) => value.toLowerCase().includes(input.keyword));
}

export function summarizePublicUsers(users: StoredUser[]): PublicUserSummary {
    return {
        total: users.length,
        active: users.filter((user) => user.status === "active").length,
        disabled: users.filter((user) => user.status === "disabled").length,
    };
}
