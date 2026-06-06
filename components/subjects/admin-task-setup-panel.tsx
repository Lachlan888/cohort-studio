"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  adminCreateDraftNumericTask,
  type AdminTaskSetupFormState,
} from "../../lib/subjects/admin-task-setup-actions";
import type {
  SubjectTasksPageOutcome,
  SubjectTasksPageUnit,
} from "../../lib/subjects/get-subject-tasks-page-data";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

type AdminTaskSetupPanelProps = {
  outcomes: SubjectTasksPageOutcome[];
  subjectId: string;
  units: SubjectTasksPageUnit[];
};

const initialState: AdminTaskSetupFormState = {
  error: null,
  success: null,
};

const fieldClasses =
  "h-11 rounded border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

const textareaClasses =
  "min-h-24 rounded border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function AdminTaskSetupPanel({
  outcomes,
  subjectId,
  units,
}: AdminTaskSetupPanelProps) {
  const [state, formAction, pending] = useActionState(
    adminCreateDraftNumericTask,
    initialState,
  );
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const filteredOutcomes = useMemo(
    () =>
      selectedUnitId
        ? outcomes.filter((outcome) => outcome.unitId === selectedUnitId)
        : outcomes,
    [outcomes, selectedUnitId],
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setSelectedUnitId("");
    }
  }, [state.success]);

  return (
    <Card as="section" className="border-teal-200 bg-teal-50">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase text-teal-800">
          System admin
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          Create draft numeric task
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Create the task setup record and its numeric scoring and moderation
          rules. Tasks remain draft until they are assigned to classes and
          published below.
        </p>
      </div>

      <form action={formAction} className="mt-6 grid gap-6" ref={formRef}>
        <input name="subject_instance_id" type="hidden" value={subjectId} />

        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="task_name"
            >
              Task name
            </label>
            <input
              className={fieldClasses}
              id="task_name"
              name="task_name"
              placeholder="Analytical response"
              type="text"
            />
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="task_type"
            >
              Task type
            </label>
            <input
              className={fieldClasses}
              defaultValue="assessment"
              id="task_type"
              name="task_type"
              type="text"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-slate-800"
            htmlFor="task_description"
          >
            Description
          </label>
          <textarea
            className={textareaClasses}
            id="task_description"
            name="task_description"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="unit_id"
            >
              Unit
            </label>
            <select
              className={fieldClasses}
              id="unit_id"
              name="unit_id"
              onChange={(event) => setSelectedUnitId(event.target.value)}
            >
              <option value="">No unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="outcome_id"
            >
              Outcome
            </label>
            <select className={fieldClasses} id="outcome_id" name="outcome_id">
              <option value="">No outcome</option>
              {filteredOutcomes.map((outcome) => (
                <option key={outcome.id} value={outcome.id}>
                  {outcome.unitName} · {outcome.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="max_score"
            >
              Maximum score
            </label>
            <input
              className={fieldClasses}
              id="max_score"
              inputMode="decimal"
              name="max_score"
              placeholder="100"
              type="text"
            />
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="display_max_score"
            >
              Display maximum
            </label>
            <input
              className={fieldClasses}
              id="display_max_score"
              inputMode="decimal"
              name="display_max_score"
              placeholder="Defaults to maximum score"
              type="text"
            />
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="pass_threshold"
            >
              Pass threshold
            </label>
            <input
              className={fieldClasses}
              id="pass_threshold"
              inputMode="decimal"
              name="pass_threshold"
              type="text"
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="variance_threshold"
            >
              Variance threshold
            </label>
            <input
              className={fieldClasses}
              id="variance_threshold"
              inputMode="decimal"
              name="variance_threshold"
              placeholder="5"
              type="text"
            />
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="required_initial_markers"
            >
              Initial markers
            </label>
            <input
              className={fieldClasses}
              defaultValue="2"
              id="required_initial_markers"
              inputMode="numeric"
              name="required_initial_markers"
              type="text"
            />
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="moderation_pathway"
            >
              Moderation pathway
            </label>
            <select
              className={fieldClasses}
              defaultValue="third_marker_required"
              id="moderation_pathway"
              name="moderation_pathway"
            >
              <option value="third_marker_required">
                Third marker required
              </option>
              <option value="manual_review">Manual review</option>
              <option value="within_tolerance_only">
                Within tolerance only
              </option>
            </select>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="task_date"
            >
              Task date
            </label>
            <input
              className={fieldClasses}
              id="task_date"
              name="task_date"
              type="date"
            />
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="marking_due_date"
            >
              Marking due date
            </label>
            <input
              className={fieldClasses}
              id="marking_due_date"
              name="marking_due_date"
              type="date"
            />
          </div>
        </div>

        {state.error ? (
          <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
            {state.success}
          </p>
        ) : null}

        <div>
          <Button disabled={pending} type="submit">
            {pending ? "Creating..." : "Create draft task"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
