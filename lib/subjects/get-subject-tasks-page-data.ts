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

type SubjectTasksTableClient = {
  from(table: "academic_years"): TableQuery<AcademicYearRow>;
  from(table: "outcomes"): TableQuery<OutcomeRow>;
  from(table: "subjects"): TableQuery<SubjectRow>;
  from(table: "subject_instances"): TableQuery<SubjectInstanceRow>;
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
  canAdminManageSubjectTasks: boolean;
  currentProfile: CurrentProfile | null;
  outcomes: SubjectTasksPageOutcome[];
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
      currentProfile: null,
      outcomes: [],
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
      currentProfile,
      outcomes: [],
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
      .from("tasks")
      .select(
        "created_at, description, id, marking_due_date, name, outcome_id, school_id, status, subject_instance_id, task_date, task_type, unit_id",
      )
      .eq("school_id", currentProfile.school_id)
      .eq("subject_instance_id", subjectInstance.id),
  ]);

  const taskIds = (tasks ?? []).map((task) => task.id);
  const [{ data: scoringRules }, { data: moderationRules }] =
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
        ])
      : [{ data: [] }, { data: [] }];

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
    currentProfile,
    outcomes: pageOutcomes,
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

        return {
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
