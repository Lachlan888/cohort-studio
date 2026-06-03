import type { SubjectOverviewUnit } from "../../lib/subjects/get-subject-overview-page-data";
import { Card } from "../ui/card";
import { SubjectStatusBadge } from "./subject-status-badge";

type SubjectStructureSummaryProps = {
  units: SubjectOverviewUnit[];
};

export function SubjectStructureSummary({
  units,
}: SubjectStructureSummaryProps) {
  return (
    <Card as="section" className="overflow-hidden p-0">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-semibold text-slate-950">
          Units and outcomes
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Stage 2 subject structure for this subject instance.
        </p>
      </div>

      {units.length > 0 ? (
        <div className="divide-y divide-slate-200">
          {units.map((unit) => (
            <div className="px-6 py-5" key={unit.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">
                    {unit.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {unit.outcomes.length} outcome
                    {unit.outcomes.length === 1 ? "" : "s"}
                  </p>
                </div>
                <SubjectStatusBadge status={unit.status} />
              </div>

              {unit.outcomes.length > 0 ? (
                <div className="mt-4 grid gap-2">
                  {unit.outcomes.map((outcome) => (
                    <div
                      className="flex flex-col gap-2 border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      key={outcome.id}
                    >
                      <span className="text-sm font-medium text-slate-800">
                        {outcome.name}
                      </span>
                      <SubjectStatusBadge status={outcome.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  No outcomes are visible for this unit.
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="px-6 py-10">
          <h3 className="text-base font-semibold text-slate-950">
            No units or outcomes are visible.
          </h3>
          <p className="text-sm leading-6 text-slate-600">
            This subject instance has no visible structure records yet.
          </p>
        </div>
      )}
    </Card>
  );
}
