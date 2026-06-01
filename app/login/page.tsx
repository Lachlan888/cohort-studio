import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthContext } from "../../lib/auth/current-profile";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const { profile, user } = await getCurrentAuthContext();

  if (profile) {
    redirect("/people");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-slate-200 py-5">
          <Link
            className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700"
            href="/"
          >
            Cohort Studio
          </Link>
          <Badge variant="primary">Phase 0 auth</Badge>
        </header>

        <div className="grid flex-1 gap-10 py-12 lg:grid-cols-[1fr_26rem] lg:items-center lg:py-16">
          <div>
            <div className="mb-5 text-sm font-medium text-teal-800">
              Assessment operations
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-slate-950 sm:text-6xl">
              Sign in to Cohort Studio
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Access the school assessment moderation shell with your Supabase
              email and password account.
            </p>
          </div>

          <Card as="section">
            {user ? (
              <div>
                <Badge variant="warning">Account not provisioned</Badge>
                <h2 className="mt-5 text-xl font-semibold text-slate-950">
                  Your sign-in worked, but your profile is not active yet.
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Ask a system administrator to link this auth account to an
                  active Cohort Studio profile.
                </p>
                <Button className="mt-6" href="/logout" variant="secondary">
                  Sign out
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6 border-b border-slate-200 pb-5">
                  <h2 className="text-xl font-semibold text-slate-950">
                    Welcome back
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Use the bootstrapped admin account to confirm auth plumbing.
                  </p>
                </div>
                <LoginForm />
              </>
            )}
          </Card>
        </div>
      </section>
    </main>
  );
}
