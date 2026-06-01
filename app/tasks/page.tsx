import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/layout/page-header";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";

const tasks = [
  {
    classes: "Assigned to 4 classes",
    name: "U3 O1 Analytical Response",
    status: "Draft",
  },
  {
    classes: "Assigned to 4 classes",
    name: "U3 O2 Creating Texts",
    status: "Ready",
  },
  {
    classes: "Assigned to 3 classes",
    name: "U4 Oral Presentation",
    status: "Planning",
  },
];

export default function TasksPage() {
  return (
    <AppShell activeHref="/tasks">
      <PageHeader
        description="Create tasks, assign classes, manage scoring rules and track marking progress."
        eyebrow="Assessment tasks"
        title="Tasks"
      />

      <section className="grid gap-3">
        {tasks.map((task) => (
          <Card
            as="article"
            className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center"
            key={task.name}
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                {task.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {task.classes}
              </p>
            </div>
            <Badge>{task.status}</Badge>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}
