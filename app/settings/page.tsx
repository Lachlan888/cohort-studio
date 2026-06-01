import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/layout/page-header";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";

const settingsAreas = [
  {
    description: "School identity, academic year defaults and reporting context.",
    name: "School profile",
  },
  {
    description: "Grade bands and result labels for future task finalisation.",
    name: "Grade scales",
  },
  {
    description: "Future controls for sensitive changes and completed records.",
    name: "Audit and archive settings",
  },
];

export default function SettingsPage() {
  return (
    <AppShell activeHref="/settings">
      <PageHeader
        description="Manage school defaults, grade scales and system configuration."
        eyebrow="Configuration"
        title="Settings"
      />

      <section className="grid gap-4 md:grid-cols-3">
        {settingsAreas.map((area) => (
          <Card as="article" key={area.name}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-950">
                {area.name}
              </h2>
              <Badge>Foundation</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {area.description}
            </p>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}
