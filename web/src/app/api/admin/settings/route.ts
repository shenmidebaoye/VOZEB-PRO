import { NextResponse } from "next/server";

import { AuthInputError, getFreshAuthSettings, isAuthInputError, setAuthSettings, type AuthSettings, type SiteSocialKey, type SiteSocialSettings } from "@/lib/auth/store";
import { normalizeSiteSocial } from "@/lib/auth/store-normalizers";
import { modelRoutingValidationErrors, normalizeDefaultModelsConfig, synchronizeLogicalModelsWithChannels } from "@/lib/model-routing-config";
import { readJsonBody } from "@/lib/auth/request";
import { getCurrentUser } from "@/lib/auth/session";
import { mergeSystemChannelSecrets, serializeAdminSettingsForUser, systemChannelWebhookSecretValidationError } from "@/lib/server/admin-channel-config";
import { auditActorFromRequest, safeRecordAuditLog } from "@/lib/server/audit-log-store";
import { invalidatePublicSiteSettings } from "@/lib/server/site-metadata";
import { channelProtocolValidationErrors } from "@/lib/channel-protocol-registry";

export const runtime = "nodejs";

export async function GET() {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "本机实例未就绪" }, { status: 503 });

    return NextResponse.json({ settings: serializeAdminSettingsForUser(await getFreshAuthSettings(), currentUser) });
}

export async function PATCH(request: Request) {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "本机实例未就绪" }, { status: 503 });

    try {
        const body = await readJsonBody<Partial<AuthSettings>>(request);
        const socialValidationError = siteSocialValidationError(body.site?.socials);
        if (socialValidationError) throw new AuthInputError(socialValidationError);
        const currentSettings = await getFreshAuthSettings();
        const patch: Partial<AuthSettings> = {};
        if (body.site) patch.site = body.site;
        if (body.dataLifecycle && typeof body.dataLifecycle === "object") patch.dataLifecycle = body.dataLifecycle;
        if (body.generationConcurrency && typeof body.generationConcurrency === "object") patch.generationConcurrency = body.generationConcurrency;
        if (body.generationDefaults && typeof body.generationDefaults === "object") patch.generationDefaults = body.generationDefaults;
        if (Array.isArray(body.systemChannels)) {
            patch.systemChannels = mergeSystemChannelSecrets(body.systemChannels, currentSettings.systemChannels);
            const webhookSecretError = patch.systemChannels.map(systemChannelWebhookSecretValidationError).find(Boolean);
            if (webhookSecretError) throw new AuthInputError(webhookSecretError);
        }
        if (Array.isArray(body.systemChannels) || Array.isArray(body.logicalModels) || body.defaultModels) {
            const channels = patch.systemChannels || currentSettings.systemChannels;
            const protocolErrors = channels.flatMap(channelProtocolValidationErrors);
            if (protocolErrors.length) throw new AuthInputError(protocolErrors[0]);
            const sourceLogicalModels = Array.isArray(body.logicalModels) ? body.logicalModels : currentSettings.logicalModels;
            const logicalModels = synchronizeLogicalModelsWithChannels(sourceLogicalModels, channels);
            const defaultModels = { ...currentSettings.defaultModels, ...body.defaultModels };
            const normalizedDefaults = normalizeDefaultModelsConfig(defaultModels, logicalModels, channels);
            const errors = modelRoutingValidationErrors(logicalModels, channels, normalizedDefaults);
            if (errors.length) throw new AuthInputError(errors[0]);
            patch.logicalModels = logicalModels;
            patch.defaultModels = normalizedDefaults;
        }
        if (Array.isArray(body.agentSkills)) patch.agentSkills = body.agentSkills;
        if (!Object.keys(patch).length) return NextResponse.json({ error: "没有可更新的设置" }, { status: 400 });

        const settings = await setAuthSettings(patch);
        if (patch.site) invalidatePublicSiteSettings();
        await safeRecordAuditLog({
            action: "settings.update",
            actor: auditActorFromRequest(request, currentUser),
            target: { type: "settings", id: "auth" },
            metadata: { fields: Object.keys(patch) },
        });
        return NextResponse.json({ settings: serializeAdminSettingsForUser(settings, currentUser) });
    } catch (error) {
        await safeRecordAuditLog({
            action: "admin.settings.update",
            status: "failure",
            actor: auditActorFromRequest(request, currentUser),
            target: { type: "settings", id: "auth" },
            metadata: { error: error instanceof Error ? error.message : "unknown" },
        });
        if (isAuthInputError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
        console.error("Admin settings update failed", error);
        return NextResponse.json({ error: "更新设置失败" }, { status: 500 });
    }
}

function siteSocialValidationError(socials: Partial<SiteSocialSettings> | undefined) {
    if (!socials) return "";
    const labels: Record<SiteSocialKey, string> = { email: "邮箱", telegram: "Telegram", x: "X", instagram: "Instagram" };
    for (const key of Object.keys(labels) as SiteSocialKey[]) {
        const social = socials[key];
        if (typeof social?.url !== "string" || !social.url.trim()) continue;
        if (!normalizeSiteSocial(key, social).url) return `${labels[key]} 地址无效，请填写完整链接或 @用户名`;
    }
    return "";
}
