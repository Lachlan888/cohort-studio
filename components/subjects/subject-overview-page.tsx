import Link from "next/link";
import type { SubjectOverviewPageData } from "../../lib/subjects/get-subject-overview-page-data";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { AdminStructureSetupPanel } from "./admin-structure-setup-panel";
import { SubjectClassesSummary } from "./subject-classes-summary";
import { SubjectOverviewCards } from "./subject-overview-cards";
import { SubjectReadOnlyNotice } from "./subject-read-only-notice";
import { SubjectStateCard } from "./subject-state-card";
import { SubjectStatusBadge } from "./subject-status-badge";
import { SubjectStructureSummary } from "./subject-structure-summary";
import { SubjectWorkspaceNav } from "./subject-workspace-nav";

type SubjectOverviewPageProps = SubjectOverviewPageData;

export function SubjectOverviewPage({
  canAdminManageSubjectStructure,
  currentProfile,
  subject,
}: SubjectOverviewPageProps) {
  if (!currentProfile) {
    return (
      <SubjectStateCard
        badge="No active profile"
        description="Sign-in has succeeded, but this account is not linked to an active staff profile for a school. Ask a system administrator to complete staff provisioning before viewing subject setup."
        title="Subject setup is not available for this account."
      />
    );
  }

  if (!subject) {
    return (
      <SubjectStateCard
        badge="Subject not visible"
        description="This subject instance was not found for your current school, or your active profile is not permitted to view it."
        linkHref="/subjects"
        linkLabel="Back to subjects"
        title="Subject instance is not visible."
      />
    );
  }

  return (
    <>
      <SubjectWorkspaceNav active="overview" subjectId={subject.id} />

      <Card as="section">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <SubjectStatusBadge status={subject.status} />
              {subject.role ? (
                <Badge variant="primary">{subject.role}</Badge>
              ) : null}
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-slate-950">
              {subject.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              {subject.subjectName} · {subject.year ?? "Unknown year"}
              {subject.subjectType ? ` · ${subject.subjectType}` : ""}
            </p>
          </div>
          <Link
            className="text-sm font-medium text-teal-800 hover:text-teal-950"
            href="/subjects"
          >
            Back to subjects
          </Link>
        </div>
      </Card>

      <SubjectReadOnlyNotice description="This overview displays subject structure, classes and enrolment totals from Supabase. Task setup is available from the Tasks tab." />
      <SubjectOverviewCards subject={subject} />
      {canAdminManageSubjectStructure ? (
        <AdminStructureSetupPanel
          subjectId={subject.id}
          units={subject.units}
        />
      ) : null}
      <SubjectStructureSummary units={subject.units} />
      <SubjectClassesSummary classes={subject.classes} />
    </>
  );
}
