/**
 * The stub model gateway, exercised through the gateway interface the real OpenRouter
 * client will implement.
 *
 * The stub is the thing under test here, so nothing about it is mocked. What these
 * tests establish is the property the rest of the suite depends on: the stub's output
 * follows the fixture it was built from. Point it at a different contract and different
 * findings come back. If that ever stops being true, every seam test that runs through
 * it becomes a test of a constant.
 */

import { describe, expect, it } from "vitest";

import type { JsonValue, ResponseSchema } from "@/lib/model/types";
import { ModelResponseError } from "@/lib/model/types";
import { loadFixture } from "./support/fixtures";
import { createStubModelGateway } from "./support/stub-model";
import {
  expectAnswered,
  expectQuotedVerbatim,
  expectRankedWorstFirst,
  expectRefusal,
  expectHedgeMatchesProvenance,
} from "./support/invariants";

interface Finding {
  readonly id: string;
  readonly clauseType: string;
  readonly sourceSentence: string;
  readonly severity: number;
  readonly hedged: boolean;
  readonly hedgeNote: string | null;
  readonly unstatedProperties: readonly string[];
  readonly cost: string;
  readonly counterOffer: { readonly replaces: string; readonly text: string };
}

interface Report {
  readonly sender: string;
  readonly engagement: string;
  readonly findings: readonly Finding[];
  readonly checkedClean: readonly string[];
}

interface Answer {
  readonly answered: boolean;
  readonly sourceSentence: string | null;
  readonly text: string;
}

/**
 * A caller's response shape. `schema` is the JSON Schema a real provider would be given;
 * `parse` is what turns one JSON response into the type the caller asked for. Written
 * out here rather than imported, because the seams that will own these schemas are built
 * in tickets 07 and 08 — this is the gateway contract, exercised early.
 */
const reportSchema: ResponseSchema<Report> = {
  name: "document_report",
  schema: {
    type: "object",
    required: ["summary", "findings", "checkedClean"],
    properties: {
      summary: { type: "object" },
      findings: { type: "array" },
      checkedClean: { type: "array", items: { type: "string" } },
    },
  },
  parse: (value) => {
    const root = object(value, "document_report");
    const summary = object(root.summary, "document_report.summary");
    return {
      sender: string(summary.sender, "summary.sender"),
      engagement: string(summary.engagement, "summary.engagement"),
      findings: array(root.findings, "findings").map((entry, index) => {
        const finding = object(entry, `findings[${index}]`);
        return {
          id: string(finding.id, "id"),
          clauseType: string(finding.clauseType, "clauseType"),
          sourceSentence: string(finding.sourceSentence, "sourceSentence"),
          severity: number(finding.severity, "severity"),
          hedged: boolean(finding.hedged, "hedged"),
          hedgeNote: finding.hedgeNote === null ? null : string(finding.hedgeNote, "hedgeNote"),
          unstatedProperties: array(finding.unstatedProperties, "unstatedProperties").map(
            (item, i) => string(item, `unstatedProperties[${i}]`)
          ),
          cost: string(finding.cost, "cost"),
          counterOffer: counterOffer(finding.counterOffer),
        };
      }),
      checkedClean: array(root.checkedClean, "checkedClean").map((entry, index) =>
        string(entry, `checkedClean[${index}]`)
      ),
    };
  },
};

const answerSchema: ResponseSchema<Answer> = {
  name: "document_answer",
  schema: {
    type: "object",
    required: ["answer"],
    properties: { answer: { type: ["object", "null"] } },
  },
  parse: (value) => {
    const root = object(value, "document_answer");
    if (root.answer === null || root.answer === undefined) {
      throw new ModelResponseError("document_answer", "no question was found in the prompt");
    }
    const answer = object(root.answer, "document_answer.answer");
    return {
      answered: boolean(answer.answered, "answered"),
      sourceSentence:
        answer.sourceSentence === null ? null : string(answer.sourceSentence, "sourceSentence"),
      text: string(answer.text, "text"),
    };
  },
};

describe("the stub model gateway", () => {
  it("reports the clauses planted in the contract it was given", async () => {
    const fixture = loadFixture("adhesion-contract.txt");
    const report = await createStubModelGateway(fixture).complete({
      prompt: fixture.text,
      response: reportSchema,
    });

    expect(report.sender).toBe("Harbourline Retail Group Limited");
    expect(report.findings.map((finding) => finding.clauseType).sort()).toEqual([
      "ip-assignment",
      "non-compete",
      "payment-approval",
      "termination-for-convenience",
    ]);
    expectRankedWorstFirst(report.findings);
    for (const finding of report.findings) {
      expectQuotedVerbatim(fixture.text, finding.sourceSentence);
      expectHedgeMatchesProvenance(finding);
      // The clause being replaced is carried as the sentence itself, not described.
      expect(finding.counterOffer.replaces).toBe(finding.sourceSentence);
    }
  });

  it("reports a different contract differently, rather than one fixed answer", async () => {
    const adhesion = loadFixture("adhesion-contract.txt");
    const balanced = loadFixture("balanced-contract.txt");

    const aggressive = await createStubModelGateway(adhesion).complete({
      prompt: adhesion.text,
      response: reportSchema,
    });
    const fair = await createStubModelGateway(balanced).complete({
      prompt: balanced.text,
      response: reportSchema,
    });

    expect(fair.sender).not.toBe(aggressive.sender);
    expect(fair.findings).toEqual([]);
    expect(fair.checkedClean.length).toBeGreaterThan(4);
    expect(aggressive.findings.length).toBeGreaterThan(0);
  });

  it("carries the hedge and its named property through from the silent fixture", async () => {
    const silent = loadFixture("pair-hedge-silent.txt");
    const stated = loadFixture("pair-hedge-stated.txt");

    const [hedgedReport, plainReport] = await Promise.all([
      createStubModelGateway(silent).complete({ prompt: silent.text, response: reportSchema }),
      createStubModelGateway(stated).complete({ prompt: stated.text, response: reportSchema }),
    ]);

    const hedged = hedgedReport.findings[0];
    const plain = plainReport.findings[0];
    expect(hedged.hedged).toBe(true);
    expect(hedged.hedgeNote).toContain("compensated");
    expect(plain.hedged).toBe(false);
    expect(plain.hedgeNote).toBeNull();
    expect(hedged.severity).toBe(plain.severity);
  });

  it("refuses a question the contract does not answer", async () => {
    const fixture = loadFixture("balanced-contract.txt");
    const gateway = createStubModelGateway(fixture);

    for (const question of fixture.sidecar.unanswerableQuestions) {
      const answer = await gateway.complete({
        prompt: `${fixture.text}\n\n${question}`,
        response: answerSchema,
      });
      expectRefusal(answer);
      expect(answer.sourceSentence).toBeNull();
    }
  });

  it("answers a question the contract does address, quoting it", async () => {
    const fixture = loadFixture("balanced-contract.txt");
    const answer = await createStubModelGateway(fixture).complete({
      prompt: `${fixture.text}\n\nHow long does the Client have to notify acceptance of a Deliverable?`,
      response: answerSchema,
    });

    expectAnswered(answer);
    expectQuotedVerbatim(fixture.text, answer.sourceSentence ?? "");
  });

  it("fails at the seam when a response does not satisfy the shape asked for", async () => {
    const fixture = loadFixture("adhesion-contract.txt");
    // No question in the prompt, so there is no answer to narrow — the schema's own
    // parse is what refuses, rather than a lying type reaching the caller.
    await expect(
      createStubModelGateway(fixture).complete({
        prompt: fixture.text,
        response: answerSchema,
      })
    ).rejects.toBeInstanceOf(ModelResponseError);
  });
});

function object(value: JsonValue | undefined, where: string): Record<string, JsonValue> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ModelResponseError(where, "expected an object");
  }
  return value as Record<string, JsonValue>;
}

function array(value: JsonValue | undefined, where: string): readonly JsonValue[] {
  if (!Array.isArray(value)) {
    throw new ModelResponseError(where, "expected an array");
  }
  return value;
}

function string(value: JsonValue | undefined, where: string): string {
  if (typeof value !== "string") {
    throw new ModelResponseError(where, "expected a string");
  }
  return value;
}

function counterOffer(value: JsonValue | undefined): {
  readonly replaces: string;
  readonly text: string;
} {
  const offer = object(value, "counterOffer");
  return {
    replaces: string(offer.replaces, "counterOffer.replaces"),
    text: string(offer.text, "counterOffer.text"),
  };
}

function number(value: JsonValue | undefined, where: string): number {
  if (typeof value !== "number") {
    throw new ModelResponseError(where, "expected a number");
  }
  return value;
}

function boolean(value: JsonValue | undefined, where: string): boolean {
  if (typeof value !== "boolean") {
    throw new ModelResponseError(where, "expected a boolean");
  }
  return value;
}
