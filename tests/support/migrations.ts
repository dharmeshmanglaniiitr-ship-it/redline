/**
 * Reading the migration SQL the repo owner actually runs, so it can be asserted against.
 *
 * `CLAUDE.md` makes per-Signer isolation a database guarantee: no query may return
 * another Signer's documents. That guarantee is only as good as the SQL under
 * `supabase/migrations/`, and the mistake most likely to happen is not a policy written
 * wrongly today but a table added next month whose author forgets to enable row level
 * security at all. This module parses the real `.sql` files — comments stripped,
 * statements split, columns and policies pulled apart — so `tests/migrations.test.ts` can
 * make that mistake fail the suite.
 *
 * It is a lint over DDL, not a Postgres parser: it understands `create table`,
 * `alter table ... enable row level security` and `create policy`, and ignores everything
 * else. Every migration file present is read, in file-name order, so a policy added by a
 * later migration counts towards the table an earlier one created.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MIGRATION_DIR = fileURLToPath(new URL("../../supabase/migrations/", import.meta.url));

/** One column as it was declared, with the rest of its definition kept verbatim. */
export interface MigrationColumn {
  readonly name: string;
  /** Everything after the column name: its type, defaults, references and inline checks. */
  readonly definition: string;
}

export interface MigrationTable {
  /** The migration that created it, for a failure message that names a file. */
  readonly file: string;
  readonly schema: string;
  /** Schema-qualified, e.g. `public.documents`. */
  readonly qualifiedName: string;
  readonly columns: readonly MigrationColumn[];
  /**
   * True when something in the table body points at `auth.users`. That foreign key is
   * what makes a table Signer-owned, and Signer-owned is what obliges every policy on it
   * to be scoped to `auth.uid()`.
   */
  readonly ownedBySigner: boolean;
}

/** The commands a policy can cover. A policy with no `for` clause covers all of them. */
export const POLICY_COMMANDS = ["select", "insert", "update", "delete"] as const;

export type PolicyCommand = (typeof POLICY_COMMANDS)[number];

export interface MigrationPolicy {
  readonly file: string;
  readonly name: string;
  /** Schema-qualified name of the table the policy is `on`. */
  readonly table: string;
  /** Expanded: `for all` becomes every command, so callers never special-case it. */
  readonly commands: readonly PolicyCommand[];
  /**
   * The roles named in the policy's `to` clause, lower-cased. Empty where there is none,
   * which in Postgres means `public` — every role, the session's and the anon key's
   * alike.
   */
  readonly roles: readonly string[];
  /** The `using` expression with its outer parentheses removed, or null if absent. */
  readonly using: string | null;
  /** The `with check` expression with its outer parentheses removed, or null if absent. */
  readonly withCheck: string | null;
}

/** One `revoke ... on table X from role` statement, as the migrations write it. */
export interface MigrationRevoke {
  readonly file: string;
  /** Schema-qualified name of the table the grant was withdrawn on. */
  readonly table: string;
  /** The roles it was withdrawn from, lower-cased. */
  readonly roles: readonly string[];
}

export interface MigrationSchema {
  /** The migration file names that were read, in the order they were applied. */
  readonly files: readonly string[];
  readonly tables: readonly MigrationTable[];
  /** Qualified names of every table that `enable row level security` was run on. */
  readonly rowLevelSecurityEnabled: readonly string[];
  readonly policies: readonly MigrationPolicy[];
  /** Every grant the migrations withdraw, so the second line of defence is assertable. */
  readonly revokes: readonly MigrationRevoke[];
}

/** Parse every migration in `supabase/migrations/`, in file-name order. */
export function readMigrationSchema(): MigrationSchema {
  const files = readdirSync(MIGRATION_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const tables: MigrationTable[] = [];
  const rowLevelSecurityEnabled: string[] = [];
  const policies: MigrationPolicy[] = [];
  const revokes: MigrationRevoke[] = [];

  for (const file of files) {
    const sql = readFileSync(MIGRATION_DIR + file, "utf8");
    for (const statement of splitStatements(sql)) {
      const table = parseCreateTable(statement, file);
      if (table !== null) {
        tables.push(table);
        continue;
      }
      const enabled = parseEnableRowLevelSecurity(statement);
      if (enabled !== null) {
        rowLevelSecurityEnabled.push(enabled);
        continue;
      }
      const policy = parseCreatePolicy(statement, file);
      if (policy !== null) {
        policies.push(policy);
        continue;
      }
      const revoke = parseRevoke(statement, file);
      if (revoke !== null) revokes.push(revoke);
    }
  }

  return { files, tables, rowLevelSecurityEnabled, policies, revokes };
}

/**
 * Split SQL into statements, dropping comments.
 *
 * Written as a scanner rather than a `split(";")` because both this repo's migrations and
 * anything Supabase generates contain semicolons inside dollar-quoted function bodies,
 * and a naive split would cut a trigger function in half and lose the statements after
 * it — which would silently shrink what the invariants run over.
 */
export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let index = 0;

  const dollarTag = /\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$/y;

  while (index < sql.length) {
    const pair = sql.slice(index, index + 2);

    if (pair === "--") {
      while (index < sql.length && sql[index] !== "\n") index += 1;
      current += " ";
      continue;
    }

    if (pair === "/*") {
      let depth = 1;
      index += 2;
      while (index < sql.length && depth > 0) {
        const inner = sql.slice(index, index + 2);
        if (inner === "/*") {
          depth += 1;
          index += 2;
        } else if (inner === "*/") {
          depth -= 1;
          index += 2;
        } else {
          index += 1;
        }
      }
      current += " ";
      continue;
    }

    const character = sql[index];

    if (character === "'" || character === '"') {
      const quoted = readQuoted(sql, index, character);
      current += quoted.text;
      index = quoted.next;
      continue;
    }

    if (character === "$") {
      dollarTag.lastIndex = index;
      const tag = dollarTag.exec(sql);
      if (tag !== null) {
        const close = sql.indexOf(tag[0], index + tag[0].length);
        const end = close === -1 ? sql.length : close + tag[0].length;
        current += sql.slice(index, end);
        index = end;
        continue;
      }
    }

    if (character === ";") {
      if (current.trim() !== "") statements.push(current.trim());
      current = "";
      index += 1;
      continue;
    }

    current += character;
    index += 1;
  }

  if (current.trim() !== "") statements.push(current.trim());
  return statements;
}

/** Read a `'...'` literal or a `"..."` identifier, honouring the doubled-quote escape. */
function readQuoted(sql: string, start: number, quote: string): { text: string; next: number } {
  let index = start + 1;
  let text = quote;
  while (index < sql.length) {
    if (sql[index] === quote && sql[index + 1] === quote) {
      text += quote + quote;
      index += 2;
      continue;
    }
    text += sql[index];
    index += 1;
    if (sql[index - 1] === quote) break;
  }
  return { text, next: index };
}

const CREATE_TABLE =
  /^create\s+table\s+(?:if\s+not\s+exists\s+)?((?:"[^"]+"|[A-Za-z_][\w$]*)(?:\s*\.\s*(?:"[^"]+"|[A-Za-z_][\w$]*))?)/i;

function parseCreateTable(statement: string, file: string): MigrationTable | null {
  const match = CREATE_TABLE.exec(statement);
  if (match === null) return null;

  const { schema, qualifiedName } = qualify(match[1]);
  const body = balancedParentheses(statement, statement.indexOf("(", match[0].length));

  return {
    file,
    schema,
    qualifiedName,
    columns: body === null ? [] : parseColumns(body),
    ownedBySigner: body !== null && /\breferences\s+auth\s*\.\s*users\b/i.test(body),
  };
}

/**
 * The keywords a table-level constraint starts with. An entry in the table body starting
 * with one of these is a constraint, not a column, and is skipped.
 */
const TABLE_CONSTRAINT_KEYWORDS = [
  "constraint",
  "primary",
  "foreign",
  "unique",
  "check",
  "exclude",
  "like",
];

function parseColumns(body: string): MigrationColumn[] {
  const columns: MigrationColumn[] = [];
  for (const entry of splitTopLevel(body)) {
    const trimmed = entry.trim();
    if (trimmed === "") continue;

    const first = /^("[^"]+"|[A-Za-z_][\w$]*)/.exec(trimmed);
    if (first === null) continue;
    if (TABLE_CONSTRAINT_KEYWORDS.includes(first[1].toLowerCase())) continue;

    columns.push({
      name: unquote(first[1]),
      definition: trimmed.slice(first[1].length).trim(),
    });
  }
  return columns;
}

const ENABLE_RLS =
  /^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?((?:"[^"]+"|[A-Za-z_][\w$]*)(?:\s*\.\s*(?:"[^"]+"|[A-Za-z_][\w$]*))?)\s+enable\s+row\s+level\s+security\b/i;

function parseEnableRowLevelSecurity(statement: string): string | null {
  const match = ENABLE_RLS.exec(statement.replace(/\s+/g, " "));
  return match === null ? null : qualify(match[1]).qualifiedName;
}

const CREATE_POLICY =
  /^create\s+policy\s+("(?:[^"]|"")+"|[A-Za-z_][\w$]*)\s+on\s+((?:"[^"]+"|[A-Za-z_][\w$]*)(?:\s*\.\s*(?:"[^"]+"|[A-Za-z_][\w$]*))?)/i;

function parseCreatePolicy(statement: string, file: string): MigrationPolicy | null {
  const flat = statement.replace(/\s+/g, " ");
  const match = CREATE_POLICY.exec(flat);
  if (match === null) return null;

  const forClause = /\bfor\s+(all|select|insert|update|delete)\b/i.exec(flat);
  const command = (forClause?.[1] ?? "all").toLowerCase();

  const usingAt = /\busing\s*\(/i.exec(flat);
  const withCheckAt = /\bwith\s+check\s*\(/i.exec(flat);

  // Read after the table name and before the filters, so a `to` inside the policy's own
  // quoted name or inside a `using` expression is never mistaken for the role clause.
  const clauses = flat.slice(
    match[0].length,
    Math.min(usingAt?.index ?? flat.length, withCheckAt?.index ?? flat.length)
  );

  return {
    file,
    name: unquote(match[1]),
    table: qualify(match[2]).qualifiedName,
    commands:
      command === "all" ? POLICY_COMMANDS : [command as PolicyCommand],
    roles: rolesIn(/\bto\s+(.+)$/i.exec(clauses)?.[1]),
    using:
      usingAt === null
        ? null
        : balancedParentheses(flat, usingAt.index + usingAt[0].length - 1),
    withCheck:
      withCheckAt === null
        ? null
        : balancedParentheses(flat, withCheckAt.index + withCheckAt[0].length - 1),
  };
}

const REVOKE =
  /^revoke\s+(?:grant\s+option\s+for\s+)?.*?\son\s+(?:table\s+)?((?:"[^"]+"|[A-Za-z_][\w$]*)(?:\s*\.\s*(?:"[^"]+"|[A-Za-z_][\w$]*))?)\s+from\s+(.+)$/i;

/**
 * A withdrawn grant.
 *
 * Both migrations revoke everything from `anon` on top of scoping their policies to the
 * `authenticated` role, so the refusal does not rest on one mechanism. That is only worth
 * writing if something checks it is still there, which is what this is parsed for.
 */
function parseRevoke(statement: string, file: string): MigrationRevoke | null {
  const match = REVOKE.exec(statement.replace(/\s+/g, " "));
  if (match === null) return null;
  return {
    file,
    table: qualify(match[1]).qualifiedName,
    roles: rolesIn(match[2]),
  };
}

/** The role names in a comma-separated role list, lower-cased and unquoted. */
function rolesIn(clause: string | undefined): readonly string[] {
  if (clause === undefined) return [];
  return clause
    .split(",")
    .map((role) => unquote(role.trim().replace(/;$/, "")))
    .filter((role) => role !== "");
}

/** The contents of the parenthesised group that opens at `open`, or null if unbalanced. */
function balancedParentheses(text: string, open: number): string | null {
  if (open < 0 || text[open] !== "(") return null;
  let depth = 0;
  let index = open;
  while (index < text.length) {
    const character = text[index];
    if (character === "'" || character === '"') {
      index = readQuoted(text, index, character).next;
      continue;
    }
    if (character === "(") depth += 1;
    if (character === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, index).trim();
    }
    index += 1;
  }
  return null;
}

/** Split a parenthesised body on the commas that sit at depth zero. */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let index = 0;
  while (index < body.length) {
    const character = body[index];
    if (character === "'" || character === '"') {
      const quoted = readQuoted(body, index, character);
      current += quoted.text;
      index = quoted.next;
      continue;
    }
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      parts.push(current);
      current = "";
      index += 1;
      continue;
    }
    current += character;
    index += 1;
  }
  parts.push(current);
  return parts;
}

/** Normalize `documents`, `public.documents` and `"public"."documents"` to one string. */
function qualify(raw: string): { schema: string; qualifiedName: string } {
  const parts = raw.split(".").map((part) => unquote(part.trim()));
  const schema = parts.length > 1 ? parts[0] : "public";
  const name = parts[parts.length - 1];
  return { schema, qualifiedName: `${schema}.${name}` };
}

function unquote(identifier: string): string {
  return identifier.startsWith('"')
    ? identifier.slice(1, -1).replace(/""/g, '"')
    : identifier.toLowerCase();
}
