# Redline

Redline reads a contract someone else drafted and tells the person about to sign it what
they are actually agreeing to. Every risk it flags quotes the exact sentence it came
from, so the reader can find it in their own copy and check it rather than trust it.

It is built for freelancers and independent contractors reviewing a client's agreement
before signing, because they can still email back and ask for a change. That ability to
negotiate is what makes a drafted counter-offer worth anything, and it is why leases and
terms of service are out of scope for this version.

## Status

The landing page is built and deployed. The analysis behind it is not.

What exists: the product record, the brief, five architecture decisions, a full v1 spec,
eighteen implementation tickets, and one public page that demonstrates the idea against a
sample contract written for the purpose. The page says so in place, because a mocked-up
flag presented as real output would break the one rule the product is built on.

What does not exist yet: the analysis itself, the counter-offers, the question box, red
lines, and the library view.

## Running it

```bash
npm install
npm run dev
```

The page is at http://localhost:3000. It runs with no environment variables at all: a
Signer can bring a contract in at `/review` and read the text that came out of it, with
the account and the library switched off and said to be switched off.

### Turning accounts on

Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` from the Supabase project's API settings. `.env.local` is
gitignored and is the only place a real key belongs.

Then, in the Supabase project:

1. Run every file in `supabase/migrations/` in order, in the SQL editor. They create the
   `documents` table, switch row level security on, and add the four policies that make a
   Signer's documents unreachable from any other account.
2. Add `<origin>/auth/confirm` to the Redirect URLs under Authentication, URL
   Configuration, or the link in a confirmation email will not come back to the app.

To run the cross-Signer isolation test against that project, set `SUPABASE_TEST_URL`,
`SUPABASE_TEST_ANON_KEY` and `SUPABASE_TEST_SERVICE_ROLE_KEY` as well. It creates and
deletes accounts, so point it at a scratch project. Without all three it skips and says
which are missing; it never reports green without having run.

## Where the thinking lives

Read these before changing anything:

- `CLAUDE.md` sets the ground rules and the closed scope.
- `PRODUCT.md` is the product record: who it is for, what it does, and what the research
  could not establish and must never be invented.
- `PRD.md` is the brief, including the calls that were made and what each one cost.
- `CONTEXT.md` defines the vocabulary. Signer, Sender and Leverage mean specific things
  here and are used consistently.
- `docs/adr/` holds the five decisions the rest of the work rests on.
- `docs/spec-v1.md` is the spec, as user stories plus implementation and testing decisions.
- `DESIGN.md` records the visual system as built, including what was never verified.
- `.scratch/redline-v1/issues/` holds the eighteen tickets, numbered in dependency order.

## Stack

Next.js with TypeScript and the App Router, Tailwind, deployed on Vercel. Supabase carries
auth and the database; model calls will go through OpenRouter. Uploaded files are parsed in
the browser and only the extracted text is ever stored, so an original document never
reaches a server.
