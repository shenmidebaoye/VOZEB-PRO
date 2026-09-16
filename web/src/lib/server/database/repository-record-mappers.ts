import { formatAccountId } from "@/lib/account-id";

import type { GenerationLogAssetRecord, GenerationLogRecord, JsonValue, PromptRecord, UserRecord } from "./repository-shared";

export function jsonValue(value: unknown): JsonValue {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") {
        try {
            return JSON.parse(value) as JsonValue;
        } catch {
            return value;
        }
    }
    return value as JsonValue;
}

export function optionalJson(value: unknown): JsonValue | undefined {
    if (value === null || value === undefined) return undefined;
    return jsonValue(value);
}

export function stringValue(value: unknown) {
    return String(value ?? "");
}

export function optionalString(value: unknown) {
    return value === null || value === undefined || value === "" ? undefined : String(value);
}

export function numberValue(value: unknown) {
    return Number(value || 0);
}

export function optionalNumber(value: unknown) {
    return value === null || value === undefined ? undefined : Number(value);
}

export function isoValue(value: unknown) {
    return value instanceof Date ? value.toISOString() : String(value || new Date().toISOString());
}

export function optionalIso(value: unknown) {
    if (value === null || value === undefined || value === "") return undefined;
    return value instanceof Date ? value.toISOString() : String(value);
}
export function mapUser(row: Record<string, unknown>): UserRecord {
    return {
        id: stringValue(row.id),
        accountId: formatAccountId(row.account_id),
        username: stringValue(row.username),
        displayName: stringValue(row.display_name),
        bio: stringValue(row.bio),
        avatarStorageKey: optionalString(row.avatar_storage_key),
        status: row.status === "disabled" ? "disabled" : "active",
        createdAt: isoValue(row.created_at),
        updatedAt: isoValue(row.updated_at),
    };
}

export function mapPrompt(row: Record<string, unknown>): PromptRecord {
    return {
        id: stringValue(row.id),
        scope: row.scope === "user" ? "user" : "library",
        ownerUserId: optionalString(row.owner_user_id),
        title: stringValue(row.title),
        coverUrl: stringValue(row.cover_url),
        prompt: stringValue(row.prompt),
        tags: jsonValue(row.tags),
        category: stringValue(row.category),
        preview: stringValue(row.preview),
        githubUrl: optionalString(row.github_url),
        source: optionalString(row.source),
        createdAt: isoValue(row.created_at),
        updatedAt: isoValue(row.updated_at),
    };
}

export function mapGenerationLog(row: Record<string, unknown>): GenerationLogRecord {
    return {
        id: stringValue(row.id),
        userId: stringValue(row.user_id),
        conversationId: optionalString(row.conversation_id),
        username: stringValue(row.username),
        displayName: stringValue(row.display_name),
        kind: row.kind === "video" ? "video" : "image",
        source: stringValue(row.source),
        status: row.status === "pending" || row.status === "failed" ? row.status : "success",
        title: stringValue(row.title),
        prompt: stringValue(row.prompt),
        model: stringValue(row.model),
        summary: stringValue(row.summary),
        durationMs: numberValue(row.duration_ms),
        count: numberValue(row.count),
        successCount: numberValue(row.success_count),
        failCount: numberValue(row.fail_count),
        assets: [],
        requestSnapshot: jsonValue(row.request_snapshot),
        taskId: optionalString(row.task_id),
        error: optionalString(row.error),
        createdAt: isoValue(row.created_at),
        updatedAt: isoValue(row.updated_at),
        completedAt: optionalIso(row.completed_at),
    };
}

export function mapGenerationLogAsset(row: Record<string, unknown>): GenerationLogAssetRecord {
    return {
        type: row.type === "video" ? "video" : "image",
        url: stringValue(row.url),
        remoteUrl: optionalString(row.remote_url),
        serverUrl: optionalString(row.server_url),
        mimeType: optionalString(row.mime_type),
        width: optionalNumber(row.width),
        height: optionalNumber(row.height),
        bytes: optionalNumber(row.bytes),
    };
}
