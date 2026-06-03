import Link from "next/link";
import type { SubjectClassesPageData } from "../../lib/subjects/get-subject-classes-page-data";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { AdminClassSetupPanel } from "./admin-class-setup-panel";
import { SubjectClassesTable } from "./subject-classes-table";
import { SubjectReadOnlyNotice } from "./subject-read-only-notice";
import { SubjectStateCard } from "./subject-state-card";
import { SubjectStatusBadge } from "./subject-status-badge";
import { SubjectWorkspaceNav } from "./subject-workspace-nav";

type SubjectClassesPageProps = SubjectClassesPageData;

export function SubjectClassesPage({
  canAdminManageSubjectClasses,
  classes,
  currentProfile,
  subject,
}: SubjectClassesPageProps) {
  if (!currentProfile) {
    return (
      <SubjectStateCard
        badge="No active profile"
        description="Sign-in has succeeded, but this account is not linked to an active staff profile for a school. Ask a system administrator to complete staff provisioning before viewing subject classes."
        title="Subject classes are not available for this account."
      />
    );
  }

  if (!subject) {
    return (
      <SubjectStateCard
        badge="Subject not visible"
        description="This subject instance was not found for your current school, or your active profile is not permitted to view its classes."
        linkHref="/subjects"
        linkLabel="Back to subjects"
        title="Subject classes are not visible."
      />
    );
  }

  return (
    <>
      <SubjectWorkspaceNav active="classes" subjectId={subject.id} />

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

      <SubjectReadOnlyNotice description="This page displays class setup and enrolment summaries from Supabase. Creation, editing and imports are outside this read-only pass." />
      {canAdminManageSubjectClasses ? (
        <AdminClassSetupPanel subjectId={subject.id} />
      ) : null}
      <SubjectClassesTable classes={classes} />
    </>
  );
}
