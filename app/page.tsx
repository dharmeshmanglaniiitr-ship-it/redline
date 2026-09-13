"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MarkKind = "caret" | "strike" | "query";

type Finding = {
  id: string;
  clause: string;
  mark: MarkKind;
  steps: number;
  severity: string;
  title: string;
  cost: string;
};

type Span = { text: string; marks?: string };

type Clause = {
  id: string;
  number: string;
  heading: string;
  spans: Span[];
};

const FINDINGS: Finding[] = [
  {
    id: "payment",
    clause: "4.2",
    mark: "strike",
    steps: 4,
    severity: "Highest",
    title: "Payment left to the client's judgment",
    cost: "The client decides whether your finished work is good enough, and nothing in the contract says what good enough means. They can hold payment for work you have already delivered and you have nothing to point at.",
  },
  {
    id: "ip",
    clause: "7.1",
    mark: "caret",
    steps: 3,
    severity: "High",
    title: "Ownership reaches past the work",
    cost: "Most contracts take what you build for the client. This one also takes the tools and methods you brought with you, and anything you make after the job ends.",
  },
  {
    id: "compete",
    clause: "11.2",
    mark: "caret",
    steps: 3,
    severity: "High",
    title: "Two years, worldwide, unpaid",
    cost: "For two years you could not take similar work from anyone, anywhere, and you are paid nothing for agreeing to that. Whether a court would hold you to it depends on which country's law governs this contract.",
  },
  {
    id: "termination",
    clause: "9.3",
    mark: "query",
    steps: 2,
    severity: "Flagged",
    title: "They can walk with five days' notice",
    cost: "The client can end the job whenever they like and owes nothing for the part you have not finished yet. You carry the gap in your schedule.",
  },
];

const CLAUSES: Clause[] = [
  {
    id: "c-4",
    number: "4.2",
    heading: "Acceptance",
    spans: [
      { text: "Contractor shall submit each Deliverable to Client for review. " },
      {
        text: "The Deliverables shall be deemed accepted only upon the Client's written confirmation that they are satisfactory to the Client in its sole and absolute discretion.",
        marks: "payment",
      },
      {
        text: " Payment of the corresponding invoice shall become due thirty (30) days after such acceptance.",
      },
    ],
  },
  {
    id: "c-7",
    number: "7.1",
    heading: "Assignment of Work Product",
    spans: [
      {
        text: "Contractor hereby assigns to Client all right, title and interest in any and all materials, methods, processes, techniques and tools authored or developed by Contractor, whether created before, during or after the Term.",
        marks: "ip",
      },
      {
        text: " Contractor shall execute any documents reasonably necessary to perfect such assignment.",
      },
    ],
  },
  {
    id: "c-9",
    number: "9.3",
    heading: "Termination for Convenience",
    spans: [
      {
        text: "Client may terminate this Agreement at any time, for any reason or for no reason, upon five (5) days' written notice, and shall have no obligation to pay for any portion of the Services not completed as of the effective date of termination.",
        marks: "termination",
      },
    ],
  },
  {
    id: "c-11",
    number: "11.2",
    heading: "Restriction on Competing Services",
    spans: [
      {
        text: "For a period of twenty-four (24) months following termination, Contractor shall not provide services of any kind to any person or entity engaged in a business similar to that of the Client, anywhere in the world.",
        marks: "compete",
      },
      { text: " Contractor acknowledges that this restriction is reasonable in scope." },
    ],
  },
];

const WHAT_YOU_GET: [string, string][] = [
  [
    "Risky clauses, ranked worst first.",
    "Each flag quotes the sentence it came from. If it cannot show you that sentence, Redline does not show the flag.",
  ],
  [
    "A counter-offer drafted for every flag.",
    "Wording you can paste straight into a reply to your client, written to go out as it stands.",
  ],
  [
    "Questions answered from the document itself.",
    "Ask what a clause means, or what the contract does not cover. Where the document is silent, Redline says so.",
  ],
];

const CLEARED = [
  ["Invoice due date", "Thirty days, stated in writing"],
  ["Expenses", "Pre-approved costs reimbursed"],
  ["Confidentiality", "Runs both ways, three years"],
  ["Revisions", "Two rounds, defined"],
  ["Governing law", "Named in the document"],
];

function ProofMark({ kind, className = "h-6 w-6" }: { kind: MarkKind; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`${className} shrink-0`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === "caret" && <path d="M3 17 12 7l9 10" />}
      {kind === "strike" && (
        <>
          <path d="M4 12h16" />
          <path d="M20 8v8" />
        </>
      )}
      {kind === "query" && (
        <>
          <path d="M8.4 9.2a3.6 3.6 0 1 1 3.6 3.6V15" />
          <path d="M12 18.4h.01" />
        </>
      )}
    </svg>
  );
}

function Severity({ steps, severity }: { steps: number; severity: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-[3px]" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`block h-3 w-[5px] border border-mark ${
              i <= steps ? "bg-mark" : "bg-transparent"
            }`}
          />
        ))}
      </span>
      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-mark-deep">
        {severity}
        <span className="sr-only"> severity, {steps} of 4</span>
      </span>
    </span>
  );
}

function TrimMarks() {
  // A sheet has edges. Without them the stock reads as a page background.
  const corner = "pointer-events-none absolute h-5 w-5 border-rule";
  return (
    <div aria-hidden="true">
      <span className={`${corner} left-3 top-3 border-l border-t`} />
      <span className={`${corner} right-3 top-3 border-r border-t`} />
      <span className={`${corner} bottom-3 left-3 border-b border-l`} />
      <span className={`${corner} bottom-3 right-3 border-b border-r`} />
    </div>
  );
}

const STAMP =
  "inline-block cursor-pointer border-[3px] border-mark-deep bg-mark-deep px-7 py-3 text-[0.82rem] font-bold uppercase tracking-[0.18em] text-stock transition-colors duration-200 hover:bg-transparent hover:text-mark-deep focus-visible:bg-transparent focus-visible:text-mark-deep";

export default function Home() {
  const [selected, setSelected] = useState("payment");
  const galleyRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const sentenceRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [leader, setLeader] = useState<{ points: string; w: number; h: number } | null>(
    null,
  );

  const measure = useCallback(() => {
    const galley = galleyRef.current;
    const mark = markRefs.current[selected];
    const sentence = sentenceRefs.current[selected];
    if (!galley || !mark || !sentence) return setLeader(null);
    if (!window.matchMedia("(min-width: 1024px)").matches) return setLeader(null);

    const g = galley.getBoundingClientRect();
    const m = mark.getBoundingClientRect();
    const rects = sentence.getClientRects();
    const head = rects[0];
    if (!head) return setLeader(null);

    // A proof mark ties to its line. A wrapped span's first rect ends at the wrap
    // point with nothing after it, so the leader can land there. On a single-line
    // span it would cross whatever follows, so it stops at the column edge instead.
    const column = sentence.closest("p")?.getBoundingClientRect();
    const anchor = rects.length > 1 ? head.right : (column?.right ?? head.right);
    const x1 = m.left - g.left - 12;
    const y1 = m.top - g.top + 17;
    const x2 = anchor - g.left + 7;
    const y2 = head.top - g.top + head.height / 2;
    const elbow = x2 + (x1 - x2) * 0.45;

    setLeader({
      points: `${x1},${y1} ${elbow},${y1} ${elbow},${y2} ${x2},${y2}`,
      w: g.width,
      h: g.height,
    });
  }, [selected]);

  useEffect(() => {
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(onResize);
    if (galleyRef.current) observer.observe(galleyRef.current);
    document.fonts?.ready.then(onResize).catch(() => {});
    return () => {
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, [measure]);

  const choose = (id: string, scroll = false) => {
    setSelected(id);
    if (scroll) {
      sentenceRefs.current[id]?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };

  return (
    <main className="flex-1">
      <div ref={galleyRef} className="galley relative bg-stock text-ink">
        {leader && (
          <svg
            className="pointer-events-none absolute inset-0 hidden lg:block"
            width={leader.w}
            height={leader.h}
            viewBox={`0 0 ${leader.w} ${leader.h}`}
            aria-hidden="true"
          >
            <polyline
              key={selected}
              className="leader"
              points={leader.points}
              fill="none"
              stroke="var(--mark)"
              strokeWidth={1.5}
              strokeLinecap="square"
              pathLength={1}
            />
          </svg>
        )}

        <TrimMarks />

        <div className="mx-auto w-full max-w-[84rem] px-5 py-10 sm:px-8 lg:py-14 xl:px-16">
          <header className="grid max-w-[68rem] items-end gap-x-16 gap-y-9 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div>
              <h1 className="max-w-[18ch] text-[clamp(2.05rem,4.6vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.03em] text-ink">
                Know what you&rsquo;re actually agreeing to.
              </h1>
              <p className="mt-5 max-w-[58ch] text-[1.05rem] leading-[1.5] text-ink-soft">
                Your client sent you a contract to sign. Redline tells you which terms
                will cost you and quotes the sentence each one came from, so you can
                find it in your own copy and ask for a change.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                <a href="/sign-in" className={STAMP}>
                  Run your own contract
                </a>
                <span className="text-[0.85rem] text-ink-soft">
                  Freelance and contractor agreements.
                </span>
              </div>
            </div>

            <nav aria-labelledby="ranked">
              <h2
                id="ranked"
                className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-soft"
              >
                In this sample, worst first
              </h2>
              <ol className="mt-3 border-t border-rule">
                {FINDINGS.map((f, i) => {
                  const active = selected === f.id;
                  return (
                    <li key={f.id} className="border-b border-rule">
                      <button
                        type="button"
                        onClick={() => choose(f.id, true)}
                        aria-pressed={active}
                        className="flex w-full cursor-pointer items-start gap-3 py-2.5 text-left transition-colors duration-200 hover:bg-stock-shade"
                      >
                        <span
                          className={`numeric mt-px w-3 shrink-0 text-[0.78rem] font-bold ${
                            active ? "text-mark-deep" : "text-ink-soft"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="flex-1">
                          <span
                            className={`block text-[0.92rem] font-semibold leading-snug ${
                              active
                                ? "text-ink underline decoration-mark decoration-2 underline-offset-4"
                                : "text-ink-soft"
                            }`}
                          >
                            {f.title}
                          </span>
                          <span className="mt-1.5 flex items-center gap-3">
                            <Severity steps={f.steps} severity={f.severity} />
                            <span className="numeric font-document text-[0.82rem] text-ink-soft">
                              Clause {f.clause}
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </header>

          <div className="mt-14 max-w-[64rem] border-t border-rule pt-8">
            <h2 className="text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
              What you get
            </h2>
            <ul className="mt-6 grid gap-x-12 gap-y-7 sm:grid-cols-3">
              {WHAT_YOU_GET.map(([name, note]) => (
                <li key={name} className="border-b border-rule pb-6">
                  <span className="block text-[0.95rem] font-semibold leading-snug text-ink">
                    {name}
                  </span>
                  <span className="mt-2 block text-[0.88rem] leading-relaxed text-ink-soft">
                    {note}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="numeric mt-14 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-ink pb-3 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-ink">
            <span>Sample: independent contractor agreement</span>
            <span className="text-ink-soft">Marked proof</span>
          </div>
          <p className="mt-3 max-w-[68ch] text-[0.86rem] leading-relaxed text-ink-soft">
            A sample agreement written for this page. The marks illustrate how Redline
            reads a document. No real contract was analysed to make them.
          </p>

          <div className="mt-9 space-y-9">
            {CLAUSES.map((clause) => {
              const finding = FINDINGS.find(
                (f) => f.id === clause.spans.find((s) => s.marks)?.marks,
              );
              const active = finding?.id === selected;
              return (
                <div
                  key={clause.id}
                  className={`grid max-w-[64rem] gap-x-10 gap-y-4 transition-opacity duration-500 lg:grid-cols-[minmax(0,1fr)_18rem] ${
                    active ? "opacity-100" : "opacity-[0.82]"
                  }`}
                >
                  <div>
                    <h3 className="numeric font-document text-[1.02rem] font-bold text-ink">
                      {clause.number} {clause.heading}
                    </h3>
                    <p className="mt-2 max-w-[58ch] font-document text-[1.06rem] leading-[1.62] text-ink">
                      {clause.spans.map((span, i) => {
                        if (!span.marks || !finding) {
                          return <span key={i}>{span.text}</span>;
                        }
                        const isSelected = span.marks === selected;
                        const struck = finding.mark === "strike";
                        return (
                          <span key={i}>
                            {/* The in-line half of the pair: proof correction marks the
                                text and the margin, and the two read together. */}
                            <ProofMark
                              kind={finding.mark}
                              className="mr-0.5 inline h-[0.95em] w-[0.95em] -translate-y-[0.1em] align-middle text-mark"
                            />
                            <span
                              id={`sentence-${span.marks}`}
                              ref={(el) => {
                                sentenceRefs.current[span.marks!] = el;
                              }}
                              className={`decoration-mark underline-offset-[5px] ${
                                struck
                                  ? "line-through decoration-[1.5px]"
                                  : isSelected
                                    ? "underline decoration-[1.5px]"
                                    : "underline decoration-dotted decoration-[1.5px]"
                              } ${isSelected ? "bg-stock-shade" : ""}`}
                            >
                              {span.text}
                            </span>
                          </span>
                        );
                      })}
                    </p>
                  </div>

                  {finding && (
                    <div className="lg:border-l lg:border-rule lg:pl-7">
                      <button
                        type="button"
                        ref={(el) => {
                          markRefs.current[finding.id] = el;
                        }}
                        onClick={() => choose(finding.id)}
                        aria-pressed={active}
                        aria-controls={`sentence-${finding.id}`}
                        className="w-full cursor-pointer text-left transition-colors duration-200 hover:bg-stock-shade"
                      >
                        <span className="flex items-start gap-3 text-mark">
                          <ProofMark kind={finding.mark} />
                          <span className="flex-1">
                            <span className="block text-[1rem] font-semibold leading-snug text-ink">
                              {finding.title}
                            </span>
                            <span className="mt-2 block">
                              <Severity steps={finding.steps} severity={finding.severity} />
                            </span>
                          </span>
                        </span>
                        <span className="sr-only">
                          {active ? "Showing" : "Show"} the sentence in clause{" "}
                          {finding.clause} this came from
                        </span>
                      </button>
                      {active && (
                        <p className="mt-4 max-w-[40ch] text-[0.94rem] leading-[1.55] text-ink-soft">
                          {finding.cost}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-14 max-w-[64rem] border-t border-rule pt-8">
            <h2 className="text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-pencil">
              Checked, nothing to report
            </h2>
            <p className="mt-3 max-w-[58ch] text-[0.94rem] leading-relaxed text-ink-soft">
              Redline names every clause it examined, including the ones it had nothing
              to say about.
            </p>
            <ul className="mt-6 grid max-w-[64rem] border-t border-rule sm:grid-cols-2 sm:gap-x-12">
              {CLEARED.map(([name, note]) => (
                <li
                  key={name}
                  className="flex items-start gap-3 border-b border-rule py-3.5"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 shrink-0 text-pencil"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 13.5 9 18.5 20 6" />
                  </svg>
                  <span>
                    <span className="block text-[0.95rem] font-semibold text-ink">
                      {name}
                    </span>
                    <span className="block text-[0.88rem] text-ink-soft">{note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="numeric mt-16 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t-2 border-ink pt-4 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
            <span className="text-ink">Redline</span>
            <span>Read the margin, then the line it points to</span>
            <span>Sheet 1 of 1</span>
          </div>
        </div>
      </div>

      <div className="bg-field">
        <div className="mx-auto w-full max-w-[84rem] px-5 py-20 sm:px-8">
          <section aria-labelledby="limits">
            <h2
              id="limits"
              className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold tracking-[-0.02em] text-field-ink"
            >
              What Redline will not do
            </h2>
            <dl className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-[1rem] font-semibold text-field-ink">
                  Tell you whether to sign
                </dt>
                <dd className="mt-2 text-[0.95rem] leading-relaxed text-field-soft">
                  It explains what the document says and drafts language you can send
                  back. The decision is yours, and it is not legal advice.
                </dd>
              </div>
              <div>
                <dt className="text-[1rem] font-semibold text-field-ink">
                  Read a scan or a photo
                </dt>
                <dd className="mt-2 text-[0.95rem] leading-relaxed text-field-soft">
                  If a file has no text in it, Redline says so instead of guessing. A
                  quote is worth nothing if the words behind it were misread.
                </dd>
              </div>
              <div>
                <dt className="text-[1rem] font-semibold text-field-ink">
                  Send your file anywhere
                </dt>
                <dd className="mt-2 text-[0.95rem] leading-relaxed text-field-soft">
                  Your document is read in your own browser. Only the text it contains is
                  stored, and only you can see it.
                </dd>
              </div>
              <div>
                <dt className="text-[1rem] font-semibold text-field-ink">
                  Cover every kind of document
                </dt>
                <dd className="mt-2 text-[0.95rem] leading-relaxed text-field-soft">
                  This version is built for freelance and contractor agreements. Leases
                  and terms of service are not in it.
                </dd>
              </div>
            </dl>
          </section>

          <section className="mt-20 border-t border-field-soft/30 pt-12">
            <p className="max-w-[38ch] text-[clamp(1.5rem,3.4vw,2.1rem)] font-bold leading-[1.12] tracking-[-0.02em] text-field-ink">
              You can still ask for a change. You just have to know what to ask for.
            </p>
            <a
              href="/sign-in"
              className="mt-8 inline-block cursor-pointer border-[3px] border-stock bg-mark-deep px-7 py-3.5 text-[0.82rem] font-bold uppercase tracking-[0.18em] text-stock transition-colors duration-200 hover:bg-stock hover:text-mark-deep focus-visible:bg-stock focus-visible:text-mark-deep"
            >
              Run your own contract
            </a>
          </section>

          <footer className="mt-20 flex flex-wrap items-baseline justify-between gap-x-10 gap-y-3 border-t border-field-soft/30 pt-6">
            <span className="font-document text-[1.05rem] italic text-field-ink">
              Redline
            </span>
            <span className="max-w-[58ch] text-[0.83rem] leading-relaxed text-field-soft">
              Redline explains a document and drafts language you can send. It does not
              tell you whether to sign, and it is not a law firm.
            </span>
          </footer>
        </div>
      </div>
    </main>
  );
}
