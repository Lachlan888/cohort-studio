import type { ReactNode } from "react";
import { ContentShell } from "./content-shell";
import { SideNav } from "./side-nav";
import { TopBar } from "./top-bar";

type AppShellProps = {
  activeHref?: string;
  children: ReactNode;
};

export function AppShell({ activeHref, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:grid lg:grid-cols-[16rem_1fr]">
      <SideNav activeHref={activeHref} />
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <main className="flex flex-1">
          <ContentShell>{children}</ContentShell>
        </main>
      </div>
    </div>
  );
}
