# Phase 5 — Career Intelligence (5A–5D)

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

## Phase 5C — Gemini Coach
- Interview feedback and career questions, Malay or English. Explicit per-request consent; only role, question and user-entered answer/context sent to Gemini. No other profile records are retrieved by this endpoint.
- Reuse existing BYOK/vault UI and model allowlist, first valid key only. Existing verified-user analysis quota (five/hour shared with skills analysis), strict Origin, bounded JSON input, 45s provider timeout, no automatic retries, generic provider errors, no key in URL or response.
- Strict five-field JSON feedback with STOP finish reason; incomplete or malformed responses rejected, thought parts excluded, plain text rendering. Not a hiring assessment; human review required.
- No new database, subscription, persistent answers or production release. Provider free-tier availability and charges depend on the user's Google project; no actual provider call in automated tests. Added two unit tests, mocked route test and browser consent checks.

## Phase 5D — Learning Progress & Mentor Journal
- Private persisted milestones for the six current target roles; three rows per role (30, 60, 90), status, evidence notes, self-recorded mentor feedback and next action. Saved progress is not verified competence.
- Migration 0012: bounded fields, composite primary key, auth user foreign key, explicit authenticated grants and owner RLS for SELECT/INSERT/UPDATE/DELETE; no anonymous privileges. No SECURITY DEFINER function or public snapshot extension.
- Browser loads only owner and selected role; validates current user before save, shows unavailable state if migration is absent, distinguishes unsaved from saved progress. Notes are not sent to Gemini or public portfolio.
- Mentor journal is learner-entered feedback, not verified mentor-authored review. A separate mentor identity, invitation, permissions and review workflow belongs in the institution phase.
- Added SQL and real local browser checks for limits, ownership, anonymous denial, save/reload, mobile and snapshot exclusion.
- Migration drafted in existing repository numbering because local CLI is unavailable; local CI applies all migrations. Production still has 11 migrations; 0012 requires separate owner-approved release and preflight.
- CI #47: app build and native PostgreSQL passed; local Supabase failed on Inbucket port 54324, before E2E. Excluded unused email capture service on pinned CLI; re-run must verify.
- All Phase 5 changes remain draft PR #4. Verify latest CI, preview, dark mode/keyboard and actual Gemini availability before release. No paid resources or production changes authorized by this development step.
