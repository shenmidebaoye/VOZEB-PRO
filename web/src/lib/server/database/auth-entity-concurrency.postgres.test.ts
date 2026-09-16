import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createPostgresRepositories, ensurePostgresSchema, withPostgresTransaction } from "./index";

const postgresIt = process.env.VOZEB_PRO_RUN_POSTGRES_INTEGRATION === "1" ? it : it.skip;

describe("PostgreSQL auth entity concurrency", () => {
    postgresIt("preserves profile, balance and session across concurrent writes", async () => {
        await ensurePostgresSchema();
        const repositories = createPostgresRepositories();
        const settings = await repositories.settings.getSettings();
        const planId = settings.settings?.defaultPlanId || settings.plans[0]?.id;
        if (!planId) throw new Error("No entitlement plan is available for the PostgreSQL integration test");

        const suffix = randomUUID();
        const userId = `test-concurrency-user-${suffix}`;
        const sessionId = `test-concurrency-session-${suffix}`;
        const now = new Date();
        try {
            await repositories.users.createWithNextAccountId({
                id: userId,
                username: `concurrency_${suffix.replaceAll("-", "").slice(0, 16)}`,
                displayName: "并发测试用户",
                bio: "",
                role: "user",
                adminPermissions: [],
                status: "active",
                planId,
                pointsBalance: 100,
                passwordHash: "integration-test-only",
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
            });
            await repositories.sessions.create({
                id: sessionId,
                userId,
                tokenHash: `test-token-${suffix}`,
                createdAt: now.toISOString(),
                expiresAt: new Date(now.getTime() + 60_000).toISOString(),
            });

            await Promise.all([
                withPostgresTransaction(async (client) => {
                    const users = createPostgresRepositories(client).users;
                    const user = await users.getById(userId, true);
                    if (!user) throw new Error("Temporary concurrency user disappeared");
                    await users.update(userId, { displayName: "资料更新已保留" });
                }),
                withPostgresTransaction(async (client) => {
                    const users = createPostgresRepositories(client).users;
                    const user = await users.getById(userId, true);
                    if (!user) throw new Error("Temporary concurrency user disappeared");
                    await users.update(userId, { pointsBalance: 125 });
                }),
            ]);

            const [user, session] = await Promise.all([repositories.users.getById(userId), repositories.sessions.getByTokenHash(`test-token-${suffix}`)]);
            expect(user).toMatchObject({ displayName: "资料更新已保留", pointsBalance: 125 });
            expect(session).toMatchObject({ id: sessionId, userId });
        } finally {
            await repositories.users.delete(userId);
        }
    });
});
