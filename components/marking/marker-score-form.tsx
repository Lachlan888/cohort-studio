"use client";

import { useActionState } from "react";
import {
  saveMarkerScore,
  type MarkerScoreFormState,
} from "../../lib/marking/marker-score-actions";
import type { TaskMarkingPageRecord } from "../../lib/marking/get-task-marking-page-data";
import { Button } from "../ui/button";

type MarkerScoreFormProps = {
  isEditable: boolean;
  maxScore: number | null;
  record: TaskMarkingPageRecord;
  taskId: string;
};

const initialState: MarkerScoreFormState = {
  error: null,
  success: null,
};

function formatScore(value: number | null) {
  return value === null ? "" : String(value);
}

export function MarkerScoreForm({
  isEditable,
  maxScore,
  record,
  taskId,
}: MarkerScoreFormProps) {
  const [state, formAction, pending] = useActionState(
    saveMarkerScore,
    initialState,
  );
  const submitted = record.status === "submitted";
  const disabled = !isEditable || submitted || pending;

  return (
    <form action={formAction} className="space-y-3">
      <input name="task_id" type="hidden" value={taskId} />
      <input
        name="student_task_record_id"
        type="hidden"
        value={record.studentTaskRecordId}
      />
      <input name="marker_role" type="hidden" value={record.markerRole} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="h-10 w-28 rounded border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
          defaultValue={formatScore(record.score)}
          disabled={disabled}
          inputMode="decimal"
          max={maxScore ?? undefined}
          min={0}
          name="score"
          step="0.01"
          type="number"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={disabled}
            name="intent"
            type="submit"
            value="save_draft"
            variant="secondary"
          >
            {pending ? "Saving..." : "Save draft"}
          </Button>
          <Button
            disabled={disabled}
            name="intent"
            type="submit"
            value="submit"
          >
            {pending ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
      {state.error ? (
        <p className="max-w-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="max-w-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
