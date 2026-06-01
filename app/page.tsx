import { WorkflowStepper } from "../components/design-system/workflow-stepper";
import { PageHeader } from "../components/layout/page-header";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";

const workflowSteps = [
  { label: "Create subject/year" },
  { label: "Create classes" },
  { label: "Import students" },
  { label: "Create or clone task" },
  { label: "Attach scoring rules and, later, rubrics" },
  { label: "Assign task to classes" },
  { label: "Assign Marker 1 and Marker 2" },
  { label: "Teachers submit marks" },
  { label: "App checks variance" },
  { label: "High-variance cases require a third marker" },
  { label: "Moderator finalises results" },
  { label: "App supports export and basic analysis" },
];

const featureCards = [
  {
    title: "Assessment setup",
    description:
      "Create subjects, classes, students and task structures before marking begins.",
  },
  {
    title: "Moderation workflow",
    description:
      "Keep marker assignments, variance checks and third-marker cases in one controlled process.",
  },
  {
    title: "Cohort analysis",
    description:
      "Support final results, exports and basic performance analysis once moderation is complete.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-slate-200 py-5">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
            Cohort Studio
          </div>
          <div className="hidden text-sm text-slate-500 sm:block">
            Phase 0 foundation
          </div>
        </header>

        <div className="grid flex-1 gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <PageHeader
            description={
              <>
                <p className="max-w-2xl text-2xl leading-9 text-slate-700">
                  Build tasks. Moderate marks. Understand cohorts.
                </p>
                <p className="mt-6">
                  A subject-level assessment operations and analysis shell for
                  configuring tasks, managing moderation evidence and preparing
                  final results for export.
                </p>
              </>
            }
            eyebrow={
              <Badge variant="primary">
              Assessment moderation, rubrics and cohort analysis for schools.
              </Badge>
            }
            title="Cohort Studio"
          />

          <Card>
            <div className="mb-6 flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  MVP workflow
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  From subject setup through finalisation/export.
                </p>
              </div>
              <Badge>12 steps</Badge>
            </div>

            <WorkflowStepper steps={workflowSteps} />
          </Card>
        </div>

        <section className="grid gap-4 pb-12 md:grid-cols-3">
          {featureCards.map((card) => (
            <Card as="article" key={card.title}>
              <h2 className="text-lg font-semibold text-slate-950">
                {card.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {card.description}
              </p>
            </Card>
          ))}
        </section>
      </section>
    </main>
  );
}
