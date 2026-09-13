/**
 * The isolation proof: two Signers, two documents, and every attempt by one to reach the
 * other's row coming back empty.
 *
 * This is the only test in the repo that proves ticket 05's fourth criterion, and it
 * needs a real Postgres with the migrations applied — row level security is a database
 * behaviour, and no amount of stubbing demonstrates it. Asserting that the UI hides
 * another Signer's documents would prove nothing at all: the claim is that the query
 * itself returns nothing, whoever makes it and from wherever.
 *
 * **It skips unless a real project is configured**, and it says which variable is
 * missing. It must never report green without having run, because a green line here tells
 * whoever reads it that confidentiality was demonstrated. If this suite is skipped, it was
 * not.
 *
 * To run it, point these at a Supabase project with `supabase/migrations/` applied — a
 * scratch project, never one holding real documents, because the suite creates and then
 * deletes accounts:
 *
 *   SUPABASE_TEST_URL=https://<project>.supabase.co
 *   SUPABASE_TEST_ANON_KEY=<the publishable anon key>
 *   SUPABASE_TEST_SERVICE_ROLE_KEY=<the secret service-role key>
 *
 * The service-role key is used only to create the two accounts, to check from outside the
 * policies whether a write actually landed, and to delete both accounts afterwards. No
 * assertion about isolation is made through it — it bypasses row level security by
 * design, so a passing assertion made with it would mean nothing.
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const REQUIRED_VARIABLES = [
  "SUPABASE_TEST_URL",
  "SUPABASE_TEST_ANON_KEY",
  "SUPABASE_TEST_SERVICE_ROLE_KEY",
] as const;

const missing = REQUIRED_VARIABLES.filter(
  (name) => (process.env[name] ?? "").trim() === ""
);

if (missing.length > 0) {
  // Written straight to stderr rather than through console, because Vitest's default
  // reporter does not print the names of skipped tests and this has to be impossible to
  // read past. A silently skipped isolation suite is the failure mode this whole file is
  // guarding against.
  process.stderr.write(
    "\n" +
      "  ┌─ tests/integration/signer-isolation.test.ts DID NOT RUN ─────────────────\n" +
      `  │  Missing: ${missing.join(", ")}\n` +
      "  │  Cross-Signer isolation is NOT proven by this test run. The checks in\n" +
      "  │  tests/migrations.test.ts assert over the migration SQL; they are not a\n" +
      "  │  substitute for attempting the read against a database.\n" +
      "  └──────────────────────────────────────────────────────────────────────────\n\n"
  );
}

const suite = missing.length === 0 ? describe : describe.skip;

const PASSWORD = "redline-isolation-suite-9f2c4a";

/** A document body long enough to clear MINIMUM_READABLE_CHARACTERS in the real schema. */
function contractText(owner: string): string {
  return (
    `This Agreement is between ${owner} and the Client for design services. ` +
    "The Contractor assigns all work product created under this Agreement to the Client. " +
    "Payment is due within thirty days of an undisputed invoice. " +
    "This Agreement is governed by the laws of England and Wales. " +
    "Either party may terminate on thirty days written notice."
  );
}

function anonClient(): SupabaseClient {
  return createClient(process.env.SUPABASE_TEST_URL!, process.env.SUPABASE_TEST_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

suite(
  missing.length === 0
    ? "cross-Signer isolation, against a real database"
    : `cross-Signer isolation — SKIPPED, no database. Missing ${missing.join(", ")}`,
  () => {
    /** Bypasses row level security. Fixture setup and teardown only, never an assertion. */
    let admin: SupabaseClient;

    let first: { user: User; client: SupabaseClient; documentId: string };
    let second: { user: User; client: SupabaseClient; documentId: string };

    async function createSigner(label: string) {
      const email = `isolation-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@redline.test`;
      const created = await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
      });
      if (created.error !== null || created.data.user === null) {
        throw new Error(`could not create the ${label} Signer: ${created.error?.message}`);
      }

      const client = anonClient();
      const signedIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
      if (signedIn.error !== null) {
        throw new Error(`the ${label} Signer could not sign in: ${signedIn.error.message}`);
      }

      const saved = await client
        .from("documents")
        .insert({
          name: `${label}-contract.txt`,
          format: "text",
          extracted_text: contractText(label),
          sentences: contractText(label).split(". ").map((part) => `${part}.`),
        })
        .select("id")
        .single();
      if (saved.error !== null) {
        throw new Error(`the ${label} Signer could not save a document: ${saved.error.message}`);
      }

      return { user: created.data.user, client, documentId: saved.data.id as string };
    }

    beforeAll(async () => {
      admin = createClient(
        process.env.SUPABASE_TEST_URL!,
        process.env.SUPABASE_TEST_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );
      first = await createSigner("first");
      second = await createSigner("second");
    }, 60_000);

    afterAll(async () => {
      // Deleting the account takes its documents with it, through the cascade the
      // migration declares.
      for (const signer of [first, second]) {
        if (signer !== undefined) await admin.auth.admin.deleteUser(signer.user.id);
      }
    }, 60_000);

    it("gives each Signer only their own row when they ask for everything", async () => {
      const seenBySecond = await second.client.from("documents").select("id, signer_id");
      expect(seenBySecond.error).toBeNull();
      expect(seenBySecond.data?.map((row) => row.id)).toEqual([second.documentId]);

      const seenByFirst = await first.client.from("documents").select("id, signer_id");
      expect(seenByFirst.error).toBeNull();
      expect(seenByFirst.data?.map((row) => row.id)).toEqual([first.documentId]);
    });

    it("returns nothing when a Signer names the other's document by its id", async () => {
      const byId = await second.client
        .from("documents")
        .select("id, extracted_text")
        .eq("id", first.documentId);

      expect(byId.error).toBeNull();
      expect(byId.data).toEqual([]);
    });

    it("returns nothing when a Signer filters by the other's account id", async () => {
      const bySigner = await second.client
        .from("documents")
        .select("id")
        .eq("signer_id", first.user.id);

      expect(bySigner.error).toBeNull();
      expect(bySigner.data).toEqual([]);
    });

    it("leaks no text through a filter on the document's own contents", async () => {
      // A Signer who guesses at wording must not be able to confirm it by watching which
      // filters match, so a search that would hit the other's row still returns nothing.
      const byContent = await second.client
        .from("documents")
        .select("id")
        .ilike("extracted_text", "%between first and the Client%");

      expect(byContent.error).toBeNull();
      expect(byContent.data).toEqual([]);
    });

    it("reports a count of one, not two, to each Signer", async () => {
      const counted = await second.client
        .from("documents")
        .select("id", { count: "exact", head: true });

      expect(counted.error).toBeNull();
      expect(counted.count).toBe(1);
    });

    it("cannot update the other Signer's document", async () => {
      const attempted = await second.client
        .from("documents")
        .update({ name: "taken-over.txt" })
        .eq("id", first.documentId)
        .select("id");

      expect(attempted.data ?? []).toEqual([]);

      const stillTheirs = await admin
        .from("documents")
        .select("name")
        .eq("id", first.documentId)
        .single();
      expect(stillTheirs.data?.name).toBe("first-contract.txt");
    });

    it("cannot delete the other Signer's document", async () => {
      const attempted = await second.client
        .from("documents")
        .delete()
        .eq("id", first.documentId)
        .select("id");

      expect(attempted.data ?? []).toEqual([]);

      const survived = await admin
        .from("documents")
        .select("id")
        .eq("id", first.documentId);
      expect(survived.data?.map((row) => row.id)).toEqual([first.documentId]);
    });

    it("cannot save a document against the other Signer's account", async () => {
      const attempted = await second.client.from("documents").insert({
        signer_id: first.user.id,
        name: "planted.txt",
        format: "text",
        extracted_text: contractText("planted"),
        sentences: [contractText("planted")],
      });

      expect(attempted.error).not.toBeNull();

      const firstSees = await first.client.from("documents").select("id");
      expect(firstSees.data?.map((row) => row.id)).toEqual([first.documentId]);
    });

    it("shows nothing at all to a caller with no session", async () => {
      const strangerSees = await anonClient().from("documents").select("id");
      expect(strangerSees.data ?? []).toEqual([]);
    });
  }
);
