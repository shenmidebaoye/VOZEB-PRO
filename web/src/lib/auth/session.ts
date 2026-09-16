import type { AuthSettings, PublicUser } from "./store";
import { ensureLocalOwner } from "./local-owner";

/** Local single-instance tool: no login cookie; always resolve the local owner. */
export async function getCurrentUser(_request?: Request) {
    return ensureLocalOwner();
}

export function serializeCurrentUser(user: PublicUser) {
    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        status: user.status,
    };
}

export function serializePublicSettings(settings: AuthSettings) {
    return {
        site: {
            title: settings.site.title,
            logoUrl: settings.site.logoUrl,
            iconUrl: settings.site.iconUrl,
            seoDescription: settings.site.seoDescription,
            footerCopyright: settings.site.footerCopyright,
            termsUrl: settings.site.termsUrl,
            termsVersion: settings.site.termsVersion,
            privacyUrl: settings.site.privacyUrl,
            privacyVersion: settings.site.privacyVersion,
            friendLinks: settings.site.friendLinks.map((item) => ({ id: item.id, label: item.label, url: item.url, enabled: item.enabled })),
            socials: Object.fromEntries(Object.entries(settings.site.socials).map(([key, item]) => [key, { enabled: item.enabled, label: item.label, url: item.url }])),
        },
        generationConcurrency: { ...settings.generationConcurrency },
        generationDefaults: {
            canvasImageCount: settings.generationDefaults.canvasImageCount,
            imageSize: settings.generationDefaults.imageSize,
            imageQuality: settings.generationDefaults.imageQuality,
            imageCount: settings.generationDefaults.imageCount,
            videoQuality: settings.generationDefaults.videoQuality,
            videoSeconds: settings.generationDefaults.videoSeconds,
            audioVoice: settings.generationDefaults.audioVoice,
            audioFormat: settings.generationDefaults.audioFormat,
        },
        defaultModels: { ...settings.defaultModels },
        logicalModels: settings.logicalModels
            .filter((model) => model.enabled)
            .map((model) => ({
                id: model.id,
                name: model.name,
                capability: model.capability,
                enabled: true,
                bindings: model.bindings
                    .filter((binding) => binding.enabled)
                    .map((binding) => {
                        const capabilityProfile = publicCapabilityProfile(binding.capabilityProfile);
                        return {
                            id: binding.id,
                            channelId: binding.channelId,
                            upstreamModel: binding.upstreamModel,
                            enabled: true,
                            priority: binding.priority,
                            ...(capabilityProfile ? { capabilityProfile } : {}),
                        };
                    }),
            })),
        systemChannels: settings.systemChannels
            .filter((channel) => channel.enabled)
            .map((channel) => ({
                id: channel.id,
                name: channel.name,
                baseUrl: `/api/ai/system/${channel.id}`,
                apiKey: "system",
                apiFormat: channel.apiFormat,
                models: channel.models,
                enabled: channel.enabled,
                hasApiKey: Boolean(channel.apiKey),
            })),
    };
}

function publicCapabilityProfile(profile: AuthSettings["logicalModels"][number]["bindings"][number]["capabilityProfile"]) {
    if (!profile) return undefined;
    const result = {
        aspectRatios: profile.aspectRatios?.slice(),
        resolutions: profile.resolutions?.slice(),
        durationSeconds: profile.durationSeconds?.slice(),
        minDurationSeconds: profile.minDurationSeconds,
        maxDurationSeconds: profile.maxDurationSeconds,
        maxBatchSize: profile.maxBatchSize,
    };
    return Object.values(result).some((value) => value !== undefined && (!Array.isArray(value) || value.length)) ? result : undefined;
}
