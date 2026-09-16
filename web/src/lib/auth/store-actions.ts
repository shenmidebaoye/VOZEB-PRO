import { createPostgresRepositories, ensurePostgresSchema, isPostgresDatabaseEnabled } from "@/lib/server/database";
import { type UserRole, type UserStatus, type PublicUser, type PublicUserSummary } from "./store-types";
import { readAuthDb } from "./store-repository";
import { normalizeText } from "./store-normalizers";
import { matchesPublicUser, summarizePublicUsers, toPublicUser } from "./store-user-projection";

export { toPublicUser };

export { getAuthSettings, getFreshAuthSettings, setAuthSettings } from "./store-settings-actions";

export type PublicUserListResult = {
    users: PublicUser[];
    total: number;
    page: number;
    pageSize: number;
    summary: PublicUserSummary;
};

export async function listPublicUsersPage(input?: { page?: number; pageSize?: number; keyword?: string; role?: UserRole; status?: UserStatus }): Promise<PublicUserListResult> {
    const page = Math.max(1, Math.floor(Number(input?.page) || 1));
    const pageSize = Math.max(1, Math.min(100, Math.floor(Number(input?.pageSize) || 20)));
    const keyword = normalizeText(input?.keyword, "", 120).toLowerCase();
    if (isPostgresDatabaseEnabled()) {
        await ensurePostgresSchema();
        const repos = createPostgresRepositories();
        const [result, summary] = await Promise.all([repos.users.list({ page, pageSize, keyword, status: input?.status }), repos.users.summarize()]);
        return {
            users: result.items.map((user) => toPublicUser(user)),
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
            summary,
        };
    }
    const db = await readAuthDb();
    const filtered = db.users
        .filter((user) => matchesPublicUser(user, { keyword, role: input?.role, status: input?.status }))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .map((user) => toPublicUser(user));
    const total = filtered.length;
    const safePage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
    return {
        users: filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
        total,
        page: safePage,
        pageSize,
        summary: summarizePublicUsers(db.users),
    };
}

export async function getPublicUserSummary(): Promise<PublicUserSummary> {
    if (isPostgresDatabaseEnabled()) {
        await ensurePostgresSchema();
        return createPostgresRepositories().users.summarize();
    }
    const db = await readAuthDb();
    return summarizePublicUsers(db.users);
}

export async function getPublicUsersByIds(userIds: string[]): Promise<PublicUser[]> {
    const ids = Array.from(new Set(userIds.map((id) => normalizeText(id, "", 120)).filter(Boolean)));
    if (!ids.length) return [];
    if (isPostgresDatabaseEnabled()) {
        await ensurePostgresSchema();
        const records = await createPostgresRepositories().users.getPublicDetails(ids);
        return records.map((user) => toPublicUser(user));
    }
    const db = await readAuthDb();
    const idSet = new Set(ids);
    return db.users.filter((user) => idSet.has(user.id)).map((user) => toPublicUser(user));
}

export async function findPublicUserIdsByKeyword(value: string, limit?: number): Promise<string[]> {
    const keyword = normalizeText(value, "", 120).toLowerCase();
    if (!keyword) return [];
    const requestedLimit = Number.isSafeInteger(limit) && Number(limit) > 0 ? Number(limit) : undefined;
    if (isPostgresDatabaseEnabled()) {
        await ensurePostgresSchema();
        const pageSize = Math.min(100, requestedLimit || 100);
        const result = await createPostgresRepositories().users.list({ page: 1, pageSize, keyword });
        return result.items.map((user) => user.id);
    }
    const db = await readAuthDb();
    const matches = db.users.filter((user) => matchesPublicUser(user, { keyword })).map((user) => user.id);
    return requestedLimit ? matches.slice(0, requestedLimit) : matches;
}
