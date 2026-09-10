# Who Has Pain: Evidence of People Hurt by Contract Terms They Didn't Understand or Notice

Pre-PRD research for Redline. Findings below are limited to cases where I could verify a verbatim quote against an accessible, directly-read source. Given the hard research-budget limits (12 web searches, 15 page fetches) and significant access barriers hit along the way (see Search Log), I was only able to confirm **2** findings that meet the bar of "verbatim quote + verified source URL + real person describing being hurt in their own words." I am reporting these honestly rather than padding the list with paraphrases or unverified search-snippet text.

---

## Finding 1

**Contract type:** Employment offer letter / startup equity agreement

**Quote (verbatim, from a Hacker News comment):**
> "work for us for a few years and then we'll get you into a situation where you will inevitably fuck up and strip you of vested equity by firing you 'for cause'"

**Source URL:** https://news.ycombinator.com/item?id=39608904 (comment by user "ein0p")

**Context:** Commenting on the HN thread "Sell for half a billion and get nothing (2021)," the user describes their own first startup job offer, which contained clauses that would have let the company terminate them "for cause" and strip their vested equity right around a potential acquisition event. They say their lawyer had to spend two weeks negotiating to get these provisions removed or modified before they would sign — i.e., the danger was buried in language they wouldn't have caught without paying for legal review.

---

## Finding 2

**Contract type:** Employment / equity agreement (back-pay-to-equity conversion)

**Quote (verbatim, from a Hacker News comment):**
> "to convert over-due back pay and future payments too, into equity . When I sought transparency - 'Can I see the cap table?' - 'Can I see the terms of the investors?' - 'Can I see anything?' - the answer was invariably 'no.'"

**Source URL:** https://news.ycombinator.com/item?id=39598903 (comment by user "justinlloyd")

**Context:** On the HN thread discussing a startup founder story ("Sell for half a billion and get nothing," about FanDuel's acquisition leaving founders with nothing due to a large liquidation preference), this commenter describes being asked to accept unpaid wages (roughly $200K by their account) converted into common stock, without being shown the cap table or investor term sheet that would have told them what that equity was actually worth or how subordinate it was. They were effectively asked to sign into a financial instrument whose real terms and risk were hidden from them.

---

## What I could not confirm / had to drop

Several other leads turned up in search results but I could not verify them against a directly-readable page within budget, so per the guardrails I dropped them rather than include unverified quotes:

- **Gym membership (Anytime Fitness) early-termination clause** — a WebSearch summary described a Reddit post showing contract language ("may cancel for any reason during the initial agreement term by paying a $250.00 early termination fee...") via a secondary AOL article. My direct fetch of that AOL article returned a 404, so I could not independently verify the quote or find the original Reddit thread. Also, this is the contract's own fine print, not a person's own words describing being hurt by it — doesn't cleanly meet the "in their own words" bar anyway.
- **Skype/Microsoft acquisition equity clawback** ("I would have never gone to work there had I known") — surfaced only inside a WebSearch tool summary with no corresponding source URL I could confirm; dropped per the "must carry a source URL" rule.
- **Trustpilot auto-renewal class action** — described deceptive renewal-notice practices (emails designed to land in spam), but this is lawsuit-allegation language from secondary reporting (topclassactions.com/businesswire.com), not a real person's first-person account.
- **Audiobook narrators / Apple AI training clause (HN thread 34810786)** — thread exists and is topically relevant (freelancers signing away voice-use rights without realizing it), but the actual comments I could retrieve were meta-argument about whether narrators read their contracts, not a narrator's own first-person account with a quotable line.
- **Arbitration clause / Uber v. Heller discussion (HN thread 37414834)** — discussion was legal/case-law analysis (Uber v. Heller, Williams v. Walker-Thomas Furniture), not a first-person account of a real, named commenter's own experience.

---

## Search Log

- **Web searches used:** 12 of 12 (budget fully used).
- **Pages fetched:** 15 of 15 (budget fully used).
- **Key obstacle:** Direct WebFetch access to `reddit.com`, `old.reddit.com`, and the Reddit search JSON endpoint was blocked/unavailable in this environment ("Claude Code is unable to fetch from www.reddit.com" / old.reddit.com). This is a major gap given Reddit was the primary requested source (r/legaladvice, r/personalfinance, r/freelance, r/Entrepreneur, r/AskHR, r/renters).
- **Secondary obstacle:** DuckDuckGo HTML search (fetched directly to work around the above) returned a CAPTCHA challenge every time, so it could not be used to locate Reddit thread URLs. Bing search via WebFetch loaded but did not surface `site:reddit.com` results for the queries tried.
- **What worked:** The WebSearch tool returned useful *summaries* of content (including a few from Reddit, gym-contract, and Trustpilot-related pages) but frequently could not be traced back to a page I could independently re-fetch and verify — several of those summaries are the "could not confirm" items above rather than findings.
- **What worked best:** The Hacker News Algolia search API (`hn.algolia.com/api/v1/search`) was directly fetchable and let me pull real comment threads with first-person accounts, which produced the two confirmed findings above (both employment/equity-contract related).
- **Coverage gaps:** No confirmed findings for leases/rental agreements, freelance/consulting agreements (client-side contract abuse), Terms of Service (consumer-facing), SaaS vendor contracts, or gym/membership contracts specifically — despite multiple targeted search attempts for each. Hacker News' audience skew (software/startup/tech) likely explains why the two confirmed findings are both employment/equity-related rather than lease or ToS pain — I could not reach Reddit or consumer-complaint sites (Trustpilot, BBB) directly to fill these gaps within the remaining budget.
- **Recommendation for a follow-up pass (not acted on here, per scope):** A future research pass with a working Reddit-capable fetch path (e.g., an authenticated Reddit API tool, or a search tool that isn't CAPTCHA-blocked) would likely be far more productive for the lease/freelance/ToS/gym categories this pass could not reach.
