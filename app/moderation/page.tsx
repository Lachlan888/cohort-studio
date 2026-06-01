import { WorkflowStepper } from "../../components/design-system/workflow-stepper";
import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/layout/page-header";
import { Card } from "../../components/ui/card";

const moderationSteps = [
  {
    description: "Variance is above the configured task tolerance.",
    label: "Third marker required",
    status: "third_marker_required" as const,
  },
  {
    description: "The case is waiting for an independent third score.",
    label: "Awaiting third marker",
    status: "awaiting_third_marker" as const,
  },
  {
    description: "Evidence is ready for moderator review and finalisation.",
    label: "Ready to finalise",
    status: "ready_to_finalise" as const,
  },
];

export default function ModerationPage() {
  return (
    <AppShell activeHref="/moderation">
      <PageHeader
        description="Track variance cases, third-marker assignment and finalisation readiness."
        eyebrow="Moderation queue"
        title="Moderation"
      />

      <Card as="section">
        <div className="mb-6 border-b border-slate-200 pb-5">
          <h2 className="text-xl font-semibold text-slate-950">
            Queue examples
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Static workflow states for the first moderation scaffold.
          </p>
        </div>
        <WorkflowStepper steps={moderationSteps} />
      </Card>
    </AppShell>
  );
}
