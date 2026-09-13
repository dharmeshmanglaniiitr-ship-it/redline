/**
 * Whether this deployment has accounts at all, decided in one place.
 *
 * Redline works without an account. A Signer can open `/review`, paste a contract and
 * read what came out of it with no Supabase project behind the app whatsoever — the file
 * is parsed in their browser and nothing is stored either way. An account adds one thing:
 * a library that survives closing the tab.
 *
 * So an unconfigured environment is a state to be handled, not an error to crash on. Both
 * variables are read here and nowhere else, and every client in this directory is built
 * lazily from the result, so importing a module that talks to Supabase costs nothing and
 * throws nothing when there is no project to talk to.
 *
 * The variable names are spelled out rather than looked up, because Next.js inlines
 * `process.env.NEXT_PUBLIC_*` by textual substitution and a dynamic key would not survive
 * the build.
 */

export interface SupabaseConfig {
  readonly url: string;
  readonly anonKey: string;
}

/** The project's URL and publishable key, or null when accounts are not set up. */
export function supabaseConfig(): SupabaseConfig | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (url === "" || anonKey === "") return null;
  return { url, anonKey };
}
