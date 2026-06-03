"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "../auth/current-profile";
import { isSystemAdmin } from "../auth/permissions";
import { createClient } from "../supabase/server";

type AcademicYearStatus = "active" | "archived";
type SubjectInstanceStatus = "active" | "draft";
type SubjectStatus = "active" | "archived";

type AcademicYearInsert = {
  school_id: string;
  status: AcademicYearStatus;
  year: number;
};

type AcademicYearRow = {
  id: string;
  school_id: string;
  year: number;
};

type SubjectInsert = {
  name: string;
  school_id: string;
  status: SubjectStatus;
  subject_type: string | null;
};

type SubjectInstanceInsert = {
  academic_year_id: string;
  created_by: string;
  name: string;
  school_id: string;
  status: SubjectInstanceStatus;
  subject_id: string;
};

type SubjectInstanceRow = {
  id: string;
};

type SubjectRow = {
  id: string;
  name: string;
  school_id: string;
  subject_type: string | null;
};

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

type AcademicYearTable = {
  insert(row: AcademicYearInsert): InsertBuilder<AcademicYearRow>;
  select(columns: string): FilterBuilder<AcademicYearRow>;
};

type SubjectTable = {
  insert(row: SubjectInsert): InsertBuilder<SubjectRow>;
  select(columns: string): FilterBuilder<SubjectRow>;
};

type SubjectInstanceTable = {
  insert(row: SubjectInstanceInsert): InsertBuilder<SubjectInstanceRow>;
  select(columns: string): FilterBuilder<SubjectInstanceRow>;
};

type CreateSubjectActionClient = {
  from(table: "academic_years"): AcademicYearTable;
  from(table: "subject_instances"): SubjectInstanceTable;
  from(table: "subjects"): SubjectTable;
};

export type AdminCreateSubjectInstanceFormState = {
  createdSubjectId: string | null;
  error: string | null;
  success: string | null;
};

const allowedAcademicYearStatuses = new Set<string>(["active", "archived"]);
const allowedSubjectInstanceStatuses = new Set<string>(["draft", "active"]);
const allowedSubjectStatuses = new Set<string>(["active", "archived"]);

function getTextValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isAcademicYearStatus(status: string): status is AcademicYearStatus {
  return allowedAcademicYearStatuses.has(status);
}

function isSubjectInstanceStatus(
  status: string,
): status is SubjectInstanceStatus {
  return allowedSubjectInstanceStatuses.has(status);
}

function isSubjectStatus(status: string): status is SubjectStatus {
  return allowedSubjectStatuses.has(status);
}

function normalizeComparableText(value: string) {
  return value.trim().toLowerCase();
}

function parseYear(value: string) {
  if (!/^\d{4}$/.test(value)) {
    return null;
  }

  return Number(value);
}

function isUniqueViolation(error: QueryError | null) {
  return error?.code === "23505";
}

async function findOrCreateAcademicYear({
  schoolId,
  status,
  tableClient,
  year,
}: {
  schoolId: string;
  status: AcademicYearStatus;
  tableClient: CreateSubjectActionClient;
  year: number;
}) {
  const { data: existingAcademicYear } = await tableClient
    .from("academic_years")
    .select("id, school_id, year")
    .eq("school_id", schoolId)
    .eq("year", String(year))
    .maybeSingle();

  if (existingAcademicYear) {
    return { academicYear: existingAcademicYear, error: null };
  }

  const { data: createdAcademicYear, error } = await tableClient
    .from("academic_years")
    .insert({
      school_id: schoolId,
      status,
      year,
    })
    .select("id, school_id, year")
    .single();

  return { academicYear: createdAcademicYear, error };
}

async function findOrCreateSubject({
  name,
  schoolId,
  status,
  subjectType,
  tableClient,
}: {
  name: string;
  schoolId: string;
  status: SubjectStatus;
  subjectType: string | null;
  tableClient: CreateSubjectActionClient;
}) {
  const { data: existingSubjects } = await tableClient
    .from("subjects")
    .select("id, name, school_id, subject_type")
    .eq("school_id", schoolId);
  const existingSubject =
    existingSubjects?.find(
      (subject) =>
        normalizeComparableText(subject.name) === normalizeComparableText(name),
    ) ?? null;

  if (existingSubject) {
    return { error: null, subject: existingSubject };
  }

  const { data: createdSubject, error } = await tableClient
    .from("subjects")
    .insert({
      name,
      school_id: schoolId,
      status,
      subject_type: subjectType,
    })
    .select("id, name, school_id, subject_type")
    .single();

  return { error, subject: createdSubject };
}

export async function adminCreateSubjectInstance(
  _previousState: AdminCreateSubjectInstanceFormState,
  formData: FormData,
): Promise<AdminCreateSubjectInstanceFormState> {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile || !isSystemAdmin(currentProfile)) {
    return {
      createdSubjectId: null,
      error: "You do not have permission to create subject instances.",
      success: null,
    };
  }

  const existingAcademicYearId = getTextValue(formData, "academic_year_id");
  const newAcademicYear = parseYear(
    getTextValue(formData, "new_academic_year"),
  );
  const newAcademicYearStatus = getTextValue(
    formData,
    "new_academic_year_status",
  );
  const existingSubjectId = getTextValue(formData, "subject_id");
  const newSubjectName = getTextValue(formData, "new_subject_name");
  const newSubjectType = getTextValue(formData, "new_subject_type") || null;
  const newSubjectStatus = getTextValue(formData, "new_subject_status");
  const subjectInstanceName = getTextValue(formData, "subject_instance_name");
  const subjectInstanceStatus = getTextValue(
    formData,
    "subject_instance_status",
  );

  if (!existingAcademicYearId && !newAcademicYear) {
    return {
      createdSubjectId: null,
      error: "Choose an academic year or enter a new four-digit year.",
      success: null,
    };
  }

  if (
    newAcademicYear &&
    (!newAcademicYearStatus || !isAcademicYearStatus(newAcademicYearStatus))
  ) {
    return {
      createdSubjectId: null,
      error: "Choose an allowed academic year status.",
      success: null,
    };
  }

  if (!existingSubjectId && !newSubjectName) {
    return {
      createdSubjectId: null,
      error: "Choose a subject or enter a new subject name.",
      success: null,
    };
  }

  if (newSubjectName && !isSubjectStatus(newSubjectStatus)) {
    return {
      createdSubjectId: null,
      error: "Choose an allowed subject status.",
      success: null,
    };
  }

  if (!isSubjectInstanceStatus(subjectInstanceStatus)) {
    return {
      createdSubjectId: null,
      error: "Choose draft or active status for the subject instance.",
      success: null,
    };
  }

  const supabase = await createClient();
  const tableClient = supabase as unknown as CreateSubjectActionClient;
  let academicYear: AcademicYearRow | null = null;
  let subject: SubjectRow | null = null;

  if (existingAcademicYearId) {
    const { data } = await tableClient
      .from("academic_years")
      .select("id, school_id, year")
      .eq("school_id", currentProfile.school_id)
      .eq("id", existingAcademicYearId)
      .maybeSingle();

    academicYear = data;
  } else if (newAcademicYear && isAcademicYearStatus(newAcademicYearStatus)) {
    const { academicYear: createdOrExistingYear, error } =
      await findOrCreateAcademicYear({
        schoolId: currentProfile.school_id,
        status: newAcademicYearStatus,
        tableClient,
        year: newAcademicYear,
      });

    if (error && !isUniqueViolation(error)) {
      return {
        createdSubjectId: null,
        error: "Could not create the academic year. Please try again.",
        success: null,
      };
    }

    academicYear = createdOrExistingYear;
  }

  if (!academicYear) {
    return {
      createdSubjectId: null,
      error: "Could not find or create that academic year.",
      success: null,
    };
  }

  if (existingSubjectId) {
    const { data } = await tableClient
      .from("subjects")
      .select("id, name, school_id, subject_type")
      .eq("school_id", currentProfile.school_id)
      .eq("id", existingSubjectId)
      .maybeSingle();

    subject = data;
  } else if (newSubjectName && isSubjectStatus(newSubjectStatus)) {
    const { error, subject: createdOrExistingSubject } =
      await findOrCreateSubject({
        name: newSubjectName,
        schoolId: currentProfile.school_id,
        status: newSubjectStatus,
        subjectType: newSubjectType,
        tableClient,
      });

    if (error && !isUniqueViolation(error)) {
      return {
        createdSubjectId: null,
        error: "Could not create the subject catalogue row. Please try again.",
        success: null,
      };
    }

    subject = createdOrExistingSubject;
  }

  if (!subject) {
    return {
      createdSubjectId: null,
      error: "Could not find or create that subject catalogue row.",
      success: null,
    };
  }

  const instanceName =
    subjectInstanceName || `${subject.name} ${academicYear.year}`;
  const { data: existingSubjectInstance } = await tableClient
    .from("subject_instances")
    .select("id")
    .eq("school_id", currentProfile.school_id)
    .eq("subject_id", subject.id)
    .eq("academic_year_id", academicYear.id)
    .maybeSingle();

  if (existingSubjectInstance) {
    return {
      createdSubjectId: existingSubjectInstance.id,
      error: null,
      success: "That subject instance already exists.",
    };
  }

  const { data: createdSubjectInstance, error: subjectInstanceError } =
    await tableClient
      .from("subject_instances")
      .insert({
        academic_year_id: academicYear.id,
        created_by: currentProfile.id,
        name: instanceName,
        school_id: currentProfile.school_id,
        status: subjectInstanceStatus,
        subject_id: subject.id,
      })
      .select("id")
      .single();

  if (subjectInstanceError || !createdSubjectInstance) {
    if (isUniqueViolation(subjectInstanceError)) {
      return {
        createdSubjectId: null,
        error:
          "A subject instance already exists for that subject and academic year.",
        success: null,
      };
    }

    return {
      createdSubjectId: null,
      error: "Could not create the subject instance. Please try again.",
      success: null,
    };
  }

  revalidatePath("/subjects");
  revalidatePath(`/subjects/${createdSubjectInstance.id}`);

  return {
    createdSubjectId: createdSubjectInstance.id,
    error: null,
    success: "Subject instance created.",
  };
}
