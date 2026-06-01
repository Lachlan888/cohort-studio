"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export type LoginFormState = {
  error: string | null;
};

export async function signInWithPassword(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Could not sign in with those details." };
  }

  redirect("/people");
}
