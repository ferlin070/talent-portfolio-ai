# Talentfolio TVET Institution — Phase 6 architecture and delivery gates

Status: design candidate, not an implemented institution product. Branch is based on Phase 5 candidate 687ffac; do not merge or deploy until Phase 5 release and separate Phase 6 review. Malaysian TVET use cases: student portfolio, lecturer mentoring, competency assessment, evidence-based certificate verification, industrial training and institution reporting. No institution is provisioned by this design.

## 6A: identity and tenant foundation
- Institution is a tenant, not an Auth user. Existing individual accounts remain personal and can have separate active memberships in multiple institutions.
- Proposed relations: institutions(id, name, slug, status); institution_memberships(institution_id, user_id, role, status); institution_programmes(institution_id, id, name, code); institution_cohorts(institution_id, programme_id, id, name); cohort_enrolments(institution_id, cohort_id, student_user_id); cohort_lecturers(institution_id, cohort_id, lecturer_user_id).
- Every tenant-scoped relation has a tenant key and composite foreign keys so mismatched institution IDs cannot be combined. Unique keys prevent duplicate membership/enrolment. Roles: institution_admin, lecturer, student; mentor access limited to explicitly assigned cohorts. Role membership is server/database-authoritative, never mutable user metadata.
- Initial institution admin provisioning is a separate trusted operator workflow. Invitation proposals bind recipient's verified account/email, tenant, fixed role, expiry, one-time consumption; random token stored as digest only, never log plaintext. Ordinary members cannot elevate roles or create institution admins. Admin transitions need explicit review; prevent last-admin lockout.
- Default deny for anon; table grants and owner/tenant RLS on all relations, both USING and WITH CHECK for updates. Avoid recursive membership policies; narrowly scoped, reviewed membership helper in non-exposed schema if required, with fixed search path and explicit caller identity checks.
- Never grant admins universal access to existing profiles, resumes, private certificate files, Gemini keys or personal learning journals. Membership alone grants no access to such records.

## 6B: student and lecturer workspaces
- Institution context selector for users with active memberships. Do not trust a tenant ID in URL or localStorage; check membership server-side for each read and mutation.
- Institution admin: programme/cohort roster, invitations, lecturer assignments, aggregated progress.
- Lecturer: only assigned cohorts, student-submitted evidence and rubrics; cannot modify student-owned personal records or grant roles.
- Student: own institution enrolment, tasks, explicitly submitted evidence, feedback. Private personal workspace remains independent.
- Proposed submissions: institution_id, cohort_id, student_user_id, assignment_id, evidence references/approved snapshot, status, timestamps. Require explicit submission preview; no silent copy of personal records. Student can withdraw sharing subject to transparent assessment retention rules.
- Use synthetic fixtures, tenant A/B plus unassigned lecturer, and no personal production data in previews.

## 6C: competency assessment
- Versioned institution rubrics, competency definitions and criteria. Separate learner self-rating from lecturer assessment. No claim of SKM, MQF or other accredited competency alignment until validated by appropriate institution.
- Lecturer review uses explicit assigned submission, rubric version, reviewer identity, written feedback, timestamp, and assessment history. Student cannot alter reviewer identity or scores. Finalization/correction flow preserves audit history; scores are human-entered, not automated hiring or accreditation decisions.
- Mentor feedback by actual lecturer/mentor account requires assignment, submission consent and attribution; distinct from Phase 5 learner-entered notes.

## 6D: credential verification
- Issuer verification is separate from upload/self-declared status. Authorized issuer workflow, explicit verification scope, evidence, revocation and review.
- Public verification is opt-in and minimal; opaque token or exact lookup, no bulk roster endpoint or private document exposure.
- Storage policies use tenant and submission ownership; signed URLs short-lived; do not use the public portfolio bucket for private institution evidence.

## 6E: industrial training and analytics
- Training placement record, learning objectives, logbook, lecturer/supervisor feedback and approved completion. External supervisor role must be scoped to one assigned placement with expiry.
- Tenant-only aggregate reporting; minimize personal data, suppress small-cohort breakdowns when needed, no cross-tenant comparisons without authorization.
- Data lifecycle: institution retention policy, access revocation, export and deletion process, audit trail. Malaysian PDPA applicability and institutional obligations require separate legal/compliance review, not asserted by this design.

## Authorization matrix (initial proposed minimum)
| Resource | Student | Assigned lecturer | Institution admin | Unassigned/cross-tenant |
|---|---|---|---|---|
| Institution roster | Own enrolment | Assigned cohorts | Own institution | Deny |
| Personal portfolio/profile | Own existing rules | Only explicit submitted evidence | Only explicit authorized submissions | Deny |
| Personal learning journal | Own only | Deny | Deny | Deny |
| Assessment | Own released result | Assigned review | Own tenant oversight | Deny |
| Membership and role assignment | No role mutation | No role mutation | Scoped approved actions | Deny |
| Private credential files | Own existing rules | Explicit authorized submission | Explicit authorized verification scope | Deny |
| Institution analytics | Own learning summary | Assigned cohort aggregates | Own institution aggregates | Deny |

## Release gates
1. Phase 5: latest full local CI green, migration 0012 production release separately approved, rollback plan and post-release checks. Never bundle untested Phase 6 migrations into Phase 5 release.
2. Phase 6A: finalize ownership/invitation policy and schema in free local Supabase; test anonymous access, tenant isolation, role escalation, foreign-key tenant consistency, membership revocation and concurrent invitation acceptance. No paid database or production DDL.
3. Phase 6B: authenticated desktop/mobile E2E with student, lecturer, admin and unrelated accounts; verify cross-tenant and unassigned access denied at API/database layer, not only hidden UI.
4. Phase 6C–E: additional threat review, explicit data-sharing UX, audit events, institutional validation and owner-approved production release.
5. Use existing GitHub Actions standard free runners and Vercel preview where available. Do not add billing, new hosted database, real institution memberships or automatic data sharing.

Decision log: architecture staged before implementation because Phase 5 CI #55 remains pending. Phase 6 branch deliberately has no runtime, database or production mutations. Next coding increment is 6A identity/membership schema with isolated tests after release gate.
