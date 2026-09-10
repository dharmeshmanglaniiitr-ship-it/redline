# 2. v1 targets freelancers/contractors with real negotiating leverage, not the best-evidenced payer

## Decision
Redline v1 is built for freelancers and independent contractors reviewing a contract
someone else (typically a client) sent them — a document type where the signer
usually still has room to push back before signing. Two segments the research
surfaced as stronger on other dimensions are explicitly out of scope for v1:
startup founders/small businesses reviewing vendor contracts and MSAs (the
strongest proven willingness to pay in the research), and individual consumers
accepting a ToS or lease with no realistic ability to negotiate at all.

## Alternatives
- Startup founders/small businesses: the only segment with hard proof people
  already pay real money for this ($300–500/hr, $8–15k/quarter on outside
  counsel). Rejected because their actual use case — B2B vendor/MSA review — is
  closer to what enterprise tools (Spellbook, LegalOn) already serve, even if
  imperfectly, and pulls the product toward business contract review rather
  than the individual-signer story the hypothesis was built around.
- Individual consumers (ToS, subscriptions): sits on the single best-evidenced
  danger in the whole research (auto-renewal clauses, the $150M FTC case
  against Adobe). Rejected for v1 because there's no evidence anyone currently
  pays a person or a tool to review a ToS before clicking accept, and a
  consumer who can't negotiate a ToS gets little value from Redline's
  counter-offer feature.
- Renters signing a lease: one of Redline's four originally-named document
  types. Rejected for v1 because the research found zero individual pain
  quotes and zero willingness-to-pay evidence for pre-signing lease review —
  building here would be a bet on the untested part of the hypothesis, not the
  validated part.

## Why
Freelancers are the only segment where three things are true together: a real,
sourced willingness-to-pay number (avg $400 per contract review, from actual
completed marketplace transactions, not rate-card estimates); a document that
is genuinely "someone else drafted this and sent it to me," which is Redline's
core premise; and enough negotiating leverage that the drafted counter-offer
feature gets used rather than just displayed. Segments with more proven demand
(founders) or more dramatic evidenced harm (consumer ToS, ironically already
served adequately by regulators suing on the user's behalf) both fail one of
those three tests.

## Consequences
- Redline's tone, clause library, and severity calibration for v1 should be
  built around client-freelancer contracts specifically, not generic
  "any contract" coverage — a lease-specific or MSA-specific clause pattern
  can wait.
- The drafted counter-offer feature is now core to the product's value for the
  target user, not a secondary nice-to-have — it needs to hold up under real
  scrutiny, not just look plausible.
- Founders/small-business and consumer/ToS use cases are not being designed
  against in v1. If either shows up as a request, it's a deliberate expansion
  decision later, not scope creep now.
