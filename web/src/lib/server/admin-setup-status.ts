import { getAuthSettings, type AuthSettings } from "@/lib/auth/store";
import { getDatabaseProvider } from "@/lib/server/database";
import { channelConnectionReady } from "@/lib/channel-protocol-registry";

export type AdminSetupStepStatus = "done" | "attention" | "pending";
export type AdminSetupAccent = "blue" | "emerald" | "amber" | "rose" | "violet" | "slate";

type AdminSetupStep = {
    id: string;
    title: string;
    eyebrow: string;
    status: AdminSetupStepStatus;
    statusLabel: string;
    description: string;
    href: string;
    actionLabel: string;
    accent: AdminSetupAccent;
    facts: string[];
};

export type AdminSetupSummary = {
    siteTitle: string;
    completed: number;
    total: number;
    percent: number;
    totalChannels: number;
    enabledChannels: number;
    modelCount: number;
    databaseProvider: "file" | "postgres";
    steps: AdminSetupStep[];
};

export async function getAdminSetupSummary(input?: { settings?: AuthSettings }) {
    const settings = input?.settings || (await getAuthSettings());
    return buildAdminSetupSummary(settings);
}

function buildAdminSetupSummary(settings: AuthSettings): AdminSetupSummary {
    const enabledChannels = settings.systemChannels.filter((channel) => channel.enabled && channelConnectionReady(channel)).length;
    const databaseProvider = getDatabaseProvider();
    const siteReady = Boolean(settings.site.title.trim() && settings.site.logoUrl.trim());
    const channelModels = new Set(settings.systemChannels.flatMap((channel) => channel.models).filter(Boolean));
    const channelReady = enabledChannels > 0 && channelModels.size > 0;
    const defaultModelsReady = Boolean(settings.defaultModels.textModel || settings.defaultModels.imageModel || settings.defaultModels.videoModel);
    const encryptionReady = hasProductionSecret(process.env.VOZEB_PRO_ENCRYPTION_KEY);

    const steps: AdminSetupStep[] = [
        {
            id: "site",
            title: "站点基础信息",
            eyebrow: "品牌展示",
            status: siteReady ? "done" : "pending",
            statusLabel: siteReady ? "已完成" : "待完善",
            description: siteReady ? "站点名称和 Logo 已经可用于本机工作室。" : "补齐站点名称和 Logo。",
            href: "/settings?section=site",
            actionLabel: "配置站点",
            accent: "blue",
            facts: [settings.site.title || "未设置站点名", settings.site.logoUrl ? "Logo 已设置" : "Logo 未设置"],
        },
        {
            id: "models",
            title: "系统模型渠道",
            eyebrow: "AI 能力入口",
            status: channelReady && defaultModelsReady ? "done" : enabledChannels > 0 ? "attention" : "pending",
            statusLabel: channelReady && defaultModelsReady ? "已可用" : enabledChannels > 0 ? "待完善" : "待配置",
            description: enabledChannels > 0 ? "已存在启用渠道，请继续同步模型并配置默认逻辑模型。" : "配置至少一个 OpenAI、Gemini 或兼容接口渠道，并保存可用模型。",
            href: "/settings",
            actionLabel: "配置模型",
            accent: "emerald",
            facts: [`已启用 ${enabledChannels} 个渠道`, `模型 ${channelModels.size} 个`, defaultModelsReady ? "默认模型已选择" : "默认模型未选择"],
        },
        {
            id: "storage",
            title: "存储与备份",
            eyebrow: "本机数据",
            status: encryptionReady ? "done" : "attention",
            statusLabel: databaseProvider === "postgres" ? "PostgreSQL" : "文件模式",
            description:
                databaseProvider === "postgres"
                    ? "业务数据使用 PostgreSQL，媒体保存在本机目录；建议同时配置生产级加密密钥。"
                    : "本机工作室默认使用文件数据库和本地媒体目录，适合单机创作。",
            href: "/settings?section=mediaStorage",
            actionLabel: "管理媒体",
            accent: "slate",
            facts: [
                databaseProvider === "postgres" ? "业务数据使用 PostgreSQL" : "业务数据使用文件模式",
                "媒体保存在服务器本地",
                encryptionReady ? "加密密钥已设置" : "建议设置 VOZEB_PRO_ENCRYPTION_KEY",
            ],
        },
    ];
    const completed = steps.filter((step) => step.status === "done").length;
    return {
        siteTitle: settings.site.title,
        completed,
        total: steps.length,
        percent: Math.round((completed / steps.length) * 100),
        totalChannels: settings.systemChannels.length,
        enabledChannels,
        modelCount: channelModels.size,
        databaseProvider,
        steps,
    };
}

function hasProductionSecret(value: string | undefined) {
    const text = value?.trim() || "";
    return Boolean(text && !/replace-with|change-me|your-|example|local-dev/i.test(text));
}
