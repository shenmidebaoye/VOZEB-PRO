#!/usr/bin/env node
/**
 * Ensure Next.js standalone output exists for fast desktop startup.
 * Skips rebuild when server.js is already present unless VOZEB_PRO_DESKTOP_FORCE_BUILD=1.
 */
import { existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = process.env.NEXT_DIST_DIR?.trim() || ".next";
const serverJs = path.join(webRoot, distDir, "standalone", "server.js");
const force = process.env.VOZEB_PRO_DESKTOP_FORCE_BUILD === "1" || process.argv.includes("--force");

if (!force && existsSync(serverJs)) {
    const ageMinutes = Math.max(0, (Date.now() - statSync(serverJs).mtimeMs) / 60_000);
    console.log(`Desktop standalone ready (${distDir}/standalone, ${ageMinutes.toFixed(1)} min old).`);
    process.exit(0);
}

console.log(force ? "Force rebuilding desktop standalone…" : "Desktop standalone missing; building once…");
const result = spawnSync(process.execPath, [path.join(webRoot, "scripts", "production-build.mjs")], {
    cwd: webRoot,
    env: {
        ...process.env,
        NEXT_DIST_DIR: distDir,
        NEXT_SKIP_BUILD_TYPECHECK: process.env.NEXT_SKIP_BUILD_TYPECHECK || "1",
        NODE_ENV: "production",
    },
    stdio: "inherit",
});

if (result.error) {
    console.error(result.error.message);
    process.exit(1);
}
if ((result.status || 0) !== 0) process.exit(result.status || 1);
if (!existsSync(serverJs)) {
    console.error(`Build finished but ${serverJs} is missing.`);
    process.exit(1);
}
console.log("Desktop standalone build complete.");
