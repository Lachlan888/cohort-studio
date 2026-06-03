"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  adminCreateSubjectOutcome,
  adminCreateSubjectUnit,
  type AdminSubjectSetupFormState,
} from "../../lib/subjects/admin-subject-setup-actions";
import type { SubjectOverviewUnit } from "../../lib/subjects/get-subject-overview-page-data";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

type AdminStructureSetupPanelProps = {
  subjectId: string;
  units: SubjectOverviewUnit[];
};

const initialState: AdminSubjectSetupFormState = {
  error: null,
  success: null,
};

const fieldClasses =
  "h-11 rounded border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

const textareaClasses =
  "min-h-24 rounded border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function AdminStructureSetupPanel({
  subjectId,
  units,
}: AdminStructureSetupPanelProps) {
  const [unitState, unitAction, unitPending] = useActionState(
    adminCreateSubjectUnit,
    initialState,
  );
  const [outcomeState, outcomeAction, outcomePending] = useActionState(
    adminCreateSubjectOutcome,
    initialState,
  );
  const unitFormRef = useRef<HTMLFormElement>(null);
  const outcomeFormRef = useRef<HTMLFormElement>(null);
  const activeUnits = units.filter((unit) => unit.status === "active");

  useEffect(() => {
    if (unitState.success) {
      unitFormRef.current?.reset();
    }
  }, [unitState.success]);

  useEffect(() => {
    if (outcomeState.success) {
      outcomeFormRef.current?.reset();
    }
  }, [outcomeState.success]);

  return (
    <Card as="section" className="border-teal-200 bg-teal-50">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase text-teal-800">
          System admin
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          Set up units and outcomes
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Add simple subject structure records for this subject instance.
        </p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <form
          action={unitAction}
          className="grid gap-5 border border-teal-200 bg-white p-5"
          ref={unitFormRef}
        >
          <input name="subject_instance_id" type="hidden" value={subjectId} />

          <div>
            <h3 className="text-base font-semibold text-slate-950">Add unit</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Use units for semesters, areas or local subject sections.
            </p>
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="unit_name"
            >
              Unit name
            </label>
            <input
              className={fieldClasses}
              id="unit_name"
              name="unit_name"
              placeholder="Unit 1"
              type="text"
            />
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="unit_description"
            >
              Description
            </label>
            <textarea
              className={textareaClasses}
              id="unit_description"
              name="unit_description"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="unit_sort_order"
              >
                Sort order
              </label>
              <input
                className={fieldClasses}
                defaultValue="0"
                id="unit_sort_order"
                inputMode="numeric"
                name="unit_sort_order"
                type="text"
              />
            </div>

            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="unit_status"
              >
                Status
              </label>
              <select
                className={fieldClasses}
                defaultValue="active"
                id="unit_status"
                name="unit_status"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {unitState.error ? (
            <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
              {unitState.error}
            </p>
          ) : null}

          {unitState.success ? (
            <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
              {unitState.success}
            </p>
          ) : null}

          <div>
            <Button disabled={unitPending} type="submit">
              {unitPending ? "Adding..." : "Add unit"}
            </Button>
          </div>
        </form>

        <form
          action={outcomeAction}
          className="grid gap-5 border border-teal-200 bg-white p-5"
          ref={outcomeFormRef}
        >
          <input name="subject_instance_id" type="hidden" value={subjectId} />

          <div>
            <h3 className="text-base font-semibold text-slate-950">
              Add outcome
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Outcomes sit inside an existing active unit.
            </p>
          </div>

          {activeUnits.length === 0 ? (
            <div>
              <Badge variant="warning">No active units</Badge>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Add an active unit before adding outcomes.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <label
                  className="text-sm font-medium text-slate-800"
                  htmlFor="unit_id"
                >
                  Unit
                </label>
                <select className={fieldClasses} id="unit_id" name="unit_id">
                  <option value="">Choose unit</option>
                  {activeUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label
                  className="text-sm font-medium text-slate-800"
                  htmlFor="outcome_name"
                >
                  Outcome name
                </label>
                <input
                  className={fieldClasses}
                  id="outcome_name"
                  name="outcome_name"
                  placeholder="Outcome 1"
                  type="text"
                />
              </div>

              <div className="grid gap-2">
                <label
                  className="text-sm font-medium text-slate-800"
                  htmlFor="outcome_description"
                >
                  Description
                </label>
                <textarea
                  className={textareaClasses}
                  id="outcome_description"
                  name="outcome_description"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="grid gap-2">
                  <label
                    className="text-sm font-medium text-slate-800"
                    htmlFor="outcome_sort_order"
                  >
                    Sort order
                  </label>
                  <input
                    className={fieldClasses}
                    defaultValue="0"
                    id="outcome_sort_order"
                    inputMode="numeric"
                    name="outcome_sort_order"
                    type="text"
                  />
                </div>

                <div className="grid gap-2">
                  <label
                    className="text-sm font-medium text-slate-800"
                    htmlFor="outcome_status"
                  >
                    Status
                  </label>
                  <select
                    className={fieldClasses}
                    defaultValue="active"
                    id="outcome_status"
                    name="outcome_status"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {outcomeState.error ? (
                <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                  {outcomeState.error}
                </p>
              ) : null}

              {outcomeState.success ? (
                <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                  {outcomeState.success}
                </p>
              ) : null}

              <div>
                <Button disabled={outcomePending} type="submit">
                  {outcomePending ? "Adding..." : "Add outcome"}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </Card>
  );
}
