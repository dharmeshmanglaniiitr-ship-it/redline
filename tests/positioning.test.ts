/**
 * Where Redline stops, asserted over everything it says to a Signer.
 *
 * One line runs through this product: it explains a document and drafts language, and it
 * does not advise whether to sign (`PRODUCT.md`, `docs/adr/0004`). The line is only
 * checkable now that flags, counter-offers and the question box all exist and can be read
 * together, which is why it is a test file rather than a note on each of them.
 *
 * Two failure modes are hunted here and they are the same failure twice. The obvious one
 * is language recommending or discouraging signing. The subtler one is Redline stating
 * something this document does not support — answering from general legal knowledge where
 * the text is silent, or putting a jurisdiction-dependent claim as universal fact
 * (`docs/adr/0005`, `docs/adr/0007`). Both are the product making a claim it cannot show
 * the Signer the basis for.
 *
 * **What is asserted over.** The real drafted text and the real rendered markup, never a
 * transcription of today's copy. Flag wording comes out of `analyze()` over the whole
 * fixture corpus and out of `lib/analysis/wording.ts` driven at both ends of every clause
 * type's threshold, so an arm the corpus never reaches is still read. The screens are
 * rendered with React's own static renderer over the real components. Nothing below
 * compares a string to a string a person would have to remember to update; the one
 * exception is the two sentences a screen says about the product itself, which are
 * exported constants and are checked for what they claim rather than for their wording.
 *
 * **Why the assertions are shaped the way they are.** A banned-word list produces false
 * positives on copy that is doing its job: a counter-offer contains "shall" because it is
 * contract language, a flag says what a clause would cost because that is the feature, and
 * the word "sign" appears all over a product about signing. So the patterns below match
 * advice *directed at the Signer about whether to sign* — a verb with its object — rather
 * than the words advice happens to be made of. And the jurisdiction rule is asserted as
 * attribution rather than as absence: a legal-effect word is allowed in exactly the
 * sentence that names whose law answers it, which is what `docs/adr/0007` asks for and
 * what a bare word ban would have forbidden.
 *
 * The live model is unreachable — every OpenRouter call comes back 429 from the pinned
 * provider's shared pool — so nothing here has been checked against a real model. What is
 * checked is Redline's own prose, which is written in this repo and not by a model, plus
 * the seams that stand between a model's prose and a Signer.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ClearedList } from "@/app/(app)/review/cleared-list";
import { GoverningLaw } from "@/app/(app)/review/governing-law";
import { DRAFTED_NOT_ADVISED, MarkedGalley } from "@/app/(app)/review/marked-galley";
import { QuestionBox, WHAT_THE_BOX_ANSWERS } from "@/app/(app)/review/question-box";
import { WHERE_REDLINE_STOPS } from "@/app/(app)/_components/galley";
import { analyze } from "@/lib/analysis/analyze";
import {
  ANSWER_CAME_FROM_OUTSIDE,
  DOCUMENT_DOES_NOT_SAY,
  answerQuestion,
} from "@/lib/analysis/answer";
import { CHECKLIST_ENTRIES, SETTLED_CLAUSE_TYPES } from "@/lib/analysis/clauses";
import { counterOfferFor } from "@/lib/analysis/counter-offer";
import { crossingsOf } from "@/lib/analysis/red-lines";
import type { Jurisdiction, RiskFlag, Severity } from "@/lib/analysis/result";
import { UNDETERMINED_JURISDICTION } from "@/lib/analysis/result";
import { severityTriggers, unstatedPropertiesOf } from "@/lib/analysis/severity";
import {
  checklistEntryName,
  costFor,
  hedgeNoteFor,
  severityWord,
  titleFor,
} from "@/lib/analysis/wording";
import { readExtractedText } from "@/lib/document/extraction";
import type { JsonObject, ModelGateway, ModelRequest } from "@/lib/model/types";

import { fixtureNames, loadFixture, type Fixture } from "./support/fixtures";
import { AT_ITS_BEST, AT_ITS_WORST, EVERY_READING, HALF_STATED } from "./support/readings";
import { createStubModelGateway } from "./support/stub-model";

/* -------------------------------------------------------------------------------- */
/* The two failures                                                                    */
/* -------------------------------------------------------------------------------- */

/**
 * Advice to the Signer about whether to sign, or about what to do with the deal.
 *
 * Each pattern is a verb with its object, because the failure is the act of advising and
 * not the vocabulary. "This is the cheap time to argue with it" points a Signer at a
 * feature of their own document; "you should not sign this" decides for them. A word list
 * cannot tell those apart and would fail the first while a real defect worded differently
 * walked past.
 */
const ADVISES_WHETHER_TO_SIGN: readonly RegExp[] = [
  /\b(?:do not|don't|should not|shouldn't|would not|wouldn't|never|refuse to|decline to|hesitate to)\s+sign\b/i,
  /\byou\s+(?:should|ought to|need to|may want to|might want to|would be wise to)\s+(?:sign|accept|reject|refuse|walk away|back out)\b/i,
  /\b(?:safe|risky|unwise|advisable|inadvisable|dangerous|fine|foolish)\s+to\s+sign\b/i,
  /\b(?:i|we|redline)\s+(?:recommend|advise|would recommend|would advise)\b/i,
  /\bmy advice\b/i,
  /\b(?:seek|get|take)\s+(?:legal\s+)?advice\b/i,
  /\bconsult\s+(?:a|an|your)\s+(?:lawyer|solicitor|attorney)\b/i,
  /\b(?:exploitative|predatory)\b/i,
  /\bunfair\s+(?:to you|term|clause|deal|contract)\b/i,
  /\bthis\s+(?:is|reads as)\s+a\s+(?:bad|terrible|good)\s+(?:deal|contract|agreement)\b/i,
];

/**
 * Redline positioning itself as a lawyer, or as one you no longer need.
 *
 * The FTC's charge against DoNotPay in September 2024 was about marketing, not output:
 * the service was sold as a lawyer substitute without anyone testing whether it matched
 * one. So this is checked over what a Signer reads, which is where such a claim would
 * actually be made.
 */
const CLAIMS_TO_BE_A_LAWYER =
  /\b(?:your|a|an|our)\s+(?:ai\s+)?(?:lawyer|solicitor|attorney|legal team|law firm|counsel)\b|\blegal advice\b|\b(?:instead of|rather than|no need for|replaces?|cheaper than)\s+(?:a|your)\s+(?:lawyer|solicitor|attorney)\b/i;

/**
 * The vocabulary of legal effect, which `docs/adr/0007` makes a question for a governing
 * jurisdiction rather than a fact.
 *
 * Its presence is not the failure. Asserting it without saying whose law answers it is.
 */
const LEGAL_EFFECT =
  /\b(?:enforce|enforced|enforces|enforceable|unenforceable|enforcement|statute|statutes|statutory|court|courts|judge|judges|void|voidable|illegal|unlawful|litigation|lawsuit|legally)\b/i;

/**
 * The two shapes `lib/analysis/wording.ts` writes a jurisdiction-dependent claim in: named
 * to the law that answers it, or held back because the contract names no law
 * (`docs/adr/0007`).
 */
const ATTRIBUTED_TO_A_LAW =
  /\bis a question for the law of \S/i.source + "|" + /\bturns on the law governing this contract\b/i.source;

const ATTRIBUTION = new RegExp(ATTRIBUTED_TO_A_LAW, "i");

/** Redline's prose, sentence by sentence, so a claim can be read beside its attribution. */
function sentencesOf(prose: string): string[] {
  return prose
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence !== "");
}

/** Nothing here recommends or discourages signing, and nothing claims to be a lawyer. */
function expectExplainsWithoutAdvising(prose: string, where: string): void {
  for (const pattern of ADVISES_WHETHER_TO_SIGN) {
    expect(prose, `${where} :: ${pattern}`).not.toMatch(pattern);
  }
  expect(prose, where).not.toMatch(CLAIMS_TO_BE_A_LAWYER);
}

/**
 * Every sentence that reaches for legal effect names the law that decides it.
 *
 * The real invariant behind `docs/adr/0007`, and stronger than forbidding the words: a
 * flag is *allowed* to raise enforceability, and it must raise it as somebody's question.
 * "This would not be enforced" fails here. "Whether it would be enforced is a question for
 * the law of Ireland" passes, and so does the undetermined form.
 */
function expectLegalClaimsAttributed(prose: string, where: string): void {
  for (const sentence of sentencesOf(prose)) {
    if (!LEGAL_EFFECT.test(sentence)) continue;
    expect(sentence, `${where} :: unattributed legal claim`).toMatch(ATTRIBUTION);
  }
}

/* -------------------------------------------------------------------------------- */
/* Every word on a flag                                                                */
/* -------------------------------------------------------------------------------- */

const LAWS: readonly Jurisdiction[] = [
  UNDETERMINED_JURISDICTION,
  { source: "document", name: "Ireland", sourceSentence: "13.1 Governed by the laws of Ireland." },
  { source: "signer", name: "England and Wales", detected: null },
];

/** Every sentence `lib/analysis/wording.ts` can write about one reading, under one law. */
function wordingFor(
  reading: (typeof EVERY_READING)[number],
  jurisdiction: Jurisdiction
): { title: string; cost: string; hedge: string | null } {
  const triggers = severityTriggers(reading);
  return {
    title: titleFor(reading, triggers),
    cost: costFor(reading, triggers, jurisdiction),
    hedge: hedgeNoteFor(
      unstatedPropertiesOf(reading.clauseType, reading.properties as never)
    ),
  };
}

describe("what a flag says about a clause", () => {
  it("covers every settled clause type at both ends of its threshold and in between", () => {
    // The guard on the tables themselves. A clause type added without a reading here
    // would leave its wording unread by everything below, silently.
    for (const table of [AT_ITS_WORST, HALF_STATED, AT_ITS_BEST]) {
      expect(table.map((reading) => reading.clauseType)).toEqual([...SETTLED_CLAUSE_TYPES]);
    }
  });

  it("describes what the clause would cost without recommending for or against signing", () => {
    for (const reading of EVERY_READING) {
      for (const law of LAWS) {
        const { title, cost, hedge } = wordingFor(reading, law);
        const where = `${reading.clauseType} under ${law.source}`;

        expectExplainsWithoutAdvising(title, `${where}: title`);
        expectExplainsWithoutAdvising(cost, `${where}: cost`);
        expectExplainsWithoutAdvising(hedge ?? "", `${where}: hedge`);

        // And it is a real account rather than an empty one, so this is not passing by
        // saying nothing at all.
        expect(cost.length, where).toBeGreaterThan(80);
        expect(title.trim(), where).not.toBe("");
      }
    }
  });

  it("attributes every claim about legal effect to a named law, or withholds it", () => {
    for (const reading of EVERY_READING) {
      for (const law of LAWS) {
        const { title, cost, hedge } = wordingFor(reading, law);
        const where = `${reading.clauseType} under ${law.source}`;

        expectLegalClaimsAttributed(cost, `${where}: cost`);
        // A title and a hedge carry no legal claim at all. A title is what to call the
        // finding and a hedge names a property the document left out (`docs/adr/0006`) —
        // neither is a place a legal conclusion could be attributed, so neither may make
        // one.
        expect(title, `${where}: title`).not.toMatch(LEGAL_EFFECT);
        expect(hedge ?? "", `${where}: hedge`).not.toMatch(LEGAL_EFFECT);
      }
    }
  });

  it("raises a legal question on exactly the clause types whose reasoning depends on one", () => {
    // `docs/adr/0008`'s complement, made mechanical, and counted by the attribution rather
    // than by vocabulary: the auto-renewal's question — whether a renewal needs its own
    // notice to take effect — carries none of the words in `LEGAL_EFFECT` and is a
    // jurisdiction-dependent claim all the same. Four clause types raise one. On the other
    // four a legal question appearing at all would be a conclusion this product never
    // reaches, attributed or not.
    const raisesIt = new Set<string>();
    for (const reading of EVERY_READING) {
      for (const law of LAWS) {
        if (ATTRIBUTION.test(wordingFor(reading, law).cost)) raisesIt.add(reading.clauseType);
      }
    }

    expect([...raisesIt].sort()).toEqual([
      "auto-renewal",
      "non-compete",
      "one-sided-indemnity",
      "uncapped-liability",
    ]);

    // And the four that raise none say nothing about legal effect either.
    for (const reading of EVERY_READING) {
      if (raisesIt.has(reading.clauseType)) continue;
      for (const law of LAWS) {
        expect(wordingFor(reading, law).cost, reading.clauseType).not.toMatch(LEGAL_EFFECT);
      }
    }
  });

  it("drafts wording to send at every end of every threshold without advising either way", () => {
    // The corpus reaches most of these arms and not all of them, and the ones it misses are
    // the quiet ones: a payment clause with a real test in it, a termination clause that
    // already pays a kill fee. A redraft on a clause that is doing its job is the easiest
    // place to slip into "this one is fine, sign it".
    const words = { sender: "Client", signer: "Contractor", work: "Deliverable" };
    const sentence = "9.9 A clause stands here, and it says what it says.";

    for (const reading of EVERY_READING) {
      const offer = counterOfferFor(reading, sentence, severityTriggers(reading), words);
      const written = offer.text.split(offer.replaces).join(" ");
      expectExplainsWithoutAdvising(written, `${reading.clauseType}: counter-offer`);
      expect(written, reading.clauseType).not.toMatch(LEGAL_EFFECT);
      // Addressed outward, to the Sender, in the Signer's own voice. There is nobody in
      // the message to advise, which is what makes the line structural rather than careful.
      expect(written, reading.clauseType).toMatch(/\bI\b/);
    }
  });

  it("names whose law decides, or says the contract names none, in every one of those", () => {
    // The withheld case is the one `docs/adr/0007` was written for. With no jurisdiction
    // established the claim is not guessed and not quietly dropped: the sentence says the
    // contract names no law, so a Signer can see that something is missing.
    for (const reading of EVERY_READING) {
      const undetermined = wordingFor(reading, UNDETERMINED_JURISDICTION).cost;
      const named = wordingFor(reading, LAWS[1]).cost;
      if (!ATTRIBUTION.test(named)) continue;

      expect(named, reading.clauseType).toContain("is a question for the law of Ireland");
      expect(undetermined, reading.clauseType).toContain(
        "turns on the law governing this contract, and nothing here names one"
      );
      expect(undetermined, reading.clauseType).not.toContain("Ireland");
    }
  });
});

describe("every flag the corpus produces", () => {
  async function flagsFor(name: string, jurisdiction: Jurisdiction): Promise<readonly RiskFlag[]> {
    const fixture = loadFixture(name);
    const { flags } = await analyze(
      { documentText: fixture.text, redLines: [], jurisdiction },
      createStubModelGateway(fixture)
    );
    return flags;
  }

  it("explains, drafts and attributes, across the whole corpus and under either law", async () => {
    let read = 0;
    for (const name of fixtureNames()) {
      for (const law of [UNDETERMINED_JURISDICTION, LAWS[1]]) {
        for (const flag of await flagsFor(name, law)) {
          const where = `${name}: ${flag.id} under ${law.source}`;
          read += 1;

          expectExplainsWithoutAdvising(flag.title, `${where}: title`);
          expectExplainsWithoutAdvising(flag.cost, `${where}: cost`);
          expectExplainsWithoutAdvising(flag.hedgeNote ?? "", `${where}: hedge`);
          expectLegalClaimsAttributed(flag.cost, `${where}: cost`);

          // The counter-offer is the piece a Signer sends under their own name, so the
          // same two rules run over the whole message. The document's own sentence is cut
          // out first: a contract that itself mentions a court is not a defect in the
          // redraft (`tests/counter-offers.test.ts` cuts it out the same way).
          const offer = flag.counterOffer;
          expect(offer, where).not.toBeNull();
          if (offer === null) continue;
          const written = offer.text.split(offer.replaces).join(" ");
          expectExplainsWithoutAdvising(written, `${where}: counter-offer`);
          // A redraft asserts no legal effect in any jurisdiction, attributed or not: its
          // reasoning is commercial, which is why it reads the same under either law
          // (`lib/analysis/counter-offer.ts`).
          expect(written, `${where}: counter-offer`).not.toMatch(LEGAL_EFFECT);
        }
      }
    }
    expect(read).toBeGreaterThan(20);
  });

  it("says nothing about a Signer's own red lines beyond what they wrote", async () => {
    // A crossing note is the one place Redline speaks about somebody's standard. It may
    // report the disagreement; it may not turn it into a reason to sign or not to.
    for (const clauseType of SETTLED_CLAUSE_TYPES) {
      for (const triggers of [[], ["anything"]]) {
        const crossings = crossingsOf(
          [{ text: "I do not sign non-competes, and I will not be paid on a client's say-so." }],
          clauseType,
          triggers
        );
        for (const crossing of crossings) {
          expectExplainsWithoutAdvising(crossing.note, `${clauseType}: crossing note`);
          expect(crossing.note, clauseType).not.toMatch(LEGAL_EFFECT);
        }
      }
    }
  });

  it("names the checklist and the meter in words that judge nothing", () => {
    for (const entry of CHECKLIST_ENTRIES) {
      expectExplainsWithoutAdvising(checklistEntryName(entry), `checklist: ${entry}`);
      expect(checklistEntryName(entry), entry).not.toMatch(LEGAL_EFFECT);
    }
    for (const severity of [1, 2, 3, 4] as Severity[]) {
      expectExplainsWithoutAdvising(severityWord(severity), `meter: ${severity}`);
    }
  });
});

/* -------------------------------------------------------------------------------- */
/* The question box                                                                    */
/* -------------------------------------------------------------------------------- */

/** A gateway that answers every request with one hand-written payload. */
function gatewayAnswering(payload: JsonObject): ModelGateway {
  return {
    async complete<Shape>(request: ModelRequest<Shape>): Promise<Shape> {
      return request.response.parse(payload);
    },
  };
}

/** One question, answered by a model that returns exactly `text` beside a real citation. */
async function answerSaying(fixture: Fixture, text: string) {
  return answerQuestion(
    { documentText: fixture.text, question: "What does this clause mean?" },
    gatewayAnswering({
      answer: { answered: true, sourceSentence: fixture.sentences[8], text },
    })
  );
}

describe("an answer that goes outside the document", () => {
  const fixture = loadFixture("adhesion-contract.txt");

  it("is held back even when its citation checks out", async () => {
    // The gap this closes. Verifying the quote proves the sentence is in the contract; it
    // proves nothing about the paragraph beside it, and the question box is the one place
    // a Signer can ask outright whether to sign or whether a clause would hold up.
    const wentOutside = [
      "You should not sign this. The clause hands the client everything.",
      "A court would almost certainly find this unenforceable.",
      "Most contracts give you thirty days here, so this one is unusually short.",
      "This is typically how a client protects itself, and it is normal.",
      "I would advise pushing back on this before you agree to anything.",
      "Under the law you are entitled to be paid regardless of what this says.",
      "This is an exploitative term and you should refuse it.",
      "It would be advisable to consult a lawyer about this clause.",
    ];

    for (const text of wentOutside) {
      const answer = await answerSaying(fixture, text);
      expect(answer.answered, text).toBe(false);
      expect(answer.text, text).toBe(ANSWER_CAME_FROM_OUTSIDE);
      // A refusal carries no citation, so the claim cannot arrive wearing the quote that
      // had nothing to do with it.
      expect("sourceSentence" in answer, text).toBe(false);
    }
  });

  it("is told apart from the contract being silent, because those are different things", async () => {
    // Saying "this contract does not answer that" about a question it does answer would be
    // the same false claim about the document that the check exists to stop. So the two
    // refusals say different things, and neither reaches for the law.
    expect(ANSWER_CAME_FROM_OUTSIDE).not.toBe(DOCUMENT_DOES_NOT_SAY);
    for (const refusal of [ANSWER_CAME_FROM_OUTSIDE, DOCUMENT_DOES_NOT_SAY]) {
      expectExplainsWithoutAdvising(refusal, "refusal");
      expect(refusal).not.toMatch(LEGAL_EFFECT);
      // Neither says what the contract does or does not contain beyond the one fact it is
      // reporting, so neither can be read as a finding about the wording.
      expect(refusal.length).toBeGreaterThan(40);
    }
  });

  it("lets a plain account of the wording through, so the check is not a blanket refusal", async () => {
    // The other half, and the one that would catch a check tightened until nothing passes.
    // Each of these explains the sentence and reaches for nothing outside it.
    const stayedInside = [
      "The client has to tell you in writing within ten working days whether the work is accepted.",
      "You are owed nothing for the part of the job you had not reached when the notice arrived.",
      "The rights in what you make pass to the client once they have paid for it in full.",
      "You have to give notice ninety days before the term ends, or it runs on for another year.",
    ];

    for (const text of stayedInside) {
      const answer = await answerSaying(fixture, text);
      expect(answer.answered, text).toBe(true);
      if (!answer.answered) continue;
      expect(answer.text, text).toBe(text);
      expect(answer.sourceSentence, text).toBe(fixture.sentences[8]);
    }
  });

  it("exempts the document's own words, so a contract that mentions a court still answers", async () => {
    // The exemption is the difference between a contract containing the word and Redline
    // using it. The governing-law sentence of this corpus names courts outright; an answer
    // that quotes it inside its own text is still an account of the document.
    const governing = fixture.sentences.find((sentence) => sentence.includes("courts"));
    if (governing === undefined) throw new Error("the corpus lost its governing-law clause");

    const answer = await answerQuestion(
      { documentText: fixture.text, question: "Which courts hear a dispute?" },
      gatewayAnswering({
        answer: {
          answered: true,
          sourceSentence: governing,
          text: `The contract settles it in one line: ${governing}`,
        },
      })
    );
    expect(answer.answered).toBe(true);
  });
});

/* -------------------------------------------------------------------------------- */
/* The screens                                                                         */
/* -------------------------------------------------------------------------------- */

/** The rendered text with tags and entities removed, as `tests/marked-galley.test.ts` does. */
function readable(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, code) => String.fromCodePoint(parseInt(code, 16)));
}

async function markedProof(name: string, jurisdiction: Jurisdiction) {
  const fixture = loadFixture(name);
  const { flags, checkedClean } = await analyze(
    { documentText: fixture.text, redLines: [], jurisdiction },
    createStubModelGateway(fixture)
  );
  const html = renderToStaticMarkup(
    createElement(MarkedGalley, { documentText: fixture.text, flags })
  );
  return { fixture, flags, checkedClean, html };
}

describe("what the screens actually put in front of a Signer", () => {
  it("renders the wording that was asserted over, so these checks are over the real page", async () => {
    // The tie between the two halves of this file. Everything above is asserted over
    // `analyze()`'s output; this is what makes that output the thing a Signer reads rather
    // than a record behind it. Only the open mark's detail renders — the rest opens on
    // selection — so the open one is checked whole and every title is checked in the index.
    const { flags, html } = await markedProof("adhesion-contract.txt", LAWS[1]);
    const text = readable(html);
    expect(flags.length).toBeGreaterThan(0);

    for (const flag of flags) expect(text, flag.id).toContain(flag.title);

    const open = flags[0];
    expect(text, open.id).toContain(open.cost);
    if (open.hedgeNote !== null) expect(text, open.id).toContain(open.hedgeNote);
    expect(text, open.id).toContain(open.counterOffer?.replacement ?? "");
  });

  it("says beside the drafted reply what the drafted reply is", async () => {
    // The surface closest to the line the FTC drew around DoNotPay: wording a Signer sends
    // to their client under their own name. What it is gets said in the margin where they
    // are reading, not in the footer under the sheet.
    const { html } = await markedProof("adhesion-contract.txt", UNDETERMINED_JURISDICTION);
    expect(readable(html)).toContain(DRAFTED_NOT_ADVISED);

    expect(DRAFTED_NOT_ADVISED).toMatch(/\bwhether to sign is yours\b/i);
    expectExplainsWithoutAdvising(DRAFTED_NOT_ADVISED, "drafted-reply note");
  });

  it("gives no advice anywhere on the marked proof, under either law", async () => {
    // Over the rendered markup rather than the fields, with the contract's own sentences
    // cut out — the document is quoted in full on this screen and a contract is entitled to
    // say whatever it says. What is left is Redline's own voice.
    for (const name of fixtureNames()) {
      for (const law of [UNDETERMINED_JURISDICTION, LAWS[1]]) {
        const { fixture, flags, html } = await markedProof(name, law);
        if (flags.length === 0) continue;

        let voice = readable(html);
        for (const sentence of fixture.sentences) voice = voice.split(sentence).join(" ");
        expectExplainsWithoutAdvising(voice, `${name} under ${law.source}`);
      }
    }
  });

  it("says on the question box that it answers from the contract and nothing else", async () => {
    const fixture = loadFixture("balanced-contract.txt");
    const document = readExtractedText({
      name: fixture.name,
      format: "text",
      rawText: fixture.text,
      whenEmpty: "too-little-text",
    });
    if (document.outcome !== "extracted") throw new Error("the fixture stopped being readable");

    const html = readable(renderToStaticMarkup(createElement(QuestionBox, { document })));
    expect(html).toContain(WHAT_THE_BOX_ANSWERS);
    // Both halves of the claim, because the box is where a Signer is most likely to ask
    // for the thing Redline does not do.
    expect(WHAT_THE_BOX_ANSWERS).toMatch(/from this contract alone/i);
    expect(WHAT_THE_BOX_ANSWERS).toMatch(/will not tell you whether to sign/i);
    expectExplainsWithoutAdvising(WHAT_THE_BOX_ANSWERS, "question box");
  });

  it("states what Redline does and does not do in words that name both", () => {
    // `PRODUCT.md`'s line, held in one place so the footer of every working view and the
    // review sheet's own note cannot drift apart. Checked for the two claims it has to
    // make rather than for its wording.
    expect(WHERE_REDLINE_STOPS).toMatch(/\bexplains a document\b/i);
    expect(WHERE_REDLINE_STOPS).toMatch(/\bdrafts wording\b/i);
    expect(WHERE_REDLINE_STOPS).toMatch(/\bdoes not tell you whether to sign\b/i);
    expect(WHERE_REDLINE_STOPS).toMatch(/\bnot a law firm\b/i);
  });

  it("gives no advice on the cleared list or on the governing-law block", async () => {
    const { checkedClean } = await markedProof("balanced-contract.txt", UNDETERMINED_JURISDICTION);
    const cleared = readable(
      renderToStaticMarkup(createElement(ClearedList, { cleared: checkedClean }))
    );
    expectExplainsWithoutAdvising(cleared, "cleared list");
    expect(cleared, "cleared list").not.toMatch(LEGAL_EFFECT);

    for (const jurisdiction of LAWS) {
      const html = readable(
        renderToStaticMarkup(
          createElement(GoverningLaw, { jurisdiction, working: false, onSet: () => {} })
        )
      );
      const where = `governing law: ${jurisdiction.source}`;
      expectExplainsWithoutAdvising(html, where);
      // It is the one block whose whole subject is the law, so it names a jurisdiction or
      // says none is named — and it still draws no conclusion about legal effect.
      expect(html, where).not.toMatch(/\b(?:enforceable|unenforceable|void|illegal|unlawful)\b/i);
    }
  });
});
