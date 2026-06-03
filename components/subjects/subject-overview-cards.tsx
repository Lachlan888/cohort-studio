import type { SubjectOverview } from "../../lib/subjects/get-subject-overview-page-data";
import { Card } from "../ui/card";

type SubjectOverviewCardsProps = {
  subject: SubjectOverview;
};

export function SubjectOverviewCards({ subject }: SubjectOverviewCardsProps) {
  const items = [
    {
      label: "Academic year",
      value: subject.year ?? "Unknown",
    },
    {
      label: "Classes",
      value: subject.classes.length,
    },
    {
      label: "Students",
      value: subject.studentCount,
    },
    {
      label: "Units",
      value: subject.units.length,
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card as="article" key={item.label}>
          <p className="text-sm font-medium text-slate-500">{item.label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {item.value}
          </p>
        </Card>
      ))}
    </section>
  );
}
