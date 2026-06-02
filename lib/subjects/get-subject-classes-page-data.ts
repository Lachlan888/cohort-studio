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
  label: string;
  school_id: string;
  year: number;
};

type ClassEnrolmentRow = {
  class_id: string;
  id: string;
  school_id: string;
  status: string;
  student_id: string;
};

type ClassRoleRow = {
  class_id: string;
  id: string;
  profile_id: string;
  role: string;
  school_id: string;
};

type ClassRow = {
  id: string;
  name: string;
  school_id: string;
  status: string;
  subject_instance_id: string;
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

type SubjectClassesTableClient = {
  from(table: "academic_years"): TableQuery<AcademicYearRow>;
  from(table: "class_enrolments"): TableQuery<ClassEnrolmentRow>;
  from(table: "classes"): TableQuery<ClassRow>;
  from(table: "subjects"): TableQuery<SubjectRow>;
  from(table: "subject_instances"): TableQuery<SubjectInstanceRow>;
  from(table: "user_class_roles"): TableQuery<ClassRoleRow>;
  from(table: "user_subject_roles"): TableQuery<SubjectRoleRow>;
};

export type SubjectClassesPageClass = {
  activeEnrolments: number;
  id: string;
  movedEnrolments: number;
  name: string;
  role: string | null;
  status: string;
  totalEnrolments: number;
  withdrawnEnrolments: number;
};

export type SubjectClassesPageSubject = {
  academicYearLabel: string;
  id: string;
  role: string | null;
  status: string;
  subjectName: string;
  subjectType: string | null;
  title: string;
  year: number | null;
};

export type SubjectClassesPageData = {
  classes: SubjectClassesPageClass[];
  currentProfile: CurrentProfile | null;
  subject: SubjectClassesPageSubject | null;
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

function summariseEnrolments(enrolments: ClassEnrolmentRow[]) {
  return {
    activeEnrolments: enrolments.filter(
      (enrolment) => enrolment.status === "active",
    ).length,
    movedEnrolments: enrolments.filter(
      (enrolment) => enrolment.status === "moved",
    ).length,
    totalEnrolments: enrolments.length,
    withdrawnEnrolments: enrolments.filter(
      (enrolment) => enrolment.status === "withdrawn",
    ).length,
  };
}

export async function getSubjectClassesPageData(
  subjectId: string,
): Promise<SubjectClassesPageData> {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile) {
    return {
      classes: [],
      currentProfile: null,
      subject: null,
    };
  }

  const supabase = await createClient();
  const tableClient = supabase as unknown as SubjectClassesTableClient;

  const { data: subjectInstances } = await tableClient
    .from("subject_instances")
    .select("academic_year_id, id, name, school_id, status, subject_id")
    .eq("school_id", currentProfile.school_id)
    .eq("id", subjectId);

  const subjectInstance = subjectInstances?.[0] ?? null;

  if (!subjectInstance) {
    return {
      classes: [],
      currentProfile,
      subject: null,
    };
  }

  const [
    { data: subjects },
    { data: academicYears },
    { data: classes },
    { data: enrolments },
    { data: subjectRoles },
    { data: classRoles },
  ] = await Promise.all([
    tableClient
      .from("subjects")
      .select("id, name, school_id, subject_type")
      .eq("school_id", currentProfile.school_id)
      .eq("id", subjectInstance.subject_id),
    tableClient
      .from("academic_years")
      .select("id, label, school_id, year")
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
      .from("user_subject_roles")
      .select("id, profile_id, role, school_id, subject_instance_id")
      .eq("school_id", currentProfile.school_id)
      .eq("profile_id", currentProfile.id)
      .eq("subject_instance_id", subjectInstance.id),
    tableClient
      .from("user_class_roles")
      .select("class_id, id, profile_id, role, school_id")
      .eq("school_id", currentProfile.school_id)
      .eq("profile_id", currentProfile.id),
  ]);

  const subject = subjects?.[0] ?? null;
  const academicYear = academicYears?.[0] ?? null;
  const classRolesByClassId = new Map(
    (classRoles ?? []).map((role) => [role.class_id, role.role]),
  );
  const subjectRole =
    formatRole(subjectRoles?.[0]?.role ?? null) ??
    (isSystemAdmin(currentProfile) ? "System admin" : null);
  const enrolmentsByClassId = (enrolments ?? []).reduce<
    Map<string, ClassEnrolmentRow[]>
  >((map, enrolment) => {
    const currentEnrolments = map.get(enrolment.class_id) ?? [];

    map.set(enrolment.class_id, [...currentEnrolments, enrolment]);

    return map;
  }, new Map<string, ClassEnrolmentRow[]>());

  return {
    classes: (classes ?? [])
      .map((classRow) => {
        const summary = summariseEnrolments(
          enrolmentsByClassId.get(classRow.id) ?? [],
        );

        return {
          ...summary,
          id: classRow.id,
          name: classRow.name,
          role:
            formatRole(classRolesByClassId.get(classRow.id) ?? null) ??
            subjectRole,
          status: classRow.status,
        };
      })
      .sort((first, second) => first.name.localeCompare(second.name)),
    currentProfile,
    subject: {
      academicYearLabel: academicYear?.label ?? "Unknown year",
      id: subjectInstance.id,
      role: subjectRole,
      status: subjectInstance.status,
      subjectName: subject?.name ?? "Unknown subject",
      subjectType: subject?.subject_type ?? null,
      title: subjectInstance.name,
      year: academicYear?.year ?? null,
    },
  };
}
