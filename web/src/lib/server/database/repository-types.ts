export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type PageInput = {
    page?: number;
    pageSize?: number;
};

export type PageResult<T> = {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
};

export type UserRole = "admin" | "user";
export type UserStatus = "active" | "disabled";
export type PromptScope = "library" | "user";
export type GenerationKind = "image" | "video";
export type GenerationStatus = "pending" | "success" | "failed";
export type AuditStatus = "success" | "failure";

export type UserRecord = {
    id: string;
    accountId: string;
    username: string;
    displayName: string;
    bio: string;
    avatarStorageKey?: string;
    status: UserStatus;
    createdAt: string;
    updatedAt: string;
};

export type UserSummaryRecord = {
    total: number;
    active: number;
    disabled: number;
};

export type AppSettingsRecord = {
    id: "default";
    site: JsonValue;
    dataLifecycle: JsonValue;
    generationConcurrency: JsonValue;
    generationDefaults: JsonValue;
    logicalModels: JsonValue;
    defaultModels: JsonValue;
    agentSkills: JsonValue;
    createdAt: string;
    updatedAt: string;
};

export type SystemModelChannelRecord = {
    id: string;
    name: string;
    baseUrl: string;
    apiKeyCiphertext: string;
    webhookSecretCiphertext: string;
    apiFormat: "openai" | "gemini";
    models: JsonValue;
    enabled: boolean;
    advancedConfig?: JsonValue;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
};

export type PromptRecord = {
    id: string;
    scope: PromptScope;
    ownerUserId?: string;
    title: string;
    coverUrl: string;
    prompt: string;
    tags: JsonValue;
    category: string;
    preview: string;
    githubUrl?: string;
    source?: string;
    createdAt: string;
    updatedAt: string;
};

export type GenerationLogAssetRecord = {
    type: GenerationKind;
    url: string;
    remoteUrl?: string;
    serverUrl?: string;
    mimeType?: string;
    width?: number;
    height?: number;
    bytes?: number;
};

export type GenerationLogRecord = {
    id: string;
    userId: string;
    conversationId?: string;
    username: string;
    displayName: string;
    kind: GenerationKind;
    source: string;
    status: GenerationStatus;
    title: string;
    prompt: string;
    model: string;
    summary: string;
    durationMs: number;
    count: number;
    successCount: number;
    failCount: number;
    assets: GenerationLogAssetRecord[];
    requestSnapshot?: JsonValue;
    taskId?: string;
    error?: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
};

export type AuditLogRecord = {
    id: string;
    action: string;
    status: AuditStatus;
    actorUserId?: string;
    actorUsername?: string;
    actorRole?: UserRole;
    actorIp?: string;
    actorUserAgent?: string;
    targetType?: string;
    targetId?: string;
    targetLabel?: string;
    metadata?: JsonValue;
    createdAt: string;
};
