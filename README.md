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

What does not exist yet: document parsing, sign-in, the analysis itself, the counter-offers,
the question box, red lines, and the library. The page's one action points at `/sign-in`,
which is not built, so it will 404.

## Running it

```bash
npm install
npm run dev
```

The page is at http://localhost:3000. No environment variables are needed yet, because
nothing is wired to a database or a model provider.

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

Next.js with TypeScript and the App Router, Tailwind, deployed on Vercel. Supabase will
carry auth and storage; model calls will go through OpenRouter. Uploaded files are parsed
in the browser and only the extracted text is ever stored, so an original document never
reaches a server.
