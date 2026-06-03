"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  adminCreateSubjectClass,
  type AdminSubjectSetupFormState,
} from "../../lib/subjects/admin-subject-setup-actions";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

type AdminClassSetupPanelProps = {
  subjectId: string;
};

const initialState: AdminSubjectSetupFormState = {
  error: null,
  success: null,
};

const fieldClasses =
  "h-11 rounded border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function AdminClassSetupPanel({ subjectId }: AdminClassSetupPanelProps) {
  const [state, formAction, pending] = useActionState(
    adminCreateSubjectClass,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <Card as="section" className="border-teal-200 bg-teal-50">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase text-teal-800">
          System admin
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">Add class</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Create one teaching group inside this subject instance.
        </p>
      </div>

      <form action={formAction} className="mt-6 grid gap-5" ref={formRef}>
        <input name="subject_instance_id" type="hidden" value={subjectId} />

        <div className="grid gap-5 md:grid-cols-[1fr_12rem]">
          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="class_name"
            >
              Class name
            </label>
            <input
              className={fieldClasses}
              id="class_name"
              name="class_name"
              placeholder="12ENGA"
              type="text"
            />
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="class_status"
            >
              Status
            </label>
            <select
              className={fieldClasses}
              defaultValue="active"
              id="class_status"
              name="class_status"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
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
            {pending ? "Adding..." : "Add class"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
