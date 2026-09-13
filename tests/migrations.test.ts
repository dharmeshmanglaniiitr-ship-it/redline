/**
 * What the migration SQL has to be true of, checked without a database.
 *
 * `CLAUDE.md` makes per-Signer isolation a property of the database rather than of
 * application code, which means the guarantee lives entirely in the `.sql` files under
 * `supabase/migrations/`. Those files are applied by hand against a hosted Supabase
 * project, so nothing in this repo's test run ever executes them — and the failure that
 * costs a Signer their confidentiality is not an exotic one. It is a table added in six
 * months whose author writes the columns, writes the policies, and forgets
 * `enable row level security`. Postgres then serves every row of it to every account.
 *
 * So these tests read the real files and assert over whatever tables and policies they
 * find. Nothing here is hard-coded to today's migration; adding a table without row level
 * security, or a policy that is not scoped to `auth.uid()`, or a column that puts an
 * uploaded file back into the database, fails this suite with the file and the table
 * named.
 *
 * This is not the isolation proof. Asserting over DDL is not the same as attempting a
 * cross-Signer read and watching it return nothing, which is what
 * `tests/integration/signer-isolation.test.ts` does and what needs a real database.
 */

import { describe, expect, it } from "vitest";

import {
  POLICY_COMMANDS,
  readMigrationSchema,
  type MigrationPolicy,
  type MigrationTable,
} from "./support/migrations";

const schema = readMigrationSchema();

/** The commands whose row filter is the `using` expression. */
const READ_LIKE = ["select", "update", "delete"] as const;
/** The commands whose new-row filter is the `with check` expression. */
const WRITE_LIKE = ["insert", "update"] as const;

/**
 * Column names that would mean the original file came back. `CLAUDE.md` allows extracted
 * text and nothing else: not the bytes, not a base64 copy of them, and not a key into a
 * bucket holding them, which is the same thing with an extra hop.
 */
const FILE_SHAPED_NAME_SEGMENTS = [
  "file",
  "files",
  "blob",
  "blobs",
  "bytes",
  "binary",
  "base64",
  "bucket",
  "attachment",
  "attachments",
  "upload",
  "uploads",
  "payload",
];

/** Column types that hold bytes. */
const BINARY_TYPE = /\b(bytea|blob|bit\s+varying|varbit)\b/i;

describe("the migrations themselves", () => {
  it("has migrations to check, and tables in them", () => {
    // Without this the whole file would report green on an empty directory, which is the
    // one result it must never give: a suite that checked nothing reading as a suite that
    // found nothing wrong.
    expect(schema.files.length, "no .sql files under supabase/migrations/").toBeGreaterThan(0);
    expect(schema.tables.length, `no create table found in ${schema.files.join(", ")}`).toBeGreaterThan(0);
    expect(schema.policies.length, "no create policy found in any migration").toBeGreaterThan(0);
  });
});

describe.each(schema.tables.map((table) => [table.qualifiedName, table] as const))(
  "%s",
  (qualifiedName: string, table: MigrationTable) => {
    const policies = schema.policies.filter((policy) => policy.table === qualifiedName);

    it("belongs to a Signer, through a foreign key to auth.users", () => {
      // Every table this product has is one Signer's private work. A table without that
      // key cannot be scoped by auth.uid(), so if one is ever added deliberately it needs
      // its own decision recorded rather than inheriting these rules by silence.
      expect(
        table.ownedBySigner,
        `${qualifiedName} (${table.file}) has no reference to auth.users, so no policy on ` +
          "it can be scoped to the Signer who owns the row"
      ).toBe(true);
    });

    it("has row level security enabled", () => {
      expect(
        schema.rowLevelSecurityEnabled,
        `${qualifiedName} was created in ${table.file} but no migration runs ` +
          `"alter table ${qualifiedName} enable row level security", so every account can read every row`
      ).toContain(qualifiedName);
    });

    it("has at least one policy", () => {
      // Row level security with no policy denies everything, which is safe but means the
      // table is unreachable. Either way it is not what anyone intended.
      expect(
        policies.length,
        `${qualifiedName} has row level security and no policy, so it is readable by nobody`
      ).toBeGreaterThan(0);
    });

    it("stores extracted text and nothing that could be the original file", () => {
      for (const column of table.columns) {
        const segments = column.name.split("_");
        const fileShaped = segments.find((segment) => FILE_SHAPED_NAME_SEGMENTS.includes(segment));

        expect(
          fileShaped,
          `${qualifiedName}.${column.name} (${table.file}) is named for a stored file. ` +
            "Only extracted text is ever stored (CLAUDE.md) — never the bytes, and never a " +
            "key into a bucket holding them"
        ).toBeUndefined();

        expect(
          BINARY_TYPE.test(column.definition),
          `${qualifiedName}.${column.name} (${table.file}) is declared "${column.definition}", ` +
            "which holds bytes. Only extracted text is ever stored (CLAUDE.md)"
        ).toBe(false);

        expect(
          /base64/i.test(column.definition),
          `${qualifiedName}.${column.name} (${table.file}) mentions base64, which is the ` +
            "original file wearing a text column"
        ).toBe(false);
      }
    });

    describe.each(policies.map((policy) => [policy.name, policy] as const))(
      "policy %o",
      (name: string, policy: MigrationPolicy) => {
        const declared = [
          ["using", policy.using],
          ["with check", policy.withCheck],
        ] as const;

        it("declares the filter each command it covers needs", () => {
          // A policy that covers select without a `using` expression, or insert without a
          // `with check`, leaves that command unfiltered. Naming the missing clause is the
          // point — an absent filter reads like a deliberately open one otherwise.
          for (const command of policy.commands) {
            if ((READ_LIKE as readonly string[]).includes(command)) {
              expect(
                policy.using,
                `policy "${name}" on ${qualifiedName} (${policy.file}) covers ${command} ` +
                  "with no `using` expression, so it filters no rows"
              ).not.toBeNull();
            }
            if ((WRITE_LIKE as readonly string[]).includes(command)) {
              expect(
                policy.withCheck,
                `policy "${name}" on ${qualifiedName} (${policy.file}) covers ${command} ` +
                  "with no `with check` expression, so a Signer could write a row against " +
                  "another account"
              ).not.toBeNull();
            }
          }
        });

        it("scopes every expression it declares to auth.uid()", () => {
          for (const [clause, expression] of declared) {
            if (expression === null) continue;
            expect(
              /\bauth\s*\.\s*uid\s*\(\s*\)/i.test(expression),
              `policy "${name}" on ${qualifiedName} (${policy.file}) has ` +
                `${clause} (${expression}), which does not mention auth.uid(). A row filter ` +
                "that does not name the current Signer does not isolate anything"
            ).toBe(true);
          }
        });

        it("is not left open with a constant expression", () => {
          for (const [clause, expression] of declared) {
            if (expression === null) continue;
            const collapsed = expression.replace(/[\s()]/g, "").toLowerCase();
            expect(
              collapsed === "true",
              `policy "${name}" on ${qualifiedName} (${policy.file}) has ${clause} (true) ` +
                `for ${policy.commands.join(", ")}, which returns every Signer's rows to ` +
                "every account"
            ).toBe(false);
          }
        });
      }
    );
  }
);

describe("every command on a Signer-owned table is covered by a policy", () => {
  it.each(schema.tables.map((table) => [table.qualifiedName] as const))(
    "%s",
    (qualifiedName: string) => {
      const covered = new Set(
        schema.policies
          .filter((policy) => policy.table === qualifiedName)
          .flatMap((policy) => policy.commands)
      );
      // Not a security hole on its own — an uncovered command is denied, not opened. It is
      // a correctness one: the library cannot delete a document nobody wrote a policy for,
      // and the failure shows up as a silent no-op at runtime rather than here.
      const missing = POLICY_COMMANDS.filter((command) => !covered.has(command));
      expect(
        missing,
        `${qualifiedName} has no policy covering ${missing.join(", ")}, so ` +
          "those commands silently affect nothing"
      ).toEqual([]);
    }
  );
});
