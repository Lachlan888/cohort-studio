import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/layout/page-header";
import { PeopleSummaryCards } from "../../components/people/people-summary-cards";
import { PeopleTable } from "../../components/people/people-table";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { getPeoplePageData } from "../../lib/people/get-people-page-data";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const { currentProfile, people, summary } = await getPeoplePageData();

  return (
    <AppShell activeHref="/people">
      <PageHeader
        description={
          currentProfile
            ? `Read-only staff and global role visibility for ${currentProfile.school.name}.`
            : "Sign-in alone is not enough to access school staff data."
        }
        eyebrow="People and access"
        rightContent={
          currentProfile ? (
            <Badge variant="primary">{currentProfile.school.name}</Badge>
          ) : null
        }
        title="People"
      />

      {currentProfile ? (
        <>
          <PeopleSummaryCards summary={summary} />
          <PeopleTable people={people} />
        </>
      ) : (
        <Card as="section" className="border-amber-200 bg-amber-50">
          <Badge variant="warning">No active profile</Badge>
          <h2 className="mt-4 text-xl font-semibold text-slate-950">
            This account is not provisioned for Cohort Studio.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
            Ask a system administrator to link your Supabase auth account to an
            active staff profile before viewing school people and roles.
          </p>
        </Card>
      )}
    </AppShell>
  );
}
