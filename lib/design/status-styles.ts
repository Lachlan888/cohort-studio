import type { BadgeVariant } from "../../components/ui/badge";

type StatusStyle = {
  label: string;
  variant: BadgeVariant;
};

export const workflowStatusStyles = {
  draft: {
    label: "Draft",
    variant: "neutral",
  },
  ready: {
    label: "Ready",
    variant: "primary",
  },
  marking_open: {
    label: "Marking open",
    variant: "primary",
  },
  marking_closed: {
    label: "Marking closed",
    variant: "neutral",
  },
  moderation: {
    label: "Moderation",
    variant: "warning",
  },
  ready_to_finalise: {
    label: "Ready to finalise",
    variant: "warning",
  },
  finalised: {
    label: "Finalised",
    variant: "success",
  },
  locked: {
    label: "Locked",
    variant: "neutral",
  },
  archived: {
    label: "Archived",
    variant: "neutral",
  },
  not_started: {
    label: "Not started",
    variant: "neutral",
  },
  partially_marked: {
    label: "Partially marked",
    variant: "warning",
  },
  ready_for_variance_check: {
    label: "Ready for variance check",
    variant: "primary",
  },
  within_tolerance: {
    label: "Within tolerance",
    variant: "success",
  },
  third_marker_required: {
    label: "Third marker required",
    variant: "danger",
  },
  awaiting_third_marker: {
    label: "Awaiting third marker",
    variant: "warning",
  },
  third_marker_submitted: {
    label: "Third marker submitted",
    variant: "primary",
  },
} satisfies Record<string, StatusStyle>;

export type WorkflowStatus = keyof typeof workflowStatusStyles;
