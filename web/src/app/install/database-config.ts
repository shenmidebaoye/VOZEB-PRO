export type DeployMode = "local" | "cloud";

export const modeOptions: Array<{ label: string; value: DeployMode; host: string; ssl: boolean; description: string }> = [
    { label: "本机 PostgreSQL", value: "local", host: "localhost", ssl: false, description: "可选：Web 直连本机 PostgreSQL，配置写入 web/.env.local。默认仍可使用文件存储。" },
    { label: "远程 PostgreSQL", value: "cloud", host: "db.example.com", ssl: true, description: "可选：连接远程 PostgreSQL，按服务商要求启用 SSL。" },
];

type DatabaseConfig = {
    mode: DeployMode;
    host: string;
    port: string;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    encryptionKey: string;
    maintenanceToken: string;
    workerToken: string;
};

export function generateDeploymentSecret() {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function buildDeploymentSnippets(config: DatabaseConfig) {
    const host = config.host.trim() || "localhost";
    const port = config.port.trim() || "5432";
    const database = config.database.trim() || "vozeb_pro";
    const username = config.username.trim() || "vozeb_pro";
    const databaseUrl = buildPostgresUrl({ database, host, password: config.password, port, username });
    const envText = `VOZEB_PRO_DATABASE_PROVIDER=postgres
DATABASE_URL=${databaseUrl}
VOZEB_PRO_DATABASE_POOL_MAX=10
VOZEB_PRO_DATABASE_SSL=${config.ssl ? "1" : "0"}
VOZEB_PRO_ENCRYPTION_KEY=${config.encryptionKey}
VOZEB_PRO_MAINTENANCE_TOKEN=${config.maintenanceToken}
VOZEB_PRO_WORKER_TOKEN=${config.workerToken}`;

    return {
        envText,
        sqlText: `psql -h ${shellArg(host)} -p ${shellArg(port)} -U postgres <<'SQL'
DO $$
BEGIN
    CREATE ROLE ${sqlIdentifier(username)} LOGIN PASSWORD ${sqlLiteral(config.password)};
EXCEPTION WHEN duplicate_object THEN
    ALTER ROLE ${sqlIdentifier(username)} WITH PASSWORD ${sqlLiteral(config.password)};
END $$;
SELECT 'CREATE DATABASE ${sqlIdentifier(database)} OWNER ${sqlIdentifier(username)}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = ${sqlLiteral(database)})\gexec
SQL`,
    };
}

function buildPostgresUrl(input: { username: string; password: string; host: string; port: string; database: string }) {
    return `postgres://${encodeURIComponent(input.username)}:${encodeURIComponent(input.password)}@${input.host}:${input.port}/${encodeURIComponent(input.database)}`;
}

function shellArg(value: string) {
    return /^[a-zA-Z0-9._:/-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\"'\"'")}'`;
}

function sqlIdentifier(value: string) {
    return `"${value.replace(/"/g, '""')}"`;
}

function sqlLiteral(value: string) {
    return `'${value.replace(/'/g, "''")}'`;
}
