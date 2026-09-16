import type { AuthSettings } from "@/lib/auth/store";

export function buildAdminSettingsPatch(settings: AuthSettings): Partial<AuthSettings> {
    return {
        generationConcurrency: settings.generationConcurrency,
        generationDefaults: settings.generationDefaults,
        dataLifecycle: settings.dataLifecycle,
    };
}
