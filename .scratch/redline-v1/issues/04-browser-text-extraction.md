# 04: Browser text extraction with an explicit unreadable state

**What to build:** A Signer picks a contract from their machine and sees its text
extracted, having watched nothing leave their computer. The file is parsed in the
browser; only extracted text ever goes anywhere. The original file is never uploaded and
never stored.

The dangerous case this ticket is really about: a scanned or image-only PDF yields no
text, and OCR is deliberately excluded from Redline. That document must surface as
"this can't be read" — loudly, as its own state. If an unreadable document ever presents
as an empty result or a clean bill, the product has told a Signer their contract is fine
when it was never examined. That is the worst failure Redline can have.

Text extraction sits outside the analysis seams on purpose, so a parsing failure stays
distinguishable from an analysis failure.

**Blocked by:** 01

**Status:** done — 2026-09-13. Extraction is a discriminated union, so reading text off
an unreadable document is a compile error rather than a convention. pdfjs-dist and mammoth
parse client-side; the scan fixture is driven through in node with no browser.

- [x] A Signer can select a contract and see the extracted text rendered back to them
- [x] Parsing happens in the browser; the original file is never sent to a server or
      persisted anywhere
- [x] An image-only PDF produces an explicit unreadable state that a Signer cannot
      mistake for a successful read or a clean result
- [x] The unreadable state is distinguishable in the code from an analysis that ran and
      found nothing
- [x] A test drives an image-only fixture through extraction and asserts the unreadable
      state, with no browser required
- [x] The parsing dependency was asked about before being added (`CLAUDE.md`)
