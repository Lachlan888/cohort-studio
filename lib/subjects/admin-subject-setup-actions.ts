"use server";

import { revalidatePath } from "next/cache";
import { insertAuditEvent } from "../audit/audit-events";
import type { CurrentProfile } from "../auth/current-profile";
import { getCurrentProfile } from "../auth/current-profile";
import { isSystemAdmin } from "../auth/permissions";
import { createClient } from "../supabase/server";
import {
  parseStudentImportCsv,
  type StudentImportCsvIssue,
  type StudentImportCsvRow,
} from "./parse-student-import-csv";

type ClassStatus = "active" | "archived";
type EnrolmentStatus = "active" | "archived" | "moved" | "withdrawn";
type StudentStatus = "active" | "inactive" | "archived";
type StructureStatus = "active" | "archived";

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

type UpdateBuilder<Row> = {
  eq(column: string, value: string): UpdateBuilder<Row>;
  select(columns: string): {
    single(): Promise<QueryResult<Row>>;
  };
};

type SubjectInstanceRow = {
  id: string;
  school_id: string;
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
  school_id: string;
  student_code: string | null;
  surname: string;
};

type UnitRow = {
  id: string;
  name: string;
  school_id: string;
  subject_instance_id: string;
};

type OutcomeRow = {
  id: string;
  name: string;
};

type EnrolmentRow = {
  id: string;
  status: string;
};

type CreatedRow = {
  id: string;
};

type ClassInsert = {
  name: string;
  school_id: string;
  status: ClassStatus;
  subject_instance_id: string;
};

type StudentInsert = {
  email: string | null;
  first_name: string;
  preferred_name: string | null;
  school_id: string;
  status: StudentStatus;
  student_code: string | null;
  surname: string;
};

type EnrolmentInsert = {
  class_id: string;
  school_id: string;
  status: EnrolmentStatus;
  student_id: string;
};

type UnitInsert = {
  description: string | null;
  name: string;
  school_id: string;
  sort_order: number;
  status: StructureStatus;
  subject_instance_id: string;
};

type OutcomeInsert = {
  description: string | null;
  name: string;
  school_id: string;
  sort_order: number;
  status: StructureStatus;
  subject_instance_id: string;
  unit_id: string;
};

type SelectTable<Row> = {
  select(columns: string): FilterBuilder<Row>;
};

type InsertTable<InsertRow, ResultRow> = SelectTable<ResultRow> & {
  insert(row: InsertRow): InsertBuilder<ResultRow>;
};

type MutableTable<InsertRow, UpdateRow, ResultRow> = InsertTable<
  InsertRow,
  ResultRow
> & {
  update(row: UpdateRow): UpdateBuilder<ResultRow>;
};

type AdminSubjectSetupClient = {
  from(
    table: "class_enrolments",
  ): MutableTable<EnrolmentInsert, { status: EnrolmentStatus }, EnrolmentRow>;
  from(table: "classes"): InsertTable<ClassInsert, ClassRow>;
  from(table: "outcomes"): InsertTable<OutcomeInsert, OutcomeRow>;
  from(table: "students"): InsertTable<StudentInsert, StudentRow>;
  from(table: "subject_instances"): SelectTable<SubjectInstanceRow>;
  from(table: "units"): InsertTable<UnitInsert, UnitRow>;
};

export type AdminSubjectSetupFormState = {
  error: string | null;
  success: string | null;
};

export type AdminStudentImportSummary = {
  alreadyEnrolledRows: number;
  enrolmentsCreated: number;
  enrolmentsReactivated: number;
  existingStudentsReused: number;
  rowsParsed: number;
  rowsSkipped: number;
  rowsValid: number;
  studentsCreated: number;
};

export type AdminStudentImportFormState = {
  error: string | null;
  errors: StudentImportCsvIssue[];
  success: string | null;
  summary: AdminStudentImportSummary | null;
  warnings: StudentImportCsvIssue[];
};

const initialDeniedState: AdminSubjectSetupFormState = {
  error: "You do not have permission to manage subject setup.",
  success: null,
};

const initialImportDeniedState: AdminStudentImportFormState = {
  error: "You do not have permission to import students.",
  errors: [],
  success: null,
  summary: null,
  warnings: [],
};

const allowedClassStatuses = new Set<string>(["active", "archived"]);
const allowedEnrolmentStatuses = new Set<string>([
  "active",
  "archived",
  "moved",
  "withdrawn",
]);
const allowedStudentStatuses = new Set<string>([
  "active",
  "inactive",
  "archived",
]);
const allowedStructureStatuses = new Set<string>(["active", "archived"]);

function getTextValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isClassStatus(status: string): status is ClassStatus {
  return allowedClassStatuses.has(status);
}

function isEnrolmentStatus(status: string): status is EnrolmentStatus {
  return allowedEnrolmentStatuses.has(status);
}

function isStudentStatus(status: string): status is StudentStatus {
  return allowedStudentStatuses.has(status);
}

function isStructureStatus(status: string): status is StructureStatus {
  return allowedStructureStatuses.has(status);
}

function parseSortOrder(value: string) {
  if (!value) {
    return 0;
  }

  if (!/^-?\d+$/.test(value)) {
    return null;
  }

  return Number(value);
}

function isUniqueViolation(error: QueryError | null) {
  return error?.code === "23505";
}

function normalizeComparableText(value: string) {
  return value.trim().toLowerCase();
}

async function getAdminContext() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile || !isSystemAdmin(currentProfile)) {
    return null;
  }

  const supabase = await createClient();

  return {
    currentProfile,
    tableClient: supabase as unknown as AdminSubjectSetupClient,
  };
}

async function getVisibleSubjectInstance(
  tableClient: AdminSubjectSetupClient,
  schoolId: string,
  subjectInstanceId: string,
) {
  const { data: subjectInstance } = await tableClient
    .from("subject_instances")
    .select("id, school_id")
    .eq("school_id", schoolId)
    .eq("id", subjectInstanceId)
    .maybeSingle();

  return subjectInstance;
}

async function getVisibleClass(
  tableClient: AdminSubjectSetupClient,
  schoolId: string,
  subjectInstanceId: string,
  classId: string,
) {
  const { data: classRow } = await tableClient
    .from("classes")
    .select("id, name, school_id, status, subject_instance_id")
    .eq("school_id", schoolId)
    .eq("subject_instance_id", subjectInstanceId)
    .eq("id", classId)
    .maybeSingle();

  return classRow;
}

async function findOrCreateStudentForImport({
  currentProfile,
  row,
  tableClient,
}: {
  currentProfile: CurrentProfile;
  row: StudentImportCsvRow;
  tableClient: AdminSubjectSetupClient;
}) {
  let student: StudentRow | null = null;
  let created = false;

  if (row.studentId) {
    const { data } = await tableClient
      .from("students")
      .select("email, first_name, id, school_id, student_code, surname")
      .eq("school_id", currentProfile.school_id)
      .eq("student_code", row.studentId)
      .maybeSingle();

    student = data;
  }

  if (!student && row.email) {
    const { data: matchingStudents } = await tableClient
      .from("students")
      .select("email, first_name, id, school_id, student_code, surname")
      .eq("school_id", currentProfile.school_id)
      .eq("first_name", row.firstName)
      .eq("surname", row.surname)
      .eq("email", row.email);

    student = matchingStudents?.[0] ?? null;
  }

  if (!student) {
    const { data, error } = await tableClient
      .from("students")
      .insert({
        email: row.email,
        first_name: row.firstName,
        preferred_name: row.preferredName,
        school_id: currentProfile.school_id,
        status: "active",
        student_code: row.studentId,
        surname: row.surname,
      })
      .select("email, first_name, id, school_id, student_code, surname")
      .single();

    if (error || !data) {
      return {
        created,
        error: isUniqueViolation(error)
          ? "A student with that student_id already exists."
          : "Could not create the student.",
        student: null,
      };
    }

    student = data;
    created = true;
  }

  return { created, error: null, student };
}

async function enrolStudentForImport({
  classRow,
  currentProfile,
  student,
  subjectInstance,
  tableClient,
}: {
  classRow: ClassRow;
  currentProfile: CurrentProfile;
  student: StudentRow;
  subjectInstance: SubjectInstanceRow;
  tableClient: AdminSubjectSetupClient;
}) {
  const { data: existingEnrolment } = await tableClient
    .from("class_enrolments")
    .select("id, status")
    .eq("school_id", currentProfile.school_id)
    .eq("class_id", classRow.id)
    .eq("student_id", student.id)
    .maybeSingle();

  if (existingEnrolment?.status === "active") {
    return {
      enrolmentId: existingEnrolment.id,
      error: null,
      outcome: "already_enrolled" as const,
    };
  }

  if (
    existingEnrolment &&
    (existingEnrolment.status === "withdrawn" ||
      existingEnrolment.status === "moved" ||
      existingEnrolment.status === "archived")
  ) {
    const { data: updatedEnrolment, error } = await tableClient
      .from("class_enrolments")
      .update({ status: "active" })
      .eq("school_id", currentProfile.school_id)
      .eq("id", existingEnrolment.id)
      .select("id, status")
      .single();

    if (error || !updatedEnrolment) {
      return {
        enrolmentId: null,
        error: "Could not reactivate the existing enrolment.",
        outcome: "error" as const,
      };
    }

    await writeSubjectSetupAuditEvent({
      currentProfile,
      entityId: updatedEnrolment.id,
      entityType: "class_enrolment",
      eventType: "student_enrolled",
      metadata: {
        class_id: classRow.id,
        previous_status: existingEnrolment.status,
        student_id: student.id,
        subject_instance_id: subjectInstance.id,
      },
      newValues: {
        status: "active",
      },
      parentEntityId: subjectInstance.id,
    });

    return {
      enrolmentId: updatedEnrolment.id,
      error: null,
      outcome: "reactivated" as const,
    };
  }

  const { data: createdEnrolment, error } = await tableClient
    .from("class_enrolments")
    .insert({
      class_id: classRow.id,
      school_id: currentProfile.school_id,
      status: "active",
      student_id: student.id,
    })
    .select("id, status")
    .single();

  if (error || !createdEnrolment) {
    return {
      enrolmentId: null,
      error: isUniqueViolation(error)
        ? "Student already has an enrolment for this class."
        : "Could not create the enrolment.",
      outcome: "error" as const,
    };
  }

  await writeSubjectSetupAuditEvent({
    currentProfile,
    entityId: createdEnrolment.id,
    entityType: "class_enrolment",
    eventType: "student_enrolled",
    metadata: {
      class_id: classRow.id,
      student_id: student.id,
      subject_instance_id: subjectInstance.id,
    },
    newValues: {
      status: "active",
    },
    parentEntityId: subjectInstance.id,
  });

  return {
    enrolmentId: createdEnrolment.id,
    error: null,
    outcome: "created" as const,
  };
}

async function getVisibleUnit(
  tableClient: AdminSubjectSetupClient,
  schoolId: string,
  subjectInstanceId: string,
  unitId: string,
) {
  const { data: unit } = await tableClient
    .from("units")
    .select("id, school_id, subject_instance_id")
    .eq("school_id", schoolId)
    .eq("subject_instance_id", subjectInstanceId)
    .eq("id", unitId)
    .maybeSingle();

  return unit;
}

function revalidateSubjectWorkspace(subjectInstanceId: string) {
  revalidatePath("/subjects");
  revalidatePath(`/subjects/${subjectInstanceId}`);
  revalidatePath(`/subjects/${subjectInstanceId}/classes`);
  revalidatePath(`/subjects/${subjectInstanceId}/students`);
}

async function writeSubjectSetupAuditEvent({
  currentProfile,
  entityId,
  entityType,
  eventType,
  metadata,
  newValues,
  parentEntityId,
  parentEntityType = "subject_instance",
}: {
  currentProfile: CurrentProfile;
  entityId: string;
  entityType: string;
  eventType: string;
  metadata?: Record<string, string | number | boolean | null>;
  newValues?: Record<string, string | number | boolean | null>;
  parentEntityId?: string;
  parentEntityType?: string;
}) {
  return insertAuditEvent({
    actor_display_name: currentProfile.display_name,
    actor_email: currentProfile.email,
    actor_profile_id: currentProfile.id,
    entity_id: entityId,
    entity_type: entityType,
    event_type: eventType,
    metadata: {
      source: "admin_subject_setup",
      ...metadata,
    },
    new_values: newValues,
    parent_entity_id: parentEntityId,
    parent_entity_type: parentEntityId ? parentEntityType : undefined,
    school_id: currentProfile.school_id,
  });
}

export async function adminCreateSubjectClass(
  _previousState: AdminSubjectSetupFormState,
  formData: FormData,
): Promise<AdminSubjectSetupFormState> {
  const context = await getAdminContext();

  if (!context) {
    return initialDeniedState;
  }

  const subjectInstanceId = getTextValue(formData, "subject_instance_id");
  const name = getTextValue(formData, "class_name");
  const status = getTextValue(formData, "class_status");

  if (!subjectInstanceId) {
    return { error: "Subject instance is required.", success: null };
  }

  if (!name) {
    return { error: "Enter a class name.", success: null };
  }

  if (!isClassStatus(status)) {
    return { error: "Choose an allowed class status.", success: null };
  }

  const { currentProfile, tableClient } = context;
  const subjectInstance = await getVisibleSubjectInstance(
    tableClient,
    currentProfile.school_id,
    subjectInstanceId,
  );

  if (!subjectInstance) {
    return { error: "Subject instance is not visible.", success: null };
  }

  const { data: existingClasses } = await tableClient
    .from("classes")
    .select("id, name, school_id, subject_instance_id")
    .eq("school_id", currentProfile.school_id)
    .eq("subject_instance_id", subjectInstance.id);
  const duplicateClass = (existingClasses ?? []).find(
    (classRow) =>
      normalizeComparableText(classRow.name) === normalizeComparableText(name),
  );

  if (duplicateClass) {
    return {
      error: "A class with that name already exists for this subject.",
      success: null,
    };
  }

  const { data: createdClass, error } = await tableClient
    .from("classes")
    .insert({
      name,
      school_id: currentProfile.school_id,
      status,
      subject_instance_id: subjectInstance.id,
    })
    .select("id, school_id, subject_instance_id")
    .single();

  if (error || !createdClass) {
    return {
      error: isUniqueViolation(error)
        ? "A class with that name already exists for this subject."
        : "Could not create the class. Please try again.",
      success: null,
    };
  }

  await writeSubjectSetupAuditEvent({
    currentProfile,
    entityId: createdClass.id,
    entityType: "class",
    eventType: "class_created",
    newValues: {
      name,
      status,
      subject_instance_id: subjectInstance.id,
    },
    parentEntityId: subjectInstance.id,
  });

  revalidateSubjectWorkspace(subjectInstance.id);

  return { error: null, success: "Class created." };
}

export async function adminCreateStudentAndEnrol(
  _previousState: AdminSubjectSetupFormState,
  formData: FormData,
): Promise<AdminSubjectSetupFormState> {
  const context = await getAdminContext();

  if (!context) {
    return initialDeniedState;
  }

  const subjectInstanceId = getTextValue(formData, "subject_instance_id");
  const classId = getTextValue(formData, "class_id");
  const firstName = getTextValue(formData, "first_name");
  const surname = getTextValue(formData, "surname");
  const preferredName = getTextValue(formData, "preferred_name") || null;
  const studentCode = getTextValue(formData, "student_code") || null;
  const email = getTextValue(formData, "email") || null;
  const studentStatus = getTextValue(formData, "student_status");
  const enrolmentStatus = getTextValue(formData, "enrolment_status");

  if (!subjectInstanceId) {
    return { error: "Subject instance is required.", success: null };
  }

  if (!classId) {
    return { error: "Choose a class for the enrolment.", success: null };
  }

  if (!firstName || !surname) {
    return {
      error: "Enter the student's first name and surname.",
      success: null,
    };
  }

  if (!isStudentStatus(studentStatus)) {
    return { error: "Choose an allowed student status.", success: null };
  }

  if (!isEnrolmentStatus(enrolmentStatus)) {
    return { error: "Choose an allowed enrolment status.", success: null };
  }

  const { currentProfile, tableClient } = context;
  const subjectInstance = await getVisibleSubjectInstance(
    tableClient,
    currentProfile.school_id,
    subjectInstanceId,
  );

  if (!subjectInstance) {
    return { error: "Subject instance is not visible.", success: null };
  }

  const classRow = await getVisibleClass(
    tableClient,
    currentProfile.school_id,
    subjectInstance.id,
    classId,
  );

  if (!classRow) {
    return { error: "Class is not visible for this subject.", success: null };
  }

  let student: StudentRow | null = null;
  let createdStudent = false;

  if (studentCode) {
    const { data } = await tableClient
      .from("students")
      .select("email, first_name, id, school_id, student_code, surname")
      .eq("school_id", currentProfile.school_id)
      .eq("student_code", studentCode)
      .maybeSingle();

    student = data;
  }

  if (!student && email) {
    const { data: matchingStudents } = await tableClient
      .from("students")
      .select("email, first_name, id, school_id, student_code, surname")
      .eq("school_id", currentProfile.school_id)
      .eq("first_name", firstName)
      .eq("surname", surname)
      .eq("email", email);

    student = matchingStudents?.[0] ?? null;
  }

  if (!student) {
    const { data, error } = await tableClient
      .from("students")
      .insert({
        email,
        first_name: firstName,
        preferred_name: preferredName,
        school_id: currentProfile.school_id,
        status: studentStatus,
        student_code: studentCode,
        surname,
      })
      .select("email, first_name, id, school_id, student_code, surname")
      .single();

    if (error || !data) {
      return {
        error: isUniqueViolation(error)
          ? "A student with that code already exists."
          : "Could not create the student. Please try again.",
        success: null,
      };
    }

    student = data;
    createdStudent = true;
  }

  if (!student) {
    return {
      error: "Could not find or create that student. Please try again.",
      success: null,
    };
  }

  const { data: existingEnrolment } = await tableClient
    .from("class_enrolments")
    .select("id, status")
    .eq("school_id", currentProfile.school_id)
    .eq("class_id", classRow.id)
    .eq("student_id", student.id)
    .maybeSingle();

  if (existingEnrolment?.status === "active") {
    return {
      error: null,
      success: createdStudent
        ? "Student created. They were already enrolled in this class."
        : "Student is already enrolled in this class.",
    };
  }

  if (
    existingEnrolment &&
    (existingEnrolment.status === "withdrawn" ||
      existingEnrolment.status === "moved" ||
      existingEnrolment.status === "archived")
  ) {
    const { data: updatedEnrolment, error } = await tableClient
      .from("class_enrolments")
      .update({ status: "active" })
      .eq("school_id", currentProfile.school_id)
      .eq("id", existingEnrolment.id)
      .select("id, status")
      .single();

    if (error || !updatedEnrolment) {
      return {
        error:
          "This student already has an enrolment for the selected class, but it could not be reactivated.",
        success: null,
      };
    }

    await writeSubjectSetupAuditEvent({
      currentProfile,
      entityId: updatedEnrolment.id,
      entityType: "class_enrolment",
      eventType: "student_enrolled",
      metadata: {
        class_id: classRow.id,
        previous_status: existingEnrolment.status,
        student_id: student.id,
        subject_instance_id: subjectInstance.id,
      },
      newValues: {
        status: "active",
      },
      parentEntityId: subjectInstance.id,
    });

    revalidateSubjectWorkspace(subjectInstance.id);

    return {
      error: null,
      success: createdStudent
        ? "Student created and enrolment reactivated."
        : "Student enrolment reactivated.",
    };
  }

  if (createdStudent) {
    await writeSubjectSetupAuditEvent({
      currentProfile,
      entityId: student.id,
      entityType: "student",
      eventType: "student_created",
      newValues: {
        email,
        first_name: firstName,
        preferred_name: preferredName,
        status: studentStatus,
        student_code: studentCode,
        surname,
      },
    });
  }

  const { data: createdEnrolment, error: enrolmentError } = await tableClient
    .from("class_enrolments")
    .insert({
      class_id: classRow.id,
      school_id: currentProfile.school_id,
      status: enrolmentStatus,
      student_id: student.id,
    })
    .select("id, status")
    .single();

  if (enrolmentError || !createdEnrolment) {
    return {
      error: isUniqueViolation(enrolmentError)
        ? "That student already has an enrolment for this class."
        : "Could not enrol the student. Please try again.",
      success: null,
    };
  }

  await writeSubjectSetupAuditEvent({
    currentProfile,
    entityId: createdEnrolment.id,
    entityType: "class_enrolment",
    eventType: "student_enrolled",
    metadata: {
      class_id: classRow.id,
      student_id: student.id,
      subject_instance_id: subjectInstance.id,
    },
    newValues: {
      status: enrolmentStatus,
    },
    parentEntityId: subjectInstance.id,
  });

  revalidateSubjectWorkspace(subjectInstance.id);

  return {
    error: null,
    success: createdStudent
      ? "Student created and enrolled."
      : "Existing student enrolled.",
  };
}

export async function adminImportStudentsFromCsv(
  _previousState: AdminStudentImportFormState,
  formData: FormData,
): Promise<AdminStudentImportFormState> {
  const context = await getAdminContext();

  if (!context) {
    return initialImportDeniedState;
  }

  const subjectInstanceId = getTextValue(formData, "subject_instance_id");
  const csvText = getTextValue(formData, "student_import_csv");

  if (!subjectInstanceId) {
    return {
      error: "Subject instance is required.",
      errors: [],
      success: null,
      summary: null,
      warnings: [],
    };
  }

  if (!csvText) {
    return {
      error: "Paste CSV data before importing.",
      errors: [],
      success: null,
      summary: null,
      warnings: [],
    };
  }

  const { currentProfile, tableClient } = context;
  const subjectInstance = await getVisibleSubjectInstance(
    tableClient,
    currentProfile.school_id,
    subjectInstanceId,
  );

  if (!subjectInstance) {
    return {
      error: "Subject instance is not visible.",
      errors: [],
      success: null,
      summary: null,
      warnings: [],
    };
  }

  const { data: classes } = await tableClient
    .from("classes")
    .select("id, name, school_id, status, subject_instance_id")
    .eq("school_id", currentProfile.school_id)
    .eq("subject_instance_id", subjectInstance.id)
    .eq("status", "active");
  const classesByName = new Map(
    (classes ?? []).map((classRow) => [
      normalizeComparableText(classRow.name),
      classRow,
    ]),
  );
  const parseResult = parseStudentImportCsv(
    csvText,
    new Set(classesByName.keys()),
  );
  const validationSkippedRows = new Set(
    parseResult.errors
      .filter((issue) => issue.rowNumber && issue.rowNumber > 1)
      .map((issue) => issue.rowNumber),
  ).size;
  const summary: AdminStudentImportSummary = {
    alreadyEnrolledRows: 0,
    enrolmentsCreated: 0,
    enrolmentsReactivated: 0,
    existingStudentsReused: 0,
    rowsParsed: parseResult.rowsParsed,
    rowsSkipped: validationSkippedRows,
    rowsValid: parseResult.rows.length,
    studentsCreated: 0,
  };
  const errors = [...parseResult.errors];
  const warnings = [...parseResult.warnings];

  for (const row of parseResult.rows) {
    const classRow = classesByName.get(normalizeComparableText(row.className));

    if (!classRow) {
      errors.push({
        message: `Unknown active class: ${row.className}.`,
        rowNumber: row.rowNumber,
      });
      summary.rowsSkipped += 1;
      continue;
    }

    const {
      created,
      error: studentError,
      student,
    } = await findOrCreateStudentForImport({
      currentProfile,
      row,
      tableClient,
    });

    if (studentError || !student) {
      errors.push({
        message: studentError ?? "Could not find or create the student.",
        rowNumber: row.rowNumber,
      });
      summary.rowsSkipped += 1;
      continue;
    }

    if (created) {
      summary.studentsCreated += 1;

      await writeSubjectSetupAuditEvent({
        currentProfile,
        entityId: student.id,
        entityType: "student",
        eventType: "student_created",
        metadata: {
          source_row: row.rowNumber,
          subject_instance_id: subjectInstance.id,
        },
        newValues: {
          email: row.email,
          first_name: row.firstName,
          preferred_name: row.preferredName,
          status: "active",
          student_code: row.studentId,
          surname: row.surname,
        },
      });
    } else {
      summary.existingStudentsReused += 1;
      warnings.push({
        message: "Existing student reused.",
        rowNumber: row.rowNumber,
      });
    }

    const enrolmentResult = await enrolStudentForImport({
      classRow,
      currentProfile,
      student,
      subjectInstance,
      tableClient,
    });

    if (enrolmentResult.error) {
      errors.push({
        message: enrolmentResult.error,
        rowNumber: row.rowNumber,
      });
      summary.rowsSkipped += 1;
      continue;
    }

    if (enrolmentResult.outcome === "already_enrolled") {
      summary.alreadyEnrolledRows += 1;
      warnings.push({
        message: "Student was already actively enrolled in this class.",
        rowNumber: row.rowNumber,
      });
    }

    if (enrolmentResult.outcome === "created") {
      summary.enrolmentsCreated += 1;
    }

    if (enrolmentResult.outcome === "reactivated") {
      summary.enrolmentsReactivated += 1;
    }
  }

  if (
    summary.studentsCreated > 0 ||
    summary.existingStudentsReused > 0 ||
    summary.enrolmentsCreated > 0 ||
    summary.enrolmentsReactivated > 0 ||
    summary.alreadyEnrolledRows > 0
  ) {
    await writeSubjectSetupAuditEvent({
      currentProfile,
      entityId: subjectInstance.id,
      entityType: "subject_instance",
      eventType: "student_import_committed",
      metadata: {
        already_enrolled_rows: summary.alreadyEnrolledRows,
        enrolments_created: summary.enrolmentsCreated,
        enrolments_reactivated: summary.enrolmentsReactivated,
        existing_students_reused: summary.existingStudentsReused,
        rows_parsed: summary.rowsParsed,
        rows_skipped: summary.rowsSkipped,
        rows_valid: summary.rowsValid,
        students_created: summary.studentsCreated,
      },
    });

    revalidateSubjectWorkspace(subjectInstance.id);
  }

  const importedSomething =
    summary.enrolmentsCreated > 0 ||
    summary.enrolmentsReactivated > 0 ||
    summary.alreadyEnrolledRows > 0;

  return {
    error: importedSomething ? null : "No rows were imported.",
    errors,
    success:
      errors.length > 0 && importedSomething
        ? "Only valid rows were imported. Rows with errors were skipped."
        : importedSomething
          ? "Student import completed."
          : null,
    summary,
    warnings,
  };
}

export async function adminCreateSubjectUnit(
  _previousState: AdminSubjectSetupFormState,
  formData: FormData,
): Promise<AdminSubjectSetupFormState> {
  const context = await getAdminContext();

  if (!context) {
    return initialDeniedState;
  }

  const subjectInstanceId = getTextValue(formData, "subject_instance_id");
  const name = getTextValue(formData, "unit_name");
  const description = getTextValue(formData, "unit_description") || null;
  const sortOrder = parseSortOrder(getTextValue(formData, "unit_sort_order"));
  const status = getTextValue(formData, "unit_status");

  if (!subjectInstanceId) {
    return { error: "Subject instance is required.", success: null };
  }

  if (!name) {
    return { error: "Enter a unit name.", success: null };
  }

  if (sortOrder === null) {
    return { error: "Sort order must be a whole number.", success: null };
  }

  if (!isStructureStatus(status)) {
    return { error: "Choose an allowed unit status.", success: null };
  }

  const { currentProfile, tableClient } = context;
  const subjectInstance = await getVisibleSubjectInstance(
    tableClient,
    currentProfile.school_id,
    subjectInstanceId,
  );

  if (!subjectInstance) {
    return { error: "Subject instance is not visible.", success: null };
  }

  const { data: existingUnits } = await tableClient
    .from("units")
    .select("id, name, school_id, subject_instance_id")
    .eq("school_id", currentProfile.school_id)
    .eq("subject_instance_id", subjectInstance.id);
  const duplicateUnit = (existingUnits ?? []).find(
    (unit) =>
      normalizeComparableText(unit.name) === normalizeComparableText(name),
  );

  if (duplicateUnit) {
    return {
      error: "A unit with that name already exists for this subject.",
      success: null,
    };
  }

  const { data: createdUnit, error } = await tableClient
    .from("units")
    .insert({
      description,
      name,
      school_id: currentProfile.school_id,
      sort_order: sortOrder,
      status,
      subject_instance_id: subjectInstance.id,
    })
    .select("id, school_id, subject_instance_id")
    .single();

  if (error || !createdUnit) {
    return {
      error: isUniqueViolation(error)
        ? "A unit with that name already exists for this subject."
        : "Could not create the unit. Please try again.",
      success: null,
    };
  }

  await writeSubjectSetupAuditEvent({
    currentProfile,
    entityId: createdUnit.id,
    entityType: "unit",
    eventType: "unit_created",
    newValues: {
      description,
      name,
      sort_order: sortOrder,
      status,
      subject_instance_id: subjectInstance.id,
    },
    parentEntityId: subjectInstance.id,
  });

  revalidateSubjectWorkspace(subjectInstance.id);

  return { error: null, success: "Unit created." };
}

export async function adminCreateSubjectOutcome(
  _previousState: AdminSubjectSetupFormState,
  formData: FormData,
): Promise<AdminSubjectSetupFormState> {
  const context = await getAdminContext();

  if (!context) {
    return initialDeniedState;
  }

  const subjectInstanceId = getTextValue(formData, "subject_instance_id");
  const unitId = getTextValue(formData, "unit_id");
  const name = getTextValue(formData, "outcome_name");
  const description = getTextValue(formData, "outcome_description") || null;
  const sortOrder = parseSortOrder(
    getTextValue(formData, "outcome_sort_order"),
  );
  const status = getTextValue(formData, "outcome_status");

  if (!subjectInstanceId) {
    return { error: "Subject instance is required.", success: null };
  }

  if (!unitId) {
    return { error: "Choose a unit for the outcome.", success: null };
  }

  if (!name) {
    return { error: "Enter an outcome name.", success: null };
  }

  if (sortOrder === null) {
    return { error: "Sort order must be a whole number.", success: null };
  }

  if (!isStructureStatus(status)) {
    return { error: "Choose an allowed outcome status.", success: null };
  }

  const { currentProfile, tableClient } = context;
  const subjectInstance = await getVisibleSubjectInstance(
    tableClient,
    currentProfile.school_id,
    subjectInstanceId,
  );

  if (!subjectInstance) {
    return { error: "Subject instance is not visible.", success: null };
  }

  const unit = await getVisibleUnit(
    tableClient,
    currentProfile.school_id,
    subjectInstance.id,
    unitId,
  );

  if (!unit) {
    return { error: "Unit is not visible for this subject.", success: null };
  }

  const { data: existingOutcomes } = await tableClient
    .from("outcomes")
    .select("id, name")
    .eq("school_id", currentProfile.school_id)
    .eq("unit_id", unit.id);
  const duplicateOutcome = (existingOutcomes ?? []).find(
    (outcome) =>
      normalizeComparableText(outcome.name) === normalizeComparableText(name),
  );

  if (duplicateOutcome) {
    return {
      error: "An outcome with that name already exists for this unit.",
      success: null,
    };
  }

  const { data: createdOutcome, error } = await tableClient
    .from("outcomes")
    .insert({
      description,
      name,
      school_id: currentProfile.school_id,
      sort_order: sortOrder,
      status,
      subject_instance_id: subjectInstance.id,
      unit_id: unit.id,
    })
    .select("id")
    .single();

  if (error || !createdOutcome) {
    return {
      error: isUniqueViolation(error)
        ? "An outcome with that name already exists for this unit."
        : "Could not create the outcome. Please try again.",
      success: null,
    };
  }

  await writeSubjectSetupAuditEvent({
    currentProfile,
    entityId: createdOutcome.id,
    entityType: "outcome",
    eventType: "outcome_created",
    metadata: {
      unit_id: unit.id,
    },
    newValues: {
      description,
      name,
      sort_order: sortOrder,
      status,
      subject_instance_id: subjectInstance.id,
      unit_id: unit.id,
    },
    parentEntityId: subjectInstance.id,
  });

  revalidateSubjectWorkspace(subjectInstance.id);

  return { error: null, success: "Outcome created." };
}
