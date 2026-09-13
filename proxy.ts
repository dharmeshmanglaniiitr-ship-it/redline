/**
 * Keeping a signed-in Signer signed in.
 *
 * A Supabase access token lasts about an hour; the refresh token in the same cookie lasts
 * far longer. Something has to spend the second to renew the first, and it has to happen
 * before a page renders, because a server component can read cookies but cannot write
 * them. This runs first and writes any refreshed session onto the response, which is what
 * turns "the session survives closing the tab" from a claim into a fact a week later
 * rather than an hour later.
 *
 * `middleware.ts` was renamed to `proxy.ts` in Next.js 16, and the exported function with
 * it (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
 *
 * With no Supabase project configured there is no session to renew and this passes every
 * request straight through, so the app runs with both variables unset.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { supabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const project = supabaseConfig();
  if (project === null) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(project.url, project.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        // The refreshed session has to reach two places: the request, so the render that
        // follows sees the new token rather than the expired one it arrived with, and the
        // response, so the browser keeps it for next time.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Supabase supplies the no-store headers with the first cookie write. Without
        // them a CDN could cache a response carrying one Signer's session and hand it to
        // somebody else.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Verifying the token is what triggers the refresh, and it has to happen here rather
  // than after the response has been committed.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  // Only the surfaces where a session means something. The landing page is public, static
  // and processes nothing (`docs/spec-v1.md`), and running this over it would put a
  // no-store header on a page that should be cached. A new signed-in surface — the
  // library, the red lines — belongs on this list when it is built.
  matcher: ["/review/:path*", "/sign-in/:path*", "/auth/:path*"],
};
