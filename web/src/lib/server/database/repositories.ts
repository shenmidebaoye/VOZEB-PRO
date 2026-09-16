import { postgresQuery, type QueryExecutor } from "@/lib/server/database/postgres";
import { AuditLogsRepository } from "./audit-log-repository";
import { GenerationLogsRepository, PromptsRepository } from "./content-repository";
import { UsersRepository } from "./user-repository";
import type { AppSettingsRecord, SystemModelChannelRecord } from "./repository-shared";
import { isoValue, jsonParam, jsonValue, numberValue, optionalJson, stringValue } from "./repository-shared";

export type { JsonValue } from "./repository-shared";

export function createPostgresRepositories(executor: QueryExecutor = { query: postgresQuery }) {
    return {
        settings: new SettingsRepository(executor),
        users: new UsersRepository(executor),
        prompts: new PromptsRepository(executor),
        generationLogs: new GenerationLogsRepository(executor),
        auditLogs: new AuditLogsRepository(executor),
    };
}

class SettingsRepository {
    constructor(private readonly db: QueryExecutor) {}

    async lock() {
        await this.db.query("SELECT id FROM app_settings WHERE id = 'default' FOR UPDATE");
    }

    async getSettings() {
        const [settings, channels] = await Promise.all([this.db.query("SELECT * FROM app_settings WHERE id = 'default'"), this.listSystemModelChannels()]);
        return {
            settings: settings.rows[0] ? mapSettings(settings.rows[0]) : undefined,
            channels,
        };
    }

    async updateSettings(input: Partial<Omit<AppSettingsRecord, "id" | "createdAt" | "updatedAt">>) {
        const assignments: string[] = [];
        const values: unknown[] = [];
        const add = (column: string, value: unknown) => {
            values.push(value);
            assignments.push(`${column} = $${values.length}`);
        };
        if (input.site !== undefined) add("site", jsonParam(input.site));
        if (input.dataLifecycle !== undefined) add("data_lifecycle", jsonParam(input.dataLifecycle));
        if (input.generationConcurrency !== undefined) add("generation_concurrency", jsonParam(input.generationConcurrency));
        if (input.generationDefaults !== undefined) add("generation_defaults", jsonParam(input.generationDefaults));
        if (input.logicalModels !== undefined) add("logical_models", jsonParam(input.logicalModels));
        if (input.defaultModels !== undefined) add("default_models", jsonParam(input.defaultModels));
        if (input.agentSkills !== undefined) add("agent_skills", jsonParam(input.agentSkills));
        if (!assignments.length) throw new Error("Settings update requires at least one field");
        const row = await this.db.query(`UPDATE app_settings SET ${assignments.join(", ")} WHERE id = 'default' RETURNING *`, values);
        return mapSettings(row.rows[0]);
    }

    async listSystemModelChannels() {
        const result = await this.db.query("SELECT * FROM system_model_channels ORDER BY sort_order ASC, created_at ASC");
        return result.rows.map(mapSystemModelChannel);
    }

    async getSystemModelChannelById(id: string, forUpdate = false) {
        const result = await this.db.query(`SELECT * FROM system_model_channels WHERE id = $1${forUpdate ? " FOR UPDATE" : ""}`, [id]);
        return result.rows[0] ? mapSystemModelChannel(result.rows[0]) : null;
    }

    async upsertSystemModelChannel(channel: Omit<SystemModelChannelRecord, "createdAt" | "updatedAt">) {
        const result = await this.db.query(
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
                sort_order = EXCLUDED.sort_order
            RETURNING *
            `,
            [channel.id, channel.name, channel.baseUrl, channel.apiKeyCiphertext, channel.webhookSecretCiphertext, channel.apiFormat, jsonParam(channel.models), channel.enabled, jsonParam(channel.advancedConfig), channel.sortOrder],
        );
        return mapSystemModelChannel(result.rows[0]);
    }

    async deleteSystemModelChannelsNotIn(ids: string[]) {
        const result = await this.db.query("DELETE FROM system_model_channels WHERE id <> ALL($1::text[])", [ids]);
        return result.rowCount || 0;
    }
}

function mapSettings(row: Record<string, unknown>): AppSettingsRecord {
    return {
        id: "default",
        site: jsonValue(row.site),
        dataLifecycle: jsonValue(row.data_lifecycle),
        generationConcurrency: jsonValue(row.generation_concurrency),
        generationDefaults: jsonValue(row.generation_defaults),
        logicalModels: jsonValue(row.logical_models),
        defaultModels: jsonValue(row.default_models),
        agentSkills: jsonValue(row.agent_skills),
        createdAt: isoValue(row.created_at),
        updatedAt: isoValue(row.updated_at),
    };
}

function mapSystemModelChannel(row: Record<string, unknown>): SystemModelChannelRecord {
    return {
        id: stringValue(row.id),
        name: stringValue(row.name),
        baseUrl: stringValue(row.base_url),
        apiKeyCiphertext: stringValue(row.api_key_ciphertext),
        webhookSecretCiphertext: stringValue(row.webhook_secret_ciphertext),
        apiFormat: row.api_format === "gemini" ? "gemini" : "openai",
        models: jsonValue(row.models),
        enabled: row.enabled !== false,
        advancedConfig: optionalJson(row.advanced_config),
        sortOrder: numberValue(row.sort_order),
        createdAt: isoValue(row.created_at),
        updatedAt: isoValue(row.updated_at),
    };
}
