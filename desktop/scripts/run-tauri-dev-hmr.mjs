#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const child = spawn(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["exec", "tauri", "dev"],
    {
        cwd: desktopRoot,
        env: { ...process.env, VOZEB_PRO_DESKTOP_MODE: "dev" },
        stdio: "inherit",
        shell: process.platform === "win32",
    },
);
child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
});
