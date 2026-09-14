/**
 * Counter-offers, driven through `analyze()` over the whole fixture corpus.
 *
 * `PRD.md` §4 test 6 splits this feature in two. That the counter-offer references the
 * clause language it replaces is testable structurally, and everything in the first two
 * blocks below tests it. Whether the drafted wording is sendable without editing is
 * called out there as needing human review, with no automated check proposed — that
 * remains true of the *quality* of the prose, and nothing here claims otherwise.
 *
 * What is claimed is narrower and still worth having: sendability has failure modes that
 * are mechanical, and a draft carrying one of them cannot be sent whatever a reader
 * thinks of the prose. An unfilled template slot cannot go to a client. A paragraph
 * describing the change to ask for, rather than the words to ask it in, leaves the
 * Signer writing the contract language themselves — which is the one thing they came
 * here not to do. And a redraft that told them whether to sign would put the product
 * over the line `PRODUCT.md` draws and `docs/spec-v1.md` puts out of scope. Those three
 * are asserted over every counter-offer in the corpus.
 *
 * The redraft is written in `lib/analysis/counter-offer.ts` rather than returned by the
 * gateway, so these assertions run over the product's own words. Had the wording come
 * back from the model it would come from the stub in here, and every test below would be
 * a test of `tests/support/stub-model.ts`.
 *
 * The live model is unreachable — every OpenRouter call comes back 429 from the pinned
 * provider's shared pool — so none of this has been checked against a real model, and
 * nothing here should be read as saying it has.
 */

import { describe, expect, it } from "vitest";

import { analyze } from "@/lib/analysis/analyze";
import { citationVerifies } from "@/lib/analysis/citation";
import { SETTLED_CLAUSE_TYPES } from "@/lib/analysis/clauses";
import { contractVocabulary, counterOfferFor } from "@/lib/analysis/counter-offer";
import type { CounterOffer, Jurisdiction, RedLine, RiskFlag } from "@/lib/analysis/result";
import { UNDETERMINED_JURISDICTION } from "@/lib/analysis/result";
import { severityTriggers, type ClauseReading } from "@/lib/analysis/severity";

import { FIXTURE_PAIRS, fixtureNames, loadFixture, type Fixture } from "./support/fixtures";
import { expectQuotedVerbatim } from "./support/invariants";

const NO_RED_LINES: readonly RedLine[] = [];

async function flagsFor(
  name: string,
  jurisdiction: Jurisdiction = UNDETERMINED_JURISDICTION
): Promise<{ fixture: Fixture; flags: readonly RiskFlag[] }> {
  const fixture = loadFixture(name);
  const { createStubModelGateway } = await import("./support/stub-model");
  const result = await analyze(
    { documentText: fixture.text, redLines: NO_RED_LINES, jurisdiction },
    createStubModelGateway(fixture)
  );
  return { fixture, flags: result.flags };
}

/** Every flag in the corpus, with the fixture it came out of. */
async function everyFlag(): Promise<{ fixture: Fixture; flag: RiskFlag }[]> {
  const all: { fixture: Fixture; flag: RiskFlag }[] = [];
  for (const name of fixtureNames()) {
    const { fixture, flags } = await flagsFor(name);
    for (const flag of flags) all.push({ fixture, flag });
  }
  return all;
}

function drafted(flag: RiskFlag): CounterOffer {
  if (flag.counterOffer === null) {
    throw new Error(`${flag.id} came back with no counter-offer`);
  }
  return flag.counterOffer;
}

/* -------------------------------------------------------------------------------- */
/* What it replaces                                                                    */
/* -------------------------------------------------------------------------------- */

describe("every flagged clause carries a counter-offer", () => {
  it("drafts one for every flag in the corpus, and leaves none null", async () => {
    const flags = await everyFlag();
    expect(flags.length).toBeGreaterThan(0);
    for (const { fixture, flag } of flags) {
      expect(flag.counterOffer, `${fixture.name}: ${flag.id}`).not.toBeNull();
    }
  });

  it("covers all eight settled clause types across the corpus", async () => {
    // A redraft exists for every clause type the analysis can flag, not only the four
    // `PRD.md` §5 settled. `docs/adr/0008` added the other four and they are flagged;
    // a flag with nothing to send back would be half a feature.
    const covered = new Set<string>();
    for (const { flag } of await everyFlag()) {
      if (flag.counterOffer !== null) covered.add(flag.clauseType);
    }
    expect([...covered].sort()).toEqual([...SETTLED_CLAUSE_TYPES].sort());
  });
});

describe("the clause language a counter-offer replaces", () => {
  it("is the flag's own citation, carried as the sentence rather than described", async () => {
    // The criterion `PRD.md` §4 test 6 calls structurally testable. `replaces` holds the
    // sentence itself, so a test can compare it — a prose reference like "the acceptance
    // clause" would satisfy a reader and nothing else.
    for (const { fixture, flag } of await everyFlag()) {
      expect(drafted(flag).replaces, `${fixture.name}: ${flag.id}`).toBe(flag.sourceSentence);
    }
  });

  it("verifies against the document by exact string match, as a flag's citation does", async () => {
    // `docs/adr/0001` reaches the counter-offer too: a redraft claiming to replace a
    // sentence the document does not contain is the same defect as a flag quoting one.
    // Checked here through the same verifier the analysis uses, against the document
    // text, rather than by trusting that `replaces` came from a verified field.
    let checked = 0;
    for (const { fixture, flag } of await everyFlag()) {
      const { replaces } = drafted(flag);
      expectQuotedVerbatim(fixture.text, replaces);
      expect(citationVerifies(fixture.text, replaces), `${fixture.name}: ${flag.id}`).toBe(true);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("sets out both the old sentence and the new one inside the message itself", async () => {
    // User story 17 is about what the Sender receives, not about the record behind it.
    // The Sender opens a reply, so the sentence being replaced and the sentence replacing
    // it both have to be in what was pasted there.
    for (const { fixture, flag } of await everyFlag()) {
      const offer = drafted(flag);
      const where = `${fixture.name}: ${flag.id}`;
      expect(offer.text, where).toContain(offer.replaces);
      expect(offer.text, where).toContain(offer.replacement);
      // Quoted, not merely mentioned: the proposed wording is set out as words to use.
      expect(offer.text, where).toContain(`"${offer.replacement}"`);
      expect(offer.replacement, where).not.toBe(offer.replaces);
    }
  });
});

/* -------------------------------------------------------------------------------- */
/* Sendability                                                                         */
/* -------------------------------------------------------------------------------- */

/** Anything a Signer would have to fill in, rewrite or delete before sending. */
const UNFILLED_SLOT =
  /\[[^\]]*\]|\{[^}]*\}|<[^>]*>|\bTBD\b|\bXXX+\b|\bTODO\b|\bN\/A\b|\bINSERT\b|\bYOUR NAME\b|_{2,}|\.\.\.|…/i;

/**
 * Phrases that describe the change to ask for instead of making it. A counter-offer
 * built out of these hands the Signer a brief and leaves them writing the contract
 * language, which is the work they came here not to do.
 */
const DESCRIBES_RATHER_THAN_DRAFTS =
  /\bwording (that|which|to)\b|\blanguage (that|which|to)\b|\bsomething (that|which|narrower|shorter|less)\b|\bask (the|your) (client|sender)\b|\byou (should|could|ought|need to|might want)\b|\bwe (recommend|suggest|advise)\b|\bconsider (asking|requesting|negotiating|pushing)\b|\bpush back\b|\btry to negotiate\b|\breplace .{0,20}with (a|an|some) \b/i;

/**
 * Advice about whether to sign, and legal effect asserted rather than attributed. The
 * first is the line `PRODUCT.md` draws and `docs/spec-v1.md` puts out of scope; the
 * second is `docs/adr/0005` — whether a clause holds up varies by jurisdiction and is
 * never stated as universal, so a redraft answers it nowhere.
 */
const ADVISES_WHETHER_TO_SIGN =
  /\b(do not|don't|should not|shouldn't|would not|wouldn't|never|refuse to|decline to) sign\b|\bbefore you sign\b|\bwalk away\b|\bbad deal\b|\bnot worth (signing|taking)\b|\bI would advise\b|\bmy advice\b|\bunfair\b|\bexploitative\b|\bpredatory\b|\bred flag\b/i;

const ASSERTS_LEGAL_EFFECT =
  /\b(unenforceable|enforceable|void|voidable|illegal|unlawful|statute|statutory|courts?|judges?|litigation|legally|the law (requires|says|will))\b/i;

/** Words that make a sentence operate on the contract rather than talk about it. */
const OPERATIVE =
  /\b(shall|may|is treated as|takes effect|applies|remains|assigns|continues|is limited to|is subject to|falls due|is liable|indemnif)/;

describe("counter-offers read as language that can be sent as it stands", () => {
  it("leaves no template slot for the Signer to fill in", async () => {
    for (const { fixture, flag } of await everyFlag()) {
      const offer = drafted(flag);
      const where = `${fixture.name}: ${flag.id}`;
      // `replaces` is the document's own sentence and is quoted, so it is exempt: a
      // contract that itself contains brackets is not a defect in the redraft.
      const written = offer.text.split(offer.replaces).join(" ");
      expect(written, where).not.toMatch(UNFILLED_SLOT);
      expect(offer.replacement, where).not.toMatch(UNFILLED_SLOT);
    }
  });

  it("proposes contract wording rather than describing the change to ask for", async () => {
    for (const { fixture, flag } of await everyFlag()) {
      const offer = drafted(flag);
      const where = `${fixture.name}: ${flag.id}`;

      // Real clause language: long enough to stand in a contract, and operative rather
      // than descriptive.
      expect(offer.replacement.length, where).toBeGreaterThan(80);
      expect(offer.replacement, where).toMatch(OPERATIVE);
      // New wording, not the document's own sentence handed back with a covering note.
      expect(fixture.text.includes(offer.replacement), where).toBe(false);

      const written = offer.text.split(offer.replaces).join(" ");
      expect(written, where).not.toMatch(DESCRIBES_RATHER_THAN_DRAFTS);
      // A whole message, not a one-line instruction.
      expect(offer.text.length, where).toBeGreaterThan(300);
    }
  });

  it("asks the Sender for a change without telling the Signer whether to sign", async () => {
    for (const { fixture, flag } of await everyFlag()) {
      const offer = drafted(flag);
      const where = `${fixture.name}: ${flag.id}`;
      const written = offer.text.split(offer.replaces).join(" ");

      expect(written, where).not.toMatch(ADVISES_WHETHER_TO_SIGN);
      expect(written, where).not.toMatch(ASSERTS_LEGAL_EFFECT);
      // Written outward, in the Signer's own voice: there is nobody in the message to
      // advise, which is what keeps the line structural rather than a matter of care.
      expect(written, where).toMatch(/\bI\b/);
    }
  });

  it("answers what was actually wrong with this clause, not its category", async () => {
    // `docs/adr/0003` applied to the remedy. Each fixture pair is two copies of one
    // contract differing in one clause, so a redraft chosen by clause type comes back
    // identical on both halves and fails here.
    for (const [narrower, broader] of FIXTURE_PAIRS) {
      const low = await flagsFor(narrower);
      const high = await flagsFor(broader);
      expect(texts(low.flags), `${narrower} and ${broader}`).not.toEqual(texts(high.flags));
    }

    // The retainer pair is not in `FIXTURE_PAIRS` and carries the four clause types
    // `docs/adr/0008` settled, so it is checked type by type.
    const exposed = await flagsFor("retainer-exposed.txt");
    const bounded = await flagsFor("retainer-bounded.txt");
    for (const clauseType of SETTLED_CLAUSE_TYPES) {
      const high = exposed.flags.find((flag) => flag.clauseType === clauseType);
      const low = bounded.flags.find((flag) => flag.clauseType === clauseType);
      if (high === undefined || low === undefined) continue;
      expect(drafted(high).replacement, clauseType).not.toBe(drafted(low).replacement);
      expect(drafted(high).text, clauseType).not.toBe(drafted(low).text);
    }
  });

  it("names the properties that were wrong, in the words the Signer would use", async () => {
    // The broad restriction is the clause where the most properties fire at once, so it
    // is where a redraft that ignored them would show. Two years, an area the Signer
    // never worked in, a whole sector and no payment: the message says all four.
    const { flags } = await flagsFor("pair-noncompete-broad.txt");
    const restriction = flags.find((flag) => flag.clauseType === "non-compete");
    if (restriction === undefined) throw new Error("the broad restriction went unflagged");

    const offer = drafted(restriction);
    expect(offer.text).toContain("24 months");
    expect(offer.text).toContain("not tied to the places I actually worked");
    expect(offer.text).toContain("nothing to do with this job");
    expect(offer.text).toContain("pays me nothing for it");
    // And the wording asked for actually narrows those things.
    expect(offer.replacement).toContain("six (6) months");
    expect(offer.replacement).toContain("shall pay");
  });

  it("says the contract was silent rather than saying what it did not say", async () => {
    // `CLAUDE.md`: the product states only what the document says. A property fires both
    // when it is stated at its dangerous end and when it is not stated at all
    // (`docs/adr/0006`), and the two are not the same sentence — a restriction naming no
    // payment is not a restriction that pays nothing. This matters more here than
    // anywhere else on the screen, because the Signer is about to send it to the person
    // who wrote the contract, and an overclaim is the fastest way to lose the argument.
    const silent = await flagsFor("pair-hedge-silent.txt");
    const stated = await flagsFor("pair-hedge-stated.txt");

    const hedged = silent.flags.find((flag) => flag.clauseType === "non-compete");
    const plain = stated.flags.find((flag) => flag.clauseType === "non-compete");
    if (hedged === undefined || plain === undefined) throw new Error("the pair lost a flag");

    expect(hedged.unstatedProperties).toEqual(["compensated"]);
    expect(drafted(hedged).text).toContain("says nothing about paying me for it");
    expect(drafted(hedged).text).not.toContain("pays me nothing");

    expect(plain.unstatedProperties).toEqual([]);
    expect(drafted(plain).text).toContain("pays me nothing for it");

    // Same for the ceiling the contract never compares with the fee: the exposed
    // retainer leaves `capProportionateToFee` unstated, so nothing calls a figure
    // disproportionate — there is no figure in that clause to call anything.
    const exposed = await flagsFor("retainer-exposed.txt");
    const liability = exposed.flags.find((flag) => flag.clauseType === "uncapped-liability");
    if (liability === undefined) throw new Error("the exposed retainer lost its liability flag");

    expect(liability.unstatedProperties).toEqual(["capProportionateToFee"]);
    expect(drafted(liability).text).not.toContain("ceiling in name only");
    expect(drafted(liability).text).not.toContain("stands a long way above");
  });

  it("keeps a clause that is doing its job rather than asking for it to be struck out", async () => {
    // The failure this guards against loses the Signer something. Where nothing fired,
    // the sentence is often the one protecting them — the bounded IP assignment is
    // exactly that — so a redraft standing in its place would ask the Sender to delete
    // the protection. The clause is kept and added to, and the message says so.
    const { fixture, flags } = await flagsFor("pair-ip-bounded.txt");
    const bounded = flags.find((flag) => flag.clauseType === "ip-assignment");
    if (bounded === undefined) throw new Error("the bounded assignment went unflagged");

    const offer = drafted(bounded);
    expect(bounded.severity).toBe(1);
    expect(offer.replacement.startsWith(offer.replaces)).toBe(true);
    expect(offer.text).toContain("I would keep that and add a line to it");
    expect(offer.text).not.toContain("put this in its place");
    // The protective wording survives into the clause being asked for.
    expect(offer.replacement).toContain("remain the Contractor's property");
    expect(fixture.text).toContain(offer.replaces);

    // A clause that did fire is genuinely replaced, so the two are not the same move.
    const overreaching = await flagsFor("pair-ip-overreaching.txt");
    const reaching = overreaching.flags.find((flag) => flag.clauseType === "ip-assignment");
    if (reaching === undefined) throw new Error("the overreaching assignment went unflagged");

    const rewrite = drafted(reaching);
    expect(rewrite.text).toContain("put this in its place");
    expect(rewrite.replacement.startsWith(rewrite.replaces)).toBe(false);
  });
});

/* -------------------------------------------------------------------------------- */
/* Jurisdiction                                                                        */
/* -------------------------------------------------------------------------------- */

describe("the drafted language and the governing law", () => {
  it("says the same thing whether a jurisdiction is named or not", async () => {
    // `docs/adr/0005` and `docs/adr/0008`. The flag's cost carries the attributed legal
    // question and changes when the law is named (`tests/risk-flags.test.ts`); the
    // redraft makes no claim whose answer turns on a jurisdiction, so it does not move.
    // A counter-offer that did move here would be carrying an enforceability assumption.
    const exposed = loadFixture("retainer-exposed.txt");
    const named = await flagsFor("retainer-exposed.txt", {
      source: "document",
      name: exposed.sidecar.jurisdiction.expected,
      sourceSentence: exposed.sidecar.jurisdiction.sourceSentence ?? "",
    });
    const unknown = await flagsFor("retainer-exposed.txt");

    expect(named.flags.length).toBeGreaterThan(0);
    expect(texts(named.flags)).toEqual(texts(unknown.flags));
    for (const flag of named.flags) {
      expect(drafted(flag).text, flag.id).not.toContain("Ireland");
    }

    // Meanwhile the cost on the same flags does move, so this is a property of the
    // redraft rather than of the fixture.
    const indemnity = named.flags.find((flag) => flag.clauseType === "one-sided-indemnity");
    expect(indemnity?.cost).toContain("Ireland");
  });
});

/* -------------------------------------------------------------------------------- */
/* The contract's own vocabulary                                                       */
/* -------------------------------------------------------------------------------- */

const OTHER_WORDS = [
  "SERVICES AGREEMENT",
  "",
  'This Agreement is made between Alder & Vance Limited (the "Company") and Rosa Petit,',
  'trading as Petit Studio (the "Consultant").',
  "",
  "1.1 The Consultant shall produce the Work Product listed in Schedule 1 for the Company.",
  "1.2 The Consultant shall deliver each Work Product to the Company by the date agreed.",
  "1.3 The Company shall pay the Consultant for each Work Product on acceptance of it.",
  "1.4 The Company may reject any Work Product the Consultant delivers.",
].join("\n");

describe("the redraft speaks the contract's own vocabulary", () => {
  it("reads the parties and the work out of the document instead of assuming them", () => {
    expect(contractVocabulary(OTHER_WORDS)).toEqual({
      sender: "Company",
      signer: "Consultant",
      work: "item of Work Product",
    });

    // And the corpus's own pair, read the same way rather than defaulted into.
    const adhesion = loadFixture("adhesion-contract.txt");
    expect(contractVocabulary(adhesion.text)).toEqual({
      sender: "Client",
      signer: "Contractor",
      work: "Deliverable",
    });
  });

  it("writes the proposed clause in those terms, so it can stand in that contract", () => {
    // Sendability at its most mechanical. A redraft calling the Signer "the Contractor"
    // into a contract that says "the Consultant" has to be translated before it can go
    // anywhere near the document, and translating it is rewriting it.
    const reading: ClauseReading = { clauseType: "payment-approval", properties: {} };
    const offer = counterOfferFor(
      reading,
      "1.4 The Company may reject any Work Product the Consultant delivers.",
      severityTriggers(reading),
      contractVocabulary(OTHER_WORDS)
    );

    expect(offer.replacement).toContain("Company shall notify");
    expect(offer.replacement).toContain("the Consultant");
    expect(offer.replacement).toContain("item of Work Product");
    expect(offer.replacement).not.toContain("Client");
    expect(offer.replacement).not.toContain("Contractor");
    expect(offer.replacement).not.toContain("Deliverable");
  });

  it("falls back to the commonest freelance pair when nothing is recognisable", () => {
    expect(contractVocabulary("A short note between two people about some work.")).toEqual({
      sender: "Client",
      signer: "Contractor",
      work: "Deliverable",
    });
  });
});

/* -------------------------------------------------------------------------------- */
/* Both ends of every threshold                                                        */
/* -------------------------------------------------------------------------------- */

/**
 * One reading per clause type with nothing stated, so every property is read at its
 * dangerous end and every trigger fires (`lib/analysis/severity.ts`).
 */
const AT_ITS_WORST: readonly ClauseReading[] = [
  { clauseType: "payment-approval", properties: {} },
  { clauseType: "ip-assignment", properties: {} },
  { clauseType: "non-compete", properties: {} },
  { clauseType: "termination-for-convenience", properties: {} },
  { clauseType: "one-sided-indemnity", properties: {} },
  { clauseType: "uncapped-liability", properties: {} },
  { clauseType: "auto-renewal", properties: {} },
  { clauseType: "unilateral-change", properties: {} },
];

/** One reading per clause type stated at the standard end, so nothing fires. */
const AT_ITS_BEST: readonly ClauseReading[] = [
  { clauseType: "payment-approval", properties: { acceptanceStandard: "objective" } },
  { clauseType: "ip-assignment", properties: { reachesBeyondDeliverable: false } },
  {
    clauseType: "non-compete",
    properties: {
      durationMonths: 3,
      geographicScope: "within ten miles of the Client's office",
      industryScope: "bookkeeping services only",
      compensated: true,
    },
  },
  {
    clauseType: "termination-for-convenience",
    properties: { killFee: "25 per cent of the fees for the work not yet started" },
  },
  {
    clauseType: "one-sided-indemnity",
    properties: {
      mutual: true,
      triggeringClaims: "a claim to the extent that it arises from that party's own breach",
      cappedByLiabilityLimit: true,
    },
  },
  {
    clauseType: "uncapped-liability",
    properties: {
      liabilityCap: "the total fees payable under this Agreement",
      capAppliesToSigner: true,
      capProportionateToFee: true,
    },
  },
  {
    clauseType: "auto-renewal",
    properties: { renewalTermMonths: 1, noticeWindowDays: 14, terminableDuringRenewal: true },
  },
  {
    clauseType: "unilateral-change",
    properties: {
      changeRequiresSignerAgreement: true,
      whatMayChange: "the monthly fee, by signed variation only",
      exitOnChange: true,
    },
  },
];

const SENTENCE = "9.9 A clause stands here, and it says what it says.";

describe("both ends of every clause type's own threshold", () => {
  it("covers each settled clause type exactly once at each end", () => {
    expect(AT_ITS_WORST.map((reading) => reading.clauseType)).toEqual([...SETTLED_CLAUSE_TYPES]);
    expect(AT_ITS_BEST.map((reading) => reading.clauseType)).toEqual([...SETTLED_CLAUSE_TYPES]);
  });

  it("drafts a different, sendable redraft at each end", () => {
    // The corpus reaches most of these arms but not all of them — no fixture plants a
    // payment-approval clause with a stated standard, or a termination clause with a kill
    // fee. Driving the drafting function directly covers the arms a Signer's own contract
    // would reach and the fixtures do not.
    const words = { sender: "Client", signer: "Contractor", work: "Deliverable" };

    for (const [index, worst] of AT_ITS_WORST.entries()) {
      const best = AT_ITS_BEST[index];
      const clauseType = worst.clauseType;

      const worstTriggers = severityTriggers(worst);
      const bestTriggers = severityTriggers(best);
      expect(worstTriggers.length, clauseType).toBeGreaterThan(0);
      expect(bestTriggers, clauseType).toEqual([]);

      const dangerous = counterOfferFor(worst, SENTENCE, worstTriggers, words);
      const standard = counterOfferFor(best, SENTENCE, bestTriggers, words);

      for (const offer of [dangerous, standard]) {
        expect(offer.replaces, clauseType).toBe(SENTENCE);
        expect(offer.text, clauseType).toContain(SENTENCE);
        expect(offer.text, clauseType).toContain(`"${offer.replacement}"`);
        expect(offer.replacement.length, clauseType).toBeGreaterThan(80);
        expect(offer.replacement, clauseType).toMatch(OPERATIVE);
        expect(offer.replacement, clauseType).not.toMatch(UNFILLED_SLOT);
        expect(offer.text, clauseType).not.toMatch(DESCRIBES_RATHER_THAN_DRAFTS);
        expect(offer.text, clauseType).not.toMatch(ADVISES_WHETHER_TO_SIGN);
        expect(offer.text, clauseType).not.toMatch(ASSERTS_LEGAL_EFFECT);
      }

      // A clause at the standard end still gets something to send, and it is not the
      // rewrite the dangerous end gets.
      expect(dangerous.replacement, clauseType).not.toBe(standard.replacement);
      expect(dangerous.text, clauseType).not.toBe(standard.text);
    }
  });
});

/** The drafted messages on a set of flags, for comparing two readings of one contract. */
function texts(flags: readonly RiskFlag[]): readonly string[] {
  return flags.map((flag) => flag.counterOffer?.text ?? "");
}
