const requiredPublicEnv = {
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
};

function getRequiredPublicEnv(
  key: keyof typeof requiredPublicEnv,
): string {
  const value = requiredPublicEnv[key];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Add it to .env.local.`,
    );
  }

  return value;
}

export const env = {
  supabaseAnonKey: getRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseUrl: getRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
};
