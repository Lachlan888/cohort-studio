import type { User } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";

type AuthDatabase = {
  public: {
    Tables: {
      profiles: {
        Row: {
          auth_user_id: string | null;
          display_name: string;
          email: string;
          id: string;
          school_id: string;
          status: string;
        };
      };
      schools: {
        Row: {
          id: string;
          name: string;
          status: string;
        };
      };
      user_global_roles: {
        Row: {
          id: string;
          profile_id: string;
          role: string;
          school_id: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type ProfileRow = AuthDatabase["public"]["Tables"]["profiles"]["Row"];
type RoleRow = AuthDatabase["public"]["Tables"]["user_global_roles"]["Row"];
type SchoolRow = AuthDatabase["public"]["Tables"]["schools"]["Row"];
type QueryError = { message: string };
type ListResult<Row> = {
  data: Row[] | null;
  error: QueryError | null;
};
type QueryResult<Row> = {
  data: Row | null;
  error: QueryError | null;
};

type FilterBuilder<Row> = {
  eq(column: string, value: string): FilterBuilder<Row>;
  maybeSingle(): Promise<QueryResult<Row>>;
} & PromiseLike<ListResult<Row>>;

type TableQuery<Row> = {
  select(columns: string): FilterBuilder<Row>;
};

type AuthTableClient = {
  from(table: "profiles"): TableQuery<ProfileRow>;
  from(table: "schools"): TableQuery<SchoolRow>;
  from(table: "user_global_roles"): TableQuery<RoleRow>;
};

export type CurrentProfile = Pick<
  ProfileRow,
  "auth_user_id" | "display_name" | "email" | "id" | "school_id" | "status"
> & {
  globalRoles: string[];
  school: Pick<SchoolRow, "id" | "name" | "status">;
};

export type CurrentAuthContext = {
  profile: CurrentProfile | null;
  user: User | null;
};

export async function getCurrentAuthContext(): Promise<CurrentAuthContext> {
  const supabase = await createClient();
  const tableClient = supabase as unknown as AuthTableClient;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { profile: null, user: null };
  }

  const { data: profile, error: profileError } = await tableClient
    .from("profiles")
    .select("auth_user_id, display_name, email, id, school_id, status")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (profileError || !profile) {
    return { profile: null, user };
  }

  const [{ data: school }, { data: roles }] = await Promise.all([
    tableClient
      .from("schools")
      .select("id, name, status")
      .eq("id", profile.school_id)
      .maybeSingle(),
    tableClient
      .from("user_global_roles")
      .select("id, profile_id, role, school_id")
      .eq("profile_id", profile.id)
      .eq("school_id", profile.school_id),
  ]);

  if (!school) {
    return { profile: null, user };
  }

  return {
    profile: {
      ...profile,
      globalRoles: (roles ?? []).map((role: RoleRow) => role.role),
      school,
    },
    user,
  };
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const { profile } = await getCurrentAuthContext();

  return profile;
}
