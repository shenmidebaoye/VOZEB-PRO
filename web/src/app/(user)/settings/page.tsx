import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { parseAdminSection, resolveAdminSection } from "@/components/admin/admin-sections";
import { getFreshAuthSettings } from "@/lib/auth/store";
import { getAdminSetupSummary } from "@/lib/server/admin-setup-status";
import { serializeAdminSettingsForUser } from "@/lib/server/admin-channel-config";
import { getAuthenticatedPageAccess } from "@/lib/server/page-access";
import { redirect } from "next/navigation";

type SettingsPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
    const params = searchParams ? await searchParams : {};
    const requestedSection = parseAdminSection(params.section);
    const access = await getAuthenticatedPageAccess();
    if (!access.user) redirect("/install");
    const currentUser = access.user;
    const initialSection = resolveAdminSection(currentUser, requestedSection) || "channels";

    const settings = await getFreshAuthSettings();
    const setup = await getAdminSetupSummary({ settings });

    return (
        <div className="h-full min-h-0 overflow-hidden">
            <AdminDashboard
                initialSettings={serializeAdminSettingsForUser(settings, currentUser)}
                currentUser={currentUser}
                initialSection={initialSection}
                setupSummary={setup}
                headerActions={null}
            />
        </div>
    );
}
