import type { SubjectTasksPageTask } from "../../lib/subjects/get-subject-tasks-page-data";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";

type SubjectTasksTableProps = {
  canAdminManageSubjectTasks: boolean;
  tasks: SubjectTasksPageTask[];
};

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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
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

function formatModerationPathway(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SubjectTasksTable({
  canAdminManageSubjectTasks,
  tasks,
}: SubjectTasksTableProps) {
  return (
    <Card as="section" className="overflow-hidden p-0">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-semibold text-slate-950">Tasks</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Draft numeric task setup records for this subject instance.
        </p>
      </div>

      {tasks.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[82rem] border-collapse text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-6 py-3">Task</th>
                <th className="border-b border-slate-200 px-6 py-3">
                  Unit / outcome
                </th>
                <th className="border-b border-slate-200 px-6 py-3">Status</th>
                <th className="border-b border-slate-200 px-6 py-3">Type</th>
                <th className="border-b border-slate-200 px-6 py-3">Score</th>
                <th className="border-b border-slate-200 px-6 py-3">
                  Moderation
                </th>
                <th className="border-b border-slate-200 px-6 py-3">Dates</th>
                <th className="border-b border-slate-200 px-6 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-6 py-4 align-top">
                    <p className="text-sm font-medium text-slate-950">
                      {task.name}
                    </p>
                    {task.description ? (
                      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                        {task.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 align-top text-sm text-slate-600">
                    <p>{task.unitName ?? "No unit"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {task.outcomeName ?? "No outcome"}
                    </p>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <Badge variant="neutral">{task.status}</Badge>
                  </td>
                  <td className="px-6 py-4 align-top text-sm text-slate-600">
                    {task.taskType}
                  </td>
                  <td className="px-6 py-4 align-top text-sm text-slate-600">
                    <p>Max: {formatNumber(task.maxScore)}</p>
                    {task.displayMaxScore !== null &&
                    task.displayMaxScore !== task.maxScore ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Display: {formatNumber(task.displayMaxScore)}
                      </p>
                    ) : null}
                    {task.passThreshold !== null ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Pass: {formatNumber(task.passThreshold)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 align-top text-sm text-slate-600">
                    <p>Variance: {formatNumber(task.varianceThreshold)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Markers: {task.requiredInitialMarkers ?? "Not set"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatModerationPathway(task.moderationPathway)}
                    </p>
                  </td>
                  <td className="px-6 py-4 align-top text-sm text-slate-600">
                    <p>Task: {formatDate(task.taskDate)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Due: {formatDate(task.markingDueDate)}
                    </p>
                  </td>
                  <td className="px-6 py-4 align-top text-sm text-slate-600">
                    {formatDateTime(task.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-10">
          <h3 className="text-base font-semibold text-slate-950">
            No tasks have been set up yet.
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {canAdminManageSubjectTasks
              ? "Create the first draft numeric task using the setup panel above."
              : "Tasks will appear here once a system admin has created draft task setup records."}
          </p>
        </div>
      )}
    </Card>
  );
}
