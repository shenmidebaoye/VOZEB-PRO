"use client";

import type { ReactNode } from "react";
import { createDefaultChannelAdvancedConfig } from "@/components/admin/admin-system-channel-editor";
import { applyChannelProtocol } from "@/lib/channel-protocol-registry";
import type { SystemChannelAdvancedConfig, SystemModelChannel } from "@/lib/auth/store";
import { nanoid } from "nanoid";
import { urlHostMatches, urlPathStartsWith } from "@/lib/url-host";

export const settingsStatusToneClass = {
    cyan: "bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-950/45 dark:text-cyan-200 dark:ring-cyan-900/40",
    blue: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/45 dark:text-blue-200 dark:ring-blue-900/40",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/45 dark:text-emerald-200 dark:ring-emerald-900/40",
    amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/45 dark:text-amber-200 dark:ring-amber-900/40",
};

export function SettingsStatusTile({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone: keyof typeof settingsStatusToneClass }) {
    return (
        <div className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 sm:p-4">
            <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                <div className="min-w-0">
                    <div className="text-[11px] font-medium text-stone-500 sm:text-xs dark:text-stone-400">{label}</div>
                    <div className="mt-1 truncate text-sm font-semibold text-stone-950 sm:mt-2 sm:text-base dark:text-stone-100">{value}</div>
                    <div className="mt-0.5 truncate text-[11px] text-stone-500 sm:mt-1 sm:text-xs dark:text-stone-400">{detail}</div>
                </div>
                <span className={"flex size-7 shrink-0 items-center justify-center rounded-md ring-1 [&>svg]:size-3.5 sm:size-9 sm:rounded-lg sm:[&>svg]:size-4 " + settingsStatusToneClass[tone]}>{icon}</span>
            </div>
        </div>
    );
}

export function SettingsAnchorItem({ href, icon, title, detail }: { href: string; icon: ReactNode; title: string; detail: string }) {
    return (
        <a
            href={href}
            className="group flex min-w-0 items-center gap-1 rounded-md px-2 py-2 text-left transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 sm:gap-3 sm:px-3 sm:py-2.5 dark:hover:bg-zinc-900"
        >
            <span className="flex size-5 shrink-0 items-center justify-center text-zinc-500 transition [&>svg]:size-3 sm:size-8 sm:[&>svg]:size-4 group-hover:text-zinc-950 dark:text-zinc-400 dark:group-hover:text-white">{icon}</span>
            <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-stone-900 sm:text-sm dark:text-stone-100">{title}</span>
                <span className="mt-0.5 hidden truncate text-xs text-stone-500 sm:block dark:text-stone-400">{detail}</span>
            </span>
        </a>
    );
}

export function FinanceFlowItem({ title, amount, description, icon }: { title: string; amount: string; description: string; icon: ReactNode }) {
    return (
        <div className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950 sm:p-4">
            <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                <div>
                    <div className="text-xs text-stone-500 sm:text-sm dark:text-stone-400">{title}</div>
                    <div className="mt-1 text-lg font-semibold tracking-normal text-stone-950 sm:mt-2 sm:text-2xl dark:text-stone-100">{amount}</div>
                </div>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-700 [&>svg]:size-3.5 sm:size-9 sm:rounded-lg sm:[&>svg]:size-4 dark:bg-stone-900 dark:text-stone-200">{icon}</span>
            </div>
            <div className="mt-2 line-clamp-2 text-xs leading-5 text-stone-500 sm:mt-3 sm:line-clamp-none sm:text-sm sm:leading-6 dark:text-stone-400">{description}</div>
        </div>
    );
}

export function FinanceMiniRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-stone-500 dark:text-stone-400">{label}</span>
            <span className="font-semibold text-stone-950 dark:text-stone-100">{value}</span>
        </div>
    );
}

export function createSystemChannel(): SystemModelChannel {
    return applyChannelProtocol({ id: nanoid(), name: "新接口", baseUrl: "", apiKey: "", apiFormat: "openai", models: [], enabled: false, advancedConfig: createDefaultChannelAdvancedConfig() }, "openai");
}

export function suggestedChannelModels(channel: Pick<SystemModelChannel, "baseUrl" | "name">) {
    const name = channel.name.toLowerCase();
    if (name.includes("globalaiopc") || urlHostMatches(channel.baseUrl, "globalaiopc.com")) return ["videos", "videos_stable", "videos_stable_fast"];
    if (name.includes("seedance") || urlHostMatches(channel.baseUrl, "volces.com") || urlPathStartsWith(channel.baseUrl, "/api/plan/v3")) return ["doubao-seedance-1-0-lite-t2v", "doubao-seedance-1-0-lite-i2v"];
    return [];
}

export type AdminModelsResult = {
    models: string[];
    modelCapabilities?: SystemChannelAdvancedConfig["modelCapabilities"];
    modelConfigs?: SystemChannelAdvancedConfig["modelConfigs"];
    recommendedConfig?: Partial<SystemChannelAdvancedConfig>;
    discoveredCount?: number;
    totalCount?: number;
    warning?: string;
    globalAiOpcPresets?: SystemChannelAdvancedConfig["globalAiOpcPresets"];
};

export async function requestAdminModels(channel: SystemModelChannel): Promise<AdminModelsResult> {
    const advanced = channel.advancedConfig;
    const response = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            channelId: channel.id,
            baseUrl: channel.baseUrl,
            apiKey: channel.apiKey,
            apiFormat: channel.apiFormat,
            protocol: advanced?.protocol,
            authMode: advanced?.authMode,
            authHeader: advanced?.authHeader,
            authPrefix: advanced?.authPrefix,
            globalAiOpcPreset: advanced?.globalAiOpcPreset,
            globalAiOpcPresets: advanced?.globalAiOpcPresets,
            createPath: advanced?.createPath,
            modelCatalogPaths: advanced?.modelCatalogPaths,
            configuredModels: channel.models,
            modelCapabilities: advanced?.modelCapabilities,
            modelConfigs: advanced?.modelConfigs,
            operationConfigs: advanced?.operationConfigs,
        }),
    });
    const payload = (await response.json()) as AdminModelsResult & { error?: string };
    if (!response.ok || !payload.models) throw new Error(payload.error || "拉取模型失败");
    return payload;
}

export function modelNameFromOption(value: string) {
    const normalized = value.trim();
    if (!normalized) return "";
    const parts = normalized.split("::");
    return parts[parts.length - 1] || normalized;
}

export function clampInteger(value: unknown, min: number, max: number, fallback: number) {
    const numberValue = Math.floor(Number(value));
    if (!Number.isFinite(numberValue)) return fallback;
    return Math.max(min, Math.min(max, numberValue));
}
