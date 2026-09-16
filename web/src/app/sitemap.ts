import type { MetadataRoute } from "next";

import { absoluteSiteUrl, siteMetadataBase } from "@/lib/server/site-metadata";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const base = siteMetadataBase();
    return ["/", "/create", "/terms", "/privacy"].map((path) => ({
        url: absoluteSiteUrl(path, base),
        changeFrequency: path === "/" || path === "/create" ? "daily" : "yearly",
        priority: path === "/" ? 1 : path === "/create" ? 0.8 : 0.3,
    }));
}
