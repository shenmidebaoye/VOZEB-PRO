#!/usr/bin/env node
/**
 * Desktop sidecar entry for Tauri (or manual desktop launch).
 * Prefer Next.js standalone (prebuilt) for fast cold start — no on-demand route compile.
 * Set VOZEB_PRO_DESKTOP_MODE=dev only when you need Turbopack HMR.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
    clearDesktopReadyFile,
    desktopEnvironment,
    emitDesktopEvent,
    loadOrCreateDesktopRuntime,
    resolveDesktopDataDir,
    resolveDesktopMode,
    resolveDesktopPort,
    writeDesktopReadyFile,
} from "./desktop-runtime.mjs";
import { generationRuntimeEnvironment, superviseGenerationRuntime, waitForHttpReady } from "./generation-runtime.mjs";
import { prepareStandaloneAssets } from "./standalone-assets.mjs";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (!existsSync(path.join(webRoot, "node_modules", "next"))) {
    emitDesktopEvent("studio.error", { message: "未找到依赖。请先在 web 目录执行：pnpm install" });
    process.exit(1);
}

const mode = await resolveDesktopModeWithEnsure(webRoot);
const dataDir = resolveDesktopDataDir({ webRoot });
clearDesktopReadyFile(dataDir);
const runtime = loadOrCreateDesktopRuntime(dataDir);
const port = await resolveDesktopPort();
const origin = `http://127.0.0.1:${port}`;
const environment = desktopEnvironment({
    webRoot,
    dataDir,
    port,
    runtime,
    mode,
    environment: {
        ...process.env,
        NODE_ENV: mode === "standalone" ? "production" : process.env.NODE_ENV,
    },
});
const supervised = generationRuntimeEnvironment({ environment, allowEphemeralToken: false });

emitDesktopEvent("studio.progress", {
    phase: "starting",
    message: mode === "standalone" ? "启动预构建桌面服务" : "启动开发态桌面服务（按路由现编，较慢）",
    url: origin,
    mode,
});

if (mode === "standalone") {
    const distDir = supervised.environment.NEXT_DIST_DIR?.trim() || ".next";
    await prepareStandaloneAssets({ webRoot, distDir });
}

const distDir = supervised.environment.NEXT_DIST_DIR?.trim() || (mode === "standalone" ? ".next" : ".next-desktop");
const app =
    mode === "standalone"
        ? {
              command: process.execPath,
              args: ["server.js"],
              cwd: path.join(webRoot, distDir, "standalone"),
          }
        : {
              command: process.execPath,
              args: [path.join(webRoot, "node_modules", "next", "dist", "bin", "next"), "dev", "-H", "127.0.0.1", "-p", String(port)],
              cwd: webRoot,
          };

const readinessAbort = new AbortController();
const exitPromise = superviseGenerationRuntime({
    app,
    workerScript: path.join(webRoot, "scripts", "generation-worker.mjs"),
    environment: supervised.environment,
});

try {
    await waitForHttpReady({ origin: supervised.environment.VOZEB_PRO_WORKER_API_ORIGIN, signal: readinessAbort.signal });
    // Navigate as soon as the server is live. Do not block on first /create RSC.
    const ready = { event: "studio.ready", url: `${origin}/create`, origin, port, mode, dataDir };
    writeDesktopReadyFile(dataDir, ready);
    emitDesktopEvent("studio.ready", ready);
    void warmupDesktopSurface(origin, readinessAbort.signal);
} catch (error) {
    readinessAbort.abort();
    emitDesktopEvent("studio.error", {
        message: error instanceof Error ? error.message : "桌面服务启动失败",
    });
    process.exitCode = 1;
}

process.exitCode = await exitPromise;

async function resolveDesktopModeWithEnsure(root) {
    const forced = process.env.VOZEB_PRO_DESKTOP_MODE?.trim().toLowerCase();
    if (forced === "dev") return "dev";

    const mode = resolveDesktopMode({ webRoot: root });
    if (mode === "standalone") return "standalone";
    if (forced === "standalone" || !forced) {
        emitDesktopEvent("studio.progress", { phase: "building", message: "首次桌面启动需要生产构建，完成后冷启动会明显加快" });
        const ensure = spawnSync(process.execPath, [path.join(root, "scripts", "ensure-desktop-standalone.mjs")], {
            cwd: root,
            env: { ...process.env, NEXT_DIST_DIR: process.env.NEXT_DIST_DIR?.trim() || ".next" },
            stdio: "inherit",
        });
        if ((ensure.status || 0) !== 0) {
            emitDesktopEvent("studio.error", { message: "桌面 standalone 构建失败；可临时设置 VOZEB_PRO_DESKTOP_MODE=dev" });
            process.exit(ensure.status || 1);
        }
        return "standalone";
    }
    return mode;
}

async function warmupDesktopSurface(baseOrigin, signal) {
    // Prefetch the first screen so WebView navigation is not the first RSC hit.
    for (const pathname of ["/create", "/api/auth/session"]) {
        if (signal?.aborted) return;
        try {
            await fetch(new URL(pathname, baseOrigin), { signal: AbortSignal.timeout(30_000), cache: "no-store" });
        } catch {
            // Warmup is best-effort; readiness already passed.
        }
    }
}
