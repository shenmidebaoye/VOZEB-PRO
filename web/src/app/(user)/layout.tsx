import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AuthUserHydrator } from "@/components/auth/auth-user-hydrator";
import { AppWorkspaceShell } from "@/components/layout/app-workspace-shell";
import { getAuthenticatedPageAccess } from "@/lib/server/page-access";

export const metadata: Metadata = {
    robots: { index: false, follow: false, noarchive: true, noimageindex: true, nosnippet: true },
};

export default async function UserLayout({ children }: { children: ReactNode }) {
    const access = await getAuthenticatedPageAccess();
    if (!access.user) redirect("/install");
    const user = access.user;

    return (
        <AuthUserHydrator
            user={{
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                bio: user.bio,
                avatarUrl: user.avatarUrl,
                status: user.status,
            }}
        >
            <AppWorkspaceShell>{children}</AppWorkspaceShell>
        </AuthUserHydrator>
    );
}
