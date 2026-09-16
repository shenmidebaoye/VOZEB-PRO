"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Database, RefreshCw, ServerCrash, Settings, ShieldCheck, Sparkles } from "lucide-react";

import { SiteLogo } from "@/components/layout/site-logo";
import type { InstallStatus } from "@/lib/server/install-status";
import { usePublicSessionStore } from "@/stores/use-public-session-store";
import type { SiteSettings } from "@/lib/auth/store";
import { DatabaseConfigBuilder } from "./database-config-builder";

type InstallStepId = "intro" | "database";

const primaryButtonClass =
    "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold !text-white shadow-sm shadow-slate-950/15 transition enabled:hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-300 disabled:!text-white disabled:shadow-none [&_svg]:!text-white";
const secondaryButtonClass = "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white";
const ghostButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900";

const steps = [
    { id: "intro" as const, title: "安装说明", description: "确认本机启动方式" },
    { id: "database" as const, title: "可选数据库", description: "文件存储或初始化 PostgreSQL" },
];

export function InstallWizard({ install, initialSite }: { install: InstallStatus; initialSite: Pick<SiteSettings, "title" | "logoUrl"> }) {
    const [activeStep, setActiveStep] = useState<InstallStepId>("intro");
    const [currentInstall, setCurrentInstall] = useState(install);
    const sessionSite = usePublicSessionStore((state) => state.payload?.settings?.site);
    const site = sessionSite || initialSite;
    const databaseReady = currentInstall.database.healthy && currentInstall.database.schemaReady;
    const schemaPending = currentInstall.database.healthy && !currentInstall.database.schemaReady;
    const runtimeReady = databaseReady && currentInstall.security.encryptionReady;
    const status = useMemo(() => installStatusView(currentInstall), [currentInstall]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [activeStep]);

    return (
        <div className="mx-auto w-full max-w-6xl">
            <header className="flex flex-col gap-4 px-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                <Link href="/" className="inline-flex min-w-0 items-center gap-3">
                    <SiteLogo logoUrl={site.logoUrl} className="size-11" />
                    <span className="min-w-0">
                        <span className="block text-2xl font-semibold tracking-normal text-slate-950">{site.title} 安装向导</span>
                        <span className="mt-1 block text-sm text-slate-500">两步完成，本机创作工具，不创建账号</span>
                    </span>
                </Link>
                <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium shadow-sm backdrop-blur ${status.className}`}>
                    {status.icon}
                    {status.label}
                </span>
            </header>

            <section className="mt-4 grid overflow-hidden rounded-lg border border-white/70 bg-white/60 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl lg:grid-cols-[300px_minmax(0,1fr)]">
                <aside className="border-b border-slate-200/70 bg-white/55 p-4 lg:border-b-0 lg:border-r">
                    <div className="rounded-lg bg-slate-100/80 p-1">
                        {steps.map((step, index) => {
                            const active = activeStep === step.id;
                            const done = step.id === "intro" || (step.id === "database" && runtimeReady);
                            return (
                                <button
                                    key={step.id}
                                    type="button"
                                    onClick={() => setActiveStep(step.id)}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:bg-white/70 hover:text-slate-900"}`}
                                >
                                    <span
                                        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${active ? "bg-slate-950 text-white" : done ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-400"}`}
                                    >
                                        {done && !active ? <CheckCircle2 className="size-4" /> : <span className="text-xs font-semibold">{index + 1}</span>}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold">{step.title}</span>
                                        <span className="mt-0.5 block truncate text-xs opacity-70">{step.description}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-4 rounded-lg border border-slate-200/80 bg-white/70 p-4">
                        <div className="grid grid-cols-2 gap-3">
                            <StatusMetric label="数据库" value={databaseReady ? "已初始化" : schemaPending ? "待初始化" : currentInstall.database.configured ? "连接失败" : "未配置"} />
                            <StatusMetric label="加密密钥" value={currentInstall.security.encryptionReady ? "已就绪" : "未配置"} />
                        </div>
                        <p className="mt-3 text-xs leading-5 text-slate-500">{currentInstall.database.message}</p>
                    </div>
                </aside>

                <div className="min-w-0 bg-white/50">
                    {activeStep === "intro" ? <IntroStep siteTitle={site.title} onNext={() => setActiveStep("database")} /> : null}
                    {activeStep === "database" ? (
                        <DatabaseStep
                            install={currentInstall}
                            runtimeReady={runtimeReady}
                            onInstallChange={setCurrentInstall}
                            onPrev={() => setActiveStep("intro")}
                        />
                    ) : null}
                </div>
            </section>
        </div>
    );
}

function IntroStep({ siteTitle, onNext }: { siteTitle: string; onNext: () => void }) {
    return (
        <section className="p-5 sm:p-8">
            <StepHeader
                step="步骤 1 / 2"
                title="先确认安装流程"
                description={`${siteTitle} 是本机创作工具：默认使用文件存储即可开写；若改用 PostgreSQL，再生成配置并初始化表结构。不创建账号。`}
            />

            <div className="mt-7 overflow-hidden rounded-lg border border-slate-200/80 bg-white/75 shadow-sm">
                <ProcessRow index="01" title="优先本机文件存储" text="未设置数据库时，pnpm start 默认使用 file Provider，适合单机创作。" />
                <ProcessRow index="02" title="可选 PostgreSQL" text="需要时在本机或远程 PostgreSQL 写入 web/.env.local，刷新检查连接后手动初始化表结构。" last />
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-sm leading-6 text-slate-500">如果你已经完成数据库配置，本页会直接显示当前初始化状态。</p>
                <button type="button" onClick={onNext} className={primaryButtonClass}>
                    下一步：配置数据库
                    <ArrowRight className="size-4" />
                </button>
            </div>
        </section>
    );
}

function DatabaseStep({
    install,
    runtimeReady,
    onInstallChange,
    onPrev,
}: {
    install: InstallStatus;
    runtimeReady: boolean;
    onInstallChange: (install: InstallStatus) => void;
    onPrev: () => void;
}) {
    const [initializing, setInitializing] = useState(false);
    const [initializeError, setInitializeError] = useState("");
    const canInitialize = install.database.configured && install.database.healthy && !install.database.schemaReady && install.security.encryptionReady;
    const schemaPending = install.database.healthy && !install.database.schemaReady;

    const initializeDatabase = async () => {
        setInitializing(true);
        setInitializeError("");
        try {
            const response = await fetch("/api/install/initialize", { method: "POST" });
            const payload = (await response.json().catch(() => ({}))) as { data?: { install?: InstallStatus }; msg?: string };
            if (!response.ok || !payload.data?.install) throw new Error(payload.msg || "数据库初始化失败");
            onInstallChange(payload.data.install);
        } catch (error) {
            setInitializeError(error instanceof Error ? error.message : "数据库初始化失败");
        } finally {
            setInitializing(false);
        }
    };

    if (runtimeReady) {
        return (
            <section className="p-5 sm:p-8">
                <StepHeader step="步骤 2 / 2" title="安装已完成" description="数据库与加密密钥已就绪。本机创作工具不创建账号，可直接进入创作或打开设置配置模型渠道。" />
                <div className="mt-7 overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50/80 p-5 text-emerald-950 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <CheckCircle2 className="size-4" />
                        运行环境已就绪
                    </div>
                    <p className="mt-2 text-sm leading-6 text-emerald-800">{install.database.message}</p>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <Link href="/create" className={primaryButtonClass}>
                            <Sparkles className="size-4" />
                            开始创作
                        </Link>
                        <Link href="/settings" className={secondaryButtonClass}>
                            <Settings className="size-4" />
                            打开设置
                        </Link>
                    </div>
                </div>
                <button type="button" onClick={onPrev} className={`mt-6 ${ghostButtonClass}`}>
                    <ArrowLeft className="size-4" />
                    返回安装说明
                </button>
            </section>
        );
    }

    return (
        <section className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 p-5 sm:p-8">
                <StepHeader step="步骤 2 / 2" title="配置并初始化数据库" description="填写数据库信息后复制配置，写入服务器环境变量并重启 Web 服务。状态检查只验证连接；确认无误后由你显式初始化表结构。" />
                <div className="mt-6">
                    <DatabaseConfigBuilder />
                </div>
            </div>

            <aside className="border-t border-slate-200/70 bg-slate-50/70 p-5 xl:border-l xl:border-t-0">
                <div className={`rounded-lg border p-4 shadow-sm ${runtimeReady ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        {runtimeReady ? <CheckCircle2 className="size-4" /> : <Database className="size-4" />}
                        {runtimeReady ? "运行环境已就绪" : schemaPending ? "数据库连接成功，等待初始化" : "等待数据库与密钥就绪"}
                    </div>
                    <p className="mt-2 text-xs leading-5">{install.database.message}</p>
                    {install.database.detail ? <p className="mt-2 break-words text-xs leading-5 opacity-80">{install.database.detail}</p> : null}
                </div>

                <div className={`mt-3 rounded-lg border p-4 text-sm ${install.security.encryptionReady ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
                    <div className="flex items-center gap-2 font-semibold">
                        <ShieldCheck className="size-4" />
                        敏感配置加密
                    </div>
                    <p className="mt-2 text-xs leading-5">{install.security.message}</p>
                </div>

                <div className="mt-5 border-l-2 border-slate-300 pl-4">
                    <div className="text-sm font-semibold text-slate-900">配置生效后的操作</div>
                    <ol className="mt-2 space-y-2 text-xs leading-5 text-slate-500">
                        <li>1. 按左侧当前部署方式的命令重新启动应用。</li>
                        <li>2. 等待 10-30 秒，再点击下方“刷新检查”。</li>
                        <li>3. 看到“数据库连接成功”后点击“初始化表结构”。</li>
                        <li>4. 初始化成功后即可进入创作或设置，无需创建账号。</li>
                    </ol>
                </div>

                <div className="mt-5 grid gap-2">
                    <Link href="/install" className={secondaryButtonClass}>
                        <RefreshCw className="size-4" />
                        刷新检查
                    </Link>
                    {!install.database.schemaReady ? (
                        <button type="button" onClick={() => void initializeDatabase()} disabled={!canInitialize || initializing} className={primaryButtonClass}>
                            <Database className={`size-4 ${initializing ? "animate-pulse" : ""}`} />
                            {initializing ? "正在初始化" : "初始化表结构"}
                        </button>
                    ) : null}
                    {initializeError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">{initializeError}</p> : null}
                    <button type="button" onClick={onPrev} className={ghostButtonClass}>
                        <ArrowLeft className="size-4" />
                        返回安装说明
                    </button>
                </div>
            </aside>
        </section>
    );
}

function StepHeader({ step, title, description }: { step: string; title: string; description: string }) {
    return (
        <div>
            <p className="text-sm font-medium text-slate-700">{step}</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">{title}</h1>
            <p className="mt-4 max-w-4xl text-base leading-8 text-slate-600">{description}</p>
        </div>
    );
}

function ProcessRow({ index, title, text, last }: { index: string; title: string; text: string; last?: boolean }) {
    return (
        <div className={`grid gap-3 px-5 py-4 sm:grid-cols-[56px_minmax(0,1fr)] ${last ? "" : "border-b border-slate-200/80"}`}>
            <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">{index}</div>
            <div>
                <div className="text-base font-semibold text-slate-950">{title}</div>
                <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
            </div>
        </div>
    );
}

function StatusMetric({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-xs text-slate-400">{label}</div>
            <div className="mt-1 text-base font-semibold text-slate-950">{value}</div>
        </div>
    );
}

function installStatusView(install: InstallStatus) {
    if (install.ready) {
        return {
            label: "安装完成",
            icon: <CheckCircle2 className="size-4" />,
            className: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
        };
    }
    if (install.database.configured) {
        if (install.database.healthy && !install.database.schemaReady) {
            return {
                label: "等待初始化",
                icon: <Database className="size-4" />,
                className: "border-amber-200 bg-amber-50/80 text-amber-700",
            };
        }
        if (install.database.healthy && install.database.schemaReady && !install.security.encryptionReady) {
            return {
                label: "等待加密密钥",
                icon: <ShieldCheck className="size-4" />,
                className: "border-amber-200 bg-amber-50/80 text-amber-700",
            };
        }
        return {
            label: "数据库需检查",
            icon: <ServerCrash className="size-4" />,
            className: "border-rose-200 bg-rose-50/80 text-rose-700",
        };
    }
    return {
        label: "等待配置数据库",
        icon: <Circle className="size-4" />,
        className: "border-amber-200 bg-amber-50/80 text-amber-700",
    };
}
