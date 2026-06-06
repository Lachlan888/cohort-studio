import Link from "next/link";
import type { TaskMarkingPageData } from "../../lib/marking/get-task-marking-page-data";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { MarkerScoreForm } from "./marker-score-form";

type TaskMarkingPageProps = TaskMarkingPageData;

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not submitted";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatNumber(value: number | null) {
  if (value === null) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-AU", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMarkerRole(value: string) {
  return value === "marker_1" ? "Marker 1" : "Marker 2";
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function TaskMarkingPage({
  canManageAllScores,
  currentProfile,
  records,
  task,
}: TaskMarkingPageProps) {
  if (!currentProfile) {
    return (
      <Card as="section" className="border-amber-200 bg-amber-50">
        <Badge variant="warning">No active profile</Badge>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">
          Marking is not available for this account.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
          Sign-in has succeeded, but this account is not linked to an active
          staff profile for a school.
        </p>
      </Card>
    );
  }

  if (!task) {
    return (
      <Card as="section">
        <Badge variant="neutral">Task not visible</Badge>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">
          This task is not visible.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          The task was not found for your current school, or your active profile
          is not permitted to view it.
        </p>
        <Link
          className="mt-5 inline-flex text-sm font-medium text-teal-800 hover:text-teal-950"
          href="/subjects"
        >
          Back to subjects
        </Link>
      </Card>
    );
  }

  const taskOpenForMarking = task.status === "marking_open";

  return (
    <>
      <Card as="section">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">{formatStatus(task.status)}</Badge>
              <Badge variant="primary">
                Max {formatNumber(task.maxScore)}
              </Badge>
              {canManageAllScores ? (
                <Badge variant="warning">System admin view</Badge>
              ) : null}
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-slate-950">
              {task.name}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              {task.subjectTitle} · {task.subjectName} ·{" "}
              {task.year ?? "Unknown year"}
              {task.subjectType ? ` · ${task.subjectType}` : ""}
            </p>
            {task.description ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                {task.description}
              </p>
            ) : null}
          </div>
          <Link
            className="text-sm font-medium text-teal-800 hover:text-teal-950"
            href={`/subjects/${task.subjectId}/tasks`}
          >
            Back to task list
          </Link>
        </div>
      </Card>

      <Card as="section">
        <h2 className="text-xl font-semibold text-slate-950">Scoring rule</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Type
            </dt>
            <dd className="mt-1 text-sm text-slate-700">
              {task.scoreType ?? "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Max score
            </dt>
            <dd className="mt-1 text-sm text-slate-700">
              {formatNumber(task.maxScore)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Display max
            </dt>
            <dd className="mt-1 text-sm text-slate-700">
              {formatNumber(task.displayMaxScore)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Due
            </dt>
            <dd className="mt-1 text-sm text-slate-700">
              {formatDate(task.markingDueDate)}
            </dd>
          </div>
        </dl>
      </Card>

      {!taskOpenForMarking ? (
        <Card as="section" className="border-amber-200 bg-amber-50">
          <Badge variant="warning">Task not open for marking</Badge>
          <h2 className="mt-4 text-xl font-semibold text-slate-950">
            Scores cannot be entered yet.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
            The task must be published and in marking open status before markers
            can save or submit numeric scores.
          </p>
        </Card>
      ) : null}

      <Card as="section" className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-slate-950">
            Assigned records
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Only your assigned marker role is editable. Submitted scores are
            locked for this pass.
          </p>
        </div>

        {records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[78rem] border-collapse text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-6 py-3">
                    Student
                  </th>
                  <th className="border-b border-slate-200 px-6 py-3">Class</th>
                  <th className="border-b border-slate-200 px-6 py-3">Role</th>
                  <th className="border-b border-slate-200 px-6 py-3">
                    Status
                  </th>
                  <th className="border-b border-slate-200 px-6 py-3">Score</th>
                  <th className="border-b border-slate-200 px-6 py-3">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map((record) => {
                  const isEditable =
                    taskOpenForMarking &&
                    record.markerProfileId === currentProfile.id;

                  return (
                    <tr
                      key={`${record.studentTaskRecordId}:${record.markerRole}`}
                    >
                      <td className="px-6 py-4 align-top">
                        <p className="text-sm font-medium text-slate-950">
                          {record.studentName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {record.studentCode ?? "No student ID"}
                        </p>
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-slate-600">
                        {record.className}
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-slate-600">
                        <p>{formatMarkerRole(record.markerRole)}</p>
                        {canManageAllScores ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {record.markerDisplayName ?? "Unknown marker"}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <Badge
                          variant={
                            record.status === "submitted"
                              ? "primary"
                              : "neutral"
                          }
                        >
                          {formatStatus(record.status)}
                        </Badge>
                        {record.administrativeStatus !== "none" ? (
                          <p className="mt-2 text-xs text-slate-500">
                            {formatStatus(record.administrativeStatus)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <MarkerScoreForm
                          isEditable={isEditable}
                          maxScore={task.maxScore}
                          record={record}
                          taskId={task.id}
                        />
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-slate-600">
                        {formatDateTime(record.submittedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-10">
            <h3 className="text-base font-semibold text-slate-950">
              No assigned marking records.
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              You do not have an active Marker 1 or Marker 2 assignment for any
              generated student records on this task.
            </p>
          </div>
        )}
      </Card>
    </>
  );
}
