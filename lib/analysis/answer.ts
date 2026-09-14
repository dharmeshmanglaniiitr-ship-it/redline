/**
 * The second analysis seam: one question about one document, answered from that document
 * or refused.
 *
 * `answerQuestion` is a pure function over text and a question (`docs/spec-v1.md`,
 * Implementation Decisions), taking its gateway as an argument the way `analyze` does, so
 * the suite drives it with the fixture stub and production hands it the OpenRouter client.
 * It sits above the model gateway, the database and the UI, and every claim below can be
 * checked with no browser, no network and no API key.
 *
 * It takes text, not a document, for the same reason `analyze` does: a file that could not
 * be read has no `text` field to pass (`lib/document/extraction.ts`), so a scanned contract
 * cannot reach this function and come back looking like a contract that answered.
 *
 * Two things make the answer worth something, and both are structural rather than asked
 * for.
 *
 * **A refusal cannot carry a citation.** What comes back is a union with two arms, and the
 * refused arm has no `sourceSentence` field at all. So "this refusal quoted a sentence" is
 * a compile error rather than a test, which is the same technique
 * `lib/document/extraction.ts` uses for a document with no text and
 * `lib/analysis/checklist.ts` uses for a clean bill. A caller that wants the quote has to
 * narrow on `answered` first, and narrowing is what tells them an answer was given.
 *
 * **An answer that left the document is refused too.** A verified quote proves the
 * sentence is there. It proves nothing about the paragraph beside it, and the question
 * box is the one place in this product where a Signer can ask outright whether to sign or
 * whether a clause would hold up. Both are answered here by holding the reply back.
 *
 * **An answer's quote is checked, not trusted.** The sentence is matched against the
 * document by `lib/analysis/citation.ts`, the same verifier every flag's citation goes
 * through (`docs/adr/0001`). A quote that is a paraphrase, a fragment or two sentences
 * joined comes back as a refusal rather than as an answer with a bad quote — the model is
 * not trusted to have quoted correctly, here any more than on a flag.
 *
 * **The refusal is written here, not by the model.** Everything a Signer reads in this
 * product has been through the humanizer skill before it shipped, and prose invented at
 * request time has not (`CLAUDE.md`) — the same argument that puts the hedge in
 * `lib/analysis/wording.ts` and the redraft in `lib/analysis/counter-offer.ts`. It lands
 * hardest here. A refusal is the one reply a Signer meets over and over, and it is exactly
 * the place a model reaches for what contracts usually say. Written here it cannot: the
 * seam decides whether the document answered, and what the refusal says is fixed English
 * that states nothing about the contract except that it is silent.
 */

import type { JsonValue, ModelGateway, ResponseSchema } from "@/lib/model/types";
import { ModelResponseError } from "@/lib/model/types";

import { createCitationVerifier } from "./citation";

/** What the question seam is given: the document's text, and what was asked of it. */
export interface QuestionRequest {
  /** The document's extracted text, as `readExtractedText` normalized it. */
  readonly documentText: string;
  /** The Signer's question, in their own words. */
  readonly question: string;
}

/**
 * What a document question comes back as.
 *
 * Two arms, discriminated on `answered`. The answered arm carries a `sourceSentence` that
 * has already been matched against the document character for character, and it is
 * required — an answer Redline cannot show the source of is not an answer, which is
 * `docs/adr/0001` applied to the question box. The refused arm has no such field to carry,
 * so silence in the contract can never arrive wearing a quotation.
 */
export type DocumentAnswer =
  | {
      readonly answered: true;
      /** The question as it was asked, so an answer can be read beside it. */
      readonly question: string;
      /** The sentence the answer came from, verbatim (`docs/adr/0001`). */
      readonly sourceSentence: string;
      /** What that sentence means for the Signer, in plain words. */
      readonly text: string;
    }
  | {
      readonly answered: false;
      readonly question: string;
      /** That the document does not settle it. Written in this file, never generated. */
      readonly text: string;
    };

/**
 * What a Signer is told when their contract is silent.
 *
 * Every word of it is fixed, and that is the point. It states one thing — this document
 * does not settle the question — and it states nothing about what other contracts say,
 * what the law provides, or what the Signer should do about it. A refusal that helpfully
 * explained what usually happens would be the product answering from outside the document,
 * which is the single thing `CLAUDE.md` rules out.
 */
export const DOCUMENT_DOES_NOT_SAY =
  "This contract does not answer that. Redline read the wording for it and found nothing " +
  "that settles the point, and it will not fill the gap with what other contracts say.";

/**
 * What a Signer is told when the reply that came back answered from somewhere else.
 *
 * A different thing from silence, so it is a different sentence. Telling a Signer their
 * contract does not answer a question it does answer would be its own false claim about
 * the document, so this says what actually happened and claims nothing about the wording
 * either way.
 */
export const ANSWER_CAME_FROM_OUTSIDE =
  "Redline held that reply back. The answer reached outside your contract: to what the " +
  "law does, to what other contracts say, or to what you should do about the deal. None " +
  "of that is something Redline can point to in your own copy. Ask about the wording " +
  "itself and it will answer.";

/**
 * The two ways an answer stops being an account of this document.
 *
 * Both are already in the prompt, and the prompt is not enough — nothing in a prompt is,
 * which is why the citation is verified downstream rather than asked for. This is the
 * same move applied to the prose. A Signer can ask the question box anything at all,
 * including the two questions this product does not answer: whether to sign, and whether
 * a term would hold up. Those are the questions a model is most willing to answer and
 * least able to source, and an answer to either arrives carrying a verified citation that
 * has nothing to do with the claim being made. The citation check cannot see that. This
 * can.
 *
 * The summary is left to its prompt alone, deliberately. It is a bounded task over the
 * document with nobody asking it anything, where the question box is unbounded by
 * construction.
 *
 * **Advice to the Signer.** Whether to sign, whether to accept, what to do next. Written
 * as the verb plus its object rather than as a word list, so "you should give thirty
 * days' notice" — a restatement of what the contract requires — is not caught by the same
 * pattern that catches "you should not sign this".
 *
 * **A claim from outside the document.** What the law does, what a court would do,
 * whether a clause is enforceable, what other contracts say. `docs/adr/0007` makes every
 * one of these a question for a governing jurisdiction, answered on a flag by naming
 * whose law decides (`lib/analysis/wording.ts`) and answered here not at all.
 */
const ANSWERED_FROM_SOMEWHERE_ELSE: readonly RegExp[] = [
  // Advice about signing or about the deal.
  /\b(?:do not|don't|should not|shouldn't|would not|wouldn't|never|refuse to|decline to|hesitate to)\s+sign\b/i,
  /\byou\s+(?:should|ought to|need to|may want to|might want to|would be wise to)\s+(?:sign|accept|reject|refuse|renegotiate|negotiate|push back|walk away|object|insist)\b/i,
  /\b(?:i|we)\s+(?:recommend|advise|suggest|would recommend|would advise|would suggest)\b/i,
  /\bmy advice\b/i,
  /\b(?:safe|risky|unwise|advisable|inadvisable|dangerous|fine)\s+to\s+sign\b/i,
  /\b(?:seek|get|take)\s+(?:legal\s+)?advice\b/i,
  /\bconsult\s+(?:a|an|your)\s+(?:lawyer|solicitor|attorney)\b/i,
  /\b(?:exploitative|predatory)\b/i,
  /\bunfair\s+(?:to you|term|clause|deal|contract)\b/i,
  // A claim the document cannot be shown to support.
  /\b(?:unenforceable|enforceable|voidable|unlawful|illegal|statutory|statute)\b/i,
  /\b(?:a|the)\s+court\s+(?:would|will|might|could|may|is likely|tends)\b/i,
  /\bthe law\s+(?:requires|says|provides|gives|allows you|will|would)\b/i,
  /\bunder\s+the\s+law\b/i,
  /\blegally\s+(?:binding|required|obliged|entitled|speaking)\b/i,
  /\b(?:most|many|other|typical|standard)\s+(?:contracts|agreements)\b/i,
  /\bin\s+most\s+cases\b/i,
  /\b(?:typically|usually|normally|ordinarily|customarily)\b/i,
  /\b(?:generally speaking|in general|as a rule|standard practice|common practice)\b/i,
];

/**
 * Whether the prose around the quote answered from outside this document.
 *
 * The document's own words are exempt, and that is not a loophole — it is the difference
 * between a contract containing the word "unenforceable" in its severability clause and
 * Redline telling somebody their clause is unenforceable. The verified sentence is cut
 * out first, the way `tests/counter-offers.test.ts` cuts it out of a drafted message, and
 * what is checked is what Redline put around it.
 *
 * A paraphrase of the document is not cut out and could still be caught. That is the
 * direction to be wrong in: the Signer is told the reply was held back, which is true,
 * rather than being told the contract is silent when it is not.
 */
function answeredFromSomewhereElse(text: string, sourceSentence: string): boolean {
  const written = text.split(sourceSentence).join(" ");
  return ANSWERED_FROM_SOMEWHERE_ELSE.some((tell) => tell.test(written));
}

/**
 * Answer a question about a document, or say that the document does not answer it.
 *
 * @throws {ModelResponseError} when what comes back is not an answer at all — no verdict
 *   on whether the document settles the question. A verdict of "it does not" is an answer
 *   and comes back as one; only a malformed response throws.
 */
export async function answerQuestion(
  request: QuestionRequest,
  gateway: ModelGateway
): Promise<DocumentAnswer> {
  const question = request.question.trim();
  return gateway.complete({
    prompt: questionPrompt(request.documentText, question),
    response: answerResponse(request.documentText, question),
  });
}

/**
 * What the model is asked.
 *
 * No test asserts on this text (`docs/spec-v1.md`, Testing Decisions). What tests assert
 * is that an unanswerable question comes back refused and an answerable one comes back
 * quoting the document.
 *
 * The instruction that carries the ticket is the one about silence. A model asked what
 * happens on the Sender's insolvency, against a contract that never mentions it, will
 * write a competent paragraph about what usually happens unless it is told plainly that
 * the contract's silence is the answer. Saying so is not on its own enough — nothing in a
 * prompt is — which is why the refusal wording is written in this file and the citation is
 * verified downstream. The prompt asks; the seam enforces.
 *
 * The question goes last, after the document, so a contract that runs to twenty pages does
 * not leave it stranded at the top.
 */
function questionPrompt(documentText: string, question: string): string {
  return [
    "You are answering one question about a contract, for the person being asked to sign",
    "it. Answer from this contract's own words and from nothing else.",
    "",
    "Return three things:",
    "",
    "1. answered: true only when this contract itself settles the question. False in every",
    "   other case, including where the contract touches the subject but does not settle",
    "   what was asked.",
    "2. sourceSentence: with answered true, the single sentence the answer comes from,",
    "   copied from the contract character for character — same words, same numbers, same",
    "   punctuation, same spacing, including any clause number at the start of it. Do not",
    "   shorten it, do not tidy it, do not join two sentences, do not quote half of one. A",
    "   sentence that does not match the contract exactly is thrown away and the question",
    "   is treated as unanswered, so copy rather than retype. With answered false, return",
    "   null.",
    "3. text: with answered true, what that sentence means for the reader, in the words an",
    "   ordinary person uses rather than the contract's own. Address them as \"you\". With",
    "   answered false, return an empty string. Redline writes that reply itself.",
    "",
    "Rules:",
    "- A contract's silence is information, and it is the answer whenever the wording does",
    "  not settle what was asked. Do not reach for what contracts usually say, what the law",
    "  provides, or what happens in most cases. A reader who is told what normally happens",
    "  believes their own contract says it.",
    "- State only what this contract says. Explain the wording; do not go past it.",
    "- Do not say whether to sign, whether a term is fair, or what to do next.",
    "- Do not mention law, enforceability, or what a court would do.",
    "",
    "The contract:",
    "",
    documentText,
    "",
    "The question:",
    "",
    question,
  ].join("\n");
}

const ANSWER_SCHEMA = "document_answer";

/**
 * The answer the gateway is asked to produce, and the narrowing that makes it an answer
 * rather than a claim to be one.
 *
 * Five different responses come back as a refusal rather than as an answer, and they are
 * one rule read five ways: an answer Redline cannot point at is not an answer. The model
 * said the document does not settle it. The model said it does but quoted nothing. The
 * model quoted something that is not a sentence of this document. The model quoted a real
 * sentence and then had nothing to say about it. Or it quoted a real sentence and then
 * said something about the law, about other contracts, or about what the Signer ought to
 * do — a claim the quote does not carry, however well the quote checks out. In every one
 * of those the Signer would be holding a claim they could not check.
 *
 * The first four are silence and are told as silence. The fifth is not silence, so it is
 * told differently: `ANSWER_CAME_FROM_OUTSIDE` rather than `DOCUMENT_DOES_NOT_SAY`,
 * because saying the contract does not answer a question it does answer would be the
 * same kind of false claim the check exists to stop.
 *
 * The one thing that throws is a response with no verdict in it at all, because that is
 * not a refusal — it is a response that was never an answer, and reporting it as "the
 * contract does not say" would put words in the document's mouth.
 */
function answerResponse(documentText: string, question: string): ResponseSchema<DocumentAnswer> {
  const refused: DocumentAnswer = {
    answered: false,
    question,
    text: DOCUMENT_DOES_NOT_SAY,
  };

  return {
    name: ANSWER_SCHEMA,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["answer"],
      properties: {
        answer: {
          type: "object",
          additionalProperties: false,
          required: ["answered", "sourceSentence", "text"],
          properties: {
            answered: {
              type: "boolean",
              description:
                "True only when this contract settles the question that was asked.",
            },
            sourceSentence: {
              type: ["string", "null"],
              description:
                "The one sentence the answer comes from, copied from the contract " +
                "character for character. Null when the contract does not answer.",
            },
            text: {
              type: "string",
              description:
                "What that sentence means for the reader, in plain words. Empty when " +
                "the contract does not answer.",
            },
          },
        },
      },
    },
    parse: (value) => {
      const root = asObject(value, ANSWER_SCHEMA);
      const answer = asObject(root.answer, `${ANSWER_SCHEMA}.answer`);

      if (typeof answer.answered !== "boolean") {
        throw new ModelResponseError(
          ANSWER_SCHEMA,
          `answer.answered is "${String(answer.answered)}", which is not a verdict on ` +
            "whether this document settles the question"
        );
      }

      if (!answer.answered) return refused;
      if (typeof answer.sourceSentence !== "string") return refused;

      // `docs/adr/0001`, on the question box. One quote, so the single-shot verifier
      // would do, except that the trimmed text it matched is what gets shown.
      const sourceSentence = createCitationVerifier(documentText).verified(
        answer.sourceSentence
      );
      if (sourceSentence === null) return refused;

      const text = typeof answer.text === "string" ? answer.text.trim() : "";
      if (text === "") return refused;

      // The positioning check, at the seam rather than in the prompt. A verified quote
      // says the sentence exists; it says nothing about whether the paragraph beside it
      // is an account of that sentence or an opinion about the law.
      if (answeredFromSomewhereElse(text, sourceSentence)) {
        return { answered: false, question, text: ANSWER_CAME_FROM_OUTSIDE };
      }

      return { answered: true, question, sourceSentence, text };
    },
  };
}

function asObject(value: JsonValue | undefined, where: string): Record<string, JsonValue> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ModelResponseError(ANSWER_SCHEMA, `${where} is not an object`);
  }
  return value as Record<string, JsonValue>;
}
