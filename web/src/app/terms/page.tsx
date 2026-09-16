import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Ban, Copyright, FileWarning, RefreshCcw, Scale, UserRoundCheck } from "lucide-react";

import { getPublicSiteSettings } from "@/lib/server/site-metadata";

const UPDATED_AT = "2026 年 9 月 16 日";

const highlights = [
    { title: "你对输入内容负责", body: "请确保有权使用上传的文字、图片、音视频、人物肖像、品牌和其他素材，并在使用前检查 AI 生成结果。", icon: UserRoundCheck },
    { title: "本机单实例工具", body: "本产品面向本机创作，不提供多用户登录、套餐、积分充值或公开作品广场。", icon: Scale },
    { title: "禁止违法与侵权使用", body: "不得利用服务实施欺诈、冒充、骚扰、侵犯隐私、传播违法内容、攻击系统或绕过安全限制。", icon: Ban },
] as const;

function termsSections(siteTitle: string) {
    return [
        {
            title: "协议范围与接受",
            paragraphs: [
                `本服务条款适用于你对本机安装的 ${siteTitle}（含桌面端与本机 Web 服务）中创作 Agent、图片与视频生成、Canvas、短剧、素材与设置等功能的使用。`,
                "继续使用即表示你已阅读并同意本条款及隐私政策。",
            ],
        },
        {
            title: "创作内容与知识产权",
            paragraphs: [
                "你保留对自己合法上传内容所享有的权利。为执行你的请求，软件可在本机必要范围内存储、复制、转码、传输和处理这些内容。",
                "你应确保拥有素材和提示词所需的版权、商标、肖像、声音、隐私和其他授权。",
                "在法律与上游模型条款允许的范围内，你可以使用生成结果；AI 输出可能与他人内容相似，也不保证独占性或适合特定商业用途。",
            ],
        },
        {
            title: "AI 服务说明",
            paragraphs: [
                "Agent 回复与生成结果由你配置的上游模型提供，可能出现事实错误、画面瑕疵或不可用结果，不构成专业意见。",
                "模型可用性、速度与参数取决于你配置的渠道与上游能力。任务可能耗时较长，请依据页面状态处理，不要重复提交同一任务。",
            ],
        },
        {
            title: "禁止行为",
            paragraphs: [
                "不得上传、生成或传播违法犯罪、侵权、仇恨骚扰、性剥削、未成年人不当内容、恶意虚假信息、隐私泄露、欺诈冒充或恶意软件相关内容。",
                "不得尝试绕过本机安全限制、滥用上游接口或破坏数据完整性。",
            ],
        },
        {
            title: "责任边界与更新",
            paragraphs: [
                "我们会尽力维持软件可用，但不保证上游模型永不中断或每次生成都满足主观预期。",
                "条款可能随功能或法律变化更新；继续使用前请阅读当前版本。",
            ],
        },
    ] as const;
}

export async function generateMetadata(): Promise<Metadata> {
    const site = await getPublicSiteSettings();
    return {
        title: "服务条款",
        description: `了解使用本机 ${site.title} 创作工具时的内容责任、AI 结果与禁止行为。`,
        alternates: { canonical: "/terms" },
    };
}

export default async function TermsPage() {
    const site = await getPublicSiteSettings();
    const sections = termsSections(site.title);
    return (
        <main className="app-scroll-page bg-[#f7f8fa] text-stone-800 dark:bg-[#0f1114] dark:text-stone-200">
            <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-8 sm:py-8">
                <Link
                    href="/create"
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-700 transition hover:border-cyan-300 hover:text-cyan-700 dark:border-white/10 dark:bg-white/5 dark:text-stone-200 dark:hover:border-cyan-500/50 dark:hover:text-cyan-200"
                >
                    <ArrowLeft className="size-4" />
                    返回创作
                </Link>

                <article className="mt-5 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,.08)] dark:border-white/10 dark:bg-[#15181c] dark:shadow-black/30">
                    <header className="bg-[#101211] px-5 py-8 text-white sm:px-9 sm:py-10">
                        <div className="inline-flex items-center gap-2 text-sm font-medium text-cyan-200">
                            <Scale className="size-4" />
                            本机创作工具使用规则
                        </div>
                        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">服务条款</h1>
                        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-300 sm:text-base">说明使用 {site.title} 时的内容责任、AI 结果边界与禁止行为。本机工具不提供多用户账号、积分或公开社区。</p>
                        <p className="mt-5 text-xs text-stone-400">生效及最近更新：{UPDATED_AT}</p>
                    </header>

                    <div className="grid gap-3 border-b border-stone-200 p-4 sm:grid-cols-3 sm:p-6 dark:border-white/10">
                        {highlights.map(({ title, body, icon: Icon }) => (
                            <section key={title} className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-white/10 dark:bg-white/[0.035]">
                                <Icon className="size-5 text-cyan-600 dark:text-cyan-300" />
                                <h2 className="mt-3 text-sm font-semibold text-stone-950 dark:text-white">{title}</h2>
                                <p className="mt-1.5 text-xs leading-5 text-stone-600 dark:text-stone-400">{body}</p>
                            </section>
                        ))}
                    </div>

                    <div className="divide-y divide-stone-200 px-5 sm:px-9 dark:divide-white/10">
                        {sections.map((section, index) => (
                            <section key={section.title} className="grid gap-3 py-6 sm:grid-cols-[44px_minmax(0,1fr)] sm:py-8">
                                <span className="grid size-8 place-items-center rounded-full bg-cyan-50 text-xs font-semibold text-cyan-700 dark:bg-cyan-300/10 dark:text-cyan-300">{String(index + 1).padStart(2, "0")}</span>
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

                    <footer className="grid gap-3 border-t border-stone-200 bg-stone-50 px-5 py-5 text-xs leading-5 text-stone-600 sm:grid-cols-3 sm:px-9 dark:border-white/10 dark:bg-white/[0.025] dark:text-stone-400">
                        <span className="flex items-start gap-2">
                            <Copyright className="mt-0.5 size-4 shrink-0" />
                            使用素材前确认授权。
                        </span>
                        <span className="flex items-start gap-2">
                            <RefreshCcw className="mt-0.5 size-4 shrink-0" />
                            失败任务按真实状态重试，不自动重复扣费。
                        </span>
                        <span className="flex items-start gap-2">
                            <FileWarning className="mt-0.5 size-4 shrink-0" />
                            重要用途前核验 AI 输出。
                        </span>
                    </footer>
                </article>
            </div>
        </main>
    );
}
