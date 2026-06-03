import Link from "next/link";

type SubjectWorkspaceNavProps = {
  active: "classes" | "overview" | "students" | "tasks";
  subjectId: string;
};

const navItems = [
  {
    key: "overview",
    hrefSuffix: "",
    label: "Overview",
  },
  {
    key: "classes",
    hrefSuffix: "/classes",
    label: "Classes",
  },
  {
    key: "students",
    hrefSuffix: "/students",
    label: "Students",
  },
  {
    key: "tasks",
    hrefSuffix: "/tasks",
    label: "Tasks",
  },
] as const;

export function SubjectWorkspaceNav({
  active,
  subjectId,
}: SubjectWorkspaceNavProps) {
  return (
    <nav
      aria-label="Subject workspace"
      className="flex flex-wrap gap-2 border-b border-slate-200"
    >
      {navItems.map((item) => {
        const isActive = item.key === active;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={[
              "border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
              isActive
                ? "border-slate-950 text-slate-950"
                : "border-transparent text-slate-500 hover:text-slate-950",
            ].join(" ")}
            href={`/subjects/${subjectId}${item.hrefSuffix}`}
            key={item.key}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
