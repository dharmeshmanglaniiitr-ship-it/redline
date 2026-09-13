# 01: Project scaffold and first deploy

**What to build:** The empty tracer path, end to end. A Next.js application in
TypeScript using the App Router, styled with Tailwind, that builds locally and serves a
page from a live Vercel URL. Nothing about Redline's analysis exists yet — this ticket
exists so every later ticket has somewhere to land and something to deploy to.

Keep the shape honest about what comes next: the analysis seams described in the spec
are pure functions over text sitting above the model gateway, the database and the UI,
so the test setup must be able to exercise them without a browser or a network.

**Blocked by:** None (can start immediately)

**Status:** done — 2026-09-13. The scaffold, Tailwind and the Vercel
deploy already exist and were verified on 2026-09-13. **Do not re-scaffold the
application and do not touch `app/page.tsx`.** The only outstanding work is the test
runner: install one that runs without a browser or a network, add an `npm test` script,
and land a trivial passing test. Then this ticket is done.

- [x] The application builds and runs locally with no errors — `npm run build` and
      `npx tsc --noEmit` both pass (2026-09-13)
- [x] A page is reachable at a live Vercel URL — deploys on every push to master.
      Vercel Deployment Protection is currently on, so the URL is reachable for the
      project owner and returns a Vercel SSO redirect for everyone else
- [x] Tailwind is applied and demonstrably working on that page
- [x] A test runner is installed and a trivial test passes, runnable without a browser
      or network — Vitest 4 in a node environment, run with `npm test` (2026-09-13)
- [x] Secrets live in a gitignored environment file; none are committed — `.gitignore`
      covers `.env.local` and no secret has been committed. The file itself does not
      exist yet; creating it is Section 6 of the course handbook, not this ticket
- [x] Any dependency beyond the stack already settled in `CLAUDE.md` was asked about
      before being added
