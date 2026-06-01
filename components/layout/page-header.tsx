import type { ReactNode } from "react";

type PageHeaderProps = {
  description?: ReactNode;
  eyebrow?: ReactNode;
  rightContent?: ReactNode;
  title: ReactNode;
};

export function PageHeader({
  description,
  eyebrow,
  rightContent,
  title,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div>
        {eyebrow ? (
          <div className="mb-5 text-sm font-medium text-teal-800">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-slate-950 sm:text-6xl">
          {title}
        </h1>
        {description ? (
          <div className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            {description}
          </div>
        ) : null}
      </div>
      {rightContent ? <div className="shrink-0">{rightContent}</div> : null}
    </div>
  );
}
