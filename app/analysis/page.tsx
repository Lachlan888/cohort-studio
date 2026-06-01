import { MetricCard } from "../../components/design-system/metric-card";
import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/layout/page-header";

const metrics = [
  {
    description: "Static placeholder count for completed student task records.",
    label: "Finalised records",
    value: "184",
  },
  {
    description: "Example share of records requiring an additional marker.",
    label: "Third-marker rate",
    value: "7.4%",
  },
  {
    description: "Example count for below-pass final results review.",
    label: "Below-pass count",
    value: "12",
  },
];

export default function AnalysisPage() {
  return (
    <AppShell activeHref="/analysis">
      <PageHeader
        description="Review cohort, class, task and moderation patterns once results are finalised."
        eyebrow="Cohort analysis"
        title="Analysis"
      />

      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard
            description={metric.description}
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </section>
    </AppShell>
  );
}
