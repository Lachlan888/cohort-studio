import Link from "next/link";
import type { SubjectOverviewPageData } from "../../lib/subjects/get-subject-overview-page-data";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { SubjectClassesSummary } from "./subject-classes-summary";
import { SubjectOverviewCards } from "./subject-overview-cards";
import { SubjectReadOnlyNotice } from "./subject-read-only-notice";
import { SubjectStatusBadge } from "./subject-status-badge";
import { SubjectStructureSummary } from "./subject-structure-summary";
import { SubjectWorkspaceNav } from "./subject-workspace-nav";

type SubjectOverviewPageProps = SubjectOverviewPageData;

export function SubjectOverviewPage({
  currentProfile,
  subject,
}: SubjectOverviewPageProps) {
  if (!currentProfile) {
    return (
      <Card as="section" className="border-amber-200 bg-amber-50">
        <Badge variant="warning">No active profile</Badge>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">
          This account is not provisioned for Cohort Studio.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
          Ask a system administrator to link your Supabase auth account to an
          active staff profile before viewing subject setup.
        </p>
      </Card>
    );
  }

  if (!subject) {
    return (
      <Card as="section">
        <Badge variant="warning">Not visible</Badge>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">
          Subject instance not found.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This subject instance may not exist, or your active profile may not
          have access to it.
        </p>
        <Link
          className="mt-6 inline-flex text-sm font-medium text-teal-800 hover:text-teal-950"
          href="/subjects"
        >
          Back to subjects
        </Link>
      </Card>
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
              {subject.role ? <Badge variant="primary">{subject.role}</Badge> : null}
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-slate-950">
              {subject.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              {subject.subjectName} · {subject.academicYearLabel}
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

      <SubjectReadOnlyNotice />
      <SubjectOverviewCards subject={subject} />
      <SubjectStructureSummary units={subject.units} />
      <SubjectClassesSummary classes={subject.classes} />
    </>
  );
}
