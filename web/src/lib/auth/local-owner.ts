import { createPostgresRepositories, ensurePostgresSchema, isPostgresDatabaseEnabled, withPostgresTransaction } from "@/lib/server/database";
import { lockAuthMutation } from "@/lib/server/auth-mutation-lock";
import { formatAccountId } from "@/lib/account-id";
import { mutateAuthDb } from "@/lib/auth/store-repository";
import { toPublicUser } from "@/lib/auth/store-user-projection";
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
        return withPostgresTransaction(async (client) => {
            await lockAuthMutation(client);
            const repos = createPostgresRepositories(client);
            const existing = await repos.users.list({ page: 1, pageSize: 1 });
            const first = existing.items[0];
            if (first) return toPublicUser(first);
            const now = new Date().toISOString();
            const user = await repos.users.createWithNextAccountId({
                id: LOCAL_OWNER_ID,
                username: LOCAL_OWNER_USERNAME,
                displayName: "本地用户",
                bio: "",
                status: "active",
                createdAt: now,
                updatedAt: now,
            });
            return toPublicUser(user);
        });
    }

    return mutateAuthDb((db) => {
        const existing = db.users[0];
        if (existing) return toPublicUser(existing);
        const now = new Date().toISOString();
        const user: StoredUser = {
            id: LOCAL_OWNER_ID,
            accountId: takeNextFileAccountId(db),
            username: LOCAL_OWNER_USERNAME,
            displayName: "本地用户",
            bio: "",
            status: "active",
            createdAt: now,
            updatedAt: now,
        };
        db.users.push(user);
        return toPublicUser(user);
    });
}

function takeNextFileAccountId(db: AuthDatabase) {
    const max = db.users.reduce((current, user) => Math.max(current, Number.parseInt(user.accountId, 10) || 0), 0);
    return formatAccountId(max + 1);
}
