/**
 * The landing page's worked example, as the analysis produced it.
 *
 * Generated from tests/fixtures/adhesion-contract.txt by `npm run sample`. Do not edit by
 * hand: `tests/landing-sample.test.ts` runs the analysis again and fails when this file
 * and the analysis disagree, so an edit here is a failing test rather than a change.
 */

import type { LandingSample } from "./sample";

export const LANDING_SAMPLE: LandingSample = {
  "fixture": "adhesion-contract.txt",
  "producedBy": "fixture-stub",
  "jurisdiction": {
    "name": "England and Wales",
    "sourceSentence": "12.1 This Agreement and any dispute arising out of or in connection with it are governed by the law of England and Wales, and the parties submit to the exclusive jurisdiction of the courts of England and Wales."
  },
  "flags": [
    {
      "id": "payment-approval-1",
      "clauseType": "payment-approval",
      "severity": 4,
      "severityWord": "Highest",
      "title": "Payment left to the client's judgment",
      "cost": "The client decides whether your finished work is good enough, and the contract makes that a matter of their own satisfaction. They can hold back money for work you have already handed over, and there is no test you could point at and say you met.",
      "hedgeNote": null,
      "clauseReference": "4.2",
      "sourceSentence": "4.2 No invoice falls due for payment until the Client has accepted the relevant Deliverable as satisfactory in the Client's sole and absolute discretion, and the Client is not required to apply any standard, test or criterion in reaching that decision."
    },
    {
      "id": "ip-assignment-1",
      "clauseType": "ip-assignment",
      "severity": 3,
      "severityWord": "High",
      "title": "Ownership reaches past this job",
      "cost": "Handing the client the rights in what you made for them is ordinary. This goes further and takes things you brought with you, so tools and methods you reuse on every job stop being yours to reuse.",
      "hedgeNote": null,
      "clauseReference": "5.2",
      "sourceSentence": "5.2 That assignment extends to any tool, library, framework, method or item of know-how that the Contractor created before 16 March 2026 and used in producing the Deliverables, and to any work of a similar character that the Contractor may create after the Term ends."
    },
    {
      "id": "non-compete-1",
      "clauseType": "non-compete",
      "severity": 3,
      "severityWord": "High",
      "title": "A block on similar work after this ends",
      "cost": "When this ends, it stops you taking work you could otherwise take. The block runs 24 months past the last day of the job. It is drawn wide enough to catch clients who have nothing to do with this one. It is not tied to the place you actually worked. You are paid nothing for agreeing to it. Whether it would be enforced is a question for the law of England and Wales.",
      "hedgeNote": null,
      "clauseReference": "9.1",
      "sourceSentence": "9.1 For twenty-four (24) months after the end of the Term, the Contractor shall not provide design, development or digital consultancy services to any business that sells goods or services to consumers, anywhere in the United Kingdom or the European Economic Area, and no payment of any kind is made to the Contractor in respect of that restriction."
    },
    {
      "id": "termination-for-convenience-1",
      "clauseType": "termination-for-convenience",
      "severity": 2,
      "severityWord": "Flagged",
      "title": "They can walk away owing nothing",
      "cost": "The client can end this whenever they like and owes nothing for the part you have not reached yet. The hole it leaves in your schedule is yours to fill, and the fee you planned around may never arrive.",
      "hedgeNote": null,
      "clauseReference": "8.1",
      "sourceSentence": "8.1 The Client may end this Agreement at any time, for any reason or for none, by giving the Contractor three (3) days' written notice, and nothing is payable to the Contractor in respect of the unexpired part of the Term."
    }
  ],
  "clauses": [
    {
      "heading": "4. FEES AND PAYMENT",
      "spans": [
        {
          "text": "4.1 The Client shall pay the Contractor a fixed fee of £18,000 for the Deliverables, invoiced in three equal instalments.\n",
          "flagId": null
        },
        {
          "text": "4.2 No invoice falls due for payment until the Client has accepted the relevant Deliverable as satisfactory in the Client's sole and absolute discretion, and the Client is not required to apply any standard, test or criterion in reaching that decision.",
          "flagId": "payment-approval-1"
        },
        {
          "text": "\n4.3 Where the Client accepts a Deliverable, the corresponding invoice is payable within sixty (60) days of acceptance.\n4.4 The Contractor shall bear its own costs of performing the Services, including software licences, equipment and travel within the United Kingdom.",
          "flagId": null
        }
      ],
      "flagIds": [
        "payment-approval-1"
      ]
    },
    {
      "heading": "5. INTELLECTUAL PROPERTY",
      "spans": [
        {
          "text": "5.1 The Contractor assigns to the Client, absolutely and with full title guarantee, all present and future intellectual property rights in the Deliverables.\n",
          "flagId": null
        },
        {
          "text": "5.2 That assignment extends to any tool, library, framework, method or item of know-how that the Contractor created before 16 March 2026 and used in producing the Deliverables, and to any work of a similar character that the Contractor may create after the Term ends.",
          "flagId": "ip-assignment-1"
        },
        {
          "text": "\n5.3 The Contractor waives, so far as the law allows, all moral rights in the Deliverables.\n5.4 The Contractor shall sign any document the Client reasonably requires in order to record or perfect the rights assigned under this clause 5.",
          "flagId": null
        }
      ],
      "flagIds": [
        "ip-assignment-1"
      ]
    },
    {
      "heading": "8. TERMINATION",
      "spans": [
        {
          "text": "8.1 The Client may end this Agreement at any time, for any reason or for none, by giving the Contractor three (3) days' written notice, and nothing is payable to the Contractor in respect of the unexpired part of the Term.",
          "flagId": "termination-for-convenience-1"
        },
        {
          "text": "\n8.2 The Contractor may end this Agreement only if the Client has failed to pay an undisputed invoice within thirty (30) days of a written reminder.\n8.3 Clauses 5, 6, 9 and 10 survive the end of this Agreement.",
          "flagId": null
        }
      ],
      "flagIds": [
        "termination-for-convenience-1"
      ]
    },
    {
      "heading": "9. RESTRICTIONS AFTER THE TERM",
      "spans": [
        {
          "text": "9.1 For twenty-four (24) months after the end of the Term, the Contractor shall not provide design, development or digital consultancy services to any business that sells goods or services to consumers, anywhere in the United Kingdom or the European Economic Area, and no payment of any kind is made to the Contractor in respect of that restriction.",
          "flagId": "non-compete-1"
        },
        {
          "text": "\n9.2 The Contractor accepts that the restriction in clause 9.1 is reasonable to protect the Client's business.",
          "flagId": null
        }
      ],
      "flagIds": [
        "non-compete-1"
      ]
    }
  ],
  "cleared": [
    {
      "entry": "one-sided-indemnity",
      "name": "Who covers it when someone else brings a claim"
    },
    {
      "entry": "uncapped-liability",
      "name": "Whether there is a ceiling on what you could be made to pay"
    },
    {
      "entry": "auto-renewal",
      "name": "Whether it renews itself"
    },
    {
      "entry": "unilateral-change",
      "name": "Whether they can change the terms on their own"
    }
  ],
  "checklistTotal": 8
};
