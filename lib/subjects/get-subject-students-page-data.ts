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

type StudentRow = {
  email: string | null;
  first_name: string;
  id: string;
  preferred_name: string | null;
  school_id: string;
  status: string;
  student_code: string | null;
  surname: string;
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

type SubjectStudentsTableClient = {
  from(table: "academic_years"): TableQuery<AcademicYearRow>;
  from(table: "class_enrolments"): TableQuery<ClassEnrolmentRow>;
  from(table: "classes"): TableQuery<ClassRow>;
  from(table: "students"): TableQuery<StudentRow>;
  from(table: "subjects"): TableQuery<SubjectRow>;
  from(table: "subject_instances"): TableQuery<SubjectInstanceRow>;
  from(table: "user_subject_roles"): TableQuery<SubjectRoleRow>;
};

export type SubjectStudentsPageStudent = {
  activeEnrolments: number;
  classNames: string[];
  displayName: string;
  email: string | null;
  firstName: string;
  id: string;
  preferredName: string | null;
  movedEnrolments: number;
  status: string;
  studentCode: string | null;
  surname: string;
  totalEnrolments: number;
  withdrawnEnrolments: number;
};

export type SubjectStudentsPageSubject = {
  id: string;
  role: string | null;
  status: string;
  subjectName: string;
  subjectType: string | null;
  title: string;
  year: number | null;
};

export type SubjectStudentsPageClass = {
  id: string;
  name: string;
  status: string;
};

export type SubjectStudentsPageData = {
  canAdminManageSubjectStudents: boolean;
  classes: SubjectStudentsPageClass[];
  currentProfile: CurrentProfile | null;
  students: SubjectStudentsPageStudent[];
  subject: SubjectStudentsPageSubject | null;
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

function buildDisplayName(student: StudentRow) {
  const givenName = student.preferred_name ?? student.first_name;

  return `${givenName} ${student.surname}`;
}

export async function getSubjectStudentsPageData(
  subjectId: string,
): Promise<SubjectStudentsPageData> {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile) {
    return {
      canAdminManageSubjectStudents: false,
      classes: [],
      currentProfile: null,
      students: [],
      subject: null,
    };
  }

  const supabase = await createClient();
  const tableClient = supabase as unknown as SubjectStudentsTableClient;

  const { data: subjectInstances } = await tableClient
    .from("subject_instances")
    .select("academic_year_id, id, name, school_id, status, subject_id")
    .eq("school_id", currentProfile.school_id)
    .eq("id", subjectId);

  const subjectInstance = subjectInstances?.[0] ?? null;

  if (!subjectInstance) {
    return {
      canAdminManageSubjectStudents: isSystemAdmin(currentProfile),
      classes: [],
      currentProfile,
      students: [],
      subject: null,
    };
  }

  const [
    { data: subjects },
    { data: academicYears },
    { data: classes },
    { data: enrolments },
    { data: students },
    { data: roles },
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
      .from("classes")
      .select("id, name, school_id, status, subject_instance_id")
      .eq("school_id", currentProfile.school_id)
      .eq("subject_instance_id", subjectInstance.id),
    tableClient
      .from("class_enrolments")
      .select("class_id, id, school_id, status, student_id")
      .eq("school_id", currentProfile.school_id),
    tableClient
      .from("students")
      .select(
        "email, first_name, id, preferred_name, school_id, status, student_code, surname",
      )
      .eq("school_id", currentProfile.school_id),
    tableClient
      .from("user_subject_roles")
      .select("id, profile_id, role, school_id, subject_instance_id")
      .eq("school_id", currentProfile.school_id)
      .eq("profile_id", currentProfile.id)
      .eq("subject_instance_id", subjectInstance.id),
  ]);

  const subject = subjects?.[0] ?? null;
  const academicYear = academicYears?.[0] ?? null;
  const classesById = new Map(
    (classes ?? []).map((classRow) => [classRow.id, classRow]),
  );
  const subjectClassIds = new Set(classesById.keys());
  const subjectEnrolments = (enrolments ?? []).filter((enrolment) =>
    subjectClassIds.has(enrolment.class_id),
  );
  const enrolmentsByStudentId = subjectEnrolments.reduce<
    Map<string, ClassEnrolmentRow[]>
  >((map, enrolment) => {
    const currentEnrolments = map.get(enrolment.student_id) ?? [];

    map.set(enrolment.student_id, [...currentEnrolments, enrolment]);

    return map;
  }, new Map<string, ClassEnrolmentRow[]>());
  const role =
    formatRole(roles?.[0]?.role ?? null) ??
    (isSystemAdmin(currentProfile) ? "System admin" : null);

  return {
    canAdminManageSubjectStudents: isSystemAdmin(currentProfile),
    classes: (classes ?? [])
      .map((classRow) => ({
        id: classRow.id,
        name: classRow.name,
        status: classRow.status,
      }))
      .sort((first, second) => first.name.localeCompare(second.name)),
    currentProfile,
    students: (students ?? [])
      .filter((student) => enrolmentsByStudentId.has(student.id))
      .map((student) => {
        const studentEnrolments = enrolmentsByStudentId.get(student.id) ?? [];

        return {
          activeEnrolments: studentEnrolments.filter(
            (enrolment) => enrolment.status === "active",
          ).length,
          classNames: studentEnrolments
            .map((enrolment) => classesById.get(enrolment.class_id)?.name)
            .filter((name): name is string => Boolean(name))
            .sort((first, second) => first.localeCompare(second)),
          displayName: buildDisplayName(student),
          email: student.email,
          firstName: student.first_name,
          id: student.id,
          movedEnrolments: studentEnrolments.filter(
            (enrolment) => enrolment.status === "moved",
          ).length,
          preferredName: student.preferred_name,
          status: student.status,
          studentCode: student.student_code,
          surname: student.surname,
          totalEnrolments: studentEnrolments.length,
          withdrawnEnrolments: studentEnrolments.filter(
            (enrolment) => enrolment.status === "withdrawn",
          ).length,
        };
      })
      .sort((first, second) => {
        const surnameComparison = first.surname.localeCompare(second.surname);

        if (surnameComparison !== 0) {
          return surnameComparison;
        }

        return first.firstName.localeCompare(second.firstName);
      }),
    subject: {
      id: subjectInstance.id,
      role,
      status: subjectInstance.status,
      subjectName: subject?.name ?? "Unknown subject",
      subjectType: subject?.subject_type ?? null,
      title: subjectInstance.name,
      year: academicYear?.year ?? null,
    },
  };
}
