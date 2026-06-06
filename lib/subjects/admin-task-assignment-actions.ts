"use server";

import { revalidatePath } from "next/cache";
import { insertAuditEvent } from "../audit/audit-events";
import type { CurrentProfile } from "../auth/current-profile";
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
  in(column: string, values: string[]): FilterBuilder<Row>;
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
} & PromiseLike<{ error: QueryError | null }>;

type SelectTable<Row> = {
  select(columns: string): FilterBuilder<Row>;
};

type InsertTable<InsertRow, ResultRow> = SelectTable<ResultRow> & {
  insert(row: InsertRow): InsertBuilder<ResultRow>;
};

type MutableTable<InsertRow, UpdateRow, ResultRow> = InsertTable<
  InsertRow,
  ResultRow
> & {
  update(row: UpdateRow): UpdateBuilder<ResultRow>;
};

type SubjectInstanceRow = {
  id: string;
  school_id: string;
};

type TaskRow = {
  id: string;
  name: string;
  school_id: string;
  status: string;
  subject_instance_id: string;
};

type TaskModerationRuleRow = {
  required_initial_markers: number;
  task_id: string;
};

type ClassRow = {
  id: string;
  name: string;
  school_id: string;
  status: string;
  subject_instance_id: string;
};

type ProfileRow = {
  display_name: string;
  id: string;
  school_id: string;
  status: string;
};

type ClassEnrolmentRow = {
  class_id: string;
  id: string;
  school_id: string;
  status: string;
  student_id: string;
};

type TaskAssignmentRow = {
  class_id: string;
  id: string;
  school_id: string;
  status: string;
  task_id: string;
};

type TaskAssignmentInsert = {
  assigned_by: string;
  class_id: string;
  school_id: string;
  status: "active";
  task_id: string;
};

type TaskAssignmentUpdate = {
  assigned_by?: string;
  removed_at?: string | null;
  status: "active" | "removed";
};

type TaskMarkerAssignmentRow = {
  class_id: string;
  id: string;
  marker_profile_id: string;
  marker_role: MarkerRole;
  school_id: string;
  status: string;
  task_id: string;
};

type TaskMarkerAssignmentInsert = {
  assigned_by: string;
  class_id: string;
  marker_profile_id: string;
  marker_role: MarkerRole;
  school_id: string;
  status: "active";
  task_id: string;
};

type TaskMarkerAssignmentUpdate = {
  assigned_by?: string;
  marker_profile_id?: string;
  removed_at?: string | null;
  status: "active" | "removed";
};

type StudentTaskRecordRow = {
  class_id: string;
  id: string;
  school_id: string;
  student_id: string;
  task_id: string;
};

type StudentTaskRecordInsert = {
  administrative_status: "none";
  class_id: string;
  school_id: string;
  status: "not_started";
  student_id: string;
  task_id: string;
};

type TaskUpdate = {
  status: "marking_open";
};

type CreatedRow = {
  id: string;
};

type AdminTaskAssignmentClient = {
  from(table: "class_enrolments"): SelectTable<ClassEnrolmentRow>;
  from(table: "classes"): SelectTable<ClassRow>;
  from(table: "profiles"): SelectTable<ProfileRow>;
  from(table: "student_task_records"): InsertTable<
    StudentTaskRecordInsert,
    StudentTaskRecordRow
  >;
  from(table: "subject_instances"): SelectTable<SubjectInstanceRow>;
  from(
    table: "task_assignments",
  ): MutableTable<TaskAssignmentInsert, TaskAssignmentUpdate, TaskAssignmentRow>;
  from(
    table: "task_marker_assignments",
  ): MutableTable<
    TaskMarkerAssignmentInsert,
    TaskMarkerAssignmentUpdate,
    TaskMarkerAssignmentRow
  >;
  from(table: "task_moderation_rules"): SelectTable<TaskModerationRuleRow>;
  from(table: "tasks"): MutableTable<never, TaskUpdate, TaskRow>;
};

type MarkerRole = "marker_1" | "marker_2";

type SelectedClassSetup = {
  classId: string;
  marker1ProfileId: string | null;
  marker2ProfileId: string | null;
};

export type AdminTaskAssignmentFormState = {
  error: string | null;
  success: string | null;
};

const initialDeniedState: AdminTaskAssignmentFormState = {
  error: "You do not have permission to manage task assignment.",
  success: null,
};

function getTextValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getSelectedClassSetups(formData: FormData): SelectedClassSetup[] {
  return formData
    .getAll("class_ids")
    .map((value) => String(value).trim())
    .filter(Boolean)
    .map((classId) => ({
      classId,
      marker1ProfileId:
        getTextValue(formData, `marker_1_profile_id_${classId}`) || null,
      marker2ProfileId:
        getTextValue(formData, `marker_2_profile_id_${classId}`) || null,
    }));
}

function isUniqueViolation(error: QueryError | null) {
  return error?.code === "23505";
}

function activeRowsByClassId<Row extends { class_id: string; status: string }>(
  rows: Row[] | null,
) {
  return new Map(
    (rows ?? [])
      .filter((row) => row.status === "active")
      .map((row) => [row.class_id, row]),
  );
}

function activeMarkersByClassAndRole(rows: TaskMarkerAssignmentRow[] | null) {
  return new Map(
    (rows ?? [])
      .filter((row) => row.status === "active")
      .map((row) => [`${row.class_id}:${row.marker_role}`, row]),
  );
}

function firstInactiveAssignmentForClass(
  rows: TaskAssignmentRow[] | null,
  classId: string,
) {
  return (rows ?? []).find(
    (row) => row.class_id === classId && row.status !== "active",
  );
}

async function getAdminContext() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile || !isSystemAdmin(currentProfile)) {
    return null;
  }

  const supabase = await createClient();

  return {
    currentProfile,
    tableClient: supabase as unknown as AdminTaskAssignmentClient,
  };
}

async function writeTaskAssignmentAuditEvent({
  currentProfile,
  entityId,
  entityType,
  eventType,
  metadata,
  newValues,
  parentEntityId,
}: {
  currentProfile: CurrentProfile;
  entityId: string;
  entityType: string;
  eventType: string;
  metadata?: Record<string, string | number | boolean | null>;
  newValues?: Record<string, string | number | boolean | null>;
  parentEntityId: string;
}) {
  return insertAuditEvent({
    actor_display_name: currentProfile.display_name,
    actor_email: currentProfile.email,
    actor_profile_id: currentProfile.id,
    entity_id: entityId,
    entity_type: entityType,
    event_type: eventType,
    metadata: {
      source: "admin_task_assignment",
      ...metadata,
    },
    new_values: newValues,
    parent_entity_id: parentEntityId,
    parent_entity_type: "task",
    school_id: currentProfile.school_id,
  });
}

async function getVisibleTaskContext({
  schoolId,
  subjectInstanceId,
  tableClient,
  taskId,
}: {
  schoolId: string;
  subjectInstanceId: string;
  tableClient: AdminTaskAssignmentClient;
  taskId: string;
}) {
  const { data: subjectInstance } = await tableClient
    .from("subject_instances")
    .select("id, school_id")
    .eq("school_id", schoolId)
    .eq("id", subjectInstanceId)
    .maybeSingle();

  if (!subjectInstance) {
    return { subjectInstance: null, task: null };
  }

  const { data: task } = await tableClient
    .from("tasks")
    .select("id, name, school_id, status, subject_instance_id")
    .eq("school_id", schoolId)
    .eq("subject_instance_id", subjectInstance.id)
    .eq("id", taskId)
    .maybeSingle();

  return { subjectInstance, task };
}

async function validateSelectedSetup({
  requiredInitialMarkers,
  selectedSetups,
  subjectInstanceId,
  tableClient,
  schoolId,
}: {
  requiredInitialMarkers: number;
  selectedSetups: SelectedClassSetup[];
  schoolId: string;
  subjectInstanceId: string;
  tableClient: AdminTaskAssignmentClient;
}) {
  const [{ data: classes }, { data: profiles }] = await Promise.all([
    tableClient
      .from("classes")
      .select("id, name, school_id, status, subject_instance_id")
      .eq("school_id", schoolId)
      .eq("subject_instance_id", subjectInstanceId),
    tableClient
      .from("profiles")
      .select("display_name, id, school_id, status")
      .eq("school_id", schoolId)
      .eq("status", "active"),
  ]);

  const activeClassesById = new Map(
    (classes ?? [])
      .filter((classRow) => classRow.status === "active")
      .map((classRow) => [classRow.id, classRow]),
  );
  const activeProfileIds = new Set((profiles ?? []).map((profile) => profile.id));
  const seenClassIds = new Set<string>();

  for (const setup of selectedSetups) {
    if (seenClassIds.has(setup.classId)) {
      return {
        error: "Each class can only be selected once.",
        selectedClassesById: activeClassesById,
      };
    }

    seenClassIds.add(setup.classId);

    if (!activeClassesById.has(setup.classId)) {
      return {
        error: "Selected class is not an active class for this subject.",
        selectedClassesById: activeClassesById,
      };
    }

    if (!setup.marker1ProfileId) {
      return {
        error: "Choose Marker 1 for each selected class.",
        selectedClassesById: activeClassesById,
      };
    }

    if (requiredInitialMarkers >= 2 && !setup.marker2ProfileId) {
      return {
        error: "Choose Marker 2 for each selected class.",
        selectedClassesById: activeClassesById,
      };
    }

    if (
      setup.marker2ProfileId &&
      setup.marker1ProfileId === setup.marker2ProfileId
    ) {
      return {
        error: "Marker 1 and Marker 2 must be different staff profiles.",
        selectedClassesById: activeClassesById,
      };
    }

    if (
      !activeProfileIds.has(setup.marker1ProfileId) ||
      (setup.marker2ProfileId && !activeProfileIds.has(setup.marker2ProfileId))
    ) {
      return {
        error: "Selected marker is not an active staff profile for this school.",
        selectedClassesById: activeClassesById,
      };
    }
  }

  return { error: null, selectedClassesById: activeClassesById };
}

async function saveTaskAssignmentSetup({
  currentProfile,
  selectedSetups,
  subjectInstanceId,
  tableClient,
  task,
}: {
  currentProfile: CurrentProfile;
  selectedSetups: SelectedClassSetup[];
  subjectInstanceId: string;
  tableClient: AdminTaskAssignmentClient;
  task: TaskRow;
}) {
  const selectedClassIds = new Set(selectedSetups.map((setup) => setup.classId));
  const [{ data: existingAssignments }, { data: existingMarkerAssignments }] =
    await Promise.all([
      tableClient
        .from("task_assignments")
        .select("class_id, id, school_id, status, task_id")
        .eq("school_id", currentProfile.school_id)
        .eq("task_id", task.id),
      tableClient
        .from("task_marker_assignments")
        .select(
          "class_id, id, marker_profile_id, marker_role, school_id, status, task_id",
        )
        .eq("school_id", currentProfile.school_id)
        .eq("task_id", task.id),
    ]);

  const activeAssignmentsByClassId = activeRowsByClassId(existingAssignments);
  const activeMarkers = activeMarkersByClassAndRole(existingMarkerAssignments);
  const now = new Date().toISOString();
  let assignmentChanges = 0;
  let markerChanges = 0;

  for (const assignment of existingAssignments ?? []) {
    if (
      assignment.status === "active" &&
      !selectedClassIds.has(assignment.class_id)
    ) {
      const { error } = await tableClient
        .from("task_assignments")
        .update({ removed_at: now, status: "removed" })
        .eq("school_id", currentProfile.school_id)
        .eq("id", assignment.id);

      if (error) {
        return { assignmentChanges, error: "Could not update class assignments.", markerChanges };
      }

      assignmentChanges += 1;
    }
  }

  for (const markerAssignment of existingMarkerAssignments ?? []) {
    if (
      markerAssignment.status === "active" &&
      !selectedClassIds.has(markerAssignment.class_id)
    ) {
      const { error } = await tableClient
        .from("task_marker_assignments")
        .update({ removed_at: now, status: "removed" })
        .eq("school_id", currentProfile.school_id)
        .eq("id", markerAssignment.id);

      if (error) {
        return { assignmentChanges, error: "Could not update marker assignments.", markerChanges };
      }

      markerChanges += 1;
    }
  }

  for (const setup of selectedSetups) {
    const activeAssignment = activeAssignmentsByClassId.get(setup.classId);

    if (!activeAssignment) {
      const inactiveAssignment = firstInactiveAssignmentForClass(
        existingAssignments,
        setup.classId,
      );

      if (inactiveAssignment) {
        const { data: updatedAssignment, error } = await tableClient
          .from("task_assignments")
          .update({
            assigned_by: currentProfile.id,
            removed_at: null,
            status: "active",
          })
          .eq("school_id", currentProfile.school_id)
          .eq("id", inactiveAssignment.id)
          .select("class_id, id, school_id, status, task_id")
          .single();

        if (error || !updatedAssignment) {
          return { assignmentChanges, error: "Could not reactivate class assignment.", markerChanges };
        }

        assignmentChanges += 1;
        await writeTaskAssignmentAuditEvent({
          currentProfile,
          entityId: updatedAssignment.id,
          entityType: "task_assignment",
          eventType: "task_class_assigned",
          metadata: {
            class_id: setup.classId,
            subject_instance_id: subjectInstanceId,
            task_id: task.id,
          },
          newValues: { status: "active" },
          parentEntityId: task.id,
        });
      } else {
        const { data: createdAssignment, error } = await tableClient
          .from("task_assignments")
          .insert({
            assigned_by: currentProfile.id,
            class_id: setup.classId,
            school_id: currentProfile.school_id,
            status: "active",
            task_id: task.id,
          })
          .select("class_id, id, school_id, status, task_id")
          .single();

        if (error || !createdAssignment) {
          return {
            assignmentChanges,
            error: isUniqueViolation(error)
              ? "That class is already assigned to this task."
              : "Could not assign class to task.",
            markerChanges,
          };
        }

        assignmentChanges += 1;
        await writeTaskAssignmentAuditEvent({
          currentProfile,
          entityId: createdAssignment.id,
          entityType: "task_assignment",
          eventType: "task_class_assigned",
          metadata: {
            class_id: setup.classId,
            subject_instance_id: subjectInstanceId,
            task_id: task.id,
          },
          newValues: { status: "active" },
          parentEntityId: task.id,
        });
      }
    }

    const markerEntries: Array<{
      markerProfileId: string | null;
      markerRole: MarkerRole;
    }> = [
      { markerProfileId: setup.marker1ProfileId, markerRole: "marker_1" },
      { markerProfileId: setup.marker2ProfileId, markerRole: "marker_2" },
    ];

    for (const markerEntry of markerEntries) {
      const activeMarker = activeMarkers.get(
        `${setup.classId}:${markerEntry.markerRole}`,
      );

      if (!markerEntry.markerProfileId) {
        if (activeMarker) {
          const { error } = await tableClient
            .from("task_marker_assignments")
            .update({ removed_at: now, status: "removed" })
            .eq("school_id", currentProfile.school_id)
            .eq("id", activeMarker.id);

          if (error) {
            return { assignmentChanges, error: "Could not update marker assignments.", markerChanges };
          }

          markerChanges += 1;
        }

        continue;
      }

      if (activeMarker?.marker_profile_id === markerEntry.markerProfileId) {
        continue;
      }

      if (activeMarker) {
        const { error } = await tableClient
          .from("task_marker_assignments")
          .update({ removed_at: now, status: "removed" })
          .eq("school_id", currentProfile.school_id)
          .eq("id", activeMarker.id);

        if (error) {
          return { assignmentChanges, error: "Could not update marker assignments.", markerChanges };
        }
      }

      const { data: createdMarkerAssignment, error } = await tableClient
        .from("task_marker_assignments")
        .insert({
          assigned_by: currentProfile.id,
          class_id: setup.classId,
          marker_profile_id: markerEntry.markerProfileId,
          marker_role: markerEntry.markerRole,
          school_id: currentProfile.school_id,
          status: "active",
          task_id: task.id,
        })
        .select(
          "class_id, id, marker_profile_id, marker_role, school_id, status, task_id",
        )
        .single();

      if (error || !createdMarkerAssignment) {
        return {
          assignmentChanges,
          error: isUniqueViolation(error)
            ? "Each active marker role must use a different staff profile for the class."
            : "Could not assign marker to task class.",
          markerChanges,
        };
      }

      markerChanges += 1;
      await writeTaskAssignmentAuditEvent({
        currentProfile,
        entityId: createdMarkerAssignment.id,
        entityType: "task_marker_assignment",
        eventType: "task_marker_assigned",
        metadata: {
          class_id: setup.classId,
          marker_profile_id: markerEntry.markerProfileId,
          marker_role: markerEntry.markerRole,
          subject_instance_id: subjectInstanceId,
          task_id: task.id,
        },
        newValues: { status: "active" },
        parentEntityId: task.id,
      });
    }
  }

  return { assignmentChanges, error: null, markerChanges };
}

async function publishTask({
  currentProfile,
  selectedSetups,
  tableClient,
  task,
}: {
  currentProfile: CurrentProfile;
  selectedSetups: SelectedClassSetup[];
  tableClient: AdminTaskAssignmentClient;
  task: TaskRow;
}) {
  const selectedClassIds = selectedSetups.map((setup) => setup.classId);

  const [{ data: activeEnrolments }, { data: existingRecords }] =
    await Promise.all([
      tableClient
        .from("class_enrolments")
        .select("class_id, id, school_id, status, student_id")
        .eq("school_id", currentProfile.school_id)
        .eq("status", "active")
        .in("class_id", selectedClassIds),
      tableClient
        .from("student_task_records")
        .select("class_id, id, school_id, student_id, task_id")
        .eq("school_id", currentProfile.school_id)
        .eq("task_id", task.id),
    ]);

  const existingStudentIds = new Set(
    (existingRecords ?? []).map((record) => record.student_id),
  );
  const generatedStudentIds = new Set<string>();
  let generatedRecords = 0;

  for (const setup of selectedSetups) {
    const enrolmentsForClass = (activeEnrolments ?? []).filter(
      (enrolment) => enrolment.class_id === setup.classId,
    );

    for (const enrolment of enrolmentsForClass) {
      if (
        existingStudentIds.has(enrolment.student_id) ||
        generatedStudentIds.has(enrolment.student_id)
      ) {
        continue;
      }

      const { data: createdRecord, error } = await tableClient
        .from("student_task_records")
        .insert({
          administrative_status: "none",
          class_id: enrolment.class_id,
          school_id: currentProfile.school_id,
          status: "not_started",
          student_id: enrolment.student_id,
          task_id: task.id,
        })
        .select("class_id, id, school_id, student_id, task_id")
        .single();

      if (error || !createdRecord) {
        return {
          error: isUniqueViolation(error)
            ? "Student task records already exist for this task."
            : "Could not generate student task records.",
          generatedRecords,
        };
      }

      generatedRecords += 1;
      generatedStudentIds.add(enrolment.student_id);
    }
  }

  const { data: updatedTask, error: taskUpdateError } = await tableClient
    .from("tasks")
    .update({ status: "marking_open" })
    .eq("school_id", currentProfile.school_id)
    .eq("id", task.id)
    .select("id, name, school_id, status, subject_instance_id")
    .single();

  if (taskUpdateError || !updatedTask) {
    return {
      error: "Student records were prepared, but the task could not be published.",
      generatedRecords,
    };
  }

  await writeTaskAssignmentAuditEvent({
    currentProfile,
    entityId: task.id,
    entityType: "task",
    eventType: "task_published",
    metadata: {
      assigned_class_count: selectedSetups.length,
      generated_student_task_records: generatedRecords,
      task_id: task.id,
    },
    newValues: { status: "marking_open" },
    parentEntityId: task.id,
  });

  return { error: null, generatedRecords };
}

export async function adminConfigureTaskAssignments(
  _previousState: AdminTaskAssignmentFormState,
  formData: FormData,
): Promise<AdminTaskAssignmentFormState> {
  const context = await getAdminContext();

  if (!context) {
    return initialDeniedState;
  }

  const subjectInstanceId = getTextValue(formData, "subject_instance_id");
  const taskId = getTextValue(formData, "task_id");
  const submitIntent = getTextValue(formData, "submit_intent");
  const selectedSetups = getSelectedClassSetups(formData);

  if (!subjectInstanceId) {
    return { error: "Subject instance is required.", success: null };
  }

  if (!taskId) {
    return { error: "Task is required.", success: null };
  }

  if (submitIntent !== "save" && submitIntent !== "publish") {
    return { error: "Choose a valid task setup action.", success: null };
  }

  if (submitIntent === "publish" && selectedSetups.length === 0) {
    return {
      error: "Assign the task to at least one active class before publishing.",
      success: null,
    };
  }

  const { currentProfile, tableClient } = context;
  const { subjectInstance, task } = await getVisibleTaskContext({
    schoolId: currentProfile.school_id,
    subjectInstanceId,
    tableClient,
    taskId,
  });

  if (!subjectInstance || !task) {
    return { error: "Task is not visible for this subject.", success: null };
  }

  if (task.status !== "draft") {
    return {
      error: "Only draft tasks can be assigned or published in this setup pass.",
      success: null,
    };
  }

  const { data: moderationRule } = await tableClient
    .from("task_moderation_rules")
    .select("required_initial_markers, task_id")
    .eq("task_id", task.id)
    .maybeSingle();
  const requiredInitialMarkers =
    moderationRule?.required_initial_markers ?? 2;
  const validation = await validateSelectedSetup({
    requiredInitialMarkers,
    schoolId: currentProfile.school_id,
    selectedSetups,
    subjectInstanceId: subjectInstance.id,
    tableClient,
  });

  if (validation.error) {
    return { error: validation.error, success: null };
  }

  const saveResult = await saveTaskAssignmentSetup({
    currentProfile,
    selectedSetups,
    subjectInstanceId: subjectInstance.id,
    tableClient,
    task,
  });

  if (saveResult.error) {
    return { error: saveResult.error, success: null };
  }

  if (submitIntent === "publish") {
    const publishResult = await publishTask({
      currentProfile,
      selectedSetups,
      tableClient,
      task,
    });

    if (publishResult.error) {
      return { error: publishResult.error, success: null };
    }

    revalidatePath(`/subjects/${subjectInstance.id}/tasks`);

    return {
      error: null,
      success: `Task published. ${publishResult.generatedRecords} student task records created.`,
    };
  }

  revalidatePath(`/subjects/${subjectInstance.id}/tasks`);

  return {
    error: null,
    success:
      saveResult.assignmentChanges === 0 && saveResult.markerChanges === 0
        ? "Task assignment setup is already up to date."
        : "Task assignment setup saved.",
  };
}
