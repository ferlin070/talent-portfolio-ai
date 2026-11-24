# Career Report Studio — Completion and Export QA

## Source of truth
Gemini provides **one** analysis string. The browser report and Word export use `parseCareerReport(analysis)` from `lib/career-report.ts`, preserving all section titles and paragraphs. PDF prints a clone of the **same report DOM** in an independent document through `lib/career-print.ts`. No second AI generation occurs during export.

## Mandatory completion rules
The backend must NOT return HTTP 200 with `analysis` unless:
1. Gemini's first candidate `finishReason` is `STOP` (not `MAX_TOKENS`).
2. The final `TAMAT_LAPORAN` marker is present.
3. Five numbered Markdown H3 sections are provided in order:
   - Tiga Kekuatan Utama (>=3 bullets)
   - Empat Jurang Kemahiran (>=4 bullets)
   - Pelan 30/60/90 Hari (>=3 bullets)
   - Dua Projek Portfolio (>=2 bullets)
   - Soalan Data (>=2 bullets)
4. Sections have meaningful length and the overall report has at least 1,400 characters.

The server uses an 8,192-output-token budget (including any model reasoning budget), low thinking level and a tightly specified Malay response format. If validation fails, one conditional retry may occur when the execution budget allows it. Otherwise the user receives an explicit incomplete-output error and cannot export a truncated report. The UI independently checks `complete:true` and five parsed sections.

## PDF and Word parity
- Word export is generated from the exact same input analysis and parsed sections, without another AI call.
- PDF prints the visible report content in an isolated pop-up with A4 print CSS, rather than setting `visibility:hidden` on the main application (which previously printed empty pages).
- Report date, target role, model, overview, all five section titles, bullets and disclosure are present in both formats.
- Decorative graphics need not be pixel-identical: Word is editable, while the PDF is a print layout.
- PDF can include browser header/footer if the end user enables it in the print dialog; recommend disabling browser headers and footers.

## Manual acceptance tests
1. Simulate Gemini HTTP 200 with `finishReason:MAX_TOKENS` and a partial first section: expect API rejection, no report and no export.
2. Simulate `finishReason:STOP` but missing fifth section: expect rejection.
3. Simulate `finishReason:STOP` with a valid five-section, end-marked report: expect 200 and `complete:true`.
4. Render a long report and export PDF: no empty trailing pages, no sidebar/header from the app, five full sections.
5. Export the same report to Word: the same 5 section titles, identical lists and text, consistent disclaimer, and a valid editable DOCX.
6. Confirm API keys are never included in exports.
7. Test mobile, desktop Chromium, Firefox and Safari, and allow pop-ups for PDF.
8. Check multi-key fallback, API quota and model errors separately.

The web application cannot reconstruct text already missing from an earlier `MAX_TOKENS` response. A fresh report must be generated after this fix.
