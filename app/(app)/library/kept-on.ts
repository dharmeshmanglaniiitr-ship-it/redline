/**
 * Dates, written once and on the server.
 *
 * Every date a Signer reads in the library is formatted here and handed down as a string,
 * never formatted in the browser. Two reasons, and the second is the one that matters: a
 * date rendered on the server and again on the client can disagree about the reader's time
 * zone, and `docs/adr/0010` makes the date the only thing telling a returning Signer how
 * old a reading is. A legend that says one thing on arrival and another a moment later is
 * worse than no legend.
 *
 * UTC, spelled out in full. A contract kept late on the last of the month is not worth
 * showing under two different days depending on where it is read.
 */

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** The day a document was kept or a reading was made, as a legend writes one. */
export function keptOn(timestamp: string): string {
  const at = new Date(timestamp);
  // A row whose date did not survive is said to have none, rather than being drawn as the
  // first of January 1970 — a made-up date is worse than an absent one on a record.
  return Number.isNaN(at.getTime()) ? "an unrecorded day" : DAY.format(at);
}
