import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
mkdirSync(dist, { recursive: true });
copyFileSync(path.join(root, "splash", "index.html"), path.join(dist, "index.html"));
const logoSrc = path.resolve(root, "..", "web", "public", "logo.svg");
if (existsSync(logoSrc)) copyFileSync(logoSrc, path.join(dist, "logo.svg"));
console.log("Desktop splash assets ready.");
