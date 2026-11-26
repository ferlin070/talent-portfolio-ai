# Phase 6A.3 — Institution invitations (backend candidate)

Production migration checkpoint: 0012, 0013 and 0014 applied on 26 November 2026 following successful CI #56, #58 and #64. Production record counts unchanged; all six new tables RLS-enabled; no additional security advisor findings. This is a schema-only release, not a production frontend deployment. Existing Phase 5 and 6A release PRs remain separate.

## Implemented on this branch
- Migration 0015: non-exposed private schema and invitation metadata, only SHA-256 token digest at rest. Two UUIDv4 values yield 244 bits of random entropy. Raw token returned once to the authorized issuing admin.
- Verified-email user identity, active tenant/admin membership; only student and lecturer roles; seven-day expiry, revocation, single redemption, existing memberships never overwritten.
- Tenant, issuer membership and invite row locking; serialized issue quota (30 per hour and 100 pending per institution). Recipient email locked on redemption.
- Three intentionally authenticated-only, narrowly scoped SECURITY DEFINER RPCs with fixed search path. No direct client access to invitation metadata.
- SQL regression tests on disposable native PostgreSQL and Supabase. Tests cover cross-tenant issuance, private schema/RPC grants, wrong email, unconfirmed email, revocation, replay, no admin invitation or role replacement.

## Before production
- Verify current CI; additional acceptance coverage for expired tokens, concurrent redemption, suspended issuer/tenant and quota. Review SECURITY DEFINER boundaries and data retention with security advisor.
- Build authenticated preview/confirm UI showing the institution and role before accepting, admin invitation history with limited recipient metadata, copy-once token and revocation. Do not put secret tokens in URL or logs. No automatic email delivery or paid resources.
- First institution/admin provisioning remains a separately authorized trusted operation. Do not create real institution memberships from test fixtures.
- Apply 0015 only after reviewed test results and explicit release scope. No production change from this branch.
