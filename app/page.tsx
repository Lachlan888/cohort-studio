const workflowSteps = [
  "Create subject/year",
  "Create classes",
  "Import students",
  "Create or clone task",
  "Attach scoring rules and, later, rubrics",
  "Assign task to classes",
  "Assign Marker 1 and Marker 2",
  "Teachers submit marks",
  "App checks variance",
  "High-variance cases require a third marker",
  "Moderator finalises results",
  "App supports export and basic analysis",
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
          <div>
            <p className="mb-5 inline-flex rounded border border-teal-200 bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
              Assessment moderation, rubrics and cohort analysis for schools.
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-slate-950 sm:text-6xl">
              Cohort Studio
            </h1>
            <p className="mt-6 max-w-2xl text-2xl leading-9 text-slate-700">
              Build tasks. Moderate marks. Understand cohorts.
            </p>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              A subject-level assessment operations and analysis shell for
              configuring tasks, managing moderation evidence and preparing
              final results for export.
            </p>
          </div>

          <div className="border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  MVP workflow
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  From subject setup through finalisation/export.
                </p>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
                12 steps
              </div>
            </div>

            <ol className="grid gap-3">
              {workflowSteps.map((step, index) => (
                <li
                  className="grid grid-cols-[2.5rem_1fr] items-start gap-3 text-sm leading-6 text-slate-700"
                  key={step}
                >
                  <span className="rounded border border-slate-200 bg-slate-50 py-1 text-center font-medium text-slate-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="pt-1">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <section className="grid gap-4 pb-12 md:grid-cols-3">
          {featureCards.map((card) => (
            <article
              className="border border-slate-200 bg-white p-6 shadow-sm"
              key={card.title}
            >
              <h2 className="text-lg font-semibold text-slate-950">
                {card.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {card.description}
              </p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
