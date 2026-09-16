import { getAuthSettings } from "@/lib/auth/store";
import { cleanupExpiredStoredGenerationTasks } from "@/lib/server/generation-task-store";
import { cleanupExpiredLocalMediaAssets } from "@/lib/server/local-media-storage";

export type DataLifecycleMaintenanceResult = {
    generationTasks: number;
    temporaryMedia: {
        deletedFiles: number;
        deletedBytes: number;
        blocked: Array<{ id: string; storageKey: string; referenceCount: number }>;
    };
};

export async function runDataLifecycleMaintenance(): Promise<DataLifecycleMaintenanceResult> {
    const { dataLifecycle } = await getAuthSettings();
    const emptyMedia = { deletedFiles: 0, deletedBytes: 0, blocked: [] };
    const [generationTasks, temporaryMedia] = await Promise.all([
        dataLifecycle.cleanupExpiredGenerationTasks ? cleanupExpiredStoredGenerationTasks({ limit: dataLifecycle.maintenanceBatchSize }) : Promise.resolve(0),
        dataLifecycle.cleanupExpiredTemporaryMedia ? cleanupExpiredLocalMediaAssets(dataLifecycle.maintenanceBatchSize) : Promise.resolve(emptyMedia),
    ]);
    return { generationTasks, temporaryMedia };
}
