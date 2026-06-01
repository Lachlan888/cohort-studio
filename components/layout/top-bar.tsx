import { Badge } from "../ui/badge";

const previewContext = [
  {
    label: "Year",
    value: "2026",
  },
  {
    label: "Subject",
    value: "VCE English",
  },
  {
    label: "User",
    value: "Admin preview",
  },
];

export function TopBar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex min-h-16 flex-col gap-3 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div>
          <p className="text-sm font-medium text-slate-950">App preview</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Static shell context for future Cohort Studio pages.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {previewContext.map((item) => (
            <Badge key={item.label}>
              {item.label}: {item.value}
            </Badge>
          ))}
        </div>
      </div>
    </header>
  );
}
