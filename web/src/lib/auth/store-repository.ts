import { ensurePostgresSchema, isPostgresDatabaseEnabled, postgresQuery, type QueryExecutor } from "@/lib/server/database";
import { formatAccountId } from "@/lib/account-id";
import { readJsonDataFile, writeJsonDataFile } from "@/lib/server/data-adapter";
import { type SystemModelChannel, type StoredUser, type AuthSettings, type AuthDatabase } from "./store-types";
import { DEFAULT_SETTINGS, AUTH_DATA_FILE } from "./store-foundation";
import { normalizeDb, emptyDb, encryptAuthDbSecretsForStorage, decryptAuthSettingsSecrets, normalizeSettings, normalizeGenerationDefaults, normalizeSiteSettings } from "./store-normalizers";

export let mutationQueue = Promise.resolve();

export async function readAuthDb(): Promise<AuthDatabase> {
    if (isPostgresDatabaseEnabled()) throw new Error("PostgreSQL auth reads must use entity repositories");
    return normalizeDb(await readJsonDataFile<Partial<AuthDatabase>>(AUTH_DATA_FILE, emptyDb()));
}

export async function mutateAuthDb<T>(mutator: (db: AuthDatabase) => T | Promise<T>) {
    if (isPostgresDatabaseEnabled()) throw new Error("PostgreSQL auth mutations must use entity repositories");
    const run = mutationQueue.then(async () => {
        const db = await readAuthDb();
        const result = await mutator(db);
        await writeAuthDb(db);
        return result;
    });
    mutationQueue = run.then(
        () => undefined,
        () => undefined,
    );
    return run;
}

export async function writeAuthDb(db: AuthDatabase) {
    if (isPostgresDatabaseEnabled()) throw new Error("Full PostgreSQL auth writes are reserved for explicit backup restore");
    await writeJsonDataFile(AUTH_DATA_FILE, encryptAuthDbSecretsForStorage(db));
}

/** Full authentication snapshot for the explicit administrator backup transaction only. */
export async function readPostgresAuthDb(executor: QueryExecutor): Promise<AuthDatabase> {
    const query: QueryExecutor["query"] = executor.query.bind(executor);
    const [settingsResult, channelResult, userResult] = await Promise.all([
        query("SELECT * FROM app_settings WHERE id = 'default'"),
        query("SELECT * FROM system_model_channels ORDER BY sort_order ASC, created_at ASC"),
        query("SELECT * FROM users ORDER BY created_at ASC"),
    ]);
    return normalizeDb({
        version: 1,
        users: userResult.rows.map(mapPostgresUser),
        settings: mapPostgresSettings(settingsResult.rows[0], channelResult.rows),
    });
}

export async function readPostgresAuthSettings(executor?: QueryExecutor): Promise<AuthSettings> {
    if (!executor) await ensurePostgresSchema();
    const query: QueryExecutor["query"] = executor ? executor.query.bind(executor) : postgresQuery;
    const [settingsResult, channelResult] = await Promise.all([
        query("SELECT * FROM app_settings WHERE id = 'default'"),
        query("SELECT * FROM system_model_channels ORDER BY sort_order ASC, created_at ASC"),
    ]);
    return decryptAuthSettingsSecrets(mapPostgresSettings(settingsResult.rows[0], channelResult.rows));
}

export function mapPostgresSettings(settingsRow: Record<string, unknown> | undefined, channelRows: Record<string, unknown>[]): AuthSettings {
    const fallback = DEFAULT_SETTINGS;
    return normalizeSettings({
        site: normalizeSiteSettings(dbJson(settingsRow?.site, fallback.site)),
        dataLifecycle: dbJson(settingsRow?.data_lifecycle, fallback.dataLifecycle),
        generationConcurrency: dbJson(settingsRow?.generation_concurrency, fallback.generationConcurrency),
        generationDefaults: normalizeGenerationDefaults(dbJson(settingsRow?.generation_defaults, fallback.generationDefaults)),
        systemChannels: channelRows.map((row) => ({
            id: dbText(row.id),
            name: dbText(row.name),
            baseUrl: dbText(row.base_url),
            apiKey: dbText(row.api_key_ciphertext),
            webhookSecret: dbText(row.webhook_secret_ciphertext),
            apiFormat: row.api_format === "gemini" ? "gemini" : "openai",
            models: dbJson(row.models, []),
            enabled: dbBool(row.enabled, true),
            advancedConfig: dbJson(row.advanced_config, undefined),
        })),
        logicalModels: dbJson(settingsRow?.logical_models, fallback.logicalModels),
        defaultModels: dbJson(settingsRow?.default_models, fallback.defaultModels),
        agentSkills: dbJson(settingsRow?.agent_skills, fallback.agentSkills),
    });
}

export function mapPostgresUser(row: Record<string, unknown>): StoredUser {
    return {
        id: dbText(row.id),
        accountId: formatAccountId(row.account_id),
        username: dbText(row.username),
        displayName: dbText(row.display_name),
        bio: dbText(row.bio),
        avatarStorageKey: dbOptionalText(row.avatar_storage_key),
        status: row.status === "disabled" ? "disabled" : "active",
        createdAt: dbIso(row.created_at),
        updatedAt: dbIso(row.updated_at),
    };
}

export async function upsertPostgresSettings(db: QueryExecutor, settings: AuthSettings) {
    await db.query(
        `
        INSERT INTO app_settings (
            id, site, data_lifecycle, generation_concurrency, generation_defaults,
            logical_models, default_models, agent_skills
        )
        VALUES ('default', $1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
            site = EXCLUDED.site,
            data_lifecycle = EXCLUDED.data_lifecycle,
            generation_concurrency = EXCLUDED.generation_concurrency,
            generation_defaults = EXCLUDED.generation_defaults,
            logical_models = EXCLUDED.logical_models,
            default_models = EXCLUDED.default_models,
            agent_skills = EXCLUDED.agent_skills
        `,
        [
            dbJsonParam(settings.site),
            dbJsonParam(settings.dataLifecycle),
            dbJsonParam(settings.generationConcurrency),
            dbJsonParam(settings.generationDefaults),
            dbJsonParam(settings.logicalModels),
            dbJsonParam(settings.defaultModels),
            dbJsonParam(settings.agentSkills),
        ],
    );
}

export async function upsertPostgresSystemChannels(db: QueryExecutor, channels: SystemModelChannel[]) {
    for (const [index, channel] of channels.entries()) {
        await db.query(
            `
            INSERT INTO system_model_channels (id, name, base_url, api_key_ciphertext, webhook_secret_ciphertext, api_format, models, enabled, advanced_config, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                base_url = EXCLUDED.base_url,
                api_key_ciphertext = EXCLUDED.api_key_ciphertext,
                webhook_secret_ciphertext = EXCLUDED.webhook_secret_ciphertext,
                api_format = EXCLUDED.api_format,
                models = EXCLUDED.models,
                enabled = EXCLUDED.enabled,
                advanced_config = EXCLUDED.advanced_config,
                sort_order = EXCLUDED.sort_order,
                updated_at = now()
            `,
            [channel.id, channel.name, channel.baseUrl, channel.apiKey, channel.webhookSecret || "", channel.apiFormat, dbJsonParam(channel.models), channel.enabled, dbJsonParam(channel.advancedConfig), index],
        );
    }
}

export async function insertPostgresUsers(db: QueryExecutor, users: StoredUser[]) {
    for (const user of users) {
        await db.query(
            `
            INSERT INTO users (id, account_id, username, display_name, bio, avatar_storage_key, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
                account_id = EXCLUDED.account_id,
                username = EXCLUDED.username,
                display_name = EXCLUDED.display_name,
                bio = EXCLUDED.bio,
                avatar_storage_key = EXCLUDED.avatar_storage_key,
                status = EXCLUDED.status,
                created_at = EXCLUDED.created_at,
                updated_at = EXCLUDED.updated_at
            `,
            [
                user.id,
                Number(user.accountId),
                user.username,
                user.displayName,
                user.bio,
                user.avatarStorageKey || null,
                user.status,
                user.createdAt,
                user.updatedAt,
            ],
        );
    }
}

export function dbText(value: unknown) {
    return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

export function dbOptionalText(value: unknown) {
    const text = dbText(value);
    return text || undefined;
}

export function dbNumber(value: unknown, fallback: number) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

export function dbBool(value: unknown, fallback: boolean) {
    if (typeof value === "boolean") return value;
    return fallback;
}

export function dbIso(value: unknown) {
    const date = value instanceof Date ? value : new Date(dbText(value));
    return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

export function dbOptionalIso(value: unknown) {
    if (!value) return undefined;
    return dbIso(value);
}

export function dbDate(value: unknown) {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return dbText(value).slice(0, 10);
}

export function dbJson<T>(value: unknown, fallback: T): T {
    if (value === null || value === undefined) return fallback;
    return value as T;
}

export function dbJsonParam(value: unknown) {
    return value === undefined ? null : JSON.stringify(value);
}
