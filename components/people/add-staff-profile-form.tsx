"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createStaffProfile,
  type CreateStaffProfileFormState,
} from "../../app/people/actions";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

const initialState: CreateStaffProfileFormState = {
  error: null,
  success: null,
};

const fieldClasses =
  "h-11 rounded border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function AddStaffProfileForm() {
  const [state, formAction, pending] = useActionState(
    createStaffProfile,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <Card as="section">
      <div className="max-w-3xl">
        <h2 className="text-xl font-semibold text-slate-950">
          Add staff profile
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Create an app-level profile before a staff member signs in.
        </p>
      </div>

      <form action={formAction} className="mt-6 grid gap-5" ref={formRef}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="display_name"
            >
              Display name
            </label>
            <input
              autoComplete="name"
              className={fieldClasses}
              id="display_name"
              name="display_name"
              required
              type="text"
            />
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="email"
            >
              Email
            </label>
            <input
              autoComplete="email"
              className={fieldClasses}
              id="email"
              name="email"
              required
              type="email"
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="status"
            >
              Status
            </label>
            <select className={fieldClasses} id="status" name="status">
              <option value="invited">Invited</option>
              <option value="active">Active</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="global_role"
            >
              Global role
            </label>
            <select className={fieldClasses} id="global_role" name="global_role">
              <option value="">None</option>
              <option value="system_admin">System admin</option>
              <option value="school_viewer">School viewer</option>
              <option value="template_manager">Template manager</option>
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
            {pending ? "Creating..." : "Create staff profile"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
