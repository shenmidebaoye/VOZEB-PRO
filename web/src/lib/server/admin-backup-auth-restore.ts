import { encryptAuthDbSecretsForStorage } from "@/lib/auth/store-normalizers";
import { insertPostgresUsers, upsertPostgresSettings, upsertPostgresSystemChannels } from "@/lib/auth/store-repository";
import type { AuthDatabase } from "@/lib/auth/store-types";
import type { QueryExecutor } from "@/lib/server/database";

/** Upserts an account/config snapshot without deleting entities absent from the backup. */
export async function restorePostgresAuthSnapshot(client: QueryExecutor, db: AuthDatabase) {
    const normalized = encryptAuthDbSecretsForStorage(db);
    await upsertPostgresSettings(client, normalized.settings);
    await upsertPostgresSystemChannels(client, normalized.settings.systemChannels);
    await insertPostgresUsers(client, normalized.users);
    await syncPostgresUserAccountIdSequence(client);
}

async function syncPostgresUserAccountIdSequence(db: QueryExecutor) {
    await db.query(`
        SELECT setval(
            'user_account_id_seq',
            greatest((SELECT last_value FROM user_account_id_seq), coalesce((SELECT max(account_id) FROM users), 1)),
            (SELECT is_called FROM user_account_id_seq) OR EXISTS (SELECT 1 FROM users)
        )
    `);
}
