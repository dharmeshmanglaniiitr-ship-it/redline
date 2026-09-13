import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { supabaseConfig } from "./config";

/**
 * A Supabase client for one server render, reading and writing the session in cookies.
 *
 * Cookies rather than browser storage is what makes criterion 1 of ticket 05 true: the
 * session is in the request, so it is still there when the tab is closed and reopened, and
 * a server component can read who the Signer is before it renders anything.
 *
 * A new client per request, never a shared one — the session belongs to the request, and a
 * client held across requests would hand one Signer's session to the next.
 *
 * Returns null when accounts are not set up, so callers handle a missing project the same
 * way they handle a missing session: as a state, not an exception.
 */
export async function serverSupabase(): Promise<SupabaseClient | null> {
  const config = supabaseConfig();
  if (config === null) return null;

  const store = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        } catch {
          // A server component cannot set cookies; only a server action or a route
          // handler can. That is expected here rather than exceptional: `proxy.ts` runs
          // before the render and writes any refreshed session to the response, so
          // swallowing this loses nothing. Letting it throw would take down a page for a
          // token refresh that has already been dealt with.
        }
      },
    },
  });
}
