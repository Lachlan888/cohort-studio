import { Badge, type BadgeVariant } from "../ui/badge";

type SubjectStatusBadgeProps = {
  status: string;
};

const statusVariants: Record<string, BadgeVariant> = {
  active: "success",
  archived: "neutral",
  draft: "warning",
};

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SubjectStatusBadge({ status }: SubjectStatusBadgeProps) {
  return (
    <Badge variant={statusVariants[status] ?? "neutral"}>
      {formatStatus(status)}
    </Badge>
  );
}
