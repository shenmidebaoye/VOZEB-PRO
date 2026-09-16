import { BookMarked, Clapperboard, Images, Maximize2, Settings2, Sparkles } from "lucide-react";

export const navigationGroups = [
    { id: "create", label: "创作" },
    { id: "projects", label: "项目" },
    { id: "assets", label: "资产" },
    { id: "system", label: "系统" },
] as const;

export const landingNavigationTools = [{ slug: "create", label: "Agent" }] as const;

export const navigationTools = [
    {
        slug: "create",
        label: "Agent",
        description: "统一创作入口",
        group: "create",
        icon: Sparkles,
        primary: true,
    },
    {
        slug: "canvas",
        label: "画布",
        description: "节点式多媒体创作",
        group: "projects",
        icon: Maximize2,
    },
    {
        slug: "drama",
        label: "短剧",
        description: "剧本、分镜与成片",
        group: "projects",
        icon: Clapperboard,
    },
    {
        slug: "assets",
        label: "素材",
        description: "图片、视频与音频",
        group: "assets",
        icon: Images,
    },
    {
        slug: "my-prompts",
        label: "提示词",
        description: "个人提示词",
        group: "assets",
        icon: BookMarked,
    },
    {
        slug: "settings",
        label: "设置",
        description: "渠道、Skills 与存储",
        group: "system",
        icon: Settings2,
    },
] as const;

export type NavigationToolSlug = (typeof navigationTools)[number]["slug"];

export function navigationToolForPathname(pathname: string) {
    const slug = pathname.split("/").filter(Boolean)[0] || "";
    return navigationTools.find((tool) => tool.slug === slug);
}
