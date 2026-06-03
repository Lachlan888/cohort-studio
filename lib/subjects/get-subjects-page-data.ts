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

type ClassRow = {
  id: string;
  school_id: string;
  subject_instance_id: string;
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

type SubjectsTableClient = {
  from(table: "academic_years"): TableQuery<AcademicYearRow>;
  from(table: "classes"): TableQuery<ClassRow>;
  from(table: "subjects"): TableQuery<SubjectRow>;
  from(table: "subject_instances"): TableQuery<SubjectInstanceRow>;
  from(table: "user_subject_roles"): TableQuery<SubjectRoleRow>;
};

export type SubjectsPageSubject = {
  academicYearStatus: string;
  classCount: number;
  id: string;
  role: string | null;
  status: string;
  subjectName: string;
  subjectStatus: string;
  subjectType: string | null;
  title: string;
  year: number | null;
};

export type SubjectsPageSummary = {
  activeSubjectInstances: number;
  archivedSubjectInstances: number;
  draftSubjectInstances: number;
  totalSubjectInstances: number;
};

export type SubjectsPageData = {
  currentProfile: CurrentProfile | null;
  subjects: SubjectsPageSubject[];
  summary: SubjectsPageSummary;
};

const emptySummary: SubjectsPageSummary = {
  activeSubjectInstances: 0,
  archivedSubjectInstances: 0,
  draftSubjectInstances: 0,
  totalSubjectInstances: 0,
};

function buildCountBySubjectInstanceId(classes: ClassRow[]) {
  return classes.reduce<Map<string, number>>((countById, classRow) => {
    const currentCount = countById.get(classRow.subject_instance_id) ?? 0;

    countById.set(classRow.subject_instance_id, currentCount + 1);

    return countById;
  }, new Map<string, number>());
}

function buildRolesBySubjectInstanceId(roles: SubjectRoleRow[]) {
  return roles.reduce<Map<string, string[]>>((rolesById, role) => {
    const currentRoles = rolesById.get(role.subject_instance_id) ?? [];

    rolesById.set(role.subject_instance_id, [...currentRoles, role.role]);

    return rolesById;
  }, new Map<string, string[]>());
}

function buildSummary(subjects: SubjectsPageSubject[]): SubjectsPageSummary {
  return {
    activeSubjectInstances: subjects.filter(
      (subject) => subject.status === "active",
    ).length,
    archivedSubjectInstances: subjects.filter(
      (subject) => subject.status === "archived",
    ).length,
    draftSubjectInstances: subjects.filter(
      (subject) => subject.status === "draft",
    ).length,
    totalSubjectInstances: subjects.length,
  };
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

export async function getSubjectsPageData(): Promise<SubjectsPageData> {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile) {
    return {
      currentProfile: null,
      subjects: [],
      summary: emptySummary,
    };
  }

  const supabase = await createClient();
  const tableClient = supabase as unknown as SubjectsTableClient;

  const [
    { data: subjectInstances },
    { data: subjects },
    { data: academicYears },
    { data: classes },
    { data: subjectRoles },
  ] = await Promise.all([
    tableClient
      .from("subject_instances")
      .select("academic_year_id, id, name, school_id, status, subject_id")
      .eq("school_id", currentProfile.school_id),
    tableClient
      .from("subjects")
      .select("id, name, school_id, status, subject_type")
      .eq("school_id", currentProfile.school_id),
    tableClient
      .from("academic_years")
      .select("id, school_id, status, year")
      .eq("school_id", currentProfile.school_id),
    tableClient
      .from("classes")
      .select("id, school_id, subject_instance_id")
      .eq("school_id", currentProfile.school_id),
    tableClient
      .from("user_subject_roles")
      .select("id, profile_id, role, school_id, subject_instance_id")
      .eq("school_id", currentProfile.school_id)
      .eq("profile_id", currentProfile.id),
  ]);

  const subjectsById = new Map(
    (subjects ?? []).map((subject) => [subject.id, subject]),
  );
  const academicYearsById = new Map(
    (academicYears ?? []).map((academicYear) => [
      academicYear.id,
      academicYear,
    ]),
  );
  const classCountBySubjectInstanceId = buildCountBySubjectInstanceId(
    classes ?? [],
  );
  const rolesBySubjectInstanceId = buildRolesBySubjectInstanceId(
    subjectRoles ?? [],
  );
  const fallbackRole = isSystemAdmin(currentProfile) ? "System admin" : null;

  const pageSubjects = (subjectInstances ?? [])
    .map((subjectInstance) => {
      const subject = subjectsById.get(subjectInstance.subject_id);
      const academicYear = academicYearsById.get(
        subjectInstance.academic_year_id,
      );
      const roles = rolesBySubjectInstanceId.get(subjectInstance.id) ?? [];
      const role = formatRole(roles[0] ?? null) ?? fallbackRole;

      return {
        academicYearStatus: academicYear?.status ?? "unknown",
        classCount: classCountBySubjectInstanceId.get(subjectInstance.id) ?? 0,
        id: subjectInstance.id,
        role,
        status: subjectInstance.status,
        subjectName: subject?.name ?? "Unknown subject",
        subjectStatus: subject?.status ?? "unknown",
        subjectType: subject?.subject_type ?? null,
        title: subjectInstance.name,
        year: academicYear?.year ?? null,
      };
    })
    .sort((first, second) => {
      const yearComparison = (second.year ?? 0) - (first.year ?? 0);

      if (yearComparison !== 0) {
        return yearComparison;
      }

      return first.title.localeCompare(second.title);
    });

  return {
    currentProfile,
    subjects: pageSubjects,
    summary: buildSummary(pageSubjects),
  };
}
