import type { ReactNode } from "react";
import type { WorkflowStatus } from "../../lib/design/status-styles";
import { workflowStatusStyles } from "../../lib/design/status-styles";
import { Badge } from "../ui/badge";

export type WorkflowStep = {
  description?: ReactNode;
  label: ReactNode;
  status?: WorkflowStatus;
};

type WorkflowStepperProps = {
  steps: WorkflowStep[];
};

export function WorkflowStepper({ steps }: WorkflowStepperProps) {
  return (
    <ol className="grid gap-3">
      {steps.map((step, index) => {
        const status = step.status
          ? workflowStatusStyles[step.status]
          : undefined;

        return (
          <li
            className="grid grid-cols-[2.5rem_1fr] items-start gap-3 text-sm leading-6 text-slate-700"
            key={`${index}-${String(step.label)}`}
          >
            <span className="rounded border border-slate-200 bg-slate-50 py-1 text-center font-medium text-slate-500">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="pt-1">
              <span className="flex flex-wrap items-center gap-2">
                <span>{step.label}</span>
                {status ? (
                  <Badge className="px-2 py-0.5 text-xs" variant={status.variant}>
                    {status.label}
                  </Badge>
                ) : null}
              </span>
              {step.description ? (
                <span className="mt-1 block text-slate-500">
                  {step.description}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
