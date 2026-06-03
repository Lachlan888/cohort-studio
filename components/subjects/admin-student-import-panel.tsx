"use client";

import { useActionState } from "react";
import {
  adminImportStudentsFromCsv,
  type AdminStudentImportFormState,
} from "../../lib/subjects/admin-subject-setup-actions";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

type AdminStudentImportPanelProps = {
  subjectId: string;
};

const initialState: AdminStudentImportFormState = {
  error: null,
  errors: [],
  success: null,
  summary: null,
  warnings: [],
};

const exampleCsv = `student_id,first_name,preferred_name,surname,email,class,status
12345,Lucy,,Adkins,lucy.adkins@example.edu.au,12ENGA,active
12346,Mia,,Brown,mia.brown@example.edu.au,12ENGA,active
12347,Alex,,Chen,alex.chen@example.edu.au,12ENGB,active`;

const textareaClasses =
  "min-h-52 rounded border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

function formatIssueLabel(rowNumber: number | null) {
  return rowNumber ? `Row ${rowNumber}` : "CSV";
}

export function AdminStudentImportPanel({
  subjectId,
}: AdminStudentImportPanelProps) {
  const [state, formAction, pending] = useActionState(
    adminImportStudentsFromCsv,
    initialState,
  );

  return (
    <Card as="section" className="border-teal-200 bg-teal-50">
      <div className="max-w-4xl">
        <p className="text-sm font-semibold uppercase text-teal-800">
          System admin
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          Student import CSV template
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Paste class-list CSV data with columns for student identity and
          existing class names. Student IDs are strongly recommended to avoid
          duplicate student identities. Classes must already exist and be active
          in this subject; this import will not create classes.
        </p>
      </div>

      <div className="mt-5 grid gap-3 text-sm leading-6 text-slate-700">
        <p>
          Required columns: <strong>first_name</strong>,{" "}
          <strong>surname</strong>, <strong>class</strong>. Strongly
          recommended: <strong>student_id</strong>. Optional:{" "}
          <strong>preferred_name</strong>, <strong>email</strong>,{" "}
          <strong>status</strong>.
        </p>
        <p>
          Supported aliases: <strong>student_code</strong> for student_id,{" "}
          <strong>last_name</strong> for surname, and{" "}
          <strong>class_code</strong> for class. Blank status imports as active;
          unsupported statuses are skipped. Simple quoted cells are supported.
          Extra columns are ignored with a warning.
        </p>
      </div>

      <pre className="mt-5 overflow-x-auto border border-teal-200 bg-white p-4 text-sm leading-6 text-slate-800">
        <code>{exampleCsv}</code>
      </pre>

      <form action={formAction} className="mt-6 grid gap-5">
        <input name="subject_instance_id" type="hidden" value={subjectId} />

        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-slate-800"
            htmlFor="student_import_csv"
          >
            CSV data
          </label>
          <textarea
            className={textareaClasses}
            id="student_import_csv"
            name="student_import_csv"
            placeholder={exampleCsv}
          />
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

        {state.summary ? (
          <div className="border border-slate-200 bg-white p-5">
            <h3 className="text-base font-semibold text-slate-950">
              Import summary
            </h3>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="font-medium text-slate-500">Rows parsed</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {state.summary.rowsParsed}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Rows valid</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {state.summary.rowsValid}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Rows skipped</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {state.summary.rowsSkipped}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Students created</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {state.summary.studentsCreated}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">
                  Existing students reused
                </dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {state.summary.existingStudentsReused}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">
                  Enrolments created
                </dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {state.summary.enrolmentsCreated}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">
                  Enrolments reactivated
                </dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {state.summary.enrolmentsReactivated}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Already enrolled</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {state.summary.alreadyEnrolledRows}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        {state.errors.length > 0 ? (
          <div className="border border-rose-200 bg-rose-50 p-5">
            <h3 className="text-base font-semibold text-rose-950">
              Rows with errors
            </h3>
            <p className="mt-2 text-sm leading-6 text-rose-800">
              These rows were skipped. Valid rows can still be imported.
            </p>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-rose-800">
              {state.errors.map((issue, index) => (
                <li key={`${issue.rowNumber ?? "csv"}-${index}`}>
                  <strong>{formatIssueLabel(issue.rowNumber)}:</strong>{" "}
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {state.warnings.length > 0 ? (
          <div className="border border-amber-200 bg-amber-50 p-5">
            <h3 className="text-base font-semibold text-amber-950">Warnings</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-amber-800">
              {state.warnings.map((issue, index) => (
                <li key={`${issue.rowNumber ?? "csv"}-${index}`}>
                  <strong>{formatIssueLabel(issue.rowNumber)}:</strong>{" "}
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <Button disabled={pending} type="submit">
            {pending ? "Importing..." : "Validate and import"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
