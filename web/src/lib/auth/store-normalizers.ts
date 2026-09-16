import { randomUUID } from "node:crypto";

import { formatAccountId, parseAccountId } from "@/lib/account-id";
import { decryptSecretValue, encryptSecretValue, isEncryptedSecretValue } from "@/lib/server/secret-crypto";
import { ECOMMERCE_IMAGE_SKILL } from "@/lib/server/agent-skills/ecommerce-image";
import { YANAI_BEAUTY_SKILL } from "@/lib/server/agent-skills/yanai-beauty";
import { DEFAULT_CREATIVE_SHORTCUT_SKILLS } from "@/lib/server/agent-skills/creative-shortcuts";
import { deriveLogicalModelsConfig, normalizeDefaultModelsConfig, normalizeLogicalModelsConfig } from "@/lib/model-routing-config";
import { applyChannelProtocol } from "@/lib/channel-protocol-registry";
import { normalizeSystemChannelAdvancedConfig } from "./store-normalizers-channel";
import {
    type SystemModelChannel,
    type LogicalModel,
    type AgentSkill,
    type GenerationConcurrencySettings,
    type GenerationDefaultSettings,
    type DataLifecycleSettings,
    type SiteSettings,
    type SiteFriendLink,
    type SiteSocialKey,
    type SiteSocialSettings,
    DEFAULT_SITE_SOCIALS,
    DEFAULT_SITE_FRIEND_LINKS,
    type StoredUser,
    type AuthSettings,
    type AuthDatabase,
} from "./store-types";
import { DEFAULT_SITE_SETTINGS, DEFAULT_SETTINGS } from "./store-foundation";

export { normalizeApiPath, normalizeSystemChannelAdvancedConfig, textOrEmpty } from "./store-normalizers-channel";
import { normalizeUserBio } from "./store-auth-utils";

export { normalizeDisplayName, normalizeUserBio } from "./store-auth-utils";

export function normalizeDb(db: Partial<AuthDatabase>): AuthDatabase {
    const settings = normalizeSettings(decryptAuthSettingsSecrets({ ...DEFAULT_SETTINGS, ...(db.settings || {}) } as AuthSettings));
    const usedAccountIds = new Set<number>();
    let nextGeneratedAccountId = 1;
    const users = Array.isArray(db.users)
        ? db.users.map((user) => {
              const legacyUser = user as Partial<StoredUser>;
              const requestedAccountId = parseAccountId(legacyUser.accountId);
              while (usedAccountIds.has(nextGeneratedAccountId)) nextGeneratedAccountId += 1;
              const accountId = requestedAccountId && !usedAccountIds.has(requestedAccountId) ? requestedAccountId : nextGeneratedAccountId;
              usedAccountIds.add(accountId);
              nextGeneratedAccountId = Math.max(nextGeneratedAccountId, accountId + 1);
              return {
                  id: String(legacyUser.id || ""),
                  accountId: formatAccountId(accountId),
                  username: String(legacyUser.username || ""),
                  displayName: String(legacyUser.displayName || legacyUser.username || ""),
                  bio: normalizeUserBio(legacyUser.bio),
                  avatarStorageKey: legacyUser.avatarStorageKey,
                  status: legacyUser.status === "disabled" ? "disabled" : "active",
                  createdAt: String(legacyUser.createdAt || new Date().toISOString()),
                  updatedAt: String(legacyUser.updatedAt || legacyUser.createdAt || new Date().toISOString()),
              } satisfies StoredUser;
          })
        : [];
    const configuredNextAccountId = parseAccountId(db.nextUserAccountId) || 1;
    return {
        version: 1,
        nextUserAccountId: Math.max(configuredNextAccountId, nextGeneratedAccountId),
        users,
        settings,
    };
}

export function emptyDb(): AuthDatabase {
    return { version: 1, nextUserAccountId: 1, users: [], settings: DEFAULT_SETTINGS };
}

export function encryptAuthDbSecretsForStorage(db: AuthDatabase): AuthDatabase {
    const normalized = normalizeDb(db);
    return { ...normalized, settings: encryptAuthSettingsSecrets(normalized.settings) };
}

export function decryptAuthSettingsSecrets(settings: AuthSettings): AuthSettings {
    return {
        ...settings,
        systemChannels: Array.isArray(settings.systemChannels)
            ? settings.systemChannels.map((channel) => ({
                  ...channel,
                  apiKey: decryptSecretValue(channel.apiKey || ""),
                  webhookSecret: decryptSecretValue(channel.webhookSecret || ""),
              }))
            : [],
    };
}

export function encryptAuthSettingsSecrets(settings: AuthSettings): AuthSettings {
    return {
        ...settings,
        systemChannels: settings.systemChannels.map((channel) => ({
            ...channel,
            apiKey: encryptSecretValue(channel.apiKey),
            webhookSecret: encryptSecretValue(channel.webhookSecret || ""),
        })),
    };
}

export function normalizeSettings(settings: AuthSettings): AuthSettings {
    const systemChannels = Array.isArray(settings.systemChannels) ? settings.systemChannels.map(normalizeSystemChannel).filter((channel) => channel.name || channel.baseUrl || channel.models.length) : [];
    const logicalModels = normalizeLogicalModels(settings.logicalModels, systemChannels);
    const site = normalizeSiteSettings(settings.site);
    return {
        site,
        dataLifecycle: normalizeDataLifecycle(settings.dataLifecycle),
        generationConcurrency: normalizeGenerationConcurrency(settings.generationConcurrency),
        generationDefaults: normalizeGenerationDefaults(settings.generationDefaults),
        systemChannels,
        logicalModels,
        defaultModels: normalizeDefaultModelsConfig(settings.defaultModels, logicalModels, systemChannels),
        agentSkills: normalizeAgentSkills(settings.agentSkills),
    };
}

export function normalizeLogicalModels(models: LogicalModel[] | undefined, channels: SystemModelChannel[]): LogicalModel[] {
    return normalizeLogicalModelsConfig(models, channels);
}

export function deriveLogicalModels(channels: SystemModelChannel[]): LogicalModel[] {
    return deriveLogicalModelsConfig(channels);
}

export function normalizeAgentSkill(skill: AgentSkill): AgentSkill {
    if (skill.id === ECOMMERCE_IMAGE_SKILL.id && !skill.sourceUrl) return { ...ECOMMERCE_IMAGE_SKILL, keywords: [...ECOMMERCE_IMAGE_SKILL.keywords], workspaces: [...ECOMMERCE_IMAGE_SKILL.workspaces], enabled: skill.enabled !== false };
    const instructions = String(skill.instructions || "")
        .trim()
        .slice(0, 8000);
    return {
        id: String(skill.id || randomUUID()),
        name: String(skill.name || "")
            .trim()
            .slice(0, 60),
        description: String(skill.description || "")
            .trim()
            .slice(0, 240),
        plannerSummary:
            String(skill.plannerSummary || skill.description || instructions)
                .trim()
                .slice(0, 240) || undefined,
        instructions,
        enabled: skill.enabled !== false,
        keywords: Array.isArray(skill.keywords)
            ? skill.keywords
                  .map(String)
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .slice(0, 30)
            : [],
        workspaces: Array.isArray(skill.workspaces) ? skill.workspaces.filter((item): item is "image" | "video" | "canvas" | "drama" => ["image", "video", "canvas", "drama"].includes(item)) : ["image"],
        action: skill.action === "edit" ? "edit" : "generate",
        requiresReference: Boolean(skill.requiresReference),
        defaultConfig: skill.defaultConfig && typeof skill.defaultConfig === "object" ? skill.defaultConfig : {},
        sourceUrl:
            String(skill.sourceUrl || "")
                .trim()
                .slice(0, 500) || undefined,
        sourceRepository:
            String(skill.sourceRepository || "")
                .trim()
                .slice(0, 160) || undefined,
        sourcePath:
            String(skill.sourcePath || "")
                .trim()
                .slice(0, 500) || undefined,
        sourceVersion:
            String(skill.sourceVersion || "")
                .trim()
                .slice(0, 40) || undefined,
        sourceCommit:
            String(skill.sourceCommit || "")
                .trim()
                .slice(0, 40) || undefined,
        sourceContentHash:
            String(skill.sourceContentHash || "")
                .trim()
                .slice(0, 64) || undefined,
        license:
            String(skill.license || "")
                .trim()
                .slice(0, 120) || undefined,
    };
}

export function normalizeAgentSkills(skills: AgentSkill[] | undefined) {
    const normalized = Array.isArray(skills) ? skills.map(normalizeAgentSkill).filter((skill) => skill.name && skill.instructions) : [...DEFAULT_SETTINGS.agentSkills];
    if (!normalized.some((skill) => skill.id === YANAI_BEAUTY_SKILL.id)) normalized.push({ ...YANAI_BEAUTY_SKILL, keywords: [...YANAI_BEAUTY_SKILL.keywords], workspaces: [...YANAI_BEAUTY_SKILL.workspaces] });
    for (const skill of DEFAULT_CREATIVE_SHORTCUT_SKILLS) {
        const index = normalized.findIndex((item) => item.id === skill.id);
        if (index < 0) normalized.push({ ...skill, keywords: [...skill.keywords], workspaces: [...skill.workspaces] });
        else normalized[index] = { ...normalized[index], workspaces: [...new Set([...skill.workspaces, ...(normalized[index].workspaces || [])])] };
    }
    return normalized;
}

export function normalizeGenerationDefaults(settings: Partial<GenerationDefaultSettings> | undefined): GenerationDefaultSettings {
    return {
        canvasImageCount: normalizePositiveSafeInteger(settings?.canvasImageCount, DEFAULT_SETTINGS.generationDefaults.canvasImageCount),
        imageSize: allowedText(settings?.imageSize, ["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16"], DEFAULT_SETTINGS.generationDefaults.imageSize),
        imageQuality: allowedText(settings?.imageQuality, ["auto", "low", "medium", "high"], DEFAULT_SETTINGS.generationDefaults.imageQuality),
        imageCount: normalizePositiveSafeInteger(settings?.imageCount, DEFAULT_SETTINGS.generationDefaults.imageCount),
        videoQuality: normalizeText(settings?.videoQuality, DEFAULT_SETTINGS.generationDefaults.videoQuality, 40),
        videoSeconds: normalizeDefaultVideoSeconds(settings?.videoSeconds),
        audioVoice: normalizeText(settings?.audioVoice, DEFAULT_SETTINGS.generationDefaults.audioVoice, 80),
        audioFormat: allowedText(settings?.audioFormat, ["mp3", "wav", "opus", "aac", "flac"], DEFAULT_SETTINGS.generationDefaults.audioFormat),
    };
}

function normalizeDefaultVideoSeconds(value: unknown) {
    const seconds = Number(value);
    if (seconds === -1) return -1;
    return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : DEFAULT_SETTINGS.generationDefaults.videoSeconds;
}

function normalizePositiveSafeInteger(value: unknown, fallback: number) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

export function allowedText(value: unknown, allowed: string[], fallback: string) {
    const text = typeof value === "string" ? value.trim() : "";
    return allowed.includes(text) ? text : fallback;
}

export function normalizeGenerationConcurrency(settings: Partial<GenerationConcurrencySettings> | undefined): GenerationConcurrencySettings {
    return {
        agent: normalizePositiveSafeInteger(settings?.agent, DEFAULT_SETTINGS.generationConcurrency.agent),
        image: normalizePositiveSafeInteger(settings?.image, DEFAULT_SETTINGS.generationConcurrency.image),
        video: normalizePositiveSafeInteger(settings?.video, DEFAULT_SETTINGS.generationConcurrency.video),
        audio: normalizePositiveSafeInteger(settings?.audio, DEFAULT_SETTINGS.generationConcurrency.audio),
        text: normalizePositiveSafeInteger(settings?.text, DEFAULT_SETTINGS.generationConcurrency.text),
        render: normalizePositiveSafeInteger(settings?.render, DEFAULT_SETTINGS.generationConcurrency.render),
    };
}

export function normalizeDataLifecycle(settings: Partial<DataLifecycleSettings> | undefined): DataLifecycleSettings {
    return {
        cleanupExpiredGenerationTasks: settings?.cleanupExpiredGenerationTasks !== false,
        cleanupExpiredTemporaryMedia: settings?.cleanupExpiredTemporaryMedia !== false,
        maintenanceBatchSize: Math.max(1, Math.min(500, Math.floor(Number(settings?.maintenanceBatchSize) || 100))),
    };
}

export function normalizeSiteSettings(settings: Partial<SiteSettings> | undefined): SiteSettings {
    const title = normalizeText(settings?.title, DEFAULT_SITE_SETTINGS.title, 40);
    const seoTitle = normalizeBrandDefault(settings?.seoTitle, DEFAULT_SITE_SETTINGS.seoTitle, title, title, 72);
    return {
        title,
        logoUrl: normalizeLogoUrl(settings?.logoUrl),
        iconUrl: normalizeSiteIconUrl(settings?.iconUrl),
        seoTitle,
        seoDescription: normalizeText(settings?.seoDescription, DEFAULT_SITE_SETTINGS.seoDescription, 180),
        seoKeywords: normalizeBrandDefault(settings?.seoKeywords, DEFAULT_SITE_SETTINGS.seoKeywords, title, DEFAULT_SITE_SETTINGS.seoKeywords.replace(DEFAULT_SITE_SETTINGS.title, title), 240),
        footerCopyright: normalizeBrandDefault(settings?.footerCopyright, DEFAULT_SITE_SETTINGS.footerCopyright, title, DEFAULT_SITE_SETTINGS.footerCopyright.replace(DEFAULT_SITE_SETTINGS.title, title), 120),
        termsUrl: normalizeLinkUrl(settings?.termsUrl, DEFAULT_SITE_SETTINGS.termsUrl),
        termsVersion: normalizeText(settings?.termsVersion, DEFAULT_SITE_SETTINGS.termsVersion, 80),
        privacyUrl: normalizeLinkUrl(settings?.privacyUrl, DEFAULT_SITE_SETTINGS.privacyUrl),
        privacyVersion: normalizeText(settings?.privacyVersion, DEFAULT_SITE_SETTINGS.privacyVersion, 80),
        friendLinks: normalizeSiteFriendLinks(settings?.friendLinks, title),
        socials: normalizeSiteSocials(settings?.socials),
    };
}

function normalizeBrandDefault(value: unknown, defaultValue: string, siteTitle: string, fallback: string, maxLength: number) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text || (siteTitle !== DEFAULT_SITE_SETTINGS.title && text === defaultValue)) return fallback.slice(0, maxLength);
    return normalizeText(text, fallback, maxLength);
}

export function normalizeSiteFriendLinks(settings: unknown, siteTitle = DEFAULT_SITE_SETTINGS.title): SiteFriendLink[] {
    const links = Array.isArray(settings) ? settings : DEFAULT_SITE_FRIEND_LINKS;
    return links
        .map((link, index) => {
            const value = link as Partial<SiteFriendLink>;
            const defaultHomeLink = value.id === "vozeb-pro-home" && value.url?.replace(/\/$/, "") === "https://www.vozeb.com";
            return {
                id: normalizeText(value.id, `friend-${index + 1}`, 80),
                label: normalizeText(defaultHomeLink && (!value.label || value.label === DEFAULT_SITE_SETTINGS.title) ? siteTitle : value.label, "友情链接", 32),
                url: normalizeLinkUrl(value.url, ""),
                enabled: value.enabled !== false,
            };
        })
        .filter((link) => link.url)
        .slice(0, 12);
}

export function normalizeSiteSocials(settings: Partial<SiteSocialSettings> | undefined): SiteSocialSettings {
    return {
        email: normalizeSiteSocial("email", settings?.email),
        telegram: normalizeSiteSocial("telegram", settings?.telegram),
        x: normalizeSiteSocial("x", settings?.x),
        instagram: normalizeSiteSocial("instagram", settings?.instagram),
    };
}

export function normalizeSiteSocial(key: SiteSocialKey, setting: Partial<SiteSocialSettings[SiteSocialKey]> | undefined) {
    const fallback = DEFAULT_SITE_SOCIALS[key];
    if (!setting) return { ...fallback };
    return {
        enabled: typeof setting.enabled === "boolean" ? setting.enabled : fallback.enabled,
        label: setting.label === undefined ? fallback.label : normalizeText(setting.label, "", 32),
        url: setting.url === undefined ? fallback.url : normalizeSiteSocialUrl(key, setting.url),
    };
}

function normalizeSiteSocialUrl(key: SiteSocialKey, value: unknown) {
    const url = typeof value === "string" ? value.trim() : "";
    if (!url) return "";
    if (url.startsWith("mailto:")) return normalizeLinkUrl(url, "");
    if (key === "email" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return `mailto:${url}`;
    if (url.startsWith("@")) {
        const handle = url.slice(1);
        if (key === "telegram" && /^[a-zA-Z0-9_]{5,32}$/.test(handle)) return `https://t.me/${handle}`;
        if (key === "x" && /^[a-zA-Z0-9_]{1,15}$/.test(handle)) return `https://x.com/${handle}`;
        if (key === "instagram" && /^[a-zA-Z0-9._]{1,30}$/.test(handle)) return `https://instagram.com/${handle}`;
    }
    const socialHost = url.replace(/^\/+/, "");
    if (key === "telegram" && /^(?:www\.)?(?:t\.me|telegram\.me)\//i.test(socialHost)) return `https://${socialHost}`;
    if (key === "x" && /^(?:www\.)?(?:x\.com|twitter\.com)\//i.test(socialHost)) return `https://${socialHost}`;
    if (key === "instagram" && /^(?:www\.)?instagram\.com\//i.test(socialHost)) return `https://${socialHost}`;
    return normalizeLinkUrl(url, "");
}

export function normalizeSecretText(value: unknown, fallback: string, maxPlainLength: number) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) return fallback;
    return text.slice(0, isEncryptedSecretValue(text) ? 4000 : maxPlainLength);
}

export function normalizeText(value: unknown, fallback: string, maxLength: number) {
    const text = typeof value === "string" ? repairKnownMojibakeText(value.trim()) : "";
    return (text || fallback).slice(0, maxLength);
}

export function repairKnownMojibakeText(value: string) {
    if (value.includes("VOZEB PRO") && value.includes("AI") && !value.includes("绘图") && value.includes(",")) return DEFAULT_SITE_SETTINGS.seoKeywords;
    if (value.includes("VOZEB PRO") && value.includes("AI") && !value.includes("工作台")) return DEFAULT_SITE_SETTINGS.seoDescription;
    if (value.includes("2026 VOZEB PRO") && !value.startsWith("©")) return "© 2026 VOZEB PRO. All rights reserved.";
    if (value.startsWith("QQ ") && !value.includes("邮箱")) return "QQ 邮箱";
    return repairUtf8MojibakeText(value);
}

export function repairUtf8MojibakeText(value: string) {
    if (!looksLikeUtf8Mojibake(value)) return value;
    const repaired = Buffer.from(value, "latin1").toString("utf8");
    if (!repaired || repaired.includes("\uFFFD")) return value;
    return textQualityScore(repaired) > textQualityScore(value) ? repaired : value;
}

export function looksLikeUtf8Mojibake(value: string) {
    if (!value) return false;
    if (/[\u0080-\u009f]/.test(value)) return true;
    if (/[ÂÃ][\u0080-\u00ff]/.test(value)) return true;
    const markers = value.match(/[åæçèéäöüï½ð]/g)?.length || 0;
    return markers >= 2 && !/[\u4e00-\u9fff]/.test(value);
}

export function textQualityScore(value: string) {
    const cjk = value.match(/[\u4e00-\u9fff]/g)?.length || 0;
    const controls = value.match(/[\u0080-\u009f]/g)?.length || 0;
    const replacements = value.match(/\uFFFD/g)?.length || 0;
    const mojibakeMarkers = value.match(/[ÂÃåæçèéäöüï½ð]/g)?.length || 0;
    return cjk * 4 - controls * 6 - replacements * 20 - mojibakeMarkers;
}

export function normalizeLogoUrl(value: unknown) {
    return normalizeSiteImageUrl(value, DEFAULT_SITE_SETTINGS.logoUrl);
}

export function normalizeSiteIconUrl(value: unknown) {
    return normalizeSiteImageUrl(value, DEFAULT_SITE_SETTINGS.iconUrl);
}

function normalizeSiteImageUrl(value: unknown, fallback: string) {
    const url = typeof value === "string" ? value.trim() : "";
    if (!url) return fallback;
    if (url.startsWith("data:image/")) return url.slice(0, 500000);
    if (url.startsWith("/") || url.startsWith("https://") || url.startsWith("http://")) return url.slice(0, 2000);
    return fallback;
}

export function normalizeLinkUrl(value: unknown, fallback: string) {
    const url = typeof value === "string" ? value.trim() : "";
    if (!url) return fallback;
    if (url.startsWith("/") || url.startsWith("https://") || url.startsWith("http://") || url.startsWith("mailto:")) return url.slice(0, 2000);
    return fallback;
}

export function normalizeSystemChannel(channel: Partial<SystemModelChannel>): SystemModelChannel {
    const normalized: SystemModelChannel = {
        id: channel.id?.trim() || randomUUID(),
        name: repairKnownMojibakeText(channel.name?.trim() || "") || "通用接口",
        baseUrl: channel.baseUrl?.trim() || "",
        apiKey: normalizeSecretText(channel.apiKey, "", 4000),
        webhookSecret: normalizeSecretText(channel.webhookSecret, "", 4000),
        apiFormat: channel.apiFormat === "gemini" ? "gemini" : "openai",
        models: Array.from(new Set((channel.models || []).map((model) => model.trim()).filter(Boolean))),
        enabled: channel.enabled !== false,
        advancedConfig: normalizeSystemChannelAdvancedConfig(channel.advancedConfig),
    };
    return normalized.advancedConfig?.protocol === "yumeng" ? applyChannelProtocol(normalized, "yumeng") : normalized;
}
