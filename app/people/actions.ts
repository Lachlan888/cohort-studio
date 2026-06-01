"use server";

import { revalidatePath } from "next/cache";
import { insertAuditEvent } from "../../lib/audit/audit-events";
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

type GlobalRoleRow = {
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
  insert(row: GlobalRoleInsert): InsertBuilder<GlobalRoleRow>;
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

async function writeStaffProfileCreatedAuditEvent({
  currentProfile,
  displayName,
  email,
  profileId,
  status,
}: {
  currentProfile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>;
  displayName: string;
  email: string;
  profileId: string;
  status: StaffProfileStatus;
}) {
  return insertAuditEvent({
    actor_display_name: currentProfile.display_name,
    actor_email: currentProfile.email,
    actor_profile_id: currentProfile.id,
    entity_id: profileId,
    entity_type: "profile",
    event_type: "profile_created",
    metadata: {
      source: "manual_people_page",
    },
    new_values: {
      auth_user_id: null,
      display_name: displayName,
      email,
      status,
    },
    school_id: currentProfile.school_id,
  });
}

async function writeGlobalRoleAssignedAuditEvent({
  currentProfile,
  profileId,
  role,
  roleId,
}: {
  currentProfile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>;
  profileId: string;
  role: AllowedGlobalRole;
  roleId: string;
}) {
  return insertAuditEvent({
    actor_display_name: currentProfile.display_name,
    actor_email: currentProfile.email,
    actor_profile_id: currentProfile.id,
    entity_id: roleId,
    entity_type: "user_global_role",
    event_type: "global_role_assigned",
    metadata: {
      source: "manual_people_page",
    },
    new_values: {
      profile_id: profileId,
      role,
    },
    parent_entity_id: profileId,
    parent_entity_type: "profile",
    school_id: currentProfile.school_id,
  });
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

  const { error: profileAuditError } =
    await writeStaffProfileCreatedAuditEvent({
      currentProfile,
      displayName,
      email,
      profileId: createdProfile.id,
      status,
    });

  if (profileAuditError) {
    revalidatePath("/people");

    return {
      error:
        "The profile was created, but the audit event could not be recorded.",
      success: null,
    };
  }

  if (globalRole) {
    const { data: createdRole, error: roleError } = await tableClient
      .from("user_global_roles")
      .insert({
        assigned_by: currentProfile.id,
        profile_id: createdProfile.id,
        role: globalRole,
        school_id: currentProfile.school_id,
      })
      .select("id")
      .single();

    if (roleError || !createdRole) {
      revalidatePath("/people");

      return {
        error:
          "The profile was created, but the global role could not be assigned.",
        success: null,
      };
    }

    const { error: roleAuditError } = await writeGlobalRoleAssignedAuditEvent({
      currentProfile,
      profileId: createdProfile.id,
      role: globalRole,
      roleId: createdRole.id,
    });

    if (roleAuditError) {
      revalidatePath("/people");

      return {
        error:
          "The profile and role were created, but the role audit event could not be recorded.",
        success: null,
      };
    }
  }

  revalidatePath("/people");

  return {
    error: null,
    success: "Staff profile created.",
  };
}
