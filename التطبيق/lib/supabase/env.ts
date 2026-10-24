export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL
      && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function isCloudAccountsEnabled() {
  return process.env.NEXT_PUBLIC_TAKKA_CLOUD_ACCOUNTS_ENABLED === "true"
    && isSupabaseConfigured();
}
