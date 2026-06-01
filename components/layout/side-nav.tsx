import { primaryNavigationItems } from "../../lib/design/navigation";

type SideNavProps = {
  activeHref?: string;
};

export function SideNav({ activeHref = "/" }: SideNavProps) {
  return (
    <aside className="border-r border-slate-200 bg-white lg:min-h-screen">
      <div className="flex h-full flex-col gap-6 px-4 py-5">
        <div className="border-b border-slate-200 pb-5">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
            Cohort Studio
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Assessment operations
          </p>
        </div>

        <nav aria-label="Primary navigation" className="grid gap-1">
          {primaryNavigationItems.map((item) => {
            const isActive = item.href === activeHref;

            return (
              <a
                aria-current={isActive ? "page" : undefined}
                className={[
                  "rounded px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                ].join(" ")}
                href={item.href}
                key={item.href}
                title={item.description}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
