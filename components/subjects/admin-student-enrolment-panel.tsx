"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  adminCreateStudentAndEnrol,
  type AdminSubjectSetupFormState,
} from "../../lib/subjects/admin-subject-setup-actions";
import type { SubjectStudentsPageClass } from "../../lib/subjects/get-subject-students-page-data";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

type AdminStudentEnrolmentPanelProps = {
  classes: SubjectStudentsPageClass[];
  subjectId: string;
};

const initialState: AdminSubjectSetupFormState = {
  error: null,
  success: null,
};

const fieldClasses =
  "h-11 rounded border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function AdminStudentEnrolmentPanel({
  classes,
  subjectId,
}: AdminStudentEnrolmentPanelProps) {
  const [state, formAction, pending] = useActionState(
    adminCreateStudentAndEnrol,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const activeClasses = classes.filter(
    (classRow) => classRow.status === "active",
  );

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
        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          Add student and enrolment
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Create a basic student record and enrol the student into one subject
          class. Student codes are strongly recommended to avoid duplicate
          student identities. Existing matching codes reuse the current student
          record.
        </p>
      </div>

      {activeClasses.length === 0 ? (
        <div className="mt-6">
          <Badge variant="warning">No active classes</Badge>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
            Add an active class before enrolling students into this subject.
          </p>
        </div>
      ) : (
        <form action={formAction} className="mt-6 grid gap-5" ref={formRef}>
          <input name="subject_instance_id" type="hidden" value={subjectId} />

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="first_name"
              >
                First name
              </label>
              <input
                className={fieldClasses}
                id="first_name"
                name="first_name"
                placeholder="Ava"
                type="text"
              />
            </div>

            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="surname"
              >
                Surname
              </label>
              <input
                className={fieldClasses}
                id="surname"
                name="surname"
                placeholder="Nguyen"
                type="text"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="preferred_name"
              >
                Preferred name
              </label>
              <input
                className={fieldClasses}
                id="preferred_name"
                name="preferred_name"
                type="text"
              />
            </div>

            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="student_code"
              >
                Student code strongly recommended
              </label>
              <input
                className={fieldClasses}
                id="student_code"
                name="student_code"
                placeholder="S12345"
                type="text"
              />
              <p className="text-xs leading-5 text-slate-600">
                Existing matching codes reuse the existing student record. Blank
                codes can create a new identity.
              </p>
            </div>

            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="email"
              >
                Email
              </label>
              <input
                className={fieldClasses}
                id="email"
                name="email"
                placeholder="student@example.edu"
                type="email"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="class_id"
              >
                Class
              </label>
              <select className={fieldClasses} id="class_id" name="class_id">
                <option value="">Choose class</option>
                {activeClasses.map((classRow) => (
                  <option key={classRow.id} value={classRow.id}>
                    {classRow.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="student_status"
              >
                Student status
              </label>
              <select
                className={fieldClasses}
                defaultValue="active"
                id="student_status"
                name="student_status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="enrolment_status"
              >
                Enrolment status
              </label>
              <select
                className={fieldClasses}
                defaultValue="active"
                id="enrolment_status"
                name="enrolment_status"
              >
                <option value="active">Active</option>
                <option value="moved">Moved</option>
                <option value="withdrawn">Withdrawn</option>
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
              {pending ? "Adding..." : "Add student and enrol"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
