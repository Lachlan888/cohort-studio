import Link from "next/link";
import type { SubjectStudentsPageData } from "../../lib/subjects/get-subject-students-page-data";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { SubjectReadOnlyNotice } from "./subject-read-only-notice";
import { SubjectStatusBadge } from "./subject-status-badge";
import { SubjectStudentsTable } from "./subject-students-table";
import { SubjectWorkspaceNav } from "./subject-workspace-nav";

type SubjectStudentsPageProps = SubjectStudentsPageData;

export function SubjectStudentsPage({
  currentProfile,
  students,
  subject,
}: SubjectStudentsPageProps) {
  if (!currentProfile) {
    return (
      <Card as="section" className="border-amber-200 bg-amber-50">
        <Badge variant="warning">No active profile</Badge>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">
          This account is not provisioned for Cohort Studio.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
          Ask a system administrator to link your Supabase auth account to an
          active staff profile before viewing subject students.
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
      <SubjectWorkspaceNav active="students" subjectId={subject.id} />

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
      <SubjectStudentsTable students={students} />
    </>
  );
}
