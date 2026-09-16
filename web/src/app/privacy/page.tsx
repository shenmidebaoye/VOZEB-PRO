import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Database, Eye, ShieldCheck, Sparkles, Trash2 } from "lucide-react";

import { getPublicSiteSettings } from "@/lib/server/site-metadata";

const UPDATED_AT = "2026 年 9 月 16 日";

const highlights = [
    { title: "创作内容留在本机", body: "对话、项目、提示词和媒体默认保存在本机数据目录，不会进入公开社区，除非你自行导出或上传到你配置的外部存储。", icon: Eye },
    { title: "AI 请求会经过上游", body: "使用文本、图片、视频或音频生成时，必要的提示词、参数和参考素材会发送给你配置的模型服务商。", icon: Sparkles },
    { title: "可备份与删除", body: "可在设置中导出备份；删除会话、项目或媒体时按引用保护清理本机登记与文件。", icon: Trash2 },
] as const;

const sections = [
    {
        title: "我们处理哪些信息",
        paragraphs: [
            "本机身份：本地 owner 的显示名称、简介、头像等资料，用于界面展示与媒体归属，不提供多用户注册登录。",
            "创作与项目数据：你提交的文字、提示词、附件、创作会话、Canvas、短剧、素材、生成参数、任务状态和生成结果。",
            "渠道配置：你在设置中填写的模型渠道、密钥密文、默认模型与并发等本机配置。",
            "运行信息：为保障任务续跑、限流和故障排查而处理的请求时间、错误和必要审计记录。",
        ],
    },
    {
        title: "我们为什么处理这些信息",
        paragraphs: [
            "用于在本机恢复项目、执行生成任务、展示与下载结果，以及完成你主动发起的备份与删除。",
            "用于防止滥用、定位故障，并按你的配置调用上游模型。我们只在实现相应功能所需的范围内处理信息。",
        ],
    },
    {
        title: "AI 与自动化处理",
        paragraphs: [
            "创作 Agent 会先理解你的本轮需求，再选择当前可用的模型和参数。内部规划提示词不会作为公开内容展示。",
            "模型服务可能处理你的提示词、参考素材和任务参数。请避免提交身份证件、财务信息、医疗信息、未公开商业秘密等不必要的敏感内容。",
            "AI 结果可能不准确。发布、商用或用于重要决策前，请自行核验。",
        ],
    },
    {
        title: "何时向第三方提供信息",
        paragraphs: [
            "仅在你配置并启用相应功能时，将必要信息交给模型服务或你配置的对象存储。第三方只会收到完成任务所需的数据。",
            "本机工作室不出售个人信息，也不提供公开作品广场社交网络。",
        ],
    },
    {
        title: "保存、安全与你的选择",
        paragraphs: [
            "数据默认保存在本机 `VOZEB_PRO_DATA_DIR`（桌面端为系统 AppData）。你可以在设置中备份或删除业务内容。",
            "删除创作会话、Canvas、短剧或媒体时，系统会先检查引用；仍被合法引用的文件会保留到引用解除。",
            "请妥善保管本机设备与加密密钥；丢失密钥可能导致已加密的渠道密钥无法解密。",
        ],
    },
] as const;

export async function generateMetadata(): Promise<Metadata> {
    const site = await getPublicSiteSettings();
    return {
        title: "隐私政策",
        description: `了解本机 ${site.title} 如何处理创作内容、模型请求与本机存储。`,
        alternates: { canonical: "/privacy" },
    };
}

export default async function PrivacyPage() {
    const site = await getPublicSiteSettings();
    return (
        <main className="app-scroll-page bg-[#f7f8fa] text-stone-800 dark:bg-[#0f1114] dark:text-stone-200">
            <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-8 sm:py-8">
                <Link
                    href="/create"
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-white/5 dark:text-stone-200 dark:hover:border-emerald-500/50 dark:hover:text-emerald-200"
                >
                    <ArrowLeft className="size-4" />
                    返回创作
                </Link>

                <article className="mt-5 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,.08)] dark:border-white/10 dark:bg-[#15181c] dark:shadow-black/30">
                    <header className="bg-[#101211] px-5 py-8 text-white sm:px-9 sm:py-10">
                        <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-200">
                            <ShieldCheck className="size-4" />
                            本机数据与隐私
                        </div>
                        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">隐私政策</h1>
                        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-300 sm:text-base">{site.title} 是本机创作工具：数据默认留在本机，模型请求只发送给你配置的上游服务。</p>
                        <p className="mt-5 text-xs text-stone-400">生效及最近更新：{UPDATED_AT}</p>
                    </header>

                    <div className="grid gap-3 border-b border-stone-200 p-4 sm:grid-cols-3 sm:p-6 dark:border-white/10">
                        {highlights.map(({ title, body, icon: Icon }) => (
                            <section key={title} className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-white/10 dark:bg-white/[0.035]">
                                <Icon className="size-5 text-emerald-600 dark:text-emerald-300" />
                                <h2 className="mt-3 text-sm font-semibold text-stone-950 dark:text-white">{title}</h2>
                                <p className="mt-1.5 text-xs leading-5 text-stone-600 dark:text-stone-400">{body}</p>
                            </section>
                        ))}
                    </div>

                    <div className="divide-y divide-stone-200 px-5 sm:px-9 dark:divide-white/10">
                        {sections.map((section, index) => (
                            <section key={section.title} className="grid gap-3 py-6 sm:grid-cols-[44px_minmax(0,1fr)] sm:py-8">
                                <span className="grid size-8 place-items-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-300">{String(index + 1).padStart(2, "0")}</span>
                                <div>
                                    <h2 className="text-lg font-semibold text-stone-950 dark:text-white">{section.title}</h2>
                                    <div className="mt-3 space-y-3 text-sm leading-7 text-stone-600 dark:text-stone-400">
                                        {section.paragraphs.map((paragraph) => (
                                            <p key={paragraph}>{paragraph}</p>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>

                    <footer className="grid gap-3 border-t border-stone-200 bg-stone-50 px-5 py-5 text-xs leading-5 text-stone-600 sm:grid-cols-2 sm:px-9 dark:border-white/10 dark:bg-white/[0.025] dark:text-stone-400">
                        <span className="flex items-start gap-2">
                            <Database className="mt-0.5 size-4 shrink-0" />
                            默认写入本机数据目录；可选外部对象存储由你显式开启。
                        </span>
                        <span className="flex items-start gap-2">
                            <Trash2 className="mt-0.5 size-4 shrink-0" />
                            删除操作按引用保护清理，不会偷换成归档。
                        </span>
                    </footer>
                </article>
            </div>
        </main>
    );
}
