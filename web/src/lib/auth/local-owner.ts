import { ALL_ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { hashPassword } from "@/lib/auth/password";
import { createPostgresRepositories, ensurePostgresSchema, isPostgresDatabaseEnabled, withPostgresTransaction } from "@/lib/server/database";
import { lockAuthMutation } from "@/lib/server/auth-mutation-lock";
import { walletClock } from "@/lib/server/wallet-clock";
import { formatAccountId } from "@/lib/account-id";
import { resolveDefaultPlan } from "@/lib/auth/store-normalizers";
import { mutateAuthDb, readPostgresAuthSettings } from "@/lib/auth/store-repository";
import { publicUserFromAuthenticatedRecord, toPublicUser } from "@/lib/auth/store-user-projection";
import type { AuthDatabase, PublicUser, StoredUser } from "@/lib/auth/store-types";

/** Prefer existing sole user so current local data stays owned; otherwise seed this id. */
export const LOCAL_OWNER_ID = "local";
export const LOCAL_OWNER_USERNAME = "localowner";

let ensurePromise: Promise<PublicUser> | null = null;

export async function ensureLocalOwner(): Promise<PublicUser> {
    if (!ensurePromise) {
        ensurePromise = ensureLocalOwnerOnce().finally(() => {
            ensurePromise = null;
        });
    }
    return ensurePromise;
}

async function ensureLocalOwnerOnce(): Promise<PublicUser> {
    if (isPostgresDatabaseEnabled()) {
        await ensurePostgresSchema();
        const clock = walletClock();
        return withPostgresTransaction(async (client) => {
            await lockAuthMutation(client);
            const repos = createPostgresRepositories(client);
            const existing = await repos.users.list({ page: 1, pageSize: 1 });
            const first = existing.items[0];
            if (first) {
                const detail = (await repos.users.getPublicDetails([first.id], { now: clock.now.toISOString(), date: clock.date }))[0];
                if (detail) return publicUserFromAuthenticatedRecord(detail, clock.expiresAt);
            }
            const settings = await readPostgresAuthSettings(client);
            const now = clock.now.toISOString();
            const user = await repos.users.createWithNextAccountId({
                id: LOCAL_OWNER_ID,
                username: LOCAL_OWNER_USERNAME,
                displayName: "本地用户",
                bio: "",
                role: "admin",
                adminPermissions: [...ALL_ADMIN_PERMISSIONS],
                status: "active",
                planId: resolveDefaultPlan(settings.entitlements).id,
                pointsBalance: 0,
                passwordHash: await hashPassword(randomLocalPassword()),
                createdAt: now,
                updatedAt: now,
            });
            const record = (await repos.users.getPublicDetails([user.id], { now: clock.now.toISOString(), date: clock.date }))[0];
            if (!record) throw new Error("本机用户创建失败");
            return publicUserFromAuthenticatedRecord(record, clock.expiresAt);
        });
    }

    return mutateAuthDb(async (db) => {
        const existing = db.users[0];
        if (existing) return toPublicUser(existing, db);
        const now = new Date().toISOString();
        const user: StoredUser = {
            id: LOCAL_OWNER_ID,
            accountId: takeNextFileAccountId(db),
            username: LOCAL_OWNER_USERNAME,
            displayName: "本地用户",
            bio: "",
            role: "admin",
            adminPermissions: [...ALL_ADMIN_PERMISSIONS],
            status: "active",
            planId: resolveDefaultPlan(db.settings.entitlements).id,
            pointsBalance: 0,
            passwordHash: await hashPassword(randomLocalPassword()),
            createdAt: now,
            updatedAt: now,
        };
        db.users.push(user);
        return toPublicUser(user, db);
    });
}

function takeNextFileAccountId(db: AuthDatabase) {
    const max = db.users.reduce((current, user) => Math.max(current, Number.parseInt(user.accountId, 10) || 0), 0);
    return formatAccountId(max + 1);
}

function randomLocalPassword() {
    return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
