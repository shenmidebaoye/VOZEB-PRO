#!/usr/bin/env node
/**
 * Prepare splash assets and ensure Next standalone exists before Tauri opens.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(desktopRoot, "..");
const webRoot = path.join(repoRoot, "web");

run(process.execPath, [path.join(desktopRoot, "scripts", "prepare-splash.mjs")], desktopRoot);
run(process.execPath, [path.join(webRoot, "scripts", "ensure-desktop-standalone.mjs")], webRoot);

function run(command, args, cwd) {
    const result = spawnSync(command, args, { cwd, env: process.env, stdio: "inherit" });
    if (result.error) {
        console.error(result.error.message);
        process.exit(1);
    }
    if ((result.status || 0) !== 0) process.exit(result.status || 1);
}
