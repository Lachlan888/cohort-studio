import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/layout/page-header";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";

export const dynamic = "force-dynamic";

type DiagnosticStatus = "failed" | "missing" | "ok" | "signed-in" | "signed-out";

type DiagnosticItem = {
  detail: string;
  label: string;
  status: DiagnosticStatus;
  value: string;
};

function getSupabaseHost() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return "Not available";
  }

  try {
    return new URL(supabaseUrl).host;
  } catch {
    return "Invalid URL";
  }
}

function getStatusVariant(status: DiagnosticStatus) {
  if (status === "failed" || status === "missing") {
    return "danger";
  }

  if (status === "signed-out") {
    return "warning";
  }

  return "success";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown Supabase diagnostic error.";
}

async function getDiagnostics(): Promise<DiagnosticItem[]> {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const environmentConfigured = hasSupabaseUrl && hasSupabaseAnonKey;

  const diagnostics: DiagnosticItem[] = [
    {
      detail: environmentConfigured
        ? "Required public Supabase environment variables are present."
        : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
      label: "Supabase environment",
      status: environmentConfigured ? "ok" : "missing",
      value: environmentConfigured ? "Configured" : "Missing",
    },
    {
      detail: "Only the host is shown. The anon key is never displayed.",
      label: "Supabase URL host",
      status: hasSupabaseUrl ? "ok" : "missing",
      value: getSupabaseHost(),
    },
  ];

  try {
    const { createClient } = await import("../../lib/supabase/server");
    const supabase = await createClient();

    diagnostics.push({
      detail: "The App Router server helper created a Supabase client.",
      label: "Server client",
      status: "ok",
      value: "Initialised",
    });

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      diagnostics.push({
        detail: error.message,
        label: "Auth session",
        status: "failed",
        value: "Failed",
      });
    } else {
      diagnostics.push({
        detail: data.session
          ? "A Supabase auth session cookie is available."
          : "No Supabase auth session cookie is active.",
        label: "Auth session",
        status: data.session ? "signed-in" : "signed-out",
        value: data.session ? "Signed in" : "No active session",
      });
    }

    const { getCurrentAuthContext } = await import(
      "../../lib/auth/current-profile"
    );
    const { profile, user } = await getCurrentAuthContext();

    diagnostics.push({
      detail: profile
        ? `${profile.display_name} is active at ${profile.school.name}.`
        : user
          ? "The Supabase user is signed in, but no matching active Cohort Studio profile was found."
          : "No signed-in Supabase user is available for profile lookup.",
      label: "Current profile",
      status: profile ? "ok" : user ? "missing" : "signed-out",
      value: profile ? "Active profile found" : "No active profile",
    });

    if (profile) {
      diagnostics.push({
        detail:
          profile.globalRoles.length > 0
            ? profile.globalRoles.join(", ")
            : "No global roles are assigned to this profile.",
        label: "Global roles",
        status: "ok",
        value: `${profile.globalRoles.length} role${
          profile.globalRoles.length === 1 ? "" : "s"
        }`,
      });
    }
  } catch (error) {
    diagnostics.push({
      detail: getErrorMessage(error),
      label: "Server client",
      status: "failed",
      value: "Failed",
    });

    diagnostics.push({
      detail: "Auth session was not checked because the server client failed.",
      label: "Auth session",
      status: "failed",
      value: "Not checked",
    });
  }

  return diagnostics;
}

export default async function SupabaseCheckPage() {
  const diagnostics = await getDiagnostics();

  return (
    <AppShell activeHref="/supabase-check">
      <PageHeader
        description="Temporary diagnostic route for checking local Supabase environment plumbing and server helper initialisation."
        eyebrow="Supabase plumbing"
        title="Supabase Check"
      />

      <Card as="section">
        <div className="mb-6 border-b border-slate-200 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                Connection diagnostics
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                This page does not query app tables or expose secrets.
              </p>
            </div>
            <Badge variant="warning">Temporary</Badge>
          </div>
        </div>

        <div className="grid gap-3">
          {diagnostics.map((item) => (
            <div
              className="grid gap-4 border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[12rem_1fr_auto] sm:items-start"
              key={item.label}
            >
              <div className="text-sm font-medium text-slate-950">
                {item.label}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  {item.value}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {item.detail}
                </p>
              </div>
              <Badge variant={getStatusVariant(item.status)}>
                {item.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card as="section">
        <h2 className="text-lg font-semibold text-slate-950">
          Removal note
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This route is a temporary Phase 0 diagnostic and should be removed
          after Supabase environment and server-client plumbing are confirmed.
        </p>
      </Card>
    </AppShell>
  );
}
