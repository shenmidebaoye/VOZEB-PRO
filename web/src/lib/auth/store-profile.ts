import { createPostgresRepositories, ensurePostgresSchema, isPostgresDatabaseEnabled, withPostgresTransaction } from "@/lib/server/database";
import { AuthInputError } from "./store-foundation";
import { normalizeDisplayName, normalizeUserBio } from "./store-normalizers";
import { mutateAuthDb } from "./store-repository";
import { toPublicUser } from "./store-user-projection";

export async function updateOwnProfile(userId: string, input: { displayName?: string; bio?: string }) {
    if (isPostgresDatabaseEnabled()) {
        await ensurePostgresSchema();
        return withPostgresTransaction(async (client) => {
            const users = createPostgresRepositories(client).users;
            const current = await users.getById(userId, true);
            if (!current || current.status !== "active") throw new AuthInputError("用户不可用");
            await users.update(userId, {
                displayName: input.displayName === undefined ? undefined : normalizeDisplayName(input.displayName || current.username),
                bio: input.bio === undefined ? undefined : normalizeUserBio(input.bio),
            });
            const updated = await users.getById(userId, true);
            if (!updated) throw new AuthInputError("用户不可用");
            return toPublicUser(updated);
        });
    }
    return mutateAuthDb((db) => {
        const user = db.users.find((item) => item.id === userId);
        if (!user || user.status !== "active") throw new AuthInputError("用户不可用");
        if (input.displayName !== undefined) user.displayName = normalizeDisplayName(input.displayName || user.username);
        if (input.bio !== undefined) user.bio = normalizeUserBio(input.bio);
        user.updatedAt = new Date().toISOString();
        return toPublicUser(user);
    });
}

export async function updateOwnAvatarStorageKey(userId: string, avatarStorageKey: string) {
    const storageKey = avatarStorageKey.trim();
    if (!/^permanent\/\d{4}\/\d{2}\/\d{2}\/images\/.+\.webp$/i.test(storageKey)) throw new AuthInputError("头像存储格式无效");
    if (isPostgresDatabaseEnabled()) {
        await ensurePostgresSchema();
        return withPostgresTransaction(async (client) => {
            const users = createPostgresRepositories(client).users;
            const user = await users.getById(userId, true);
            if (!user || user.status !== "active") throw new AuthInputError("用户不可用");
            await users.update(userId, { avatarStorageKey: storageKey });
            const updated = await users.getById(userId, true);
            if (!updated) throw new AuthInputError("用户不可用");
            return { user: toPublicUser(updated), previousStorageKey: user.avatarStorageKey };
        });
    }
    return mutateAuthDb((db) => {
        const user = db.users.find((item) => item.id === userId);
        if (!user || user.status !== "active") throw new AuthInputError("用户不可用");
        const previousStorageKey = user.avatarStorageKey;
        user.avatarStorageKey = storageKey;
        user.updatedAt = new Date().toISOString();
        return { user: toPublicUser(user), previousStorageKey };
    });
}
