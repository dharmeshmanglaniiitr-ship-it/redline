/**
 * The question seam, driven the way `docs/spec-v1.md` says a good test drives it:
 * document text and a question in, structure out, with no browser, no network and no API
 * key.
 *
 * `PRD.md` §4 test 5 is the one this file exists for. A fixture set of questions the
 * document does not answer has to produce explicit refusals rather than general legal
 * answers, and every question in every sidecar's `unanswerableQuestions` is run through
 * the seam below. Two things are asserted about each: that the structure says a refusal
 * happened, and that the words a Signer reads carry none of the tells of an answer given
 * from outside the document — what usually happens, what the law provides, what they
 * should do about it.
 *
 * The second of those holds structurally rather than by luck, and it is worth saying why
 * the test is still here. Redline writes the refusal itself (`lib/analysis/answer.ts`),
 * so the wording cannot drift into general legal content while that stays true. The test
 * is what makes it stay true: route the model's own refusal prose back to the Signer and
 * this file goes red.
 *
 * The other half — that a refusal is distinguishable without matching on wording — is
 * carried by the type rather than by an assertion. `DocumentAnswer`'s refused arm has no
 * `sourceSentence` field, so a refusal that cited a sentence does not compile. The
 * `@ts-expect-error` below is the assertion, and `npx tsc --noEmit` is what runs it.
 *
 * The live model is unreachable — every OpenRouter call comes back 429 from the pinned
 * provider's shared pool — so nothing here has been checked against a real model, and
 * nothing here should be read as saying it has.
 */

import { describe, expect, it } from "vitest";

import { answerQuestion, type DocumentAnswer } from "@/lib/analysis/answer";
import type { JsonObject, ModelGateway, ModelRequest } from "@/lib/model/types";
import { ModelResponseError } from "@/lib/model/types";

import { fixtureNames, loadFixture, type Fixture } from "./support/fixtures";
import { expectAnswered, expectQuotedVerbatim, expectRefusal } from "./support/invariants";
import { createStubModelGateway } from "./support/stub-model";

/** Ask one fixture one question, through that fixture's own stub. */
async function ask(fixture: Fixture, question: string): Promise<DocumentAnswer> {
  return answerQuestion(
    { documentText: fixture.text, question },
    createStubModelGateway(fixture)
  );
}

/**
 * The tells of an answer given from outside the document.
 *
 * Each of these is a way of saying "here is what normally happens" — which is exactly the
 * failure the refusal exists to prevent, because a Signer told what normally happens will
 * believe their own contract says it. The advice words are the second line
 * `docs/spec-v1.md` puts out of scope: the product explains a document, it does not say
 * what to do about one.
 */
const GENERAL_LEGAL_CONTENT =
  /\b(typically|usually|generally|normally|commonly|ordinarily|customarily|as a rule|in most|the law provides|under the law|most contracts|standard practice|you should|we recommend|advisable|seek advice|consult a)\b/i;

/** A gateway that answers every request with one hand-written payload. */
function gatewayAnswering(payload: JsonObject): ModelGateway {
  return {
    async complete<Shape>(request: ModelRequest<Shape>): Promise<Shape> {
      return request.response.parse(payload);
    },
  };
}

/* -------------------------------------------------------------------------------- */
/* The seam                                                                            */
/* -------------------------------------------------------------------------------- */

describe("answerQuestion", () => {
  it("is a function of document text and a question, with no browser and no UI", async () => {
    // The whole of the seam's contract in one call: two strings and a gateway. Nothing
    // here touches a DOM, a database or a network, which is what lets every claim below
    // be checked at all.
    const fixture = loadFixture("adhesion-contract.txt");
    const answer = await ask(fixture, "What does the contract say about late payment interest?");

    expect(typeof answer.answered).toBe("boolean");
    expect(answer.question).toBe("What does the contract say about late payment interest?");
    expect(answer.text.trim()).not.toBe("");
  });

  it("answers a question about each contract and quotes the sentence it came from", async () => {
    // The citation rule, on the question box. A Signer checks an answer the same way they
    // check a flag: they search their own copy for the quoted string and find it
    // (`docs/adr/0001`). Asserted over every fixture and every clause planted in it, so
    // the coverage is the corpus rather than one contract.
    for (const name of fixtureNames()) {
      const fixture = loadFixture(name);
      for (const clause of fixture.sidecar.planted) {
        const answer = await ask(fixture, askingAbout(clause.sourceSentence));

        expectAnswered(answer);
        if (!answer.answered) throw new Error("unreachable");
        expectQuotedVerbatim(fixture.text, answer.sourceSentence);
        expect(answer.text.trim(), `${name}: ${clause.id}`).not.toBe("");
      }
    }
  });

  it("reads the document it was given, not some other one", async () => {
    // A seam that answered the same way whichever contract it was handed would make every
    // assertion in this file vacuous. The two contracts name different parties and
    // different work, so the same question has to come back off different sentences.
    const adhesion = loadFixture("adhesion-contract.txt");
    const balanced = loadFixture("balanced-contract.txt");
    const question = "What does this Agreement say about the fees payable to the Contractor?";

    const first = await ask(adhesion, question);
    const second = await ask(balanced, question);

    expectAnswered(first);
    expectAnswered(second);
    if (!first.answered || !second.answered) throw new Error("unreachable");
    expect(first.sourceSentence).not.toBe(second.sourceSentence);
    expectQuotedVerbatim(adhesion.text, first.sourceSentence);
    expectQuotedVerbatim(balanced.text, second.sourceSentence);
  });

  it("explains what the document says without advising whether to sign", async () => {
    // `docs/spec-v1.md` puts anything positioned as a substitute for a lawyer out of
    // scope, and names the Q&A as one of the two features nearest that line. An answer
    // explains the wording; it does not tell the Signer what to do about it.
    for (const name of fixtureNames()) {
      const fixture = loadFixture(name);
      for (const clause of fixture.sidecar.planted) {
        const answer = await ask(fixture, askingAbout(clause.sourceSentence));
        if (!answer.answered) continue;
        expect(answer.text, `${name}: ${clause.id}`).not.toMatch(
          /\b(you should sign|do not sign|don't sign|we recommend|refuse to sign|walk away)\b/i
        );
      }
    }
  });
});

/* -------------------------------------------------------------------------------- */
/* The refusal                                                                         */
/* -------------------------------------------------------------------------------- */

describe("a question the document does not answer", () => {
  it("is refused, for every unanswerable question in every sidecar", async () => {
    // `PRD.md` §4 test 5, run over the whole fixture set rather than one example. Every
    // sidecar carries its own list, and `tests/support/fixtures.ts` refuses to load a
    // sidecar whose list is empty, so a fixture added to the corpus arrives with the
    // refusal case covered or it does not load at all.
    let asked = 0;

    for (const name of fixtureNames()) {
      const fixture = loadFixture(name);
      for (const question of fixture.sidecar.unanswerableQuestions) {
        const answer = await ask(fixture, question);
        asked += 1;

        expectRefusal(answer);
        expect(answer.question, `${name}: ${question}`).toBe(question);
        // Explicit, not blank. A Signer has to be able to tell "the contract is silent"
        // from "nothing came back".
        expect(answer.text.trim().length, `${name}: ${question}`).toBeGreaterThan(20);
      }
    }

    // Guards the loop itself: a corpus that stopped carrying unanswerable questions would
    // otherwise pass this test by asking none.
    expect(asked).toBeGreaterThan(20);
  });

  it("says the document is silent rather than what usually happens", async () => {
    // The line this ticket turns on. A refusal that helpfully explained what happens in
    // most contracts would be the product stating something this document does not say,
    // which `CLAUDE.md` forbids outright.
    for (const name of fixtureNames()) {
      const fixture = loadFixture(name);
      for (const question of fixture.sidecar.unanswerableQuestions) {
        const answer = await ask(fixture, question);
        expect(answer.text, `${name}: ${question}`).not.toMatch(GENERAL_LEGAL_CONTENT);
      }
    }
  });

  it("carries no sentence, because a refusal has none to carry", async () => {
    // The structural half. `answered` is the discriminant, so a caller tells a refusal
    // from an answer by narrowing rather than by reading the prose, and the refused arm
    // has no `sourceSentence` on it to be filled in with something plausible.
    const fixture = loadFixture("balanced-contract.txt");
    const answer = await ask(fixture, fixture.sidecar.unanswerableQuestions[0]);

    expectRefusal(answer);
    expect("sourceSentence" in answer).toBe(false);
  });

  it("refuses an insolvency question against a contract that never mentions insolvency", async () => {
    // The example the ticket names, kept as its own case because it is the one a reader
    // of this file will look for. Nothing in the corpus says what happens if the Sender
    // goes under, so nothing is said about it.
    const fixture = loadFixture("adhesion-contract.txt");
    expect(fixture.text.toLowerCase()).not.toContain("insolven");

    const answer = await ask(fixture, "What happens to the fee if the Client becomes insolvent?");
    expectRefusal(answer);
  });
});

/* -------------------------------------------------------------------------------- */
/* What the seam refuses to take from the model                                        */
/* -------------------------------------------------------------------------------- */

describe("the seam's own refusals", () => {
  const fixture = loadFixture("adhesion-contract.txt");

  it("turns an answer quoting a sentence that is not in the document into a refusal", async () => {
    // `docs/adr/0001`, the same rule the flags run under: the model is not trusted to
    // have quoted correctly. The reading below is materially right about this contract
    // and the quote is a paraphrase, so it comes back as a refusal rather than as an
    // answer carrying a sentence the Signer will not find in their own copy.
    const answer = await answerQuestion(
      { documentText: fixture.text, question: "When does an invoice become payable?" },
      gatewayAnswering({
        answer: {
          answered: true,
          sourceSentence:
            "No invoice is payable until the Client decides, in its sole discretion, that the Deliverable is satisfactory.",
          text: "Payment waits on the Client being satisfied.",
        },
      })
    );

    expectRefusal(answer);
  });

  it("turns an answer quoting half a sentence into a refusal", async () => {
    // A fragment is materially accurate and still fails, which is the point of matching
    // on characters: the Signer's next move is to search their own copy for the quoted
    // string, and a half-sentence is not what they will find.
    const whole = fixture.sidecar.planted[0].sourceSentence;
    const half = whole.slice(0, Math.floor(whole.length / 2));
    expect(fixture.text).toContain(half);

    const answer = await answerQuestion(
      { documentText: fixture.text, question: "What does the acceptance clause say?" },
      gatewayAnswering({
        answer: { answered: true, sourceSentence: half, text: "Here is what it says." },
      })
    );

    expectRefusal(answer);
  });

  it("turns an answer with no quote at all into a refusal", async () => {
    const answer = await answerQuestion(
      { documentText: fixture.text, question: "What does the contract say about notice?" },
      gatewayAnswering({
        answer: { answered: true, sourceSentence: null, text: "Thirty days, from memory." },
      })
    );

    expectRefusal(answer);
  });

  it("turns an answer with a real quote and nothing to say into a refusal", async () => {
    const answer = await answerQuestion(
      { documentText: fixture.text, question: "What does the acceptance clause say?" },
      gatewayAnswering({
        answer: {
          answered: true,
          sourceSentence: fixture.sidecar.planted[0].sourceSentence,
          text: "   ",
        },
      })
    );

    expectRefusal(answer);
  });

  it("rejects a response that reaches no verdict, rather than reading it as silence", async () => {
    // The one case that throws. A malformed response is not a contract that said nothing,
    // and reporting it as one would put words in the document's mouth.
    await expect(
      answerQuestion(
        { documentText: fixture.text, question: "What does the contract say about notice?" },
        gatewayAnswering({ answer: { sourceSentence: null, text: "" } })
      )
    ).rejects.toBeInstanceOf(ModelResponseError);

    await expect(
      answerQuestion(
        { documentText: fixture.text, question: "What does the contract say about notice?" },
        gatewayAnswering({ nothing: true })
      )
    ).rejects.toBeInstanceOf(ModelResponseError);
  });
});

/* -------------------------------------------------------------------------------- */
/* The compile-time half                                                               */
/* -------------------------------------------------------------------------------- */

/**
 * A refusal that cited a sentence is a compile error, not a test that could be forgotten.
 *
 * This is the criterion "a refusal is distinguishable in the returned structure" at its
 * strongest reading: the refused arm has no `sourceSentence` field, so there is no value
 * of `DocumentAnswer` that says a document is silent and points at a sentence at the same
 * time. `npx tsc --noEmit` fails if that stops being true, because `@ts-expect-error`
 * fails when the line beneath it compiles.
 */
const CANNOT_EXIST: DocumentAnswer = {
  answered: false,
  question: "What happens if the Client becomes insolvent?",
  text: "This contract does not answer that.",
  // @ts-expect-error a refusal has no sentence to carry (`lib/analysis/answer.ts`).
  sourceSentence: "12.1 This Agreement is governed by the law of England and Wales.",
};

void CANNOT_EXIST;

/**
 * A question built out of a sentence's own distinctive words.
 *
 * The stub answers by finding the document sentence that shares the most words with the
 * question (`tests/support/stub-model.ts`), which stands in for a model that has read the
 * contract. Feeding it the long words of a planted clause is how a test asks a question
 * this document genuinely does answer, without the test having to hand-write one question
 * per clause per fixture and keep them in step with the corpus.
 */
function askingAbout(sourceSentence: string): string {
  const distinctive = [
    ...new Set(
      sourceSentence
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length >= 5)
    ),
  ].slice(0, 12);
  return `What does this contract say about ${distinctive.join(" ")}?`;
}
