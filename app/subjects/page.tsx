import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/layout/page-header";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";

const subjects = [
  {
    classes: "4 classes",
    name: "VCE English 2026",
    status: "Setup",
  },
  {
    classes: "3 classes",
    name: "Year 10 Media 2026",
    status: "Planning",
  },
  {
    classes: "2 classes",
    name: "VCE Media 2026",
    status: "Setup",
  },
];

export default function SubjectsPage() {
  return (
    <AppShell activeHref="/subjects">
      <PageHeader
        description="Manage subject instances, classes, students and subject-level setup."
        eyebrow="Subject setup"
        title="Subjects"
      />

      <section className="grid gap-4 md:grid-cols-3">
        {subjects.map((subject) => (
          <Card as="article" key={subject.name}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-950">
                {subject.name}
              </h2>
              <Badge>{subject.status}</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {subject.classes} ready for subject-level assessment operations.
            </p>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}
