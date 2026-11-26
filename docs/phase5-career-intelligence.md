# Phase 5 — Career Intelligence (5A–5B)

Base: production release 1b159ff. Preview only until acceptance and release approval.

## Delivered
- Career Studio on the authenticated Skills Intelligence page.
- Job Fit: user-entered skill requirements (one per line), maximum 25 unique requirements, boundary-aware matching against recorded skills. Coverage is name matching only, not an ATS score or employment probability.
- 30/60/90-day roadmap based on the three largest positive illustrative target gaps. No fabricated evidence or credentials.
- Structured role-aware interview prompts with STAR guidance and session-only practice completion. No external processing, no persistent answers, no generative feedback.
- Existing Gemini career analysis remains separate and requires consent and a user-provided key.
- Responsive theme-aware UI; pure regression tests and authenticated browser acceptance checks.

## Release gates
- Pass all existing Phase 2–4 tests, four new Phase 5 unit tests, and local Supabase authenticated E2E including Career Studio and nine public portfolio themes.
- Verify keyboard/mobile/dark mode and no network requests for rule-based tools. Real Gemini remains an independent verification item.
- No new database schema, provider subscriptions or production deployment in 5A.

## Phase 5B — Application Studio
- Text-only resume readiness review: explicit keywords, boundary-aware literal matching and common bilingual section headings. Not a vendor ATS, no PDF/DOCX parsing, no ranking or employment probability.
- Editable bilingual cover-letter drafts from account profile name and up to six explicitly selected skill, public project, education or employment records. Private projects and certificate files are excluded. No automatic sending, no external API or persistence. Copy and TXT download supported.
- Four additional regression tests and local authenticated browser QA for matching, evidence exclusion, language switching, editing and file download.
- Same release gate as 5A; CI results pending. No production changes or new dependencies.

## Next increments
5C: consented Gemini interview coaching and career feedback, reuse secure key vault and enforce quotas. 5D: learning progress and mentor review with RLS design, privacy and separate migration review. Do not claim job listings are live or ATS scores are official.
