import type { SubjectOverviewClass } from "../../lib/subjects/get-subject-overview-page-data";
import { Card } from "../ui/card";
import { SubjectStatusBadge } from "./subject-status-badge";

type SubjectClassesSummaryProps = {
  classes: SubjectOverviewClass[];
};

function formatEnrolmentCount(count: number) {
  return `${count} enrolment${count === 1 ? "" : "s"}`;
}

export function SubjectClassesSummary({
  classes,
}: SubjectClassesSummaryProps) {
  return (
    <Card as="section" className="overflow-hidden p-0">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-semibold text-slate-950">Classes</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Teaching groups currently visible for this subject instance.
        </p>
      </div>

      {classes.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-6 py-3">Class</th>
                <th className="border-b border-slate-200 px-6 py-3">
                  Enrolments
                </th>
                <th className="border-b border-slate-200 px-6 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {classes.map((classRow) => (
                <tr key={classRow.id}>
                  <td className="px-6 py-4 text-sm font-medium text-slate-950">
                    {classRow.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatEnrolmentCount(classRow.enrolmentCount)}
                  </td>
                  <td className="px-6 py-4">
                    <SubjectStatusBadge status={classRow.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-10">
          <p className="text-sm leading-6 text-slate-600">
            No classes are visible for this subject instance yet.
          </p>
        </div>
      )}
    </Card>
  );
}
