export const POSTGRESQL_TRIGGER_SCHEMA_SQL = `
DROP TRIGGER IF EXISTS app_settings_set_updated_at ON app_settings;
CREATE TRIGGER app_settings_set_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION vozeb_pro_set_updated_at();

DROP TRIGGER IF EXISTS system_model_channels_set_updated_at ON system_model_channels;
CREATE TRIGGER system_model_channels_set_updated_at BEFORE UPDATE ON system_model_channels FOR EACH ROW EXECUTE FUNCTION vozeb_pro_set_updated_at();

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION vozeb_pro_set_updated_at();

DROP TRIGGER IF EXISTS prompts_set_updated_at ON prompts;
CREATE TRIGGER prompts_set_updated_at BEFORE UPDATE ON prompts FOR EACH ROW EXECUTE FUNCTION vozeb_pro_set_updated_at();

DROP TRIGGER IF EXISTS drama_projects_set_updated_at ON drama_projects;
CREATE TRIGGER drama_projects_set_updated_at BEFORE UPDATE ON drama_projects FOR EACH ROW EXECUTE FUNCTION vozeb_pro_set_updated_at();

DROP TRIGGER IF EXISTS generation_logs_set_updated_at ON generation_logs;
CREATE TRIGGER generation_logs_set_updated_at BEFORE UPDATE ON generation_logs FOR EACH ROW EXECUTE FUNCTION vozeb_pro_set_updated_at();

DROP TRIGGER IF EXISTS object_storage_settings_set_updated_at ON object_storage_settings;
CREATE TRIGGER object_storage_settings_set_updated_at BEFORE UPDATE ON object_storage_settings FOR EACH ROW EXECUTE FUNCTION vozeb_pro_set_updated_at();
`;
