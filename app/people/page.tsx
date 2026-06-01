import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/layout/page-header";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";

const peopleAreas = [
  {
    description: "Prepare invite flows for teachers, moderators and viewers.",
    name: "Staff invitations",
  },
  {
    description: "Keep global system roles separate from subject access.",
    name: "Global roles",
  },
  {
    description: "Assign future subject, class and task-level responsibilities.",
    name: "Subject access",
  },
];

export default function PeoplePage() {
  return (
    <AppShell activeHref="/people">
      <PageHeader
        description="Invite staff, manage profiles and assign access."
        eyebrow="People and access"
        title="People"
      />

      <section className="grid gap-4 md:grid-cols-3">
        {peopleAreas.map((area) => (
          <Card as="article" key={area.name}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-950">
                {area.name}
              </h2>
              <Badge>Preview</Badge>
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
