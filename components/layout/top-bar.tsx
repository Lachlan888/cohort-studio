import type { CurrentProfile } from "../../lib/auth/current-profile";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

type TopBarProps = {
  profile?: CurrentProfile | null;
  userEmail?: string | null;
};

export function TopBar({ profile, userEmail }: TopBarProps) {
  const roles = profile?.globalRoles ?? [];
  const isAuthenticated = Boolean(profile || userEmail);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex min-h-16 flex-col gap-3 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div>
          <p className="text-sm font-medium text-slate-950">
            {profile?.display_name ?? "App preview"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {profile
              ? `${profile.email} · ${profile.school.name}`
              : userEmail
                ? `${userEmail} · Account not provisioned`
                : "Static shell context for future Cohort Studio pages."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {profile ? (
            <>
              <Badge>School: {profile.school.name}</Badge>
              <Badge variant="primary">
                Roles: {roles.length > 0 ? roles.join(", ") : "None"}
              </Badge>
            </>
          ) : (
            <>
              <Badge>Year: 2026</Badge>
              <Badge>Subject: VCE English</Badge>
              <Badge variant={userEmail ? "warning" : "neutral"}>
                {userEmail ? "Not provisioned" : "User: Preview"}
              </Badge>
            </>
          )}
          {isAuthenticated ? (
            <Button href="/logout" variant="secondary">
              Sign out
            </Button>
          ) : (
            <Button href="/login" variant="secondary">
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
