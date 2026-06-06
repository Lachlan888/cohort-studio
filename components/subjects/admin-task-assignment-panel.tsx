"use client";

import { useActionState, useMemo, useState } from "react";
import {
  adminConfigureTaskAssignments,
  type AdminTaskAssignmentFormState,
} from "../../lib/subjects/admin-task-assignment-actions";
import type {
  SubjectTasksPageClass,
  SubjectTasksPageStaffProfile,
  SubjectTasksPageTask,
} from "../../lib/subjects/get-subject-tasks-page-data";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

type AdminTaskAssignmentPanelProps = {
  classes: SubjectTasksPageClass[];
  staffProfiles: SubjectTasksPageStaffProfile[];
  subjectId: string;
  tasks: SubjectTasksPageTask[];
};

type DraftTaskAssignmentFormProps = {
  activeClasses: SubjectTasksPageClass[];
  staffProfiles: SubjectTasksPageStaffProfile[];
  subjectId: string;
  task: SubjectTasksPageTask;
};

const initialState: AdminTaskAssignmentFormState = {
  error: null,
  success: null,
};

const selectClasses =
  "h-10 rounded border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100 disabled:text-slate-400";

function getAssignedClassIds(task: SubjectTasksPageTask) {
  return new Set(task.classAssignments.map((assignment) => assignment.classId));
}

function getAssignmentForClass(task: SubjectTasksPageTask, classId: string) {
  return (
    task.classAssignments.find((assignment) => assignment.classId === classId) ??
    null
  );
}

function DraftTaskAssignmentForm({
  activeClasses,
  staffProfiles,
  subjectId,
  task,
}: DraftTaskAssignmentFormProps) {
  const [state, formAction, pending] = useActionState(
    adminConfigureTaskAssignments,
    initialState,
  );
  const initialSelectedClassIds = useMemo(
    () => getAssignedClassIds(task),
    [task],
  );
  const [selectedClassIds, setSelectedClassIds] = useState(
    initialSelectedClassIds,
  );
  const selectedStudentCount = activeClasses
    .filter((classRow) => selectedClassIds.has(classRow.id))
    .reduce((total, classRow) => total + classRow.activeStudentCount, 0);

  function toggleClass(classId: string, selected: boolean) {
    setSelectedClassIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (selected) {
        nextIds.add(classId);
      } else {
        nextIds.delete(classId);
      }

      return nextIds;
    });
  }

  return (
    <form action={formAction} className="border-t border-slate-200 px-6 py-6">
      <input name="subject_instance_id" type="hidden" value={subjectId} />
      <input name="task_id" type="hidden" value={task.id} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="neutral">{task.status}</Badge>
            <Badge variant="primary">
              {task.requiredInitialMarkers ?? 2} initial markers
            </Badge>
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-950">
            {task.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {selectedClassIds.size} classes selected · {selectedStudentCount}{" "}
            active students in preview · {task.studentTaskRecordCount} student
            records already generated
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending}
            name="submit_intent"
            type="submit"
            value="save"
            variant="secondary"
          >
            {pending ? "Saving..." : "Save setup"}
          </Button>
          <Button
            disabled={pending}
            name="submit_intent"
            type="submit"
            value="publish"
          >
            {pending ? "Publishing..." : "Publish task"}
          </Button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[58rem] border-collapse text-left">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-4 py-3">Class</th>
              <th className="border-b border-slate-200 px-4 py-3">
                Active students
              </th>
              <th className="border-b border-slate-200 px-4 py-3">Marker 1</th>
              <th className="border-b border-slate-200 px-4 py-3">Marker 2</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {activeClasses.map((classRow) => {
              const selected = selectedClassIds.has(classRow.id);
              const assignment = getAssignmentForClass(task, classRow.id);

              return (
                <tr key={classRow.id}>
                  <td className="px-4 py-4 align-top">
                    <label className="flex items-center gap-3 text-sm font-medium text-slate-950">
                      <input
                        className="h-4 w-4 rounded border-slate-300"
                        defaultChecked={selected}
                        name="class_ids"
                        onChange={(event) =>
                          toggleClass(classRow.id, event.target.checked)
                        }
                        type="checkbox"
                        value={classRow.id}
                      />
                      {classRow.name}
                    </label>
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-slate-600">
                    {classRow.activeStudentCount}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <select
                      className={selectClasses}
                      defaultValue={assignment?.marker1ProfileId ?? ""}
                      disabled={!selected}
                      name={`marker_1_profile_id_${classRow.id}`}
                    >
                      <option value="">Choose Marker 1</option>
                      {staffProfiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.displayName} · {profile.email}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <select
                      className={selectClasses}
                      defaultValue={assignment?.marker2ProfileId ?? ""}
                      disabled={!selected}
                      name={`marker_2_profile_id_${classRow.id}`}
                    >
                      <option value="">Choose Marker 2</option>
                      {staffProfiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.displayName} · {profile.email}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {state.error ? (
        <p className="mt-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="mt-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}

export function AdminTaskAssignmentPanel({
  classes,
  staffProfiles,
  subjectId,
  tasks,
}: AdminTaskAssignmentPanelProps) {
  const draftTasks = tasks.filter((task) => task.status === "draft");
  const activeClasses = classes.filter((classRow) => classRow.status === "active");

  return (
    <Card as="section" className="overflow-hidden border-teal-200 bg-teal-50 p-0">
      <div className="px-6 py-5">
        <p className="text-sm font-semibold uppercase text-teal-800">
          System admin
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          Assign draft tasks to classes
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
          Select active classes, assign Marker 1 and Marker 2, then publish the
          draft task to generate student task records from active enrolments.
        </p>
      </div>

      {activeClasses.length === 0 ? (
        <div className="border-t border-slate-200 px-6 py-6">
          <h3 className="text-base font-semibold text-slate-950">
            No active classes are available.
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create an active class before assigning draft tasks.
          </p>
        </div>
      ) : staffProfiles.length === 0 ? (
        <div className="border-t border-slate-200 px-6 py-6">
          <h3 className="text-base font-semibold text-slate-950">
            No active staff profiles are available.
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Active staff profiles are required before assigning markers.
          </p>
        </div>
      ) : draftTasks.length === 0 ? (
        <div className="border-t border-slate-200 px-6 py-6">
          <h3 className="text-base font-semibold text-slate-950">
            No draft tasks are ready for assignment.
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create a draft numeric task before assigning classes and markers.
          </p>
        </div>
      ) : (
        draftTasks.map((task) => (
          <DraftTaskAssignmentForm
            activeClasses={activeClasses}
            key={task.id}
            staffProfiles={staffProfiles}
            subjectId={subjectId}
            task={task}
          />
        ))
      )}
    </Card>
  );
}
