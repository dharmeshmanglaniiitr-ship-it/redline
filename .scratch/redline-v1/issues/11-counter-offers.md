# 11: Counter-offers per flagged clause

**What to build:** For each flagged clause, drafted language the Signer can send to the
Sender to push back — without knowing how to write contract language themselves.

This is the feature that makes Redline's segment choice pay off. Freelancers were chosen
over better-evidenced segments specifically because they have the Leverage to ask for
changes before signing, which makes the counter-offer core value rather than decoration.
It has to hold up under real scrutiny, not just look plausible.

The bar is sendability. If a Signer would have to rewrite the counter-offer before
sending it, it has failed — they are using Redline instead of a lawyer, so needing a
lawyer to fix its output defeats the point. Each counter-offer references the specific
clause language it replaces, so the Sender can see exactly what is being asked for.

Watch the positioning line here. Counter-offers and Q&A sit closest to the boundary
Redline must not cross: the product drafts language and explains a document, it does not
advise whether to sign. Ticket 16 reviews this across the whole surface.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] Every flagged clause carries a drafted counter-offer
- [ ] Each counter-offer references the specific clause language it would replace, so the
      Sender can see what is being asked to change
- [ ] The reference to the replaced language is structurally present and assertable in a
      test, not merely implied in prose
- [ ] Counter-offers read as sendable without rewriting — this needs human review, and no
      automated check is claimed for it
- [ ] The drafted language asks for a change; it does not advise the Signer whether to
      sign
