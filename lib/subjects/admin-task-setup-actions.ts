"use server";

import { revalidatePath } from "next/cache";
import { insertAuditEvent } from "../audit/audit-events";
import { getCurrentProfile } from "../auth/current-profile";
import { isSystemAdmin } from "../auth/permissions";
import { createClient } from "../supabase/server";

type QueryError = {
  code?: string;
  message: string;
};

type QueryResult<Row> = {
  data: Row | null;
  error: QueryError | null;
};

type ListResult<Row> = {
  data: Row[] | null;
  error: QueryError | null;
};

type FilterBuilder<Row> = {
  eq(column: string, value: string): FilterBuilder<Row>;
  maybeSingle(): Promise<QueryResult<Row>>;
} & PromiseLike<ListResult<Row>>;

type InsertBuilder<Row> = {
  select(columns: string): {
    single(): Promise<QueryResult<Row>>;
  };
};

type DeleteBuilder = {
  eq(column: string, value: string): DeleteBuilder;
} & PromiseLike<{ error: QueryError | null }>;

type SelectTable<Row> = {
  select(columns: string): FilterBuilder<Row>;
};

type InsertTable<InsertRow, ResultRow> = SelectTable<ResultRow> & {
  insert(row: InsertRow): InsertBuilder<ResultRow>;
};

type MutableTable<InsertRow, ResultRow> = InsertTable<InsertRow, ResultRow> & {
  delete(): DeleteBuilder;
};

type SubjectInstanceRow = {
  id: string;
  school_id: string;
};

type UnitRow = {
  id: string;
  school_id: string;
  subject_instance_id: string;
};

type OutcomeRow = {
  id: string;
  school_id: string;
  subject_instance_id: string;
  unit_id: string;
};

type TaskRow = {
  id: string;
  name: string;
};

type TaskInsert = {
  created_by: string;
  description: string | null;
  marking_due_date: string | null;
  name: string;
  outcome_id: string | null;
  school_id: string;
  status: "draft";
  subject_instance_id: string;
  task_date: string | null;
  task_type: string;
  unit_id: string | null;
};

type TaskScoringRuleInsert = {
  display_max_score: number;
  max_score: number;
  pass_threshold: number | null;
  school_id: string;
  score_type: "numeric";
  task_id: string;
};

type TaskModerationRuleInsert = {
  moderation_pathway: ModerationPathway;
  required_initial_markers: number;
  school_id: string;
  task_id: string;
  variance_threshold: number;
};

type CreatedRow = {
  id: string;
};

type AdminTaskSetupClient = {
  from(table: "outcomes"): SelectTable<OutcomeRow>;
  from(table: "subject_instances"): SelectTable<SubjectInstanceRow>;
  from(
    table: "task_moderation_rules",
  ): InsertTable<TaskModerationRuleInsert, CreatedRow>;
  from(
    table: "task_scoring_rules",
  ): InsertTable<TaskScoringRuleInsert, CreatedRow>;
  from(table: "tasks"): MutableTable<TaskInsert, TaskRow>;
  from(table: "units"): SelectTable<UnitRow>;
};

type ModerationPathway =
  | "manual_review"
  | "third_marker_required"
  | "within_tolerance_only";

export type AdminTaskSetupFormState = {
  error: string | null;
  success: string | null;
};

const initialDeniedState: AdminTaskSetupFormState = {
  error: "You do not have permission to create tasks.",
  success: null,
};

const allowedModerationPathways = new Set<string>([
  "manual_review",
  "third_marker_required",
  "within_tolerance_only",
]);

function getTextValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizeComparableText(value: string) {
  return value.trim().toLowerCase();
}

function isUniqueViolation(error: QueryError | null) {
  return error?.code === "23505";
}

function isModerationPathway(value: string): value is ModerationPathway {
  return allowedModerationPathways.has(value);
}

function parsePositiveNumber(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseNonNegativeNumber(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function parseOptionalNonNegativeNumber(value: string) {
  if (!value) {
    return { error: false, value: null };
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: true, value: null };
  }

  return { error: false, value: parsed };
}

function parseRequiredInitialMarkers(value: string) {
  if (!value) {
    return 2;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  if (parsed < 1) {
    return null;
  }

  return parsed;
}

function isValidDateInput(value: string) {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function cleanupCreatedTask(
  tableClient: AdminTaskSetupClient,
  schoolId: string,
  taskId: string,
) {
  await tableClient
    .from("tasks")
    .delete()
    .eq("school_id", schoolId)
    .eq("id", taskId);
}

export async function adminCreateDraftNumericTask(
  _previousState: AdminTaskSetupFormState,
  formData: FormData,
): Promise<AdminTaskSetupFormState> {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile || !isSystemAdmin(currentProfile)) {
    return initialDeniedState;
  }

  const subjectInstanceId = getTextValue(formData, "subject_instance_id");
  const name = getTextValue(formData, "task_name");
  const description = getTextValue(formData, "task_description") || null;
  const unitId = getTextValue(formData, "unit_id") || null;
  const outcomeId = getTextValue(formData, "outcome_id") || null;
  const taskType = getTextValue(formData, "task_type") || "assessment";
  const maxScore = parsePositiveNumber(getTextValue(formData, "max_score"));
  const rawDisplayMaxScore = getTextValue(formData, "display_max_score");
  const displayMaxScore = rawDisplayMaxScore
    ? parsePositiveNumber(rawDisplayMaxScore)
    : maxScore;
  const passThreshold = parseOptionalNonNegativeNumber(
    getTextValue(formData, "pass_threshold"),
  );
  const varianceThreshold = parseNonNegativeNumber(
    getTextValue(formData, "variance_threshold"),
  );
  const requiredInitialMarkers = parseRequiredInitialMarkers(
    getTextValue(formData, "required_initial_markers"),
  );
  const moderationPathway =
    getTextValue(formData, "moderation_pathway") || "third_marker_required";
  const taskDate = getTextValue(formData, "task_date") || null;
  const markingDueDate = getTextValue(formData, "marking_due_date") || null;

  if (!subjectInstanceId) {
    return { error: "Subject instance is required.", success: null };
  }

  if (!name) {
    return { error: "Enter a task name.", success: null };
  }

  if (!taskType) {
    return { error: "Enter a task type.", success: null };
  }

  if (!maxScore) {
    return { error: "Enter a maximum score greater than zero.", success: null };
  }

  if (!displayMaxScore) {
    return {
      error: "Enter a display maximum score greater than zero.",
      success: null,
    };
  }

  if (passThreshold.error) {
    return {
      error: "Pass threshold must be blank, zero or greater than zero.",
      success: null,
    };
  }

  if (varianceThreshold === null) {
    return {
      error: "Enter a variance threshold of zero or greater.",
      success: null,
    };
  }

  if (!requiredInitialMarkers) {
    return {
      error: "Required initial markers must be at least 1.",
      success: null,
    };
  }

  if (!isModerationPathway(moderationPathway)) {
    return { error: "Choose an allowed moderation pathway.", success: null };
  }

  if (
    !isValidDateInput(taskDate ?? "") ||
    !isValidDateInput(markingDueDate ?? "")
  ) {
    return {
      error: "Use valid dates for task and marking due dates.",
      success: null,
    };
  }

  const supabase = await createClient();
  const tableClient = supabase as unknown as AdminTaskSetupClient;
  const { data: subjectInstance } = await tableClient
    .from("subject_instances")
    .select("id, school_id")
    .eq("school_id", currentProfile.school_id)
    .eq("id", subjectInstanceId)
    .maybeSingle();

  if (!subjectInstance) {
    return { error: "Subject instance is not visible.", success: null };
  }

  let unit: UnitRow | null = null;

  if (unitId) {
    const { data } = await tableClient
      .from("units")
      .select("id, school_id, subject_instance_id")
      .eq("school_id", currentProfile.school_id)
      .eq("subject_instance_id", subjectInstance.id)
      .eq("id", unitId)
      .maybeSingle();

    if (!data) {
      return {
        error: "Selected unit is not visible for this subject.",
        success: null,
      };
    }

    unit = data;
  }

  let outcome: OutcomeRow | null = null;

  if (outcomeId) {
    const { data } = await tableClient
      .from("outcomes")
      .select("id, school_id, subject_instance_id, unit_id")
      .eq("school_id", currentProfile.school_id)
      .eq("subject_instance_id", subjectInstance.id)
      .eq("id", outcomeId)
      .maybeSingle();

    if (!data) {
      return {
        error: "Selected outcome is not visible for this subject.",
        success: null,
      };
    }

    if (unit && data.unit_id !== unit.id) {
      return {
        error: "Selected outcome does not belong to the selected unit.",
        success: null,
      };
    }

    outcome = data;
  }

  const { data: existingTasks } = await tableClient
    .from("tasks")
    .select("id, name")
    .eq("school_id", currentProfile.school_id)
    .eq("subject_instance_id", subjectInstance.id);
  const duplicateTask = (existingTasks ?? []).find(
    (task) =>
      normalizeComparableText(task.name) === normalizeComparableText(name),
  );

  if (duplicateTask) {
    return {
      error: "A task with that name already exists for this subject.",
      success: null,
    };
  }

  const { data: createdTask, error: taskError } = await tableClient
    .from("tasks")
    .insert({
      created_by: currentProfile.id,
      description,
      marking_due_date: markingDueDate,
      name,
      outcome_id: outcome?.id ?? null,
      school_id: currentProfile.school_id,
      status: "draft",
      subject_instance_id: subjectInstance.id,
      task_date: taskDate,
      task_type: taskType,
      unit_id: unit?.id ?? null,
    })
    .select("id, name")
    .single();

  if (taskError || !createdTask) {
    return {
      error: isUniqueViolation(taskError)
        ? "A task with that name already exists for this subject."
        : "Could not create the task. Please try again.",
      success: null,
    };
  }

  const { error: scoringRuleError } = await tableClient
    .from("task_scoring_rules")
    .insert({
      display_max_score: displayMaxScore,
      max_score: maxScore,
      pass_threshold: passThreshold.value,
      school_id: currentProfile.school_id,
      score_type: "numeric",
      task_id: createdTask.id,
    })
    .select("id")
    .single();

  if (scoringRuleError) {
    await cleanupCreatedTask(
      tableClient,
      currentProfile.school_id,
      createdTask.id,
    );

    return {
      error: "Could not create the task scoring rule. Please try again.",
      success: null,
    };
  }

  const { error: moderationRuleError } = await tableClient
    .from("task_moderation_rules")
    .insert({
      moderation_pathway: moderationPathway,
      required_initial_markers: requiredInitialMarkers,
      school_id: currentProfile.school_id,
      task_id: createdTask.id,
      variance_threshold: varianceThreshold,
    })
    .select("id")
    .single();

  if (moderationRuleError) {
    await cleanupCreatedTask(
      tableClient,
      currentProfile.school_id,
      createdTask.id,
    );

    return {
      error: "Could not create the task moderation rule. Please try again.",
      success: null,
    };
  }

  await insertAuditEvent({
    actor_display_name: currentProfile.display_name,
    actor_email: currentProfile.email,
    actor_profile_id: currentProfile.id,
    entity_id: createdTask.id,
    entity_type: "task",
    event_type: "task_created",
    metadata: {
      display_max_score: displayMaxScore,
      max_score: maxScore,
      moderation_pathway: moderationPathway,
      outcome_id: outcome?.id ?? null,
      pass_threshold: passThreshold.value,
      required_initial_markers: requiredInitialMarkers,
      subject_instance_id: subjectInstance.id,
      task_id: createdTask.id,
      task_name: name,
      unit_id: unit?.id ?? null,
      variance_threshold: varianceThreshold,
    },
    new_values: {
      status: "draft",
      task_type: taskType,
    },
    parent_entity_id: subjectInstance.id,
    parent_entity_type: "subject_instance",
    school_id: currentProfile.school_id,
  });

  revalidatePath(`/subjects/${subjectInstance.id}/tasks`);

  return { error: null, success: "Draft numeric task created." };
}
