import type { PeoplePagePerson } from "../../lib/people/get-people-page-data";
import { Badge, type BadgeVariant } from "../ui/badge";
import { Card } from "../ui/card";

type PeopleTableProps = {
  people: PeoplePagePerson[];
};

const statusVariants: Record<string, BadgeVariant> = {
  active: "success",
  archived: "neutral",
  inactive: "neutral",
  invited: "warning",
  suspended: "danger",
};

function formatRole(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusVariant(status: string): BadgeVariant {
  return statusVariants[status] ?? "neutral";
}

export function PeopleTable({ people }: PeopleTableProps) {
  return (
    <Card as="section" className="overflow-hidden p-0">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-semibold text-slate-950">Staff profiles</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Provisioned Cohort Studio profiles in this school.
        </p>
      </div>

      {people.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-6 py-3">
                  Display name
                </th>
                <th className="border-b border-slate-200 px-6 py-3">
                  Email
                </th>
                <th className="border-b border-slate-200 px-6 py-3">
                  Status
                </th>
                <th className="border-b border-slate-200 px-6 py-3">
                  Global roles
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {people.map((person) => (
                <tr key={person.id}>
                  <td className="px-6 py-4 text-sm font-medium text-slate-950">
                    {person.display_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {person.email}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={getStatusVariant(person.status)}>
                      {person.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {person.globalRoles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {person.globalRoles.map((role) => (
                          <Badge key={role} variant="primary">
                            {formatRole(role)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-10">
          <p className="text-sm leading-6 text-slate-600">
            No staff profiles are visible for this school yet.
          </p>
        </div>
      )}
    </Card>
  );
}
