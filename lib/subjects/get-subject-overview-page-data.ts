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
} & PromiseLike<ListResult<Row>>;

type TableQuery<Row> = {
  select(columns: string): FilterBuilder<Row>;
};

type AcademicYearRow = {
  id: string;
  school_id: string;
  status: string;
  year: number;
};

type ClassEnrolmentRow = {
  class_id: string;
  id: string;
  school_id: string;
  status: string;
  student_id: string;
};

type ClassRow = {
  id: string;
  name: string;
  school_id: string;
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

type SubjectRow = {
  id: string;
  name: string;
  school_id: string;
  status: string;
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

type SubjectOverviewTableClient = {
  from(table: "academic_years"): TableQuery<AcademicYearRow>;
  from(table: "class_enrolments"): TableQuery<ClassEnrolmentRow>;
  from(table: "classes"): TableQuery<ClassRow>;
  from(table: "outcomes"): TableQuery<OutcomeRow>;
  from(table: "subjects"): TableQuery<SubjectRow>;
  from(table: "subject_instances"): TableQuery<SubjectInstanceRow>;
  from(table: "units"): TableQuery<UnitRow>;
  from(table: "user_subject_roles"): TableQuery<SubjectRoleRow>;
};

export type SubjectOverviewClass = {
  enrolmentCount: number;
  id: string;
  name: string;
  status: string;
};

export type SubjectOverviewUnit = {
  id: string;
  name: string;
  outcomes: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  status: string;
};

export type SubjectOverview = {
  academicYearStatus: string;
  classes: SubjectOverviewClass[];
  id: string;
  role: string | null;
  status: string;
  studentCount: number;
  subjectName: string;
  subjectStatus: string;
  subjectType: string | null;
  title: string;
  units: SubjectOverviewUnit[];
  year: number | null;
};

export type SubjectOverviewPageData = {
  canAdminManageSubjectStructure: boolean;
  currentProfile: CurrentProfile | null;
  subject: SubjectOverview | null;
};

function buildEnrolmentCountsByClassId(enrolments: ClassEnrolmentRow[]) {
  return enrolments.reduce<Map<string, number>>((countById, enrolment) => {
    const currentCount = countById.get(enrolment.class_id) ?? 0;

    countById.set(enrolment.class_id, currentCount + 1);

    return countById;
  }, new Map<string, number>());
}

function formatRole(role: string | null) {
  if (!role) {
    return null;
  }

  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getSubjectOverviewPageData(
  subjectId: string,
): Promise<SubjectOverviewPageData> {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile) {
    return {
      canAdminManageSubjectStructure: false,
      currentProfile: null,
      subject: null,
    };
  }

  const supabase = await createClient();
  const tableClient = supabase as unknown as SubjectOverviewTableClient;

  const { data: subjectInstances } = await tableClient
    .from("subject_instances")
    .select("academic_year_id, id, name, school_id, status, subject_id")
    .eq("school_id", currentProfile.school_id)
    .eq("id", subjectId);

  const subjectInstance = subjectInstances?.[0] ?? null;

  if (!subjectInstance) {
    return {
      canAdminManageSubjectStructure: isSystemAdmin(currentProfile),
      currentProfile,
      subject: null,
    };
  }

  const [
    { data: subjects },
    { data: academicYears },
    { data: classes },
    { data: enrolments },
    { data: units },
    { data: outcomes },
    { data: roles },
  ] = await Promise.all([
    tableClient
      .from("subjects")
      .select("id, name, school_id, status, subject_type")
      .eq("school_id", currentProfile.school_id)
      .eq("id", subjectInstance.subject_id),
    tableClient
      .from("academic_years")
      .select("id, school_id, status, year")
      .eq("school_id", currentProfile.school_id)
      .eq("id", subjectInstance.academic_year_id),
    tableClient
      .from("classes")
      .select("id, name, school_id, status, subject_instance_id")
      .eq("school_id", currentProfile.school_id)
      .eq("subject_instance_id", subjectInstance.id),
    tableClient
      .from("class_enrolments")
      .select("class_id, id, school_id, status, student_id")
      .eq("school_id", currentProfile.school_id),
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
      .from("user_subject_roles")
      .select("id, profile_id, role, school_id, subject_instance_id")
      .eq("school_id", currentProfile.school_id)
      .eq("profile_id", currentProfile.id)
      .eq("subject_instance_id", subjectInstance.id),
  ]);

  const subject = subjects?.[0] ?? null;
  const academicYear = academicYears?.[0] ?? null;
  const classIds = new Set((classes ?? []).map((classRow) => classRow.id));
  const subjectEnrolments = (enrolments ?? []).filter((enrolment) =>
    classIds.has(enrolment.class_id),
  );
  const enrolmentCountsByClassId =
    buildEnrolmentCountsByClassId(subjectEnrolments);
  const studentIds = new Set(
    subjectEnrolments.map((enrolment) => enrolment.student_id),
  );
  const outcomesByUnitId = (outcomes ?? []).reduce<Map<string, OutcomeRow[]>>(
    (map, outcome) => {
      const currentOutcomes = map.get(outcome.unit_id) ?? [];

      map.set(outcome.unit_id, [...currentOutcomes, outcome]);

      return map;
    },
    new Map<string, OutcomeRow[]>(),
  );
  const role =
    formatRole(roles?.[0]?.role ?? null) ??
    (isSystemAdmin(currentProfile) ? "System admin" : null);

  return {
    canAdminManageSubjectStructure: isSystemAdmin(currentProfile),
    currentProfile,
    subject: {
      academicYearStatus: academicYear?.status ?? "unknown",
      classes: (classes ?? [])
        .map((classRow) => ({
          enrolmentCount: enrolmentCountsByClassId.get(classRow.id) ?? 0,
          id: classRow.id,
          name: classRow.name,
          status: classRow.status,
        }))
        .sort((first, second) => first.name.localeCompare(second.name)),
      id: subjectInstance.id,
      role,
      status: subjectInstance.status,
      studentCount: studentIds.size,
      subjectName: subject?.name ?? "Unknown subject",
      subjectStatus: subject?.status ?? "unknown",
      subjectType: subject?.subject_type ?? null,
      title: subjectInstance.name,
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
            })),
          status: unit.status,
        })),
      year: academicYear?.year ?? null,
    },
  };
}
