import type { ReactNode } from "react";
import { getCurrentAuthContext } from "../../lib/auth/current-profile";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { ContentShell } from "./content-shell";
import { SideNav } from "./side-nav";
import { TopBar } from "./top-bar";

type AppShellProps = {
  activeHref?: string;
  children: ReactNode;
};

export async function AppShell({ activeHref, children }: AppShellProps) {
  const { profile, user } = await getCurrentAuthContext();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:grid lg:grid-cols-[16rem_1fr]">
      <SideNav activeHref={activeHref} />
      <div className="flex min-h-screen flex-col">
        <TopBar profile={profile} userEmail={user?.email ?? null} />
        <main className="flex flex-1">
          <ContentShell>
            {user && !profile ? (
              <Card as="section" className="border-amber-200 bg-amber-50">
                <Badge variant="warning">Account not provisioned</Badge>
                <h2 className="mt-4 text-xl font-semibold text-slate-950">
                  Your account is signed in but not active in Cohort Studio.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
                  Ask a system administrator to link {user.email} to an active
                  staff profile before using the app shell.
                </p>
              </Card>
            ) : null}
            {children}
          </ContentShell>
        </main>
      </div>
    </div>
  );
}
