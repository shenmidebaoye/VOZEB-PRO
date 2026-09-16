import { ensureLocalOwner } from "@/lib/auth/local-owner";
import { getInstallStatus } from "@/lib/server/install-status";

export async function getAuthenticatedPageAccess() {
    const install = await getInstallStatus();
    if (!install.ready) return { user: null, install };
    try {
        const user = await ensureLocalOwner();
        return { user, install: null };
    } catch {
        return { user: null, install };
    }
}
