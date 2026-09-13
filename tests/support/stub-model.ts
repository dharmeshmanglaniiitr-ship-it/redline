/**
 * A model gateway that answers from a fixture's sidecar instead of from a model.
 *
 * This is what lets the suite run the analysis seams with no API key and no network. It
 * is a stub, not a mock: it records nothing about how it was called and asserts nothing,
 * and every field it returns is derived from the fixture it was built with. Point it at
 * `adhesion-contract` and it produces four findings at the planted severities; point it
 * at `balanced-contract` and it produces none and a populated clean list. A stub that
 * returned the same object either way would make every test that used it vacuous.
 *
 * It answers whatever shape the caller asks for by building one payload from the sidecar
 * and handing it to `request.response.parse`. Narrowing is the caller's schema's job, so
 * the seams built in later tickets can ask for a summary, a flag list or an answer
 * without this file needing to know their schemas.
 */

import type { JsonObject, JsonValue, ModelGateway, ModelRequest } from "@/lib/model/types";
import type { Fixture, PlantedClause } from "./fixtures";

/** What the stub would say a flagged clause costs, by clause type. */
const COST_OF: Record<string, string> = {
  "payment-approval":
    "money you have already earned can be withheld, and there is no standard to appeal to",
  "ip-assignment":
    "work you own today, and work you have not done yet, transfers with the deliverable",
  "non-compete": "the kind of work you do now is closed off after this engagement ends",
  "termination-for-convenience":
    "the rest of the engagement can disappear with nothing payable for it",
};

export function createStubModelGateway(fixture: Fixture): ModelGateway {
  return {
    // `async` so that a response the caller's schema rejects arrives as a rejected
    // promise, the way a failure from a real network client would.
    async complete<Shape>(request: ModelRequest<Shape>): Promise<Shape> {
      return request.response.parse(buildPayload(fixture, request.prompt));
    },
  };
}

/**
 * The whole of what this fixture supports, as JSON. Everything except `answer` depends
 * only on the sidecar; `answer` depends on the question found in the prompt.
 */
function buildPayload(fixture: Fixture, prompt: string): JsonObject {
  const { sidecar } = fixture;
  const findings = [...sidecar.planted]
    .sort((a, b) => b.expectedSeverity - a.expectedSeverity)
    .map((clause) => buildFinding(clause));

  return {
    jurisdiction: {
      name: sidecar.jurisdiction.expected,
      sourceSentence: sidecar.jurisdiction.sourceSentence,
    },
    summary: {
      sender: sidecar.sender,
      engagement: sidecar.engagement,
      plainEnglish: `${sidecar.sender} sent you this one. It covers ${lowerFirst(sidecar.engagement)}`,
    },
    findings,
    checkedClean: [...sidecar.expectedCleanChecklist],
    answer: answerFrom(fixture, prompt),
  };
}

function buildFinding(clause: PlantedClause): JsonObject {
  const hedged = clause.unstatedProperties.length > 0;
  return {
    id: clause.id,
    clauseType: clause.clauseType,
    sourceSentence: clause.sourceSentence,
    severity: clause.expectedSeverity,
    properties: { ...clause.properties },
    unstatedProperties: [...clause.unstatedProperties],
    hedged,
    // A hedge that cannot name what is missing is a failure, not a hedge (ADR 0006).
    hedgeNote: hedged
      ? `The contract does not say ${clause.unstatedProperties.join(" or ")}.`
      : null,
    cost: COST_OF[clause.clauseType] ?? "this clause is worth reading twice",
    // Counter-offers reference the clause language they replace (PRD §4 test 6).
    counterOffer: `Replace "${opening(clause.sourceSentence)}" with wording that does not leave ${clause.clauseType} open-ended.`,
  };
}

/**
 * Find the question in a prompt: a run ending in a question mark that is not itself part
 * of the document. The corpus contains no question marks, so in practice this is the
 * question the caller appended to the document text.
 */
function questionIn(prompt: string, documentText: string): string | null {
  const candidates = prompt.match(/[^\n?]*\?/g) ?? [];
  const asked = candidates
    .map((candidate) => candidate.trim())
    .filter((candidate) => candidate.length > 1 && !documentText.includes(candidate));
  return asked.length > 0 ? asked[asked.length - 1] : null;
}

/**
 * Answer from the document or refuse. A question the sidecar lists as unanswerable is
 * refused; anything else is answered with the document sentence that shares the most
 * words with it, so the answer carries a citation the same way a flag does.
 */
function answerFrom(fixture: Fixture, prompt: string): JsonValue {
  const question = questionIn(prompt, fixture.text);
  if (question === null) {
    return null;
  }

  const refused = fixture.sidecar.unanswerableQuestions.includes(question);
  const best = refused ? null : bestMatchingSentence(fixture.sentences, question);
  if (best === null) {
    return {
      question,
      answered: false,
      sourceSentence: null,
      text: "This contract does not say.",
    };
  }
  return {
    question,
    answered: true,
    sourceSentence: best,
    text: `The contract covers that: ${best}`,
  };
}

function bestMatchingSentence(
  sentences: readonly string[],
  question: string
): string | null {
  const terms = contentWords(question);
  let best: string | null = null;
  let bestScore = 0;
  for (const sentence of sentences) {
    const haystack = sentence.toLowerCase();
    const score = terms.filter((term) => haystack.includes(term)).length;
    if (score > bestScore) {
      best = sentence;
      bestScore = score;
    }
  }
  return best;
}

function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4);
}

function opening(sentence: string): string {
  return sentence.length <= 60 ? sentence : `${sentence.slice(0, 60).trimEnd()}...`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
