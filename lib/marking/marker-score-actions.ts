"use server";

import { revalidatePath } from "next/cache";
import { insertAuditEvent } from "../audit/audit-events";
import type { CurrentProfile } from "../auth/current-profile";
import { getCurrentProfile } from "../auth/current-profile";
import { createClient } from "../supabase/server";
import type { MarkerRole, MarkerScoreStatus } from "./get-task-marking-page-data";

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

type UpdateBuilder<Row> = {
  eq(column: string, value: string): UpdateBuilder<Row>;
  select(columns: string): {
    single(): Promise<QueryResult<Row>>;
  };
};

type SelectTable<Row> = {
  select(columns: string): FilterBuilder<Row>;
};

type MutableTable<InsertRow, UpdateRow, ResultRow> = SelectTable<ResultRow> & {
  insert(row: InsertRow): InsertBuilder<ResultRow>;
  update(row: UpdateRow): UpdateBuilder<ResultRow>;
};

type MarkerScoreInsert = {
  marker_profile_id: string;
  marker_role: MarkerRole;
  school_id: string;
  score: number | null;
  status: "draft";
  student_task_record_id: string;
  task_id: string;
};

type MarkerScoreUpdate = {
  score: number | null;
  status: MarkerScoreStatus;
};

type MarkerScoreRow = {
  id: string;
  marker_profile_id: string;
  marker_role: MarkerRole;
  score: number | null;
  status: MarkerScoreStatus;
  student_task_record_id: string;
  submitted_at: string | null;
  task_id: string;
};

type StudentTaskRecordRow = {
  class_id: string;
  id: string;
  school_id: string;
  task_id: string;
};

type TaskRow = {
  id: string;
  name: string;
  school_id: string;
  status: string;
};

type TaskMarkerAssignmentRow = {
  class_id: string;
  marker_profile_id: string;
  marker_role: MarkerRole;
  status: string;
  task_id: string;
};

type TaskScoringRuleRow = {
  max_score: number;
  task_id: string;
};

type MarkerScoreClient = {
  from(
    table: "marker_scores",
  ): MutableTable<MarkerScoreInsert, MarkerScoreUpdate, MarkerScoreRow>;
  from(table: "student_task_records"): SelectTable<StudentTaskRecordRow>;
  from(table: "task_marker_assignments"): SelectTable<TaskMarkerAssignmentRow>;
  from(table: "task_scoring_rules"): SelectTable<TaskScoringRuleRow>;
  from(table: "tasks"): SelectTable<TaskRow>;
};

export type MarkerScoreFormState = {
  error: string | null;
  success: string | null;
};

type SaveIntent = "save_draft" | "submit";

const deniedState: MarkerScoreFormState = {
  error: "You do not have permission to mark this record.",
  success: null,
};

function getTextValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isMarkerRole(value: string): value is MarkerRole {
  return value === "marker_1" || value === "marker_2";
}

function isSaveIntent(value: string): value is SaveIntent {
  return value === "save_draft" || value === "submit";
}

function parseScore(rawScore: string) {
  if (!rawScore) {
    return { error: null, score: null };
  }

  const score = Number(rawScore);

  if (!Number.isFinite(score)) {
    return { error: "Enter a valid numeric score.", score: null };
  }

  return { error: null, score };
}

async function writeMarkerScoreAuditEvent({
  currentProfile,
  eventType,
  markerRole,
  score,
  scoreId,
  studentTaskRecordId,
  task,
}: {
  currentProfile: CurrentProfile;
  eventType: "marker_score_draft_saved" | "marker_score_submitted";
  markerRole: MarkerRole;
  score: number | null;
  scoreId: string;
  studentTaskRecordId: string;
  task: TaskRow;
}) {
  return insertAuditEvent({
    actor_display_name: currentProfile.display_name,
    actor_email: currentProfile.email,
    actor_profile_id: currentProfile.id,
    entity_id: scoreId,
    entity_type: "marker_score",
    event_type: eventType,
    metadata: {
      marker_role: markerRole,
      source: "task_marking_page",
      student_task_record_id: studentTaskRecordId,
      task_id: task.id,
    },
    new_values: {
      score,
      status: eventType === "marker_score_submitted" ? "submitted" : "draft",
    },
    parent_entity_id: task.id,
    parent_entity_type: "task",
    school_id: currentProfile.school_id,
  });
}

export async function saveMarkerScore(
  _previousState: MarkerScoreFormState,
  formData: FormData,
): Promise<MarkerScoreFormState> {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile) {
    return deniedState;
  }

  const taskId = getTextValue(formData, "task_id");
  const studentTaskRecordId = getTextValue(formData, "student_task_record_id");
  const markerRole = getTextValue(formData, "marker_role");
  const intent = getTextValue(formData, "intent");
  const rawScore = getTextValue(formData, "score");

  if (!taskId || !studentTaskRecordId) {
    return { error: "Task and student record are required.", success: null };
  }

  if (!isMarkerRole(markerRole)) {
    return { error: "Choose a valid marker role.", success: null };
  }

  if (!isSaveIntent(intent)) {
    return { error: "Choose a valid marking action.", success: null };
  }

  const parsedScore = parseScore(rawScore);

  if (parsedScore.error) {
    return { error: parsedScore.error, success: null };
  }

  const score = parsedScore.score;

  if (intent === "submit" && score === null) {
    return { error: "Enter a score before submitting.", success: null };
  }

  const supabase = await createClient();
  const tableClient = supabase as unknown as MarkerScoreClient;

  const [{ data: task }, { data: scoringRule }, { data: studentRecord }] =
    await Promise.all([
      tableClient
        .from("tasks")
        .select("id, name, school_id, status")
        .eq("school_id", currentProfile.school_id)
        .eq("id", taskId)
        .maybeSingle(),
      tableClient
        .from("task_scoring_rules")
        .select("max_score, task_id")
        .eq("task_id", taskId)
        .maybeSingle(),
      tableClient
        .from("student_task_records")
        .select("class_id, id, school_id, task_id")
        .eq("school_id", currentProfile.school_id)
        .eq("task_id", taskId)
        .eq("id", studentTaskRecordId)
        .maybeSingle(),
    ]);

  if (!task || !studentRecord) {
    return { error: "This marking record is not visible.", success: null };
  }

  if (task.status !== "marking_open") {
    return { error: "This task is not open for marking.", success: null };
  }

  if (!scoringRule) {
    return { error: "This task does not have a numeric scoring rule.", success: null };
  }

  if (score !== null && (score < 0 || score > scoringRule.max_score)) {
    return {
      error: `Enter a score between 0 and ${scoringRule.max_score}.`,
      success: null,
    };
  }

  const { data: markerAssignment } = await tableClient
    .from("task_marker_assignments")
    .select("class_id, marker_profile_id, marker_role, status, task_id")
    .eq("task_id", task.id)
    .eq("class_id", studentRecord.class_id)
    .eq("marker_profile_id", currentProfile.id)
    .eq("marker_role", markerRole)
    .eq("status", "active")
    .maybeSingle();

  if (!markerAssignment) {
    return deniedState;
  }

  const { data: existingScore } = await tableClient
    .from("marker_scores")
    .select(
      "id, marker_profile_id, marker_role, score, status, student_task_record_id, submitted_at, task_id",
    )
    .eq("student_task_record_id", studentRecord.id)
    .eq("marker_role", markerRole)
    .maybeSingle();

  if (existingScore?.status === "submitted") {
    return {
      error: "Submitted scores are locked in this marking pass.",
      success: null,
    };
  }

  let draftScore = existingScore;

  if (!draftScore) {
    const { data: createdScore, error } = await tableClient
      .from("marker_scores")
      .insert({
        marker_profile_id: currentProfile.id,
        marker_role: markerRole,
        school_id: currentProfile.school_id,
        score,
        status: "draft",
        student_task_record_id: studentRecord.id,
        task_id: task.id,
      })
      .select(
        "id, marker_profile_id, marker_role, score, status, student_task_record_id, submitted_at, task_id",
      )
      .single();

    if (error || !createdScore) {
      return {
        error:
          error?.code === "23505"
            ? "A score already exists for this student and marker role."
            : "Could not save this score.",
        success: null,
      };
    }

    draftScore = createdScore;
  } else {
    const { data: updatedScore, error } = await tableClient
      .from("marker_scores")
      .update({ score, status: "draft" })
      .eq("id", draftScore.id)
      .eq("marker_profile_id", currentProfile.id)
      .select(
        "id, marker_profile_id, marker_role, score, status, student_task_record_id, submitted_at, task_id",
      )
      .single();

    if (error || !updatedScore) {
      return { error: "Could not update this draft score.", success: null };
    }

    draftScore = updatedScore;
  }

  if (intent === "submit") {
    const { data: submittedScore, error } = await tableClient
      .from("marker_scores")
      .update({ score, status: "submitted" })
      .eq("id", draftScore.id)
      .eq("marker_profile_id", currentProfile.id)
      .select(
        "id, marker_profile_id, marker_role, score, status, student_task_record_id, submitted_at, task_id",
      )
      .single();

    if (error || !submittedScore) {
      return { error: "Could not submit this score.", success: null };
    }

    await writeMarkerScoreAuditEvent({
      currentProfile,
      eventType: "marker_score_submitted",
      markerRole,
      score,
      scoreId: submittedScore.id,
      studentTaskRecordId: studentRecord.id,
      task,
    });

    revalidatePath(`/tasks/${task.id}/marking`);

    return { error: null, success: "Score submitted." };
  }

  await writeMarkerScoreAuditEvent({
    currentProfile,
    eventType: "marker_score_draft_saved",
    markerRole,
    score,
    scoreId: draftScore.id,
    studentTaskRecordId: studentRecord.id,
    task,
  });

  revalidatePath(`/tasks/${task.id}/marking`);

  return { error: null, success: "Draft score saved." };
}
