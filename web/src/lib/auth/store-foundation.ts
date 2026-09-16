import { ECOMMERCE_IMAGE_SKILL } from "@/lib/server/agent-skills/ecommerce-image";
import { YANAI_BEAUTY_SKILL } from "@/lib/server/agent-skills/yanai-beauty";
import { DEFAULT_CREATIVE_SHORTCUT_SKILLS } from "@/lib/server/agent-skills/creative-shortcuts";
import { type DataLifecycleSettings, type SiteSettings, type AuthSettings, DEFAULT_SITE_SOCIALS, DEFAULT_SITE_FRIEND_LINKS } from "./store-types";

export class AuthInputError extends Error {
    constructor(
        message: string,
        public status = 400,
    ) {
        super(message);
    }
}

export function isAuthInputError(error: unknown): error is AuthInputError {
    return error instanceof AuthInputError;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
    title: "VOZEB PRO",
    logoUrl: "/logo.svg",
    iconUrl: "/icon.svg",
    seoTitle: "VOZEB PRO",
    seoDescription: "面向 Agent、图片、视频、画布与短剧生产的一体化 AI 创作工作台",
    seoKeywords: "VOZEB PRO,AI Agent,AI 绘图,AI 视频,画布,短剧,提示词库,素材管理",
    footerCopyright: "© 2026 VOZEB PRO. All rights reserved.",
    termsUrl: "/terms",
    termsVersion: "1.0",
    privacyUrl: "/privacy",
    privacyVersion: "1.0",
    friendLinks: DEFAULT_SITE_FRIEND_LINKS,
    socials: DEFAULT_SITE_SOCIALS,
};
export const DEFAULT_DATA_LIFECYCLE: DataLifecycleSettings = {
    cleanupExpiredGenerationTasks: true,
    cleanupExpiredTemporaryMedia: true,
    maintenanceBatchSize: 100,
};
export const DEFAULT_SETTINGS: AuthSettings = {
    site: DEFAULT_SITE_SETTINGS,
    dataLifecycle: DEFAULT_DATA_LIFECYCLE,
    generationConcurrency: { agent: 2, image: 4, video: 1, audio: 2, text: 4, render: 1 },
    generationDefaults: {
        canvasImageCount: 1,
        imageSize: "1:1",
        imageQuality: "auto",
        imageCount: 1,
        videoQuality: "720",
        videoSeconds: 5,
        audioVoice: "alloy",
        audioFormat: "mp3",
    },
    systemChannels: [],
    logicalModels: [],
    defaultModels: { imageModel: "", videoModel: "", textModel: "", audioModel: "" },
    agentSkills: [
        { ...ECOMMERCE_IMAGE_SKILL, keywords: [...ECOMMERCE_IMAGE_SKILL.keywords], workspaces: [...ECOMMERCE_IMAGE_SKILL.workspaces] },
        { ...YANAI_BEAUTY_SKILL, keywords: [...YANAI_BEAUTY_SKILL.keywords], workspaces: [...YANAI_BEAUTY_SKILL.workspaces] },
        ...DEFAULT_CREATIVE_SHORTCUT_SKILLS.map((skill) => ({ ...skill, keywords: [...skill.keywords], workspaces: [...skill.workspaces] })),
    ],
};
export const AUTH_DATA_FILE = "auth.json";
