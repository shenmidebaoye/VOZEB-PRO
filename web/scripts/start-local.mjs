#!/usr/bin/env node
/**
 * 本机创作工具一键启动：加载 web/.env.local，拉起 Next.js 与生成 Worker。
 * 用法：pnpm start  或  pnpm --dir web start:local
 */
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(webRoot, ".env.local");
const runApp = path.join(webRoot, "scripts", "run-app.mjs");

if (!existsSync(path.join(webRoot, "node_modules", "next"))) {
    console.error("未找到依赖。请先在 web 目录执行：pnpm install");
    process.exit(1);
}

if (!existsSync(envFile)) {
    console.warn("未找到 web/.env.local，将使用进程环境变量启动。");
    console.warn("本机文件存储建议至少配置 VOZEB_PRO_ENCRYPTION_KEY；未设置 VOZEB_PRO_DATABASE_PROVIDER 时默认 file。");
}

const env = { ...process.env };
if (!env.VOZEB_PRO_DATABASE_PROVIDER?.trim() && !envFileHasDatabaseProvider(envFile)) {
    env.VOZEB_PRO_DATABASE_PROVIDER = "file";
    console.log("未设置 VOZEB_PRO_DATABASE_PROVIDER，本机启动默认使用 file。");
}

console.log("正在启动 VOZEB PRO 本机创作工具…");
console.log("地址：http://127.0.0.1:3000  （就绪后进入 /create，配置在 /settings）");

const child = spawn(process.execPath, ["--env-file-if-exists=.env.local", runApp, "dev"], {
    cwd: webRoot,
    stdio: "inherit",
    env,
    windowsHide: true,
});

child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
        if (!child.killed) child.kill(signal);
    });
}

function envFileHasDatabaseProvider(filePath) {
    if (!existsSync(filePath)) return false;
    return /^\s*VOZEB_PRO_DATABASE_PROVIDER\s*=\s*\S+/m.test(readFileSync(filePath, "utf8"));
}
