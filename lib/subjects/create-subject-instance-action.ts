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
  details?: string;
  hint?: string;
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
  values: AdminCreateSubjectInstanceFormValues;
};

export type AdminCreateSubjectInstanceFormValues = {
  academicYearId: string;
  newAcademicYear: string;
  newAcademicYearStatus: string;
  newSubjectName: string;
  newSubjectStatus: string;
  newSubjectType: string;
  subjectId: string;
  subjectInstanceName: string;
  subjectInstanceStatus: string;
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

const initialCreateSubjectFormValues: AdminCreateSubjectInstanceFormValues = {
  academicYearId: "",
  newAcademicYear: "",
  newAcademicYearStatus: "active",
  newSubjectName: "",
  newSubjectStatus: "active",
  newSubjectType: "",
  subjectId: "",
  subjectInstanceName: "",
  subjectInstanceStatus: "draft",
};

function createErrorState(
  error: string,
  values: AdminCreateSubjectInstanceFormValues = initialCreateSubjectFormValues,
): AdminCreateSubjectInstanceFormState {
  return {
    createdSubjectId: null,
    error,
    success: null,
    values,
  };
}

function getSubmittedFormValues(
  formData: FormData,
): AdminCreateSubjectInstanceFormValues {
  return {
    academicYearId: getTextValue(formData, "academic_year_id"),
    newAcademicYear: getTextValue(formData, "new_academic_year"),
    newAcademicYearStatus:
      getTextValue(formData, "new_academic_year_status") ||
      initialCreateSubjectFormValues.newAcademicYearStatus,
    newSubjectName: getTextValue(formData, "new_subject_name"),
    newSubjectStatus:
      getTextValue(formData, "new_subject_status") ||
      initialCreateSubjectFormValues.newSubjectStatus,
    newSubjectType: getTextValue(formData, "new_subject_type"),
    subjectId: getTextValue(formData, "subject_id"),
    subjectInstanceName: getTextValue(formData, "subject_instance_name"),
    subjectInstanceStatus:
      getTextValue(formData, "subject_instance_status") ||
      initialCreateSubjectFormValues.subjectInstanceStatus,
  };
}

function formatQueryError(error: QueryError | null, fallback: string) {
  if (!error) {
    return fallback;
  }

  return [error.message, error.details, error.hint].filter(Boolean).join(" ");
}

function logSubjectCreateError(
  context: string,
  error: QueryError | null,
  metadata?: Record<string, string | number | null>,
) {
  console.error("adminCreateSubjectInstance failed", {
    context,
    error,
    metadata,
  });
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
  const { data: existingAcademicYear, error: existingAcademicYearError } =
    await tableClient
      .from("academic_years")
      .select("id, school_id, year")
      .eq("school_id", schoolId)
      .eq("year", String(year))
      .maybeSingle();

  if (existingAcademicYearError) {
    return { academicYear: null, error: existingAcademicYearError };
  }

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

  if (!error && !createdAcademicYear) {
    return {
      academicYear: null,
      error: {
        message:
          "Academic year insert returned no row. Check RLS select policy for academic_years.",
      },
    };
  }

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
  const { data: existingSubjects, error: existingSubjectsError } =
    await tableClient
      .from("subjects")
      .select("id, name, school_id, subject_type")
      .eq("school_id", schoolId);

  if (existingSubjectsError) {
    return { error: existingSubjectsError, subject: null };
  }

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

  if (!error && !createdSubject) {
    return {
      error: {
        message:
          "Subject insert returned no row. Check RLS select policy for subjects.",
      },
      subject: null,
    };
  }

  return { error, subject: createdSubject };
}

export async function adminCreateSubjectInstance(
  _previousState: AdminCreateSubjectInstanceFormState,
  formData: FormData,
): Promise<AdminCreateSubjectInstanceFormState> {
  const submittedValues = getSubmittedFormValues(formData);

  try {
    const currentProfile = await getCurrentProfile();

    if (!currentProfile || !isSystemAdmin(currentProfile)) {
      return createErrorState(
        "You do not have permission to create subject instances.",
      );
    }

    const values = submittedValues;
    const existingAcademicYearId = values.academicYearId;
    const newAcademicYear = parseYear(values.newAcademicYear);
    const newAcademicYearStatus = values.newAcademicYearStatus;
    const existingSubjectId = values.subjectId;
    const newSubjectName = values.newSubjectName;
    const newSubjectType = values.newSubjectType || null;
    const newSubjectStatus = values.newSubjectStatus;
    const subjectInstanceName = values.subjectInstanceName;
    const subjectInstanceStatus = values.subjectInstanceStatus;

    if (!existingAcademicYearId && !newAcademicYear) {
      return createErrorState(
        "Choose an academic year or enter a new four-digit year.",
        values,
      );
    }

    if (
      newAcademicYear &&
      (!newAcademicYearStatus || !isAcademicYearStatus(newAcademicYearStatus))
    ) {
      return createErrorState(
        "Choose an allowed academic year status.",
        values,
      );
    }

    if (!existingSubjectId && !newSubjectName) {
      return createErrorState(
        "Choose a subject or enter a new subject name.",
        values,
      );
    }

    if (newSubjectName && !isSubjectStatus(newSubjectStatus)) {
      return createErrorState("Choose an allowed subject status.", values);
    }

    if (!isSubjectInstanceStatus(subjectInstanceStatus)) {
      return createErrorState(
        "Choose draft or active status for the subject instance.",
        values,
      );
    }

    const supabase = await createClient();
    const tableClient = supabase as unknown as CreateSubjectActionClient;
    let academicYear: AcademicYearRow | null = null;
    let subject: SubjectRow | null = null;

    if (existingAcademicYearId) {
      const { data, error } = await tableClient
        .from("academic_years")
        .select("id, school_id, year")
        .eq("school_id", currentProfile.school_id)
        .eq("id", existingAcademicYearId)
        .maybeSingle();

      if (error) {
        logSubjectCreateError("load existing academic year", error, {
          academic_year_id: existingAcademicYearId,
          school_id: currentProfile.school_id,
        });

        return createErrorState(
          formatQueryError(error, "Could not load that academic year."),
          values,
        );
      }

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
        logSubjectCreateError("find or create academic year", error, {
          school_id: currentProfile.school_id,
          year: newAcademicYear,
        });

        return createErrorState(
          formatQueryError(error, "Could not create the academic year."),
          values,
        );
      }

      academicYear = createdOrExistingYear;
    }

    if (!academicYear) {
      return createErrorState(
        "Could not find or create that academic year.",
        values,
      );
    }

    if (existingSubjectId) {
      const { data, error } = await tableClient
        .from("subjects")
        .select("id, name, school_id, subject_type")
        .eq("school_id", currentProfile.school_id)
        .eq("id", existingSubjectId)
        .maybeSingle();

      if (error) {
        logSubjectCreateError("load existing subject", error, {
          school_id: currentProfile.school_id,
          subject_id: existingSubjectId,
        });

        return createErrorState(
          formatQueryError(error, "Could not load that subject."),
          values,
        );
      }

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
        logSubjectCreateError("find or create subject", error, {
          school_id: currentProfile.school_id,
          subject_name: newSubjectName,
        });

        return createErrorState(
          formatQueryError(
            error,
            "Could not create the subject catalogue row.",
          ),
          values,
        );
      }

      subject = createdOrExistingSubject;
    }

    if (!subject) {
      return createErrorState(
        "Could not find or create that subject catalogue row.",
        values,
      );
    }

    const instanceName =
      subjectInstanceName || `${subject.name} ${academicYear.year}`;
    const {
      data: existingSubjectInstance,
      error: existingSubjectInstanceError,
    } = await tableClient
      .from("subject_instances")
      .select("id")
      .eq("school_id", currentProfile.school_id)
      .eq("subject_id", subject.id)
      .eq("academic_year_id", academicYear.id)
      .maybeSingle();

    if (existingSubjectInstanceError) {
      logSubjectCreateError(
        "load existing subject instance",
        existingSubjectInstanceError,
        {
          academic_year_id: academicYear.id,
          school_id: currentProfile.school_id,
          subject_id: subject.id,
        },
      );

      return createErrorState(
        formatQueryError(
          existingSubjectInstanceError,
          "Could not check existing subject instances.",
        ),
        values,
      );
    }

    if (existingSubjectInstance) {
      return {
        createdSubjectId: existingSubjectInstance.id,
        error: null,
        success: "That subject instance already exists.",
        values: initialCreateSubjectFormValues,
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
        return createErrorState(
          "A subject instance already exists for that subject and academic year.",
          values,
        );
      }

      const fallback = !createdSubjectInstance
        ? "Subject instance insert returned no row. Check RLS select policy for subject_instances."
        : "Could not create the subject instance.";

      logSubjectCreateError("create subject instance", subjectInstanceError, {
        academic_year_id: academicYear.id,
        school_id: currentProfile.school_id,
        subject_id: subject.id,
      });

      return createErrorState(
        formatQueryError(subjectInstanceError, fallback),
        values,
      );
    }

    revalidatePath("/subjects");
    revalidatePath(`/subjects/${createdSubjectInstance.id}`);

    return {
      createdSubjectId: createdSubjectInstance.id,
      error: null,
      success: "Subject instance created.",
      values: initialCreateSubjectFormValues,
    };
  } catch (error) {
    console.error("adminCreateSubjectInstance failed", {
      context: "unexpected exception",
      error,
    });

    return createErrorState(
      error instanceof Error
        ? error.message
        : "Unexpected error while creating the subject instance.",
      submittedValues,
    );
  }
}
