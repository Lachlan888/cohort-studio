import type { SubjectStudentsPageStudent } from "../../lib/subjects/get-subject-students-page-data";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { SubjectStatusBadge } from "./subject-status-badge";

type SubjectStudentsTableProps = {
  students: SubjectStudentsPageStudent[];
};

export function SubjectStudentsTable({ students }: SubjectStudentsTableProps) {
  if (students.length === 0) {
    return (
      <Card as="section">
        <Badge variant="warning">No students</Badge>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">
          No students are visible for this subject.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Students may not have been enrolled in visible classes yet, or your
          active profile may not have access to them.
        </p>
      </Card>
    );
  }

  return (
    <Card as="section" className="overflow-hidden p-0">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-semibold text-slate-950">Students</h2>
        <p className="mt-2 text-sm text-slate-600">
          Read-only student identities and class membership visible for this
          subject instance.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-3">Student</th>
              <th className="px-6 py-3">Code</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Classes</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Active</th>
              <th className="px-6 py-3">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {students.map((student) => (
              <tr key={student.id}>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-950">
                    {student.displayName}
                  </div>
                  {student.preferredName ? (
                    <div className="mt-1 text-xs text-slate-500">
                      Legal: {student.firstName} {student.surname}
                    </div>
                  ) : null}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {student.studentCode ?? "Not set"}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {student.email ?? "Not set"}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {student.classNames.length > 0
                    ? student.classNames.join(", ")
                    : "No visible class"}
                </td>
                <td className="px-6 py-4">
                  <SubjectStatusBadge status={student.status} />
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {student.activeEnrolments}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {student.totalEnrolments}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
