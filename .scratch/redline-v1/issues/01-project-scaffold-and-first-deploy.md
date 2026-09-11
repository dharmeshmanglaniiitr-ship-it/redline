# 01: Project scaffold and first deploy

**What to build:** The empty tracer path, end to end. A Next.js application in
TypeScript using the App Router, styled with Tailwind, that builds locally and serves a
page from a live Vercel URL. Nothing about Redline's analysis exists yet — this ticket
exists so every later ticket has somewhere to land and something to deploy to.

Keep the shape honest about what comes next: the analysis seams described in the spec
are pure functions over text sitting above the model gateway, the database and the UI,
so the test setup must be able to exercise them without a browser or a network.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The application builds and runs locally with no errors
- [ ] A page is reachable at a live Vercel URL
- [ ] Tailwind is applied and demonstrably working on that page
- [ ] A test runner is installed and a trivial test passes, runnable without a browser
      or network
- [ ] Secrets live in a gitignored environment file; none are committed
- [ ] Any dependency beyond the stack already settled in `CLAUDE.md` was asked about
      before being added
