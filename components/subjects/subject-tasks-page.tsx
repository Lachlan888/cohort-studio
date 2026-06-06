import Link from "next/link";
import type { SubjectTasksPageData } from "../../lib/subjects/get-subject-tasks-page-data";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { AdminTaskAssignmentPanel } from "./admin-task-assignment-panel";
import { AdminTaskSetupPanel } from "./admin-task-setup-panel";
import { SubjectReadOnlyNotice } from "./subject-read-only-notice";
import { SubjectStateCard } from "./subject-state-card";
import { SubjectStatusBadge } from "./subject-status-badge";
import { SubjectTasksTable } from "./subject-tasks-table";
import { SubjectWorkspaceNav } from "./subject-workspace-nav";

type SubjectTasksPageProps = SubjectTasksPageData;

export function SubjectTasksPage({
  canAdminManageSubjectTasks,
  classes,
  currentProfile,
  outcomes,
  staffProfiles,
  subject,
  tasks,
  units,
}: SubjectTasksPageProps) {
  if (!currentProfile) {
    return (
      <SubjectStateCard
        badge="No active profile"
        description="Sign-in has succeeded, but this account is not linked to an active staff profile for a school. Ask a system administrator to complete staff provisioning before viewing subject tasks."
        title="Subject tasks are not available for this account."
      />
    );
  }

  if (!subject) {
    return (
      <SubjectStateCard
        badge="Subject not visible"
        description="This subject instance was not found for your current school, or your active profile is not permitted to view its tasks."
        linkHref="/subjects"
        linkLabel="Back to subjects"
        title="Subject tasks are not visible."
      />
    );
  }

  return (
    <>
      <SubjectWorkspaceNav active="tasks" subjectId={subject.id} />

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

      <SubjectReadOnlyNotice
        description={
          canAdminManageSubjectTasks
            ? "This page displays task setup records from Supabase. System admins can create draft tasks, assign classes and markers, and publish tasks for marking."
            : "This page displays task setup records from Supabase. Task setup, assignment and publishing are restricted to system admins."
        }
      />
      {canAdminManageSubjectTasks ? (
        <>
          <AdminTaskSetupPanel
            outcomes={outcomes}
            subjectId={subject.id}
            units={units}
          />
          <AdminTaskAssignmentPanel
            classes={classes}
            staffProfiles={staffProfiles}
            subjectId={subject.id}
            tasks={tasks}
          />
        </>
      ) : null}
      <SubjectTasksTable
        canAdminManageSubjectTasks={canAdminManageSubjectTasks}
        tasks={tasks}
      />
    </>
  );
}
