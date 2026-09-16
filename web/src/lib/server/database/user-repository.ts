import { formatAccountId } from "@/lib/account-id";
import type { QueryExecutor } from "@/lib/server/database/postgres";
import type { PageInput, PageResult, UserRecord, UserStatus, UserSummaryRecord } from "./repository-shared";
import { mapUser } from "./repository-record-mappers";
import { normalizePage, normalizePageSize, numberValue, pageResult } from "./repository-shared";

type UserUpdatePatch = Partial<Omit<UserRecord, "id" | "accountId" | "createdAt" | "updatedAt" | "avatarStorageKey">> & {
    avatarStorageKey?: string | null;
};

export class UsersRepository {
    constructor(private readonly db: QueryExecutor) {}

    async list(input: PageInput & { keyword?: string; status?: UserStatus } = {}): Promise<PageResult<UserRecord>> {
        const page = normalizePage(input.page);
        const pageSize = normalizePageSize(input.pageSize);
        const keyword = input.keyword?.trim().toLowerCase() || "";
        const params = [keyword, `%${keyword}%`, input.status || null];
        const countResult = await this.db.query(
            `
            SELECT count(*) AS total
            FROM users
            WHERE (
                $1 = ''
                OR lower(username) LIKE $2
                OR lpad(account_id::text, 4, '0') LIKE $2
                OR lower(display_name) LIKE $2
                OR lower(status) LIKE $2
                OR CASE WHEN status = 'active' THEN '可用' ELSE '禁用' END LIKE $2
            )
              AND ($3::text IS NULL OR status = $3)
            `,
            params,
        );
        const total = numberValue(countResult.rows[0]?.total);
        const safePage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
        const result = await this.db.query(
            `
            SELECT *
            FROM users
            WHERE (
                $1 = ''
                OR lower(username) LIKE $2
                OR lpad(account_id::text, 4, '0') LIKE $2
                OR lower(display_name) LIKE $2
                OR lower(status) LIKE $2
                OR CASE WHEN status = 'active' THEN '可用' ELSE '禁用' END LIKE $2
            )
              AND ($3::text IS NULL OR status = $3)
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5
            `,
            [...params, pageSize, (safePage - 1) * pageSize],
        );
        return pageResult(result.rows.map(mapUser), total, safePage, pageSize);
    }

    async getPublicDetails(userIds: string[]): Promise<UserRecord[]> {
        if (!userIds.length) return [];
        const result = await this.db.query("SELECT * FROM users WHERE id = ANY($1::text[])", [userIds]);
        return result.rows.map(mapUser);
    }

    async summarize(): Promise<UserSummaryRecord> {
        const result = await this.db.query(
            `
            SELECT
                count(*) AS total,
                count(*) FILTER (WHERE status = 'active') AS active,
                count(*) FILTER (WHERE status = 'disabled') AS disabled
            FROM users
            `,
        );
        const row = result.rows[0] || {};
        return {
            total: numberValue(row.total),
            active: numberValue(row.active),
            disabled: numberValue(row.disabled),
        };
    }

    async getById(id: string, forUpdate = false) {
        const result = await this.db.query(`SELECT * FROM users WHERE id = $1${forUpdate ? " FOR UPDATE" : ""}`, [id]);
        return result.rows[0] ? mapUser(result.rows[0]) : null;
    }

    async count() {
        const result = await this.db.query("SELECT count(*) AS total FROM users");
        return numberValue(result.rows[0]?.total);
    }

    async getByUsername(username: string) {
        const result = await this.db.query("SELECT * FROM users WHERE lower(username) = lower($1)", [username]);
        return result.rows[0] ? mapUser(result.rows[0]) : null;
    }

    async findIdentityConflict(input: { username?: string; excludingUserId?: string }) {
        const result = await this.db.query(
            `SELECT * FROM users
             WHERE ($1::text IS NOT NULL AND lower(username) = lower($1))
               AND ($2::text IS NULL OR id <> $2)
             ORDER BY created_at ASC
             LIMIT 1`,
            [input.username || null, input.excludingUserId || null],
        );
        return result.rows[0] ? mapUser(result.rows[0]) : null;
    }

    async getByPublicIdentity(identity: string) {
        const result = await this.db.query(
            `SELECT * FROM users
             WHERE lower(username) = lower($1) OR id = $1
             ORDER BY CASE WHEN lower(username) = lower($1) THEN 0 ELSE 1 END
             LIMIT 1`,
            [identity],
        );
        return result.rows[0] ? mapUser(result.rows[0]) : null;
    }

    async create(user: UserRecord) {
        const result = await this.db.query(
            `
            INSERT INTO users (id, account_id, username, display_name, bio, avatar_storage_key, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            `,
            [user.id, Number(user.accountId), user.username, user.displayName, user.bio, user.avatarStorageKey || null, user.status, user.createdAt, user.updatedAt],
        );
        return mapUser(result.rows[0]);
    }

    async createWithNextAccountId(user: Omit<UserRecord, "accountId">) {
        const result = await this.db.query(
            `
            INSERT INTO users (id, account_id, username, display_name, bio, avatar_storage_key, status, created_at, updated_at)
            VALUES ($1, nextval('user_account_id_seq'), $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            `,
            [user.id, user.username, user.displayName, user.bio, user.avatarStorageKey || null, user.status, user.createdAt, user.updatedAt],
        );
        return mapUser(result.rows[0]);
    }

    async update(id: string, patch: UserUpdatePatch) {
        const hasAvatarStorageKey = Object.prototype.hasOwnProperty.call(patch, "avatarStorageKey");
        const result = await this.db.query(
            `
            UPDATE users SET
                username = COALESCE($2, username),
                display_name = COALESCE($3, display_name),
                bio = COALESCE($4, bio),
                avatar_storage_key = CASE WHEN $5::boolean THEN $6 ELSE avatar_storage_key END,
                status = COALESCE($7, status),
                updated_at = now()
            WHERE id = $1
            RETURNING *
            `,
            [id, patch.username, patch.displayName, patch.bio, hasAvatarStorageKey, patch.avatarStorageKey ?? null, patch.status],
        );
        return result.rows[0] ? mapUser(result.rows[0]) : null;
    }

    async delete(id: string) {
        const result = await this.db.query("DELETE FROM users WHERE id = $1", [id]);
        return result.rowCount || 0;
    }
}
