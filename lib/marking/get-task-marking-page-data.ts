import type { CurrentProfile } from "../auth/current-profile";
import { getCurrentProfile } from "../auth/current-profile";
import { isSystemAdmin } from "../auth/permissions";
import { createClient } from "../supabase/server";

type QueryError = { message: string };
type ListResult<Row> = {
  data: Row[] | null;
  error: QueryError | null;
};
type QueryResult<Row> = {
  data: Row | null;
  error: QueryError | null;
};

type FilterBuilder<Row> = {
  eq(column: string, value: string): FilterBuilder<Row>;
  in(column: string, values: string[]): FilterBuilder<Row>;
  maybeSingle(): Promise<QueryResult<Row>>;
} & PromiseLike<ListResult<Row>>;

type TableQuery<Row> = {
  select(columns: string): FilterBuilder<Row>;
};

type AcademicYearRow = {
  id: string;
  school_id: string;
  year: number;
};

type ClassRow = {
  id: string;
  name: string;
  school_id: string;
  subject_instance_id: string;
};

type MarkerScoreRow = {
  id: string;
  marker_profile_id: string;
  marker_role: MarkerRole;
  score: number | null;
  status: MarkerScoreStatus;
  student_task_record_id: string;
  submitted_at: string | null;
};

type ProfileRow = {
  display_name: string;
  id: string;
};

type StudentRow = {
  first_name: string;
  id: string;
  preferred_name: string | null;
  student_code: string | null;
  surname: string;
};

type StudentTaskRecordRow = {
  administrative_status: string;
  class_id: string;
  id: string;
  school_id: string;
  status: string;
  student_id: string;
  task_id: string;
};

type SubjectRow = {
  id: string;
  name: string;
  subject_type: string | null;
};

type SubjectInstanceRow = {
  academic_year_id: string;
  id: string;
  name: string;
  school_id: string;
  status: string;
  subject_id: string;
};

type TaskRow = {
  description: string | null;
  id: string;
  marking_due_date: string | null;
  name: string;
  school_id: string;
  status: string;
  subject_instance_id: string;
  task_date: string | null;
  task_type: string;
};

type TaskMarkerAssignmentRow = {
  class_id: string;
  marker_profile_id: string;
  marker_role: MarkerRole;
  status: string;
  task_id: string;
};

type TaskScoringRuleRow = {
  display_max_score: number;
  max_score: number;
  pass_threshold: number | null;
  score_type: string;
  task_id: string;
};

type MarkingPageClient = {
  from(table: "academic_years"): TableQuery<AcademicYearRow>;
  from(table: "classes"): TableQuery<ClassRow>;
  from(table: "marker_scores"): TableQuery<MarkerScoreRow>;
  from(table: "profiles"): TableQuery<ProfileRow>;
  from(table: "students"): TableQuery<StudentRow>;
  from(table: "student_task_records"): TableQuery<StudentTaskRecordRow>;
  from(table: "subjects"): TableQuery<SubjectRow>;
  from(table: "subject_instances"): TableQuery<SubjectInstanceRow>;
  from(table: "task_marker_assignments"): TableQuery<TaskMarkerAssignmentRow>;
  from(table: "task_scoring_rules"): TableQuery<TaskScoringRuleRow>;
  from(table: "tasks"): TableQuery<TaskRow>;
};

export type MarkerRole = "marker_1" | "marker_2";
export type MarkerScoreStatus = "draft" | "submitted";

export type TaskMarkingPageRecord = {
  administrativeStatus: string;
  classId: string;
  className: string;
  markerDisplayName: string | null;
  markerProfileId: string;
  markerRole: MarkerRole;
  score: number | null;
  scoreId: string | null;
  status: MarkerScoreStatus | "not_started";
  studentCode: string | null;
  studentName: string;
  studentTaskRecordId: string;
  submittedAt: string | null;
};

export type TaskMarkingPageTask = {
  description: string | null;
  displayMaxScore: number | null;
  id: string;
  markingDueDate: string | null;
  maxScore: number | null;
  name: string;
  passThreshold: number | null;
  scoreType: string | null;
  status: string;
  subjectId: string;
  subjectTitle: string;
  subjectName: string;
  subjectType: string | null;
  taskDate: string | null;
  taskType: string;
  year: number | null;
};

export type TaskMarkingPageData = {
  canManageAllScores: boolean;
  currentProfile: CurrentProfile | null;
  records: TaskMarkingPageRecord[];
  task: TaskMarkingPageTask | null;
};

function getStudentName(student: StudentRow | undefined) {
  if (!student) {
    return "Unknown student";
  }

  const givenName = student.preferred_name || student.first_name;

  return `${givenName} ${student.surname}`.trim();
}

function formatMarkerRole(markerRole: MarkerRole) {
  return markerRole === "marker_1" ? "Marker 1" : "Marker 2";
}

export async function getTaskMarkingPageData(
  taskId: string,
): Promise<TaskMarkingPageData> {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile) {
    return {
      canManageAllScores: false,
      currentProfile: null,
      records: [],
      task: null,
    };
  }

  const supabase = await createClient();
  const tableClient = supabase as unknown as MarkingPageClient;

  const { data: task } = await tableClient
    .from("tasks")
    .select(
      "description, id, marking_due_date, name, school_id, status, subject_instance_id, task_date, task_type",
    )
    .eq("school_id", currentProfile.school_id)
    .eq("id", taskId)
    .maybeSingle();

  if (!task) {
    return {
      canManageAllScores: isSystemAdmin(currentProfile),
      currentProfile,
      records: [],
      task: null,
    };
  }

  const [
    { data: subjectInstance },
    { data: scoringRule },
    { data: markerAssignments },
    { data: studentTaskRecords },
  ] = await Promise.all([
    tableClient
      .from("subject_instances")
      .select("academic_year_id, id, name, school_id, status, subject_id")
      .eq("school_id", currentProfile.school_id)
      .eq("id", task.subject_instance_id)
      .maybeSingle(),
    tableClient
      .from("task_scoring_rules")
      .select(
        "display_max_score, max_score, pass_threshold, score_type, task_id",
      )
      .eq("task_id", task.id)
      .maybeSingle(),
    tableClient
      .from("task_marker_assignments")
      .select("class_id, marker_profile_id, marker_role, status, task_id")
      .eq("task_id", task.id),
    tableClient
      .from("student_task_records")
      .select(
        "administrative_status, class_id, id, school_id, status, student_id, task_id",
      )
      .eq("school_id", currentProfile.school_id)
      .eq("task_id", task.id),
  ]);

  const activeMarkerAssignments = (markerAssignments ?? []).filter(
    (assignment) =>
      assignment.status === "active" &&
      (isSystemAdmin(currentProfile) ||
        assignment.marker_profile_id === currentProfile.id),
  );
  const permittedClassIds = new Set(
    activeMarkerAssignments.map((assignment) => assignment.class_id),
  );
  const permittedRecords = (studentTaskRecords ?? []).filter((record) =>
    permittedClassIds.has(record.class_id),
  );

  const classIds = [...new Set(permittedRecords.map((record) => record.class_id))];
  const studentIds = [
    ...new Set(permittedRecords.map((record) => record.student_id)),
  ];
  const markerProfileIds = [
    ...new Set(
      activeMarkerAssignments.map((assignment) => assignment.marker_profile_id),
    ),
  ];
  const studentTaskRecordIds = permittedRecords.map((record) => record.id);

  const [
    { data: subject },
    { data: academicYear },
    { data: classes },
    { data: students },
    { data: markerProfiles },
    { data: markerScores },
  ] = await Promise.all([
    subjectInstance
      ? tableClient
          .from("subjects")
          .select("id, name, subject_type")
          .eq("id", subjectInstance.subject_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    subjectInstance
      ? tableClient
          .from("academic_years")
          .select("id, school_id, year")
          .eq("school_id", currentProfile.school_id)
          .eq("id", subjectInstance.academic_year_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    classIds.length > 0
      ? tableClient
          .from("classes")
          .select("id, name, school_id, subject_instance_id")
          .eq("school_id", currentProfile.school_id)
          .in("id", classIds)
      : Promise.resolve({ data: [], error: null }),
    studentIds.length > 0
      ? tableClient
          .from("students")
          .select("first_name, id, preferred_name, student_code, surname")
          .in("id", studentIds)
      : Promise.resolve({ data: [], error: null }),
    markerProfileIds.length > 0
      ? tableClient
          .from("profiles")
          .select("display_name, id")
          .in("id", markerProfileIds)
      : Promise.resolve({ data: [], error: null }),
    studentTaskRecordIds.length > 0
      ? tableClient
          .from("marker_scores")
          .select(
            "id, marker_profile_id, marker_role, score, status, student_task_record_id, submitted_at",
          )
          .in("student_task_record_id", studentTaskRecordIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const classById = new Map((classes ?? []).map((classRow) => [classRow.id, classRow]));
  const studentById = new Map((students ?? []).map((student) => [student.id, student]));
  const profileById = new Map(
    (markerProfiles ?? []).map((profile) => [profile.id, profile]),
  );
  const scoresByRecordRole = new Map(
    (markerScores ?? []).map((score) => [
      `${score.student_task_record_id}:${score.marker_role}`,
      score,
    ]),
  );

  return {
    canManageAllScores: isSystemAdmin(currentProfile),
    currentProfile,
    records: permittedRecords
      .flatMap((record) =>
        activeMarkerAssignments
          .filter((assignment) => assignment.class_id === record.class_id)
          .map((assignment) => {
            const score = scoresByRecordRole.get(
              `${record.id}:${assignment.marker_role}`,
            );
            const status: TaskMarkingPageRecord["status"] =
              score?.status ?? "not_started";

            return {
              administrativeStatus: record.administrative_status,
              classId: record.class_id,
              className: classById.get(record.class_id)?.name ?? "Unknown class",
              markerDisplayName:
                profileById.get(assignment.marker_profile_id)?.display_name ??
                (assignment.marker_profile_id === currentProfile.id
                  ? currentProfile.display_name
                  : null),
              markerProfileId: assignment.marker_profile_id,
              markerRole: assignment.marker_role,
              score: score?.score ?? null,
              scoreId: score?.id ?? null,
              status,
              studentCode: studentById.get(record.student_id)?.student_code ?? null,
              studentName: getStudentName(studentById.get(record.student_id)),
              studentTaskRecordId: record.id,
              submittedAt: score?.submitted_at ?? null,
            };
          }),
      )
      .sort((first, second) => {
        const classComparison = first.className.localeCompare(second.className);

        if (classComparison !== 0) {
          return classComparison;
        }

        const studentComparison = first.studentName.localeCompare(
          second.studentName,
        );

        if (studentComparison !== 0) {
          return studentComparison;
        }

        return formatMarkerRole(first.markerRole).localeCompare(
          formatMarkerRole(second.markerRole),
        );
      }),
    task: {
      description: task.description,
      displayMaxScore: scoringRule?.display_max_score ?? null,
      id: task.id,
      markingDueDate: task.marking_due_date,
      maxScore: scoringRule?.max_score ?? null,
      name: task.name,
      passThreshold: scoringRule?.pass_threshold ?? null,
      scoreType: scoringRule?.score_type ?? null,
      status: task.status,
      subjectId: subjectInstance?.id ?? task.subject_instance_id,
      subjectName: subject?.name ?? "Unknown subject",
      subjectTitle: subjectInstance?.name ?? "Unknown subject",
      subjectType: subject?.subject_type ?? null,
      taskDate: task.task_date,
      taskType: task.task_type,
      year: academicYear?.year ?? null,
    },
  };
}
