import type { MetadataRoute } from "next";

import { absoluteSiteUrl, siteMetadataBase } from "@/lib/server/site-metadata";

export default function robots(): MetadataRoute.Robots {
    const base = siteMetadataBase();
    return {
        rules: {
            userAgent: "*",
            disallow: "/",
        },
        sitemap: absoluteSiteUrl("/sitemap.xml", base),
    };
}
