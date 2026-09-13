"use server";

/**
 * Signing in, creating an account, and signing out.
 *
 * All three run on the server, so the password is read from a form post and never sits in
 * client state, and the session lands in cookies the browser sends back on its own.
 *
 * Nothing here invents a session. There is no development bypass and no fake Signer: when
 * Supabase is not configured the actions say so plainly, which is a message for whoever
 * set the deployment up as much as for whoever is looking at the screen.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { serverSupabase } from "@/lib/supabase/server";

import { SHORTEST_PASSWORD, type SignInState } from "./state";

/**
 * Handles both halves of the screen. Which half is carried by the form's own `intent`
 * field rather than by two actions, so the two paths share one validation pass and one set
 * of messages.
 *
 * On success it redirects, which throws, so there is no success state to render.
 */
export async function signInOrCreateAccount(
  _previous: SignInState,
  form: FormData
): Promise<SignInState> {
  const supabase = await serverSupabase();
  if (supabase === null) return { status: "accounts-not-set-up" };

  const creating = form.get("intent") === "create-account";
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (email === "") {
    return { status: "refused", message: "Type the email address for your account." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "refused", message: `${email} is not an email address. Check it over.` };
  }
  if (password === "") {
    return { status: "refused", message: "Type your password." };
  }
  if (creating && password.length < SHORTEST_PASSWORD) {
    return {
      status: "refused",
      message: `Passwords here need ${SHORTEST_PASSWORD} characters or more. Yours has ${password.length}.`,
    };
  }

  if (creating) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm` },
    });

    if (error !== null) return { status: "refused", message: whatWentWrong(error.code, true) };

    // Supabase returns no session when the project asks for a confirmed address. It
    // returns the same shape for an address that already has an account, deliberately, so
    // that nobody can use this form to find out who has one. Either way the next step is
    // the same and the answer here gives nothing away.
    if (data.session === null) return { status: "check-your-email", email };
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error !== null) return { status: "refused", message: whatWentWrong(error.code, false) };
  }

  redirect("/review");
}

/** Ends the session and empties its cookies. Reachable from the foot of every view. */
export async function signOut(): Promise<void> {
  const supabase = await serverSupabase();
  if (supabase !== null) await supabase.auth.signOut();
  redirect("/sign-in");
}

/**
 * What to say about a refusal from the auth server.
 *
 * Its own messages are written for whoever built the app, and a few of them would tell a
 * stranger which addresses have accounts. These are written for the Signer, and the ones
 * that could be used to go fishing say the same thing whether the account exists or not.
 */
function whatWentWrong(code: string | undefined, creating: boolean): string {
  switch (code) {
    case "invalid_credentials":
      return "That email and password don't go together. Try the password again.";
    case "email_not_confirmed":
      return "This account is waiting on the link in the email we sent. Open that first.";
    case "user_already_exists":
    case "email_exists":
      return "There is already an account for this address. Sign in instead.";
    case "weak_password":
      return "That password is too easy to guess. Try a longer one that is not a word.";
    case "email_address_invalid":
    case "email_address_not_authorized":
      return "The mail server would not take that address. Check the spelling.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "That is a lot of attempts in a short time. Wait a minute and go again.";
    case "signup_disabled":
    case "email_provider_disabled":
      return "New accounts are switched off on this deployment. Ask whoever runs it.";
    case "user_banned":
      return "This account is closed. Ask whoever runs this deployment.";
    default:
      return creating
        ? "Setting the account up did not work. Nothing changed, so it is worth another go."
        : "Signing in did not work. Nothing changed, so it is worth another go.";
  }
}

/** Where this deployment is being served from, for the link in a confirmation email. */
async function siteOrigin(): Promise<string> {
  const heading = await headers();
  const host = heading.get("x-forwarded-host") ?? heading.get("host") ?? "localhost:3000";
  const protocol = heading.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
