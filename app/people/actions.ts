"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "../../lib/auth/current-profile";
import {
  canManagePeople,
  isAllowedGlobalRole,
  type AllowedGlobalRole,
} from "../../lib/auth/permissions";
import { createClient } from "../../lib/supabase/server";

type StaffProfileStatus = "invited" | "active";

type ProfileRow = {
  id: string;
};

type ProfileInsert = {
  auth_user_id: null;
  display_name: string;
  email: string;
  school_id: string;
  status: StaffProfileStatus;
};

type GlobalRoleInsert = {
  assigned_by: string;
  profile_id: string;
  role: AllowedGlobalRole;
  school_id: string;
};

type QueryError = {
  code?: string;
  message: string;
};

type QueryResult<Row> = {
  data: Row | null;
  error: QueryError | null;
};

type FilterBuilder<Row> = {
  eq(column: string, value: string): FilterBuilder<Row>;
  maybeSingle(): Promise<QueryResult<Row>>;
} & PromiseLike<{ data: Row[] | null; error: QueryError | null }>;

type InsertBuilder<Row> = {
  select(columns: string): {
    single(): Promise<QueryResult<Row>>;
  };
} & PromiseLike<{ error: QueryError | null }>;

type ProfileTable = {
  insert(row: ProfileInsert): InsertBuilder<ProfileRow>;
  select(columns: string): FilterBuilder<ProfileRow>;
};

type GlobalRoleTable = {
  insert(row: GlobalRoleInsert): Promise<{ error: QueryError | null }>;
};

type PeopleActionClient = {
  from(table: "profiles"): ProfileTable;
  from(table: "user_global_roles"): GlobalRoleTable;
};

export type CreateStaffProfileFormState = {
  error: string | null;
  success: string | null;
};

const allowedStatuses = new Set<string>(["invited", "active"]);

function getTextValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isStaffProfileStatus(status: string): status is StaffProfileStatus {
  return allowedStatuses.has(status);
}

function isDuplicateEmailError(error: QueryError) {
  return (
    error.code === "23505" ||
    error.message.includes("profiles_school_id_email_key")
  );
}

export async function createStaffProfile(
  _previousState: CreateStaffProfileFormState,
  formData: FormData,
): Promise<CreateStaffProfileFormState> {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile || !canManagePeople(currentProfile)) {
    return {
      error: "You do not have permission to create staff profiles.",
      success: null,
    };
  }

  const displayName = getTextValue(formData, "display_name");
  const email = getTextValue(formData, "email").toLowerCase();
  const status = getTextValue(formData, "status");
  const role = getTextValue(formData, "global_role");

  if (!displayName) {
    return { error: "Enter a display name.", success: null };
  }

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address.", success: null };
  }

  if (!isStaffProfileStatus(status)) {
    return { error: "Choose invited or active status.", success: null };
  }

  if (role && !isAllowedGlobalRole(role)) {
    return { error: "Choose an allowed global role.", success: null };
  }

  const globalRole = role && isAllowedGlobalRole(role) ? role : null;
  const supabase = await createClient();
  const tableClient = supabase as unknown as PeopleActionClient;

  const { data: existingProfile } = await tableClient
    .from("profiles")
    .select("id")
    .eq("school_id", currentProfile.school_id)
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    return {
      error: "A staff profile already exists for that email in this school.",
      success: null,
    };
  }

  const { data: createdProfile, error: profileError } = await tableClient
    .from("profiles")
    .insert({
      auth_user_id: null,
      display_name: displayName,
      email,
      school_id: currentProfile.school_id,
      status,
    })
    .select("id")
    .single();

  if (profileError || !createdProfile) {
    if (profileError && isDuplicateEmailError(profileError)) {
      return {
        error: "A staff profile already exists for that email in this school.",
        success: null,
      };
    }

    return {
      error: "Could not create the staff profile. Please try again.",
      success: null,
    };
  }

  if (globalRole) {
    const { error: roleError } = await tableClient
      .from("user_global_roles")
      .insert({
        assigned_by: currentProfile.id,
        profile_id: createdProfile.id,
        role: globalRole,
        school_id: currentProfile.school_id,
      });

    if (roleError) {
      revalidatePath("/people");

      return {
        error:
          "The profile was created, but the global role could not be assigned.",
        success: null,
      };
    }
  }

  // TODO: Audit staff profile creation and role assignment in a later audit pass.
  revalidatePath("/people");

  return {
    error: null,
    success: "Staff profile created.",
  };
}
