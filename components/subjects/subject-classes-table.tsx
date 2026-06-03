import type { SubjectClassesPageClass } from "../../lib/subjects/get-subject-classes-page-data";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { SubjectStatusBadge } from "./subject-status-badge";

type SubjectClassesTableProps = {
  classes: SubjectClassesPageClass[];
};

export function SubjectClassesTable({ classes }: SubjectClassesTableProps) {
  if (classes.length === 0) {
    return (
      <Card as="section">
        <Badge variant="warning">No classes</Badge>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">
          No classes are visible for this subject instance.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Classes may not have been set up yet, or your active profile may not
          be permitted to view class setup for this subject instance.
        </p>
      </Card>
    );
  }

  return (
    <Card as="section" className="overflow-hidden p-0">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-semibold text-slate-950">Classes</h2>
        <p className="mt-2 text-sm text-slate-600">
          Read-only class setup with active, moved, withdrawn and total
          enrolment counts.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-3">Class</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Active</th>
              <th className="px-6 py-3">Moved</th>
              <th className="px-6 py-3">Withdrawn</th>
              <th className="px-6 py-3">Total</th>
              <th className="px-6 py-3">Your role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {classes.map((classRow) => (
              <tr key={classRow.id}>
                <td className="px-6 py-4 font-medium text-slate-950">
                  {classRow.name}
                </td>
                <td className="px-6 py-4">
                  <SubjectStatusBadge status={classRow.status} />
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {classRow.activeEnrolments}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {classRow.movedEnrolments}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {classRow.withdrawnEnrolments}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {classRow.totalEnrolments}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {classRow.role ?? "No direct role"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
