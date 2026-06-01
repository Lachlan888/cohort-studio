"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "../env";
import type { Database } from "./types";

export function createClient() {
  return createBrowserClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey,
  );
}
