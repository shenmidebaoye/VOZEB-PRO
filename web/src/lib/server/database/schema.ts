import { POSTGRESQL_TRIGGER_SCHEMA_SQL } from "./schema-triggers";

const DEFAULT_AGENT_SKILLS_JSON = '[{"id":"ecommerce-image","name":"电商生图","description":"为商品主图、场景图和详情页视觉生成结构化方案。","instructions":"识别商品卖点、目标人群、平台与画幅。优先规划白底主图、核心卖点场景图、细节特写和详情页横幅；保持商品外观、材质、颜色、Logo 与包装一致。提示词必须写清主体、构图、光线、背景、镜头、商业质感、尺寸比例与禁止变形要求。","enabled":true,"keywords":["电商","商品","主图","详情页","淘宝","京东","亚马逊"]}]';

export const POSTGRESQL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION vozeb_pro_set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_role;
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_admin_permissions_array;
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_mfa_enabled_secret;
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_registration_consent_complete;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS email CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS role CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS admin_permissions CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS plan_id CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS points_balance CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS password_hash CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS mfa_secret_ciphertext CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS mfa_enabled_at CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS terms_version CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS terms_url CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS privacy_version CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS privacy_url CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS policy_accepted_at CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS last_login_at CASCADE;
DROP INDEX IF EXISTS vozeb_pro_users_email_lower_idx;
DROP INDEX IF EXISTS vozeb_pro_users_plan_id_idx;

ALTER TABLE IF EXISTS app_settings DROP COLUMN IF EXISTS registration_enabled CASCADE;
ALTER TABLE IF EXISTS app_settings DROP COLUMN IF EXISTS email_registration_enabled CASCADE;
ALTER TABLE IF EXISTS app_settings DROP COLUMN IF EXISTS free_daily_points_enabled CASCADE;
ALTER TABLE IF EXISTS app_settings DROP COLUMN IF EXISTS free_daily_points CASCADE;
ALTER TABLE IF EXISTS app_settings DROP COLUMN IF EXISTS mail CASCADE;
ALTER TABLE IF EXISTS app_settings DROP COLUMN IF EXISTS model_point_costs CASCADE;
ALTER TABLE IF EXISTS app_settings DROP COLUMN IF EXISTS generation_point_multipliers CASCADE;
ALTER TABLE IF EXISTS app_settings DROP COLUMN IF EXISTS generation_cost_control CASCADE;
ALTER TABLE IF EXISTS app_settings DROP COLUMN IF EXISTS entitlements_enabled CASCADE;
ALTER TABLE IF EXISTS app_settings DROP COLUMN IF EXISTS default_plan_id CASCADE;
ALTER TABLE IF EXISTS app_settings DROP COLUMN IF EXISTS payment_config CASCADE;
ALTER TABLE IF EXISTS app_settings DROP COLUMN IF EXISTS allow_user_api_config CASCADE;

DROP TABLE IF EXISTS vozeb_pro_check_ins CASCADE;
DROP TABLE IF EXISTS vozeb_pro_billing_reconciliation_rows CASCADE;
DROP TABLE IF EXISTS vozeb_pro_billing_reconciliation_runs CASCADE;
DROP TABLE IF EXISTS vozeb_pro_payment_provider_events CASCADE;
DROP TABLE IF EXISTS vozeb_pro_payment_transactions CASCADE;
DROP TABLE IF EXISTS vozeb_pro_billing_refund_jobs CASCADE;
DROP TABLE IF EXISTS vozeb_pro_coupon_redemptions CASCADE;
DROP TABLE IF EXISTS vozeb_pro_user_coupons CASCADE;
DROP TABLE IF EXISTS vozeb_pro_coupon_template_products CASCADE;
DROP TABLE IF EXISTS vozeb_pro_coupon_templates CASCADE;
DROP TABLE IF EXISTS vozeb_pro_promotion_products CASCADE;
DROP TABLE IF EXISTS vozeb_pro_promotion_campaigns CASCADE;
DROP TABLE IF EXISTS vozeb_pro_billing_orders CASCADE;
DROP TABLE IF EXISTS vozeb_pro_billing_products CASCADE;
DROP TABLE IF EXISTS vozeb_pro_referral_rewards CASCADE;
DROP TABLE IF EXISTS vozeb_pro_referral_relationships CASCADE;
DROP TABLE IF EXISTS vozeb_pro_referral_codes CASCADE;
DROP TABLE IF EXISTS vozeb_pro_referral_programs CASCADE;
DROP TABLE IF EXISTS vozeb_pro_published_work_likes CASCADE;
DROP TABLE IF EXISTS vozeb_pro_published_work_cases CASCADE;
DROP TABLE IF EXISTS vozeb_pro_published_work_assets CASCADE;
DROP TABLE IF EXISTS vozeb_pro_published_work_versions CASCADE;
DROP TABLE IF EXISTS vozeb_pro_published_works CASCADE;
DROP TABLE IF EXISTS vozeb_pro_user_follows CASCADE;
DROP TABLE IF EXISTS vozeb_pro_user_blocks CASCADE;
DROP TABLE IF EXISTS vozeb_pro_user_notifications CASCADE;
DROP TABLE IF EXISTS vozeb_pro_cdk_redemptions CASCADE;
DROP TABLE IF EXISTS vozeb_pro_cdk_codes CASCADE;
DROP TABLE IF EXISTS vozeb_pro_announcements CASCADE;
DROP TABLE IF EXISTS vozeb_pro_daily_plan_point_wallets CASCADE;
DROP TABLE IF EXISTS vozeb_pro_user_plan_assignments CASCADE;
DROP TABLE IF EXISTS vozeb_pro_point_records CASCADE;
DROP TABLE IF EXISTS vozeb_pro_quota_usage CASCADE;
DROP TABLE IF EXISTS vozeb_pro_email_codes CASCADE;
DROP TABLE IF EXISTS vozeb_pro_account_deletion_requests CASCADE;
DROP TABLE IF EXISTS vozeb_pro_sessions CASCADE;
DROP TABLE IF EXISTS vozeb_pro_entitlement_plans CASCADE;

CREATE TABLE IF NOT EXISTS app_settings (
    id text PRIMARY KEY DEFAULT 'default',
    site jsonb NOT NULL DEFAULT '{}'::jsonb,
    data_lifecycle jsonb NOT NULL DEFAULT '{}'::jsonb,
    generation_concurrency jsonb NOT NULL DEFAULT '{}'::jsonb,
    generation_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
    logical_models jsonb NOT NULL DEFAULT '[]'::jsonb,
    default_models jsonb NOT NULL DEFAULT '{}'::jsonb,
    agent_skills jsonb NOT NULL DEFAULT '${DEFAULT_AGENT_SKILLS_JSON}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT app_settings_singleton CHECK (id = 'default')
);

INSERT INTO app_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS agent_skills jsonb NOT NULL DEFAULT '${DEFAULT_AGENT_SKILLS_JSON}'::jsonb;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS logical_models jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS data_lifecycle jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS system_model_channels (
    id text PRIMARY KEY,
    name text NOT NULL,
    base_url text NOT NULL DEFAULT '',
    api_key_ciphertext text NOT NULL DEFAULT '',
    webhook_secret_ciphertext text NOT NULL DEFAULT '',
    api_format text NOT NULL DEFAULT 'openai',
    models jsonb NOT NULL DEFAULT '[]'::jsonb,
    enabled boolean NOT NULL DEFAULT true,
    advanced_config jsonb,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT system_model_channels_api_format CHECK (api_format IN ('openai', 'gemini'))
);
ALTER TABLE system_model_channels ADD COLUMN IF NOT EXISTS webhook_secret_ciphertext text NOT NULL DEFAULT '';

CREATE SEQUENCE IF NOT EXISTS user_account_id_seq START WITH 1;

CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    account_id bigint NOT NULL DEFAULT nextval('user_account_id_seq'),
    username text NOT NULL,
    display_name text NOT NULL,
    bio text NOT NULL DEFAULT '',
    avatar_storage_key text,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_status CHECK (status IN ('active', 'disabled')),
    CONSTRAINT users_bio_length CHECK (char_length(bio) <= 160)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_storage_key text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_id bigint;

WITH sequence_state AS (
    SELECT CASE WHEN is_called THEN last_value ELSE 0 END AS reserved_max FROM user_account_id_seq
), current_state AS (
    SELECT greatest(coalesce(max(account_id), 0), (SELECT reserved_max FROM sequence_state)) AS assigned_max FROM users
), missing_accounts AS (
    SELECT id, (SELECT assigned_max FROM current_state) + row_number() OVER (ORDER BY created_at ASC, id ASC) AS next_account_id
    FROM users
    WHERE account_id IS NULL
)
UPDATE users
SET account_id = missing_accounts.next_account_id
FROM missing_accounts
WHERE users.id = missing_accounts.id;

ALTER TABLE users ALTER COLUMN account_id SET DEFAULT nextval('user_account_id_seq');
ALTER TABLE users ALTER COLUMN account_id SET NOT NULL;

SELECT setval(
    'user_account_id_seq',
    greatest((SELECT last_value FROM user_account_id_seq), coalesce((SELECT max(account_id) FROM users), 1)),
    (SELECT is_called FROM user_account_id_seq) OR EXISTS (SELECT 1 FROM users)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_bio_length') THEN
        ALTER TABLE users ADD CONSTRAINT users_bio_length CHECK (char_length(bio) <= 160);
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_account_id_idx ON users (account_id);

CREATE TABLE IF NOT EXISTS rate_limits (
    key_hash text PRIMARY KEY,
    request_count integer NOT NULL DEFAULT 0,
    reset_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limits_reset_idx ON rate_limits (reset_at);

CREATE TABLE IF NOT EXISTS generation_tasks (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_type text NOT NULL,
    status text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    CONSTRAINT generation_tasks_type CHECK (task_type IN ('text', 'image', 'video', 'audio', 'agent', 'render')),
    CONSTRAINT generation_tasks_status CHECK (status IN ('pending', 'running', 'success', 'error', 'paused', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS generation_tasks_user_status_idx ON generation_tasks (user_id, task_type, status, updated_at DESC);
ALTER TABLE generation_tasks DROP CONSTRAINT IF EXISTS generation_tasks_type;
ALTER TABLE generation_tasks ADD CONSTRAINT generation_tasks_type CHECK (task_type IN ('text', 'image', 'video', 'audio', 'agent', 'render'));
ALTER TABLE generation_tasks DROP CONSTRAINT IF EXISTS generation_tasks_status;
ALTER TABLE generation_tasks ADD CONSTRAINT generation_tasks_status CHECK (status IN ('pending', 'running', 'success', 'error', 'paused', 'cancelled'));
CREATE INDEX IF NOT EXISTS generation_tasks_expires_idx ON generation_tasks (expires_at);
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS conversation_id text;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS run_id text;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS surface text;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS project_id text;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS parent_task_id text;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS attempt_no integer;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS client_request_id text;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS execution_phase text NOT NULL DEFAULT 'created';
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS upstream_task_id text;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS channel_id text;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS query_path text;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS next_poll_at timestamptz;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS last_poll_at timestamptz;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS last_upstream_status text;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS result_payload jsonb;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS worker_id text;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS lease_until timestamptz;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz;
ALTER TABLE generation_tasks DROP CONSTRAINT IF EXISTS generation_tasks_execution_phase;
ALTER TABLE generation_tasks ADD CONSTRAINT generation_tasks_execution_phase CHECK (execution_phase IN ('created', 'submitting', 'submitted', 'polling', 'result_ready', 'persisting', 'cancel_requested', 'cancel_polling', 'needs_review', 'review_pending', 'reviewing', 'review_unavailable', 'completed'));

DROP INDEX IF EXISTS generation_tasks_user_client_request_idx;
CREATE UNIQUE INDEX generation_tasks_user_client_request_idx ON generation_tasks (user_id, task_type, client_request_id, COALESCE(attempt_no, 0)) WHERE client_request_id IS NOT NULL AND client_request_id <> '';
CREATE UNIQUE INDEX IF NOT EXISTS generation_tasks_channel_upstream_idx ON generation_tasks (channel_id, upstream_task_id) WHERE channel_id IS NOT NULL AND channel_id <> '' AND upstream_task_id IS NOT NULL AND upstream_task_id <> '';
CREATE INDEX IF NOT EXISTS generation_tasks_conversation_idx ON generation_tasks (conversation_id, updated_at DESC) WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS generation_tasks_run_idx ON generation_tasks (run_id, updated_at DESC) WHERE run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS generation_tasks_user_project_idx ON generation_tasks (user_id, project_id, task_type, status) WHERE project_id IS NOT NULL;
DROP INDEX IF EXISTS generation_tasks_recovery_due_idx;
CREATE INDEX generation_tasks_recovery_due_idx ON generation_tasks (next_poll_at, lease_until, id) WHERE (status IN ('pending', 'running') AND execution_phase IN ('created', 'submitting', 'submitted', 'polling', 'result_ready', 'persisting')) OR (status = 'cancelled' AND execution_phase IN ('cancel_requested', 'cancel_polling')) OR (task_type = 'agent' AND status = 'success' AND execution_phase IN ('review_pending', 'reviewing'));

CREATE TABLE IF NOT EXISTS generation_concurrency_reservations (
    user_id text NOT NULL,
    task_type text NOT NULL,
    request_id text NOT NULL,
    expires_at timestamptz NOT NULL,
    PRIMARY KEY (user_id, task_type, request_id),
    CONSTRAINT generation_concurrency_reservations_type CHECK (task_type IN ('text', 'image', 'video', 'audio', 'agent', 'render'))
);
CREATE INDEX IF NOT EXISTS generation_concurrency_reservations_expires_idx ON generation_concurrency_reservations (expires_at);

CREATE TABLE IF NOT EXISTS generation_worker_heartbeats (
    worker_id text PRIMARY KEY,
    last_seen_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS generation_worker_heartbeats_seen_idx ON generation_worker_heartbeats (last_seen_at DESC);

CREATE TABLE IF NOT EXISTS generation_webhook_events (
    channel_id text NOT NULL,
    event_id text NOT NULL,
    upstream_task_id text NOT NULL,
    task_id text,
    task_type text,
    payload_hash text NOT NULL,
    signature_timestamp timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'received',
    conflict_count integer NOT NULL DEFAULT 0,
    last_conflict_payload_hash text,
    last_conflict_at timestamptz,
    received_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    PRIMARY KEY (channel_id, event_id)
);

ALTER TABLE generation_webhook_events ADD COLUMN IF NOT EXISTS signature_timestamp timestamptz;
UPDATE generation_webhook_events SET signature_timestamp = COALESCE(signature_timestamp, received_at) WHERE signature_timestamp IS NULL;
ALTER TABLE generation_webhook_events ALTER COLUMN signature_timestamp SET NOT NULL;
ALTER TABLE generation_webhook_events ADD COLUMN IF NOT EXISTS conflict_count integer NOT NULL DEFAULT 0;
ALTER TABLE generation_webhook_events ADD COLUMN IF NOT EXISTS last_conflict_payload_hash text;
ALTER TABLE generation_webhook_events ADD COLUMN IF NOT EXISTS last_conflict_at timestamptz;

CREATE INDEX IF NOT EXISTS generation_webhook_events_received_idx ON generation_webhook_events (received_at DESC);

CREATE TABLE IF NOT EXISTS creative_conversations (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    surface text NOT NULL,
    source text NOT NULL DEFAULT 'agent',
    project_id text,
    title text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'active',
    context_summary text NOT NULL DEFAULT '',
    context_summary_through_sequence integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    last_message_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT creative_conversations_surface CHECK (surface IN ('chat', 'canvas', 'drama')),
    CONSTRAINT creative_conversations_source CHECK (source IN ('agent', 'image-workbench', 'video-workbench', 'canvas', 'drama')),
    CONSTRAINT creative_conversations_status CHECK (status IN ('active', 'archived'))
);
ALTER TABLE creative_conversations ADD COLUMN IF NOT EXISTS context_summary text NOT NULL DEFAULT '';
ALTER TABLE creative_conversations ADD COLUMN IF NOT EXISTS context_summary_through_sequence integer NOT NULL DEFAULT 0;
ALTER TABLE creative_conversations ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'agent';
UPDATE creative_conversations SET source = surface WHERE surface IN ('canvas', 'drama') AND source = 'agent';

CREATE INDEX IF NOT EXISTS creative_conversations_user_updated_idx ON creative_conversations (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS creative_conversations_user_source_idx ON creative_conversations (user_id, surface, source, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS creative_conversations_project_idx ON creative_conversations (user_id, surface, project_id, updated_at DESC) WHERE project_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS creative_messages (
    id text PRIMARY KEY,
    conversation_id text NOT NULL REFERENCES creative_conversations(id) ON DELETE CASCADE,
    sequence integer NOT NULL,
    role text NOT NULL,
    status text NOT NULL,
    content text NOT NULL DEFAULT '',
    run_id text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT creative_messages_role CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    CONSTRAINT creative_messages_status CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    CONSTRAINT creative_messages_sequence CHECK (sequence > 0),
    UNIQUE (conversation_id, sequence)
);

CREATE INDEX IF NOT EXISTS creative_messages_conversation_sequence_idx ON creative_messages (conversation_id, sequence ASC);
CREATE INDEX IF NOT EXISTS creative_messages_run_idx ON creative_messages (run_id) WHERE run_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS creative_assets (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id text NOT NULL REFERENCES creative_conversations(id) ON DELETE CASCADE,
    message_id text REFERENCES creative_messages(id) ON DELETE SET NULL,
    source_run_id text,
    source_task_id text,
    parent_asset_id text REFERENCES creative_assets(id) ON DELETE SET NULL,
    ordinal integer NOT NULL DEFAULT 0,
    type text NOT NULL,
    status text NOT NULL DEFAULT 'ready',
    title text NOT NULL DEFAULT '',
    text_content text,
    storage_kind text,
    storage_key text,
    remote_url text,
    server_url text,
    mime_type text,
    width integer,
    height integer,
    duration_ms integer,
    bytes bigint,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT creative_assets_type CHECK (type IN ('text', 'image', 'video', 'audio')),
    CONSTRAINT creative_assets_status CHECK (status IN ('ready', 'failed', 'deleted')),
    CONSTRAINT creative_assets_storage_kind CHECK (storage_kind IS NULL OR storage_kind IN ('local', 'object', 'remote')),
    UNIQUE (source_run_id, source_task_id, ordinal)
);

CREATE INDEX IF NOT EXISTS creative_assets_conversation_idx ON creative_assets (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS creative_assets_run_idx ON creative_assets (source_run_id, ordinal ASC) WHERE source_run_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS local_media_assets (
    storage_key text PRIMARY KEY,
    scope text NOT NULL,
    storage_class text NOT NULL,
    type text NOT NULL,
    owner_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_name text,
    source text NOT NULL DEFAULT '',
    conversation_id text,
    run_id text,
    task_id text,
    project_id text,
    mime_type text NOT NULL DEFAULT '',
    bytes bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    CONSTRAINT local_media_assets_scope CHECK (scope IN ('generation', 'reference')),
    CONSTRAINT local_media_assets_class CHECK (storage_class IN ('temporary', 'permanent')),
    CONSTRAINT local_media_assets_type CHECK (type IN ('image', 'video', 'audio'))
);

CREATE INDEX IF NOT EXISTS local_media_assets_owner_created_idx ON local_media_assets (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS local_media_assets_source_idx ON local_media_assets (source, created_at DESC);
CREATE INDEX IF NOT EXISTS local_media_assets_expires_idx ON local_media_assets (expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE local_media_assets ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'local';
ALTER TABLE local_media_assets ADD COLUMN IF NOT EXISTS external_storage_id text;
ALTER TABLE local_media_assets ADD COLUMN IF NOT EXISTS external_object_key text;
ALTER TABLE local_media_assets ADD COLUMN IF NOT EXISTS external_synced_at timestamptz;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'local_media_assets_storage_provider_check') THEN
        ALTER TABLE local_media_assets ADD CONSTRAINT local_media_assets_storage_provider_check CHECK (storage_provider IN ('local', 'object'));
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS local_media_assets_external_object_idx ON local_media_assets (external_storage_id, external_object_key) WHERE external_object_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS local_media_assets_local_created_idx ON local_media_assets (created_at DESC) WHERE storage_provider = 'local';
CREATE INDEX IF NOT EXISTS local_media_assets_local_filter_idx ON local_media_assets (storage_class, type, created_at DESC) WHERE storage_provider = 'local';

CREATE TABLE IF NOT EXISTS object_storage_settings (
    id text PRIMARY KEY DEFAULT 'default',
    enabled boolean NOT NULL DEFAULT false,
    endpoint text NOT NULL DEFAULT '',
    region text NOT NULL DEFAULT 'us-east-1',
    bucket text NOT NULL DEFAULT '',
    prefix text NOT NULL DEFAULT 'vozeb-pro',
    access_key_id_ciphertext text NOT NULL DEFAULT '',
    secret_access_key_ciphertext text NOT NULL DEFAULT '',
    force_path_style boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT object_storage_settings_singleton CHECK (id = 'default')
);

INSERT INTO object_storage_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
    legacy_name text := 'local_' || 'media_assets';
    target_name text := 'vozeb_pro_' || legacy_name;
BEGIN
    IF to_regclass('public.' || legacy_name) IS NOT NULL AND to_regclass('public.' || target_name) IS NOT NULL THEN
        EXECUTE format(
            'INSERT INTO %I (storage_key, scope, storage_class, type, owner_user_id, original_name, source, conversation_id, run_id, task_id, project_id, mime_type, bytes, created_at, expires_at)
             SELECT storage_key, scope, storage_class, type, owner_user_id, original_name, source, conversation_id, run_id, task_id, project_id, mime_type, bytes, created_at, expires_at
             FROM %I
             ON CONFLICT (storage_key) DO NOTHING',
            target_name,
            legacy_name
        );
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS creative_run_events (
    id bigserial PRIMARY KEY,
    run_id text NOT NULL,
    type text NOT NULL,
    data jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creative_run_events_run_id_idx ON creative_run_events (run_id, id ASC);

CREATE TABLE IF NOT EXISTS canvas_projects (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title text NOT NULL,
    project_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS canvas_projects_user_updated_idx ON canvas_projects (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS library_assets (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind text NOT NULL,
    title text NOT NULL,
    asset_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT library_assets_kind CHECK (kind IN ('text', 'image', 'video', 'audio'))
);
ALTER TABLE library_assets DROP CONSTRAINT IF EXISTS library_assets_kind;
ALTER TABLE library_assets ADD CONSTRAINT library_assets_kind CHECK (kind IN ('text', 'image', 'video', 'audio'));

CREATE INDEX IF NOT EXISTS library_assets_user_updated_idx ON library_assets (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS drama_projects (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title text NOT NULL,
    status text NOT NULL DEFAULT 'active',
    project_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT drama_projects_status CHECK (status IN ('active', 'archived'))
);

CREATE INDEX IF NOT EXISTS drama_projects_user_updated_idx ON drama_projects (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS drama_project_versions (
    id text PRIMARY KEY,
    project_id text NOT NULL REFERENCES drama_projects(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version integer NOT NULL,
    reason text NOT NULL DEFAULT '',
    snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, version)
);

CREATE INDEX IF NOT EXISTS drama_project_versions_user_created_idx ON drama_project_versions (user_id, project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS prompts (
    id text PRIMARY KEY,
    scope text NOT NULL,
    owner_user_id text REFERENCES users(id) ON DELETE CASCADE,
    title text NOT NULL,
    cover_url text NOT NULL DEFAULT '',
    prompt text NOT NULL,
    tags jsonb NOT NULL DEFAULT '[]'::jsonb,
    category text NOT NULL DEFAULT '',
    preview text NOT NULL DEFAULT '',
    github_url text,
    source text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT prompts_scope CHECK (scope IN ('library', 'user'))
);

CREATE INDEX IF NOT EXISTS prompts_scope_updated_idx ON prompts (scope, updated_at DESC);
CREATE INDEX IF NOT EXISTS prompts_owner_updated_idx ON prompts (owner_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS prompts_tags_gin_idx ON prompts USING gin (tags);

CREATE TABLE IF NOT EXISTS prompt_seed_sources (
    source text PRIMARY KEY,
    imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generation_logs (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id text REFERENCES creative_conversations(id) ON DELETE SET NULL,
    username text NOT NULL,
    display_name text NOT NULL,
    kind text NOT NULL,
    source text NOT NULL,
    status text NOT NULL,
    title text NOT NULL,
    prompt text NOT NULL,
    model text NOT NULL DEFAULT '',
    summary text NOT NULL DEFAULT '',
    duration_ms integer NOT NULL DEFAULT 0,
    count integer NOT NULL DEFAULT 1,
    success_count integer NOT NULL DEFAULT 0,
    fail_count integer NOT NULL DEFAULT 0,
    request_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    task_id text,
    error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    CONSTRAINT generation_logs_kind CHECK (kind IN ('image', 'video')),
    CONSTRAINT generation_logs_status CHECK (status IN ('pending', 'success', 'failed'))
);
ALTER TABLE generation_logs ADD COLUMN IF NOT EXISTS conversation_id text REFERENCES creative_conversations(id) ON DELETE SET NULL;
ALTER TABLE generation_logs ADD COLUMN IF NOT EXISTS request_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
UPDATE creative_conversations AS conversation
SET source = CASE WHEN log.source = 'video-workbench' THEN 'video-workbench' ELSE 'image-workbench' END
FROM generation_logs AS log
WHERE conversation.id = log.conversation_id
  AND conversation.surface = 'chat'
  AND conversation.source = 'agent'
  AND log.source IN ('image-workbench', 'video-workbench');

CREATE INDEX IF NOT EXISTS generation_logs_user_created_idx ON generation_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS generation_logs_created_idx ON generation_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS generation_logs_admin_filter_idx ON generation_logs (kind, source, status, created_at DESC);
CREATE INDEX IF NOT EXISTS generation_logs_conversation_idx ON generation_logs (conversation_id, created_at DESC) WHERE conversation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS generation_log_assets (
    id bigserial PRIMARY KEY,
    generation_log_id text NOT NULL REFERENCES generation_logs(id) ON DELETE CASCADE,
    type text NOT NULL,
    url text NOT NULL,
    remote_url text,
    server_url text,
    mime_type text,
    width integer,
    height integer,
    bytes bigint,
    sort_order integer NOT NULL DEFAULT 0,
    CONSTRAINT generation_log_assets_type CHECK (type IN ('image', 'video'))
);

CREATE INDEX IF NOT EXISTS generation_log_assets_log_idx ON generation_log_assets (generation_log_id, sort_order);

CREATE TABLE IF NOT EXISTS audit_logs (
    id text PRIMARY KEY,
    action text NOT NULL,
    status text NOT NULL,
    actor_user_id text,
    actor_username text,
    actor_role text,
    actor_ip text,
    actor_user_agent text,
    target_type text,
    target_id text,
    target_label text,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT audit_logs_status CHECK (status IN ('success', 'failure')),
    CONSTRAINT audit_logs_actor_role CHECK (actor_role IS NULL OR actor_role IN ('admin', 'user'))
);

CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_actor_user_idx ON audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS audit_logs_target_idx ON audit_logs (target_type, target_id);

${POSTGRESQL_TRIGGER_SCHEMA_SQL}

INSERT INTO schema_migrations (version)
VALUES ('20260916_local_studio_schema')
ON CONFLICT (version) DO NOTHING;
`;
