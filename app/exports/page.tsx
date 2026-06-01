import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/layout/page-header";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";

const exports = [
  {
    description: "Final marks and task-level result fields for school systems.",
    name: "Task results export",
  },
  {
    description: "Moderation decisions, variance notes and third-marker trail.",
    name: "Moderation report",
  },
  {
    description: "Subject-level cohort summary for review and reporting.",
    name: "Cohort summary",
  },
];

export default function ExportsPage() {
  return (
    <AppShell activeHref="/exports">
      <PageHeader
        description="Prepare CSV/XLSX exports, moderation summaries and final result reports."
        eyebrow="Export support"
        title="Exports"
      />

      <section className="grid gap-4 md:grid-cols-3">
        {exports.map((exportItem) => (
          <Card as="article" key={exportItem.name}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-950">
                {exportItem.name}
              </h2>
              <Badge>Planned</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {exportItem.description}
            </p>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}
