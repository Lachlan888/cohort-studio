import Link from "next/link";
import type { SubjectsPageSubject } from "../../lib/subjects/get-subjects-page-data";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { SubjectStatusBadge } from "./subject-status-badge";

type SubjectListProps = {
  subjects: SubjectsPageSubject[];
};

function formatClassCount(count: number) {
  return `${count} class${count === 1 ? "" : "es"}`;
}

export function SubjectList({ subjects }: SubjectListProps) {
  return (
    <Card as="section" className="overflow-hidden p-0">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-semibold text-slate-950">
          Subject instances
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Read-only subject setup records visible to your active profile.
        </p>
      </div>

      {subjects.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[54rem] border-collapse text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-6 py-3">
                  Subject instance
                </th>
                <th className="border-b border-slate-200 px-6 py-3">
                  Subject
                </th>
                <th className="border-b border-slate-200 px-6 py-3">
                  Academic year
                </th>
                <th className="border-b border-slate-200 px-6 py-3">
                  Classes
                </th>
                <th className="border-b border-slate-200 px-6 py-3">
                  Status
                </th>
                <th className="border-b border-slate-200 px-6 py-3">
                  Your role
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {subjects.map((subject) => (
                <tr key={subject.id}>
                  <td className="px-6 py-4">
                    <Link
                      className="text-sm font-medium text-slate-950 hover:text-teal-800"
                      href={`/subjects/${subject.id}`}
                    >
                      {subject.title}
                    </Link>
                    {subject.subjectType ? (
                      <div className="mt-1 text-xs text-slate-500">
                        {subject.subjectType}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {subject.subjectName}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {subject.academicYearLabel}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatClassCount(subject.classCount)}
                  </td>
                  <td className="px-6 py-4">
                    <SubjectStatusBadge status={subject.status} />
                  </td>
                  <td className="px-6 py-4">
                    {subject.role ? (
                      <Badge variant="primary">{subject.role}</Badge>
                    ) : (
                      <span className="text-sm text-slate-500">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-10">
          <p className="text-sm leading-6 text-slate-600">
            No subject instances are visible for this profile yet.
          </p>
        </div>
      )}
    </Card>
  );
}
