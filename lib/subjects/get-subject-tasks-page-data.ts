import type { CurrentProfile } from "../auth/current-profile";
import { getCurrentProfile } from "../auth/current-profile";
import { isSystemAdmin } from "../auth/permissions";
import { createClient } from "../supabase/server";

type QueryError = { message: string };
type ListResult<Row> = {
  data: Row[] | null;
  error: QueryError | null;
};

type FilterBuilder<Row> = {
  eq(column: string, value: string): FilterBuilder<Row>;
  in(column: string, values: string[]): FilterBuilder<Row>;
} & PromiseLike<ListResult<Row>>;

type TableQuery<Row> = {
  select(columns: string): FilterBuilder<Row>;
};

type AcademicYearRow = {
  id: string;
  school_id: string;
  year: number;
};

type SubjectRow = {
  id: string;
  name: string;
  school_id: string;
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

type SubjectRoleRow = {
  id: string;
  profile_id: string;
  role: string;
  school_id: string;
  subject_instance_id: string;
};

type UnitRow = {
  id: string;
  name: string;
  school_id: string;
  sort_order: number;
  status: string;
  subject_instance_id: string;
};

type OutcomeRow = {
  id: string;
  name: string;
  school_id: string;
  sort_order: number;
  status: string;
  subject_instance_id: string;
  unit_id: string;
};

type ClassRow = {
  id: string;
  name: string;
  school_id: string;
  status: string;
  subject_instance_id: string;
};

type ClassEnrolmentRow = {
  class_id: string;
  id: string;
  school_id: string;
  status: string;
  student_id: string;
};

type ProfileRow = {
  display_name: string;
  email: string;
  id: string;
  school_id: string;
  status: string;
};

type TaskRow = {
  created_at: string;
  description: string | null;
  id: string;
  marking_due_date: string | null;
  name: string;
  outcome_id: string | null;
  school_id: string;
  status: string;
  subject_instance_id: string;
  task_date: string | null;
  task_type: string;
  unit_id: string | null;
};

type TaskScoringRuleRow = {
  display_max_score: number;
  id: string;
  max_score: number;
  pass_threshold: number | null;
  school_id: string;
  score_type: string;
  task_id: string;
};

type TaskModerationRuleRow = {
  id: string;
  moderation_pathway: string;
  required_initial_markers: number;
  school_id: string;
  task_id: string;
  variance_threshold: number;
};

type TaskAssignmentRow = {
  class_id: string;
  id: string;
  school_id: string;
  status: string;
  task_id: string;
};

type TaskMarkerAssignmentRow = {
  class_id: string;
  id: string;
  marker_profile_id: string;
  marker_role: string;
  school_id: string;
  status: string;
  task_id: string;
};

type StudentTaskRecordRow = {
  class_id: string;
  id: string;
  school_id: string;
  student_id: string;
  task_id: string;
};

type SubjectTasksTableClient = {
  from(table: "academic_years"): TableQuery<AcademicYearRow>;
  from(table: "class_enrolments"): TableQuery<ClassEnrolmentRow>;
  from(table: "classes"): TableQuery<ClassRow>;
  from(table: "outcomes"): TableQuery<OutcomeRow>;
  from(table: "profiles"): TableQuery<ProfileRow>;
  from(table: "subjects"): TableQuery<SubjectRow>;
  from(table: "subject_instances"): TableQuery<SubjectInstanceRow>;
  from(table: "student_task_records"): TableQuery<StudentTaskRecordRow>;
  from(table: "task_assignments"): TableQuery<TaskAssignmentRow>;
  from(table: "task_marker_assignments"): TableQuery<TaskMarkerAssignmentRow>;
  from(table: "task_moderation_rules"): TableQuery<TaskModerationRuleRow>;
  from(table: "task_scoring_rules"): TableQuery<TaskScoringRuleRow>;
  from(table: "tasks"): TableQuery<TaskRow>;
  from(table: "units"): TableQuery<UnitRow>;
  from(table: "user_subject_roles"): TableQuery<SubjectRoleRow>;
};

export type SubjectTasksPageUnit = {
  id: string;
  name: string;
  outcomes: SubjectTasksPageOutcome[];
  status: string;
};

export type SubjectTasksPageOutcome = {
  id: string;
  name: string;
  status: string;
  unitId: string;
  unitName: string;
};

export type SubjectTasksPageTask = {
  assignedClassCount: number;
  canOpenMarking: boolean;
  classAssignments: SubjectTasksPageTaskClassAssignment[];
  createdAt: string;
  description: string | null;
  displayMaxScore: number | null;
  id: string;
  markingDueDate: string | null;
  maxScore: number | null;
  moderationPathway: string | null;
  name: string;
  outcomeName: string | null;
  passThreshold: number | null;
  requiredInitialMarkers: number | null;
  status: string;
  taskDate: string | null;
  taskType: string;
  unitName: string | null;
  varianceThreshold: number | null;
  studentTaskRecordCount: number;
};

export type SubjectTasksPageTaskClassAssignment = {
  classId: string;
  marker1ProfileId: string | null;
  marker2ProfileId: string | null;
};

export type SubjectTasksPageClass = {
  activeStudentCount: number;
  id: string;
  name: string;
  status: string;
};

export type SubjectTasksPageStaffProfile = {
  displayName: string;
  email: string;
  id: string;
};

export type SubjectTasksPageSubject = {
  id: string;
  role: string | null;
  status: string;
  subjectName: string;
  subjectType: string | null;
  title: string;
  year: number | null;
};

export type SubjectTasksPageData = {
  classes: SubjectTasksPageClass[];
  canAdminManageSubjectTasks: boolean;
  currentProfile: CurrentProfile | null;
  outcomes: SubjectTasksPageOutcome[];
  staffProfiles: SubjectTasksPageStaffProfile[];
  subject: SubjectTasksPageSubject | null;
  tasks: SubjectTasksPageTask[];
  units: SubjectTasksPageUnit[];
};

function formatRole(role: string | null) {
  if (!role) {
    return null;
  }

  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getSubjectTasksPageData(
  subjectId: string,
): Promise<SubjectTasksPageData> {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile) {
    return {
      canAdminManageSubjectTasks: false,
      classes: [],
      currentProfile: null,
      outcomes: [],
      staffProfiles: [],
      subject: null,
      tasks: [],
      units: [],
    };
  }

  const supabase = await createClient();
  const tableClient = supabase as unknown as SubjectTasksTableClient;

  const { data: subjectInstances } = await tableClient
    .from("subject_instances")
    .select("academic_year_id, id, name, school_id, status, subject_id")
    .eq("school_id", currentProfile.school_id)
    .eq("id", subjectId);

  const subjectInstance = subjectInstances?.[0] ?? null;

  if (!subjectInstance) {
    return {
      canAdminManageSubjectTasks: isSystemAdmin(currentProfile),
      classes: [],
      currentProfile,
      outcomes: [],
      staffProfiles: [],
      subject: null,
      tasks: [],
      units: [],
    };
  }

  const [
    { data: subjects },
    { data: academicYears },
    { data: roles },
    { data: units },
    { data: outcomes },
    { data: classes },
    { data: staffProfiles },
    { data: tasks },
  ] = await Promise.all([
    tableClient
      .from("subjects")
      .select("id, name, school_id, subject_type")
      .eq("school_id", currentProfile.school_id)
      .eq("id", subjectInstance.subject_id),
    tableClient
      .from("academic_years")
      .select("id, school_id, year")
      .eq("school_id", currentProfile.school_id)
      .eq("id", subjectInstance.academic_year_id),
    tableClient
      .from("user_subject_roles")
      .select("id, profile_id, role, school_id, subject_instance_id")
      .eq("school_id", currentProfile.school_id)
      .eq("profile_id", currentProfile.id)
      .eq("subject_instance_id", subjectInstance.id),
    tableClient
      .from("units")
      .select("id, name, school_id, sort_order, status, subject_instance_id")
      .eq("school_id", currentProfile.school_id)
      .eq("subject_instance_id", subjectInstance.id),
    tableClient
      .from("outcomes")
      .select(
        "id, name, school_id, sort_order, status, subject_instance_id, unit_id",
      )
      .eq("school_id", currentProfile.school_id)
      .eq("subject_instance_id", subjectInstance.id),
    tableClient
      .from("classes")
      .select("id, name, school_id, status, subject_instance_id")
      .eq("school_id", currentProfile.school_id)
      .eq("subject_instance_id", subjectInstance.id),
    tableClient
      .from("profiles")
      .select("display_name, email, id, school_id, status")
      .eq("school_id", currentProfile.school_id)
      .eq("status", "active"),
    tableClient
      .from("tasks")
      .select(
        "created_at, description, id, marking_due_date, name, outcome_id, school_id, status, subject_instance_id, task_date, task_type, unit_id",
      )
      .eq("school_id", currentProfile.school_id)
      .eq("subject_instance_id", subjectInstance.id),
  ]);

  const taskIds = (tasks ?? []).map((task) => task.id);
  const classIds = (classes ?? []).map((classRow) => classRow.id);
  const [
    { data: scoringRules },
    { data: moderationRules },
    { data: taskAssignments },
    { data: taskMarkerAssignments },
    { data: studentTaskRecords },
  ] =
    taskIds.length > 0
      ? await Promise.all([
          tableClient
            .from("task_scoring_rules")
            .select(
              "display_max_score, id, max_score, pass_threshold, school_id, score_type, task_id",
            )
            .eq("school_id", currentProfile.school_id)
            .in("task_id", taskIds),
          tableClient
            .from("task_moderation_rules")
            .select(
              "id, moderation_pathway, required_initial_markers, school_id, task_id, variance_threshold",
            )
            .eq("school_id", currentProfile.school_id)
            .in("task_id", taskIds),
          tableClient
            .from("task_assignments")
            .select("class_id, id, school_id, status, task_id")
            .eq("school_id", currentProfile.school_id)
            .in("task_id", taskIds),
          tableClient
            .from("task_marker_assignments")
            .select(
              "class_id, id, marker_profile_id, marker_role, school_id, status, task_id",
            )
            .eq("school_id", currentProfile.school_id)
            .in("task_id", taskIds),
          tableClient
            .from("student_task_records")
            .select("class_id, id, school_id, student_id, task_id")
            .eq("school_id", currentProfile.school_id)
            .in("task_id", taskIds),
        ])
      : [
          { data: [] },
          { data: [] },
          { data: [] },
          { data: [] },
          { data: [] },
        ];
  const { data: classEnrolments } =
    classIds.length > 0
      ? await tableClient
          .from("class_enrolments")
          .select("class_id, id, school_id, status, student_id")
          .eq("school_id", currentProfile.school_id)
          .in("class_id", classIds)
      : { data: [] };

  const subject = subjects?.[0] ?? null;
  const academicYear = academicYears?.[0] ?? null;
  const role =
    formatRole(roles?.[0]?.role ?? null) ??
    (isSystemAdmin(currentProfile) ? "System admin" : null);
  const unitsById = new Map((units ?? []).map((unit) => [unit.id, unit]));
  const outcomesById = new Map(
    (outcomes ?? []).map((outcome) => [outcome.id, outcome]),
  );
  const outcomesByUnitId = (outcomes ?? []).reduce<Map<string, OutcomeRow[]>>(
    (map, outcome) => {
      const currentOutcomes = map.get(outcome.unit_id) ?? [];

      map.set(outcome.unit_id, [...currentOutcomes, outcome]);

      return map;
    },
    new Map<string, OutcomeRow[]>(),
  );
  const scoringRulesByTaskId = new Map(
    (scoringRules ?? []).map((rule) => [rule.task_id, rule]),
  );
  const moderationRulesByTaskId = new Map(
    (moderationRules ?? []).map((rule) => [rule.task_id, rule]),
  );
  const classEnrolmentsByClassId = (classEnrolments ?? []).reduce<
    Map<string, ClassEnrolmentRow[]>
  >((map, enrolment) => {
    const currentEnrolments = map.get(enrolment.class_id) ?? [];

    map.set(enrolment.class_id, [...currentEnrolments, enrolment]);

    return map;
  }, new Map<string, ClassEnrolmentRow[]>());
  const activeTaskAssignments = (taskAssignments ?? []).filter(
    (assignment) => assignment.status === "active",
  );
  const activeMarkerAssignments = (taskMarkerAssignments ?? []).filter(
    (assignment) => assignment.status === "active",
  );
  const taskAssignmentsByTaskId = activeTaskAssignments.reduce<
    Map<string, TaskAssignmentRow[]>
  >((map, assignment) => {
    const currentAssignments = map.get(assignment.task_id) ?? [];

    map.set(assignment.task_id, [...currentAssignments, assignment]);

    return map;
  }, new Map<string, TaskAssignmentRow[]>());
  const markerAssignmentsByTaskClassRole = new Map(
    activeMarkerAssignments.map((assignment) => [
      `${assignment.task_id}:${assignment.class_id}:${assignment.marker_role}`,
      assignment,
    ]),
  );
  const studentTaskRecordCountByTaskId = (studentTaskRecords ?? []).reduce<
    Map<string, number>
  >((map, record) => {
    map.set(record.task_id, (map.get(record.task_id) ?? 0) + 1);

    return map;
  }, new Map<string, number>());
  const pageOutcomes = [...(outcomes ?? [])]
    .sort((first, second) => {
      const firstUnit = unitsById.get(first.unit_id);
      const secondUnit = unitsById.get(second.unit_id);
      const unitComparison =
        (firstUnit?.sort_order ?? 0) - (secondUnit?.sort_order ?? 0);

      if (unitComparison !== 0) {
        return unitComparison;
      }

      const outcomeComparison = first.sort_order - second.sort_order;

      if (outcomeComparison !== 0) {
        return outcomeComparison;
      }

      return first.name.localeCompare(second.name);
    })
    .map((outcome) => ({
      id: outcome.id,
      name: outcome.name,
      status: outcome.status,
      unitId: outcome.unit_id,
      unitName: unitsById.get(outcome.unit_id)?.name ?? "Unknown unit",
    }));

  return {
    canAdminManageSubjectTasks: isSystemAdmin(currentProfile),
    classes: [...(classes ?? [])]
      .sort((first, second) => first.name.localeCompare(second.name))
      .map((classRow) => ({
        activeStudentCount: (
          classEnrolmentsByClassId.get(classRow.id) ?? []
        ).filter((enrolment) => enrolment.status === "active").length,
        id: classRow.id,
        name: classRow.name,
        status: classRow.status,
      })),
    currentProfile,
    outcomes: pageOutcomes,
    staffProfiles: [...(staffProfiles ?? [])]
      .sort((first, second) =>
        first.display_name.localeCompare(second.display_name),
      )
      .map((profile) => ({
        displayName: profile.display_name,
        email: profile.email,
        id: profile.id,
      })),
    subject: {
      id: subjectInstance.id,
      role,
      status: subjectInstance.status,
      subjectName: subject?.name ?? "Unknown subject",
      subjectType: subject?.subject_type ?? null,
      title: subjectInstance.name,
      year: academicYear?.year ?? null,
    },
    tasks: [...(tasks ?? [])]
      .sort((first, second) => first.name.localeCompare(second.name))
      .map((task) => {
        const scoringRule = scoringRulesByTaskId.get(task.id);
        const moderationRule = moderationRulesByTaskId.get(task.id);
        const unit = task.unit_id ? unitsById.get(task.unit_id) : null;
        const outcome = task.outcome_id
          ? outcomesById.get(task.outcome_id)
          : null;
        const classAssignments = (
          taskAssignmentsByTaskId.get(task.id) ?? []
        ).map((assignment) => ({
          classId: assignment.class_id,
          marker1ProfileId:
            markerAssignmentsByTaskClassRole.get(
              `${task.id}:${assignment.class_id}:marker_1`,
            )?.marker_profile_id ?? null,
          marker2ProfileId:
            markerAssignmentsByTaskClassRole.get(
              `${task.id}:${assignment.class_id}:marker_2`,
            )?.marker_profile_id ?? null,
        }));

        return {
          assignedClassCount: classAssignments.length,
          canOpenMarking:
            task.status === "marking_open" &&
            (isSystemAdmin(currentProfile) ||
              activeMarkerAssignments.some(
                (assignment) =>
                  assignment.task_id === task.id &&
                  assignment.marker_profile_id === currentProfile.id,
              )),
          classAssignments,
          createdAt: task.created_at,
          description: task.description,
          displayMaxScore: scoringRule?.display_max_score ?? null,
          id: task.id,
          markingDueDate: task.marking_due_date,
          maxScore: scoringRule?.max_score ?? null,
          moderationPathway: moderationRule?.moderation_pathway ?? null,
          name: task.name,
          outcomeName: outcome?.name ?? null,
          passThreshold: scoringRule?.pass_threshold ?? null,
          requiredInitialMarkers:
            moderationRule?.required_initial_markers ?? null,
          status: task.status,
          taskDate: task.task_date,
          taskType: task.task_type,
          unitName:
            unit?.name ??
            (outcome ? unitsById.get(outcome.unit_id)?.name : null) ??
            null,
          varianceThreshold: moderationRule?.variance_threshold ?? null,
          studentTaskRecordCount:
            studentTaskRecordCountByTaskId.get(task.id) ?? 0,
        };
      }),
    units: [...(units ?? [])]
      .sort((first, second) => {
        const sortOrderComparison = first.sort_order - second.sort_order;

        if (sortOrderComparison !== 0) {
          return sortOrderComparison;
        }

        return first.name.localeCompare(second.name);
      })
      .map((unit) => ({
        id: unit.id,
        name: unit.name,
        outcomes: [...(outcomesByUnitId.get(unit.id) ?? [])]
          .sort((first, second) => {
            const sortOrderComparison = first.sort_order - second.sort_order;

            if (sortOrderComparison !== 0) {
              return sortOrderComparison;
            }

            return first.name.localeCompare(second.name);
          })
          .map((outcome) => ({
            id: outcome.id,
            name: outcome.name,
            status: outcome.status,
            unitId: unit.id,
            unitName: unit.name,
          })),
        status: unit.status,
      })),
  };
}
