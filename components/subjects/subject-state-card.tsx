import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, type BadgeVariant } from "../ui/badge";
import { Card } from "../ui/card";

type SubjectStateCardProps = {
  badge: string;
  badgeVariant?: BadgeVariant;
  children?: ReactNode;
  description: string;
  linkHref?: string;
  linkLabel?: string;
  title: string;
};

export function SubjectStateCard({
  badge,
  badgeVariant = "warning",
  children,
  description,
  linkHref,
  linkLabel,
  title,
}: SubjectStateCardProps) {
  return (
    <Card as="section" className="border-amber-200 bg-amber-50">
      <Badge variant={badgeVariant}>{badge}</Badge>
      <h2 className="mt-4 text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
        {description}
      </p>
      {children}
      {linkHref && linkLabel ? (
        <Link
          className="mt-6 inline-flex text-sm font-medium text-teal-800 hover:text-teal-950"
          href={linkHref}
        >
          {linkLabel}
        </Link>
      ) : null}
    </Card>
  );
}
