import type { PeoplePageSummary } from "../../lib/people/get-people-page-data";
import { Card } from "../ui/card";

type PeopleSummaryCardsProps = {
  summary: PeoplePageSummary;
};

const summaryItems: Array<{
  key: keyof PeoplePageSummary;
  label: string;
}> = [
  {
    key: "totalProfiles",
    label: "Total staff",
  },
  {
    key: "activeProfiles",
    label: "Active profiles",
  },
  {
    key: "invitedProfiles",
    label: "Invited profiles",
  },
  {
    key: "systemAdmins",
    label: "System admins",
  },
];

export function PeopleSummaryCards({ summary }: PeopleSummaryCardsProps) {
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
