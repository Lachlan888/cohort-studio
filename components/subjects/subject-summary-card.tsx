import type { SubjectsPageSummary } from "../../lib/subjects/get-subjects-page-data";
import { Card } from "../ui/card";

type SubjectSummaryCardsProps = {
  summary: SubjectsPageSummary;
};

const summaryItems: Array<{
  key: keyof SubjectsPageSummary;
  label: string;
}> = [
  {
    key: "totalSubjectInstances",
    label: "Subject instances",
  },
  {
    key: "activeSubjectInstances",
    label: "Active",
  },
  {
    key: "draftSubjectInstances",
    label: "Draft",
  },
  {
    key: "archivedSubjectInstances",
    label: "Archived",
  },
];

export function SubjectSummaryCards({ summary }: SubjectSummaryCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryItems.map((item) => (
        <Card as="article" key={item.key}>
          <p className="text-sm font-medium text-slate-500">{item.label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {summary[item.key]}
          </p>
        </Card>
      ))}
    </section>
  );
}
