/**
 * `deriveSeverity` on its own, with no model and no fixture behind it.
 *
 * This is `docs/adr/0003` under test. The claim the product makes is that the same
 * clause type ranges from unflagged to high depending on what it actually says, so what
 * is asserted here is the *within-type* spread: two non-competes, two IP assignments,
 * two acceptance standards, each pair differing only in its wording and coming back at
 * different steps. A category lookup passes none of these.
 *
 * The second thing under test is the rule that an unstated property is read at its
 * dangerous end. Every property here is checked twice — stated at its safe value, and
 * absent — and absence has to land where the dangerous value lands, because a hedge
 * never lowers severity (`docs/adr/0006`). If silence were read as "probably fine", the
 * hedged findings would be the quiet ones, which is backwards: an ambiguous contract is
 * the dangerous case, not the safe one.
 */

import { describe, expect, it } from "vitest";

import { SEVERITY_PROPERTIES } from "@/lib/analysis/clauses";
import {
  deriveSeverity,
  severityTriggers,
  unstatedPropertiesOf,
  type ClauseReading,
} from "@/lib/analysis/severity";

describe("deriveSeverity", () => {
  describe("payment approval", () => {
    it("puts the client's own satisfaction at the top of the scale", () => {
      const subjective: ClauseReading = {
        clauseType: "payment-approval",
        properties: { acceptanceStandard: "subjective" },
      };
      expect(deriveSeverity(subjective)).toBe(4);
      expect(severityTriggers(subjective)).toContain("acceptanceStandard");
    });

    it("reads a standard the contract actually sets rather than fearing it", () => {
      const objective: ClauseReading = {
        clauseType: "payment-approval",
        properties: { acceptanceStandard: "objective" },
      };
      expect(deriveSeverity(objective)).toBe(1);
      expect(severityTriggers(objective)).toEqual([]);
    });

    it("treats a contract that never says what acceptance means as the dangerous case", () => {
      const silent: ClauseReading = { clauseType: "payment-approval", properties: {} };
      expect(deriveSeverity(silent)).toBe(4);
      expect(unstatedPropertiesOf("payment-approval", silent.properties)).toEqual([
        "acceptanceStandard",
      ]);
    });
  });

  describe("IP assignment", () => {
    it("ranks an assignment that reaches past the deliverable high", () => {
      const overreaching: ClauseReading = {
        clauseType: "ip-assignment",
        properties: { reachesBeyondDeliverable: true },
      };
      expect(deriveSeverity(overreaching)).toBe(3);
    });

    it("does not cry wolf on 'the client owns what I built for them'", () => {
      // The crying-wolf failure `docs/adr/0003` exists to prevent: this is what nearly
      // every legitimate freelance contract says, and marking it high would train a
      // Signer to ignore the marks that matter.
      const bounded: ClauseReading = {
        clauseType: "ip-assignment",
        properties: { reachesBeyondDeliverable: false },
      };
      expect(deriveSeverity(bounded)).toBe(1);
      expect(severityTriggers(bounded)).toEqual([]);
    });

    it("reads an undefined 'Work Product' as reaching further, not less far", () => {
      const undefinedTerm: ClauseReading = { clauseType: "ip-assignment", properties: {} };
      expect(deriveSeverity(undefinedTerm)).toBe(3);
    });
  });

  describe("non-compete", () => {
    const narrow = {
      durationMonths: 3,
      geographicScope: "within ten miles of the Client's office at Gadsby Street",
      industryScope: "bookkeeping services only",
      compensated: true,
    } as const;

    it("judges a restriction on what it restricts, not on existing", () => {
      const restrained: ClauseReading = { clauseType: "non-compete", properties: narrow };
      expect(deriveSeverity(restrained)).toBe(1);
      expect(severityTriggers(restrained)).toEqual([]);
    });

    it.each([
      ["duration past the year", { durationMonths: 24 }, "durationMonths"],
      ["a nationwide reach", { geographicScope: "anywhere in the United Kingdom" }, "geographicScope"],
      ["a whole industry", { industryScope: "any business in the hospitality sector" }, "industryScope"],
      ["nothing paid for it", { compensated: false }, "compensated"],
    ])("marks it high on %s alone", (_case, widened, trigger) => {
      const reading: ClauseReading = {
        clauseType: "non-compete",
        properties: { ...narrow, ...widened },
      };
      expect(severityTriggers(reading)).toEqual([trigger]);
      expect(deriveSeverity(reading)).toBe(3);
    });

    it("holds twelve months inside the window rather than past it", () => {
      // `PRD.md` §5 draws the window at roughly 6-12 months. Twelve sits at the top of
      // it, so the length alone is not the trigger — which is what makes the hedging
      // pair a test of provenance rather than a second test of duration.
      const twelve: ClauseReading = {
        clauseType: "non-compete",
        properties: { ...narrow, durationMonths: 12 },
      };
      expect(severityTriggers(twelve)).toEqual([]);
      expect(deriveSeverity(twelve)).toBe(1);
    });

    it("does not let a widening word hide behind a measured bound", () => {
      // "within any sector" states a bound and then takes it back. A scope Redline
      // cannot read as narrow is read as wide.
      const reading: ClauseReading = {
        clauseType: "non-compete",
        properties: { ...narrow, industryScope: "within any sector the Client serves" },
      };
      expect(severityTriggers(reading)).toEqual(["industryScope"]);
    });

    it("reads every property the contract skipped at its dangerous end", () => {
      const silent: ClauseReading = { clauseType: "non-compete", properties: {} };
      expect(deriveSeverity(silent)).toBe(3);
      expect([...severityTriggers(silent)].sort()).toEqual(
        [...SEVERITY_PROPERTIES["non-compete"]].sort()
      );
    });

    it("keeps a hedged finding at the same step as the stated one it mirrors", () => {
      // `docs/adr/0006`: a hedge is a statement about the basis of a finding, never a
      // softening of it. The same clause with the payment words removed has to land on
      // the same step, or hedging would quietly bury the ambiguous contracts.
      const stated: ClauseReading = {
        clauseType: "non-compete",
        properties: {
          durationMonths: 12,
          geographicScope: "anywhere in the United Kingdom",
          industryScope: "the hospitality sector",
          compensated: false,
        },
      };
      const silentOnPay: ClauseReading = {
        clauseType: "non-compete",
        properties: {
          durationMonths: 12,
          geographicScope: "anywhere in the United Kingdom",
          industryScope: "the hospitality sector",
        },
      };

      expect(deriveSeverity(silentOnPay)).toBe(deriveSeverity(stated));
      expect(unstatedPropertiesOf("non-compete", stated.properties)).toEqual([]);
      expect(unstatedPropertiesOf("non-compete", silentOnPay.properties)).toEqual([
        "compensated",
      ]);
    });
  });

  describe("termination for convenience", () => {
    it("flags it, and below the clauses that threaten money already earned", () => {
      const noKillFee: ClauseReading = {
        clauseType: "termination-for-convenience",
        properties: { killFee: "absent" },
      };
      const subjectivePayment: ClauseReading = {
        clauseType: "payment-approval",
        properties: { acceptanceStandard: "subjective" },
      };

      expect(deriveSeverity(noKillFee)).toBe(2);
      expect(deriveSeverity(noKillFee)).toBeLessThan(deriveSeverity(subjectivePayment));
    });

    it("does not flag an early exit that costs the client something", () => {
      const payable: ClauseReading = {
        clauseType: "termination-for-convenience",
        properties: { killFee: "one month of the fee" },
      };
      expect(deriveSeverity(payable)).toBe(1);
    });

    it("reads a fee of zero as no fee, however it is written", () => {
      for (const killFee of ["none", "nil", 0, false, "0"] as const) {
        const reading: ClauseReading = {
          clauseType: "termination-for-convenience",
          properties: { killFee },
        };
        expect(severityTriggers(reading), String(killFee)).toEqual(["killFee"]);
      }
    });
  });

  describe("one-sided indemnity", () => {
    const confined = {
      mutual: true,
      triggeringClaims:
        "a third-party claim to the extent that it arises from that party's own breach",
      cappedByLiabilityLimit: true,
    } as const;

    it("does not cry wolf on a mutual promise confined to each party's own fault", () => {
      const fair: ClauseReading = { clauseType: "one-sided-indemnity", properties: confined };
      expect(severityTriggers(fair)).toEqual([]);
      expect(deriveSeverity(fair)).toBe(1);
    });

    it("flags a promise that runs one way, without calling it the dangerous case", () => {
      // `docs/adr/0008`: an indemnity running only towards the client, held to the
      // signer's own fault and inside the ceiling, is the ordinary freelance shape.
      // Worth knowing about, and marking it 3 would train a Signer to ignore the 3s.
      const oneWay: ClauseReading = {
        clauseType: "one-sided-indemnity",
        properties: { ...confined, mutual: false },
      };
      expect(severityTriggers(oneWay)).toEqual(["mutual"]);
      expect(deriveSeverity(oneWay)).toBe(2);
    });

    it.each([
      [
        "a promise that fires whoever caused the loss",
        {
          triggeringClaims:
            "any claim connected with the Services, whether or not the Contractor caused it",
        },
        "triggeringClaims",
      ],
      [
        "a promise carved out of the liability ceiling",
        { cappedByLiabilityLimit: false },
        "cappedByLiabilityLimit",
      ],
    ])("marks %s high on its own", (_case, widened, trigger) => {
      const reading: ClauseReading = {
        clauseType: "one-sided-indemnity",
        properties: { ...confined, ...widened },
      };
      expect(severityTriggers(reading)).toEqual([trigger]);
      expect(deriveSeverity(reading)).toBe(3);
    });

    it("does not let a confinement that is taken back count as a confinement", () => {
      // "to the extent" states a bound, "regardless of fault" removes it. Wording
      // Redline cannot read as confined is read as reaching.
      const reading: ClauseReading = {
        clauseType: "one-sided-indemnity",
        properties: {
          ...confined,
          triggeringClaims:
            "a claim to the extent it arises from the Services, regardless of fault",
        },
      };
      expect(severityTriggers(reading)).toEqual(["triggeringClaims"]);
    });

    it("reads a contract silent on all three at the dangerous end", () => {
      const silent: ClauseReading = { clauseType: "one-sided-indemnity", properties: {} };
      expect(deriveSeverity(silent)).toBe(3);
      expect([...severityTriggers(silent)].sort()).toEqual(
        [...SEVERITY_PROPERTIES["one-sided-indemnity"]].sort()
      );
    });
  });

  describe("uncapped liability", () => {
    const bounded = {
      liabilityCap: "the total fees payable in the twelve months before the claim",
      capAppliesToSigner: true,
      capProportionateToFee: true,
    } as const;

    it("reads a real ceiling as a ceiling rather than fearing the clause", () => {
      const capped: ClauseReading = { clauseType: "uncapped-liability", properties: bounded };
      expect(severityTriggers(capped)).toEqual([]);
      expect(deriveSeverity(capped)).toBe(1);
    });

    it.each([
      ["no ceiling at all", { liabilityCap: "none" }, "liabilityCap"],
      ["a ceiling in words only", { liabilityCap: "unlimited" }, "liabilityCap"],
      ["a ceiling that covers the client alone", { capAppliesToSigner: false }, "capAppliesToSigner"],
      [
        "a figure unrelated to the job",
        { capProportionateToFee: false },
        "capProportionateToFee",
      ],
    ])("marks %s high on its own", (_case, widened, trigger) => {
      const reading: ClauseReading = {
        clauseType: "uncapped-liability",
        properties: { ...bounded, ...widened },
      };
      expect(severityTriggers(reading)).toEqual([trigger]);
      expect(deriveSeverity(reading)).toBe(3);
    });

    it("ranks an open-ended exposure below withheld payment, not beside it", () => {
      // `docs/adr/0008`: this is a contingent exposure. Subjective payment approval is a
      // certainty about money already handed over, and `PRD.md` §5 keeps 4 for it.
      const open: ClauseReading = {
        clauseType: "uncapped-liability",
        properties: { liabilityCap: "none" },
      };
      const withheld: ClauseReading = {
        clauseType: "payment-approval",
        properties: { acceptanceStandard: "subjective" },
      };
      expect(deriveSeverity(open)).toBeLessThan(deriveSeverity(withheld));
    });
  });

  describe("auto-renewal", () => {
    const rolling = {
      renewalTermMonths: 1,
      noticeWindowDays: 14,
      terminableDuringRenewal: true,
    } as const;

    it("leaves an arrangement that rolls on in short steps alone", () => {
      const reading: ClauseReading = { clauseType: "auto-renewal", properties: rolling };
      expect(severityTriggers(reading)).toEqual([]);
      expect(deriveSeverity(reading)).toBe(1);
    });

    it.each([
      ["a renewal that commits another year", { renewalTermMonths: 12 }, "renewalTermMonths"],
      ["a window that opens a quarter early", { noticeWindowDays: 90 }, "noticeWindowDays"],
      [
        "a renewed term with no way out",
        { terminableDuringRenewal: false },
        "terminableDuringRenewal",
      ],
    ])("flags %s on its own", (_case, widened, trigger) => {
      const reading: ClauseReading = {
        clauseType: "auto-renewal",
        properties: { ...rolling, ...widened },
      };
      expect(severityTriggers(reading)).toEqual([trigger]);
      expect(deriveSeverity(reading)).toBe(2);
    });

    it("holds six months inside the window and thirty days' notice outside the trap", () => {
      // The two calibrations `docs/adr/0008` records as choices rather than findings.
      // They are asserted here so changing one is a deliberate act with a failing test
      // behind it, not a quiet edit to a regular expression.
      const atTheLine: ClauseReading = {
        clauseType: "auto-renewal",
        properties: { ...rolling, renewalTermMonths: 6, noticeWindowDays: 30 },
      };
      expect(severityTriggers(atTheLine)).toEqual([]);
    });

    it("ranks a renewal beside an early exit, not above it", () => {
      const locked: ClauseReading = {
        clauseType: "auto-renewal",
        properties: { ...rolling, renewalTermMonths: 12 },
      };
      const noKillFee: ClauseReading = {
        clauseType: "termination-for-convenience",
        properties: { killFee: "absent" },
      };
      expect(deriveSeverity(locked)).toBe(deriveSeverity(noKillFee));
    });
  });

  describe("unilateral change", () => {
    it("reads a change-order clause as the thing a fair contract has", () => {
      const changeOrder: ClauseReading = {
        clauseType: "unilateral-change",
        properties: {
          changeRequiresSignerAgreement: true,
          whatMayChange: "the monthly fee, the Services or any other term",
          exitOnChange: true,
        },
      };
      expect(severityTriggers(changeOrder)).toEqual([]);
      expect(deriveSeverity(changeOrder)).toBe(1);
    });

    it("does not flag a change-order clause for listing the fee among what can change", () => {
      // The gate that stops this clause type flagging every contract that has a changes
      // section. What may change matters only once it can change without a signature.
      const signedOnly: ClauseReading = {
        clauseType: "unilateral-change",
        properties: { changeRequiresSignerAgreement: true },
      };
      expect(severityTriggers(signedOnly)).toEqual([]);
      expect(deriveSeverity(signedOnly)).toBe(1);
      // Still hedged: the gap is real and named, it just does not move the mark
      // (`docs/adr/0006` — a hedge is about the basis of a finding, not its rank).
      expect(unstatedPropertiesOf("unilateral-change", signedOnly.properties)).toEqual([
        "whatMayChange",
        "exitOnChange",
      ]);
    });

    it("marks a power over the money and the work above a power over operating detail", () => {
      const overTheFee: ClauseReading = {
        clauseType: "unilateral-change",
        properties: {
          changeRequiresSignerAgreement: false,
          whatMayChange: "the monthly fee or the Services",
          exitOnChange: false,
        },
      };
      const overDetail: ClauseReading = {
        clauseType: "unilateral-change",
        properties: {
          changeRequiresSignerAgreement: false,
          whatMayChange: "the brand guidelines and the address invoices are sent to",
          exitOnChange: false,
        },
      };

      expect(severityTriggers(overTheFee)).toContain("whatMayChange");
      expect(deriveSeverity(overTheFee)).toBe(3);
      expect(severityTriggers(overDetail)).not.toContain("whatMayChange");
      expect(deriveSeverity(overDetail)).toBe(2);
    });

    it("reads a contract silent on all three at the dangerous end", () => {
      const silent: ClauseReading = { clauseType: "unilateral-change", properties: {} };
      expect(deriveSeverity(silent)).toBe(3);
      expect([...severityTriggers(silent)].sort()).toEqual(
        [...SEVERITY_PROPERTIES["unilateral-change"]].sort()
      );
    });
  });

  it("accounts for every property its clause type consumes, and no others", () => {
    // `docs/adr/0006` lets a hedge name only a property the severity function read.
    // Splitting stated from unstated has to cover the whole list and nothing outside it,
    // or a hedge could name something severity never looked at.
    const reading: ClauseReading = {
      clauseType: "non-compete",
      properties: { durationMonths: 12, industryScope: "marketing services" },
    };
    const consumed = SEVERITY_PROPERTIES["non-compete"];
    const unstated = unstatedPropertiesOf("non-compete", reading.properties);

    expect([...unstated].sort()).toEqual(["compensated", "geographicScope"]);
    for (const property of unstated) {
      expect(consumed).toContain(property);
    }
    expect(unstated.length + Object.keys(reading.properties).length).toBe(consumed.length);
  });
});
