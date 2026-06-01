import type { CurrentProfile } from "../auth/current-profile";
import { getCurrentProfile } from "../auth/current-profile";
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

type ProfileRow = {
  auth_user_id: string | null;
  display_name: string;
  email: string;
  id: string;
  school_id: string;
  status: string;
};

type GlobalRoleRow = {
  id: string;
  profile_id: string;
  role: string;
  school_id: string;
};

type PeopleTableClient = {
  from(table: "profiles"): TableQuery<ProfileRow>;
  from(table: "user_global_roles"): TableQuery<GlobalRoleRow>;
};

export type PeoplePagePerson = Pick<
  ProfileRow,
  "auth_user_id" | "display_name" | "email" | "id" | "school_id" | "status"
> & {
  globalRoles: string[];
};

export type PeoplePageSummary = {
  activeProfiles: number;
  invitedProfiles: number;
  systemAdmins: number;
  totalProfiles: number;
};

export type PeoplePageData = {
  currentProfile: CurrentProfile | null;
  people: PeoplePagePerson[];
  summary: PeoplePageSummary;
};

const emptySummary: PeoplePageSummary = {
  activeProfiles: 0,
  invitedProfiles: 0,
  systemAdmins: 0,
  totalProfiles: 0,
};

function buildRolesByProfileId(roles: GlobalRoleRow[]) {
  return roles.reduce<Map<string, string[]>>((rolesByProfileId, role) => {
    const currentRoles = rolesByProfileId.get(role.profile_id) ?? [];

    rolesByProfileId.set(role.profile_id, [...currentRoles, role.role]);

    return rolesByProfileId;
  }, new Map<string, string[]>());
}

function buildSummary(
  profiles: ProfileRow[],
  rolesByProfileId: Map<string, string[]>,
): PeoplePageSummary {
  const systemAdminIds = new Set(
    profiles
      .filter((profile) =>
        (rolesByProfileId.get(profile.id) ?? []).includes("system_admin"),
      )
      .map((profile) => profile.id),
  );

  return {
    activeProfiles: profiles.filter((profile) => profile.status === "active")
      .length,
    invitedProfiles: profiles.filter((profile) => profile.status === "invited")
      .length,
    systemAdmins: systemAdminIds.size,
    totalProfiles: profiles.length,
  };
}

export async function getPeoplePageData(): Promise<PeoplePageData> {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile) {
    return {
      currentProfile: null,
      people: [],
      summary: emptySummary,
    };
  }

  const supabase = await createClient();
  const tableClient = supabase as unknown as PeopleTableClient;

  const [{ data: profiles }, { data: globalRoles }] = await Promise.all([
    tableClient
      .from("profiles")
      .select("auth_user_id, display_name, email, id, school_id, status")
      .eq("school_id", currentProfile.school_id),
    tableClient
      .from("user_global_roles")
      .select("id, profile_id, role, school_id")
      .eq("school_id", currentProfile.school_id),
  ]);

  const schoolProfiles = (profiles ?? []).sort((first, second) =>
    first.display_name.localeCompare(second.display_name),
  );
  const rolesByProfileId = buildRolesByProfileId(globalRoles ?? []);

  return {
    currentProfile,
    people: schoolProfiles.map((profile) => ({
      ...profile,
      globalRoles: rolesByProfileId.get(profile.id) ?? [],
    })),
    summary: buildSummary(schoolProfiles, rolesByProfileId),
  };
}
