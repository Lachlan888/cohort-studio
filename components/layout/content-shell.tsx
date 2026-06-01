import type { ReactNode } from "react";

type ContentShellProps = {
  children: ReactNode;
  className?: string;
};

export function ContentShell({ children, className }: ContentShellProps) {
  const classes = [
    "mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}
