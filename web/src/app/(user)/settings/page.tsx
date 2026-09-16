import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { parseAdminSection, resolveAdminSection } from "@/components/admin/admin-sections";
import { getFreshAuthSettings, getPublicUserSummary } from "@/lib/auth/store";
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

    const [settings, userSummary] = await Promise.all([getFreshAuthSettings(), getPublicUserSummary()]);
    const setup = await getAdminSetupSummary({ settings, userSummary });

    return (
        <div className="h-full min-h-0 overflow-hidden">
            <AdminDashboard
                initialUsers={[]}
                initialUserSummary={userSummary}
                initialSettings={serializeAdminSettingsForUser(settings, currentUser)}
                initialPromptCount={0}
                currentUser={currentUser}
                initialSection={initialSection}
                setupSummary={setup}
                headerActions={null}
            />
        </div>
    );
}
