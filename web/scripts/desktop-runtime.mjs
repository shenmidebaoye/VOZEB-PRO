import { createServer } from "node:net";
import { existsSync, mkdirSync, readFileSync, writeFileSync, writeSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

const RUNTIME_FILE = "desktop-runtime.json";
const READY_FILE = "desktop-ready.json";
const MIN_TOKEN_LENGTH = 32;
const DEFAULT_PORT = 47831;

export function resolveDesktopDataDir({ webRoot, environment = process.env } = {}) {
    const configured = environment.VOZEB_PRO_DATA_DIR?.trim();
    if (configured) return path.resolve(configured);
    return path.join(webRoot, ".data");
}

export function loadOrCreateDesktopRuntime(dataDir) {
    mkdirSync(dataDir, { recursive: true });
    const filePath = path.join(dataDir, RUNTIME_FILE);
    const existing = readRuntimeFile(filePath);
    const encryptionKey = validEncryptionKey(existing.encryptionKey) || randomBytes(32).toString("hex");
    let maintenanceToken = validToken(existing.maintenanceToken) || randomBytes(32).toString("hex");
    let workerToken = validToken(existing.workerToken) || randomBytes(32).toString("hex");
    if (workerToken === maintenanceToken) workerToken = randomBytes(32).toString("hex");

    const runtime = {
        encryptionKey,
        maintenanceToken,
        workerToken,
        updatedAt: new Date().toISOString(),
    };
    writeFileSync(filePath, `${JSON.stringify(runtime, null, 2)}\n`, "utf8");
    return runtime;
}

export async function resolveDesktopPort(environment = process.env) {
    const preferred = validPort(environment.PORT) || DEFAULT_PORT;
    if (await canListen(preferred)) return preferred;
    return freePort();
}

export function emitDesktopEvent(event, payload = {}) {
    // Piped stdout is block-buffered; sync write so Tauri sees handshake immediately.
    writeSync(1, `${JSON.stringify({ event, ...payload })}\n`);
}

export function writeDesktopReadyFile(dataDir, payload) {
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(path.join(dataDir, READY_FILE), `${JSON.stringify({ ...payload, updatedAt: new Date().toISOString() })}\n`, "utf8");
}

export function clearDesktopReadyFile(dataDir) {
    const filePath = path.join(dataDir, READY_FILE);
    if (!existsSync(filePath)) return;
    try {
        writeFileSync(filePath, "", "utf8");
    } catch {
        // ignore
    }
}

export function desktopEnvironment({ webRoot, dataDir, port, runtime, environment = process.env, mode = "dev" }) {
    const origin = `http://127.0.0.1:${port}`;
    return {
        ...environment,
        PORT: String(port),
        HOSTNAME: "127.0.0.1",
        NEXT_PUBLIC_SITE_URL: origin,
        VOZEB_PRO_DATABASE_PROVIDER: environment.VOZEB_PRO_DATABASE_PROVIDER?.trim() || "file",
        VOZEB_PRO_DATA_DIR: dataDir,
        VOZEB_PRO_ENCRYPTION_KEY: runtime.encryptionKey,
        VOZEB_PRO_MAINTENANCE_TOKEN: runtime.maintenanceToken,
        VOZEB_PRO_WORKER_TOKEN: runtime.workerToken,
        VOZEB_PRO_INTERNAL_ORIGIN: origin,
        VOZEB_PRO_WORKER_API_ORIGIN: origin,
        VOZEB_PRO_DESKTOP: "1",
        VOZEB_PRO_DESKTOP_MODE: mode,
        // Keep desktop Turbopack cache/lock separate from `pnpm start` (.next-dev).
        NEXT_DIST_DIR: environment.NEXT_DIST_DIR?.trim() || (mode === "standalone" ? ".next" : ".next-desktop"),
    };
}

export function resolveDesktopMode({ webRoot, environment = process.env } = {}) {
    const forced = environment.VOZEB_PRO_DESKTOP_MODE?.trim().toLowerCase();
    if (forced === "dev") return "dev";
    if (forced === "standalone") return "standalone";
    const distDir = environment.NEXT_DIST_DIR?.trim() || ".next";
    const serverJs = path.join(webRoot, distDir, "standalone", "server.js");
    // Prefer prebuilt standalone for desktop cold start; fall back only when absent.
    return existsSync(serverJs) ? "standalone" : "dev";
}

function readRuntimeFile(filePath) {
    if (!existsSync(filePath)) return {};
    try {
        return JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
        return {};
    }
}

function validEncryptionKey(value) {
    const raw = typeof value === "string" ? value.trim() : "";
    return /^[a-f0-9]{64}$/i.test(raw) ? raw : "";
}

function validToken(value) {
    const raw = typeof value === "string" ? value.trim() : "";
    return raw.length >= MIN_TOKEN_LENGTH ? raw : "";
}

function validPort(value) {
    const port = Number(value);
    return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : 0;
}

function canListen(port) {
    return new Promise((resolve) => {
        const server = createServer();
        server.unref();
        server.once("error", () => resolve(false));
        server.listen(port, "127.0.0.1", () => {
            server.close(() => resolve(true));
        });
    });
}

function freePort() {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.unref();
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            const port = typeof address === "object" && address ? address.port : 0;
            server.close((error) => {
                if (error) reject(error);
                else resolve(port);
            });
        });
    });
}
