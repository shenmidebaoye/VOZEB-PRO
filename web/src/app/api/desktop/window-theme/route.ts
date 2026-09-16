import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { getServerDataDir } from "@/lib/server/data-dir";
import { readJsonBodyResult } from "@/lib/auth/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ThemeBody = {
    theme?: string;
};

export async function POST(request: Request) {
    if (process.env.VOZEB_PRO_DESKTOP !== "1") {
        return NextResponse.json({ code: 0, data: { synced: false }, msg: "非桌面运行时" });
    }

    const parsed = await readJsonBodyResult<ThemeBody | null>(request);
    if (!parsed.ok) return NextResponse.json({ code: parsed.status, data: null, msg: parsed.message }, { status: parsed.status });
    const theme = parsed.data?.theme === "dark" ? "dark" : "light";
    const dataDir = getServerDataDir();
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(resolve(dataDir, "desktop-theme.json"), `${JSON.stringify({ event: "studio.theme", theme, updatedAt: new Date().toISOString() })}\n`, "utf8");
    return NextResponse.json({ code: 0, data: { theme, synced: true }, msg: "已同步窗口主题" });
}
