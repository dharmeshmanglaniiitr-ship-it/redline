import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { serverSupabase } from "@/lib/supabase/server";

/**
 * Where the link in a confirmation email lands.
 *
 * A route handler rather than a page, because this is the one place the session is written
 * and only a route handler or a server action can set a cookie.
 *
 * Supabase sends one of two shapes depending on how the project's email template is
 * written, and both arrive here:
 *
 * - `?code=...` — the exchange half of the PKCE flow, which is what the stock template
 *   produces for a server-side client.
 * - `?token_hash=...&type=signup` — what the template produces when it is rewritten to
 *   point straight at the app, which is the arrangement Supabase's own Next.js guide
 *   describes.
 *
 * Whichever it is, the Signer ends up signed in on `/review` or back on `/sign-in` being
 * told the link did not work. They never see a query string or a token.
 *
 * Set-up note for whoever configures the project: add `<origin>/auth/confirm` to the
 * Redirect URLs in Authentication → URL Configuration, or the link will refuse to come
 * back here.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const supabase = await serverSupabase();

  if (supabase === null) {
    return NextResponse.redirect(`${origin}/sign-in?confirm=accounts-not-set-up`);
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (code !== null) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(
      error === null ? `${origin}/review` : `${origin}/sign-in?confirm=expired`
    );
  }

  if (tokenHash !== null && type !== null) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    return NextResponse.redirect(
      error === null ? `${origin}/review` : `${origin}/sign-in?confirm=expired`
    );
  }

  // Somebody opened this address directly. There is nothing to confirm.
  return NextResponse.redirect(`${origin}/sign-in`);
}
