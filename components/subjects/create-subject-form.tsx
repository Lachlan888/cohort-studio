"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import {
  adminCreateSubjectInstance,
  type AdminCreateSubjectInstanceFormState,
} from "../../lib/subjects/create-subject-instance-action";
import type {
  CreateSubjectPageAcademicYear,
  CreateSubjectPageSubject,
} from "../../lib/subjects/get-create-subject-page-data";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

type AdminCreateSubjectFormProps = {
  academicYears: CreateSubjectPageAcademicYear[];
  subjects: CreateSubjectPageSubject[];
};

const initialState: AdminCreateSubjectInstanceFormState = {
  createdSubjectId: null,
  error: null,
  success: null,
};

const fieldClasses =
  "h-11 rounded border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function AdminCreateSubjectForm({
  academicYears,
  subjects,
}: AdminCreateSubjectFormProps) {
  const [state, formAction, pending] = useActionState(
    adminCreateSubjectInstance,
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
          Admin create subject instance
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Create only the academic year, catalogue subject and subject instance
          records needed by the read-only subject workspace.
        </p>
      </div>

      <form action={formAction} className="mt-6 grid gap-6" ref={formRef}>
        <fieldset className="grid gap-5">
          <legend className="text-base font-semibold text-slate-950">
            Academic year
          </legend>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="academic_year_id"
            >
              Existing academic year
            </label>
            <select
              className={fieldClasses}
              id="academic_year_id"
              name="academic_year_id"
            >
              <option value="">Create a new academic year</option>
              {academicYears.map((academicYear) => (
                <option key={academicYear.id} value={academicYear.id}>
                  {academicYear.year}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="new_academic_year"
              >
                New year
              </label>
              <input
                className={fieldClasses}
                id="new_academic_year"
                inputMode="numeric"
                maxLength={4}
                name="new_academic_year"
                placeholder="2026"
                type="text"
              />
            </div>

            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="new_academic_year_status"
              >
                Year status
              </label>
              <select
                className={fieldClasses}
                defaultValue="active"
                id="new_academic_year_status"
                name="new_academic_year_status"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="grid gap-5">
          <legend className="text-base font-semibold text-slate-950">
            Subject catalogue
          </legend>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-slate-800"
              htmlFor="subject_id"
            >
              Existing subject
            </label>
            <select className={fieldClasses} id="subject_id" name="subject_id">
              <option value="">Create a new subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                  {subject.subjectType ? ` · ${subject.subjectType}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="new_subject_name"
              >
                New subject name
              </label>
              <input
                className={fieldClasses}
                id="new_subject_name"
                name="new_subject_name"
                placeholder="English"
                type="text"
              />
            </div>

            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="new_subject_type"
              >
                Subject type
              </label>
              <input
                className={fieldClasses}
                id="new_subject_type"
                name="new_subject_type"
                placeholder="VCE"
                type="text"
              />
            </div>

            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="new_subject_status"
              >
                Subject status
              </label>
              <select
                className={fieldClasses}
                defaultValue="active"
                id="new_subject_status"
                name="new_subject_status"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="grid gap-5">
          <legend className="text-base font-semibold text-slate-950">
            Subject instance
          </legend>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="subject_instance_name"
              >
                Instance name
              </label>
              <input
                className={fieldClasses}
                id="subject_instance_name"
                name="subject_instance_name"
                placeholder="English 2026"
                type="text"
              />
            </div>

            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-800"
                htmlFor="subject_instance_status"
              >
                Instance status
              </label>
              <select
                className={fieldClasses}
                defaultValue="draft"
                id="subject_instance_status"
                name="subject_instance_status"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>
        </fieldset>

        {state.error ? (
          <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
            <p>{state.success}</p>
            {state.createdSubjectId ? (
              <Link
                className="mt-2 inline-flex font-medium text-emerald-950 hover:text-emerald-800"
                href={`/subjects/${state.createdSubjectId}`}
              >
                Open subject overview
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button disabled={pending} type="submit">
            {pending ? "Creating..." : "Create subject instance"}
          </Button>
          <Button href="/subjects" variant="secondary">
            Back to subjects
          </Button>
        </div>
      </form>
    </Card>
  );
}
