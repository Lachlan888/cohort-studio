import type { ReactNode } from "react";
import { Card } from "../ui/card";

type MetricCardProps = {
  description?: ReactNode;
  label: ReactNode;
  value: ReactNode;
};

export function MetricCard({ description, label, value }: MetricCardProps) {
  return (
    <Card as="article">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
      {description ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      ) : null}
    </Card>
  );
}
