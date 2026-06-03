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

type SubjectRow = {
  id: string;
  name: string;
  school_id: string;
  status: string;
  subject_type: string | null;
};

type CreateSubjectTableClient = {
  from(table: "academic_years"): TableQuery<AcademicYearRow>;
  from(table: "subjects"): TableQuery<SubjectRow>;
};

export type CreateSubjectPageAcademicYear = {
  id: string;
  status: string;
  year: number;
};

export type CreateSubjectPageSubject = {
  id: string;
  name: string;
  status: string;
  subjectType: string | null;
};

export type CreateSubjectPageData = {
  academicYears: CreateSubjectPageAcademicYear[];
  canAdminCreateSubjectInstances: boolean;
  currentProfile: CurrentProfile | null;
  subjects: CreateSubjectPageSubject[];
};

export async function getCreateSubjectPageData(): Promise<CreateSubjectPageData> {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile) {
    return {
      academicYears: [],
      canAdminCreateSubjectInstances: false,
      currentProfile: null,
      subjects: [],
    };
  }

  const canAdminCreateSubjectInstances = isSystemAdmin(currentProfile);

  if (!canAdminCreateSubjectInstances) {
    return {
      academicYears: [],
      canAdminCreateSubjectInstances,
      currentProfile,
      subjects: [],
    };
  }

  const supabase = await createClient();
  const tableClient = supabase as unknown as CreateSubjectTableClient;
  const [{ data: academicYears }, { data: subjects }] = await Promise.all([
    tableClient
      .from("academic_years")
      .select("id, school_id, status, year")
      .eq("school_id", currentProfile.school_id),
    tableClient
      .from("subjects")
      .select("id, name, school_id, status, subject_type")
      .eq("school_id", currentProfile.school_id),
  ]);

  return {
    academicYears: (academicYears ?? [])
      .map((academicYear) => ({
        id: academicYear.id,
        status: academicYear.status,
        year: academicYear.year,
      }))
      .sort((first, second) => second.year - first.year),
    canAdminCreateSubjectInstances,
    currentProfile,
    subjects: (subjects ?? [])
      .map((subject) => ({
        id: subject.id,
        name: subject.name,
        status: subject.status,
        subjectType: subject.subject_type,
      }))
      .sort((first, second) => first.name.localeCompare(second.name)),
  };
}
