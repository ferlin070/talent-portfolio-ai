# Phase 6A.3 — Institution invitations (full UI candidate)

Production migration checkpoint: 0012, 0013 and 0014 applied on 26 November 2026 following successful CI #56, #58 and #64. Production record counts unchanged; all six new tables RLS-enabled; no additional security advisor findings. This is a schema-only release, not a production frontend deployment. Existing Phase 5 and 6A release PRs remain separate.

## Implemented on this branch
- Migration 0015: non-exposed private schema and invitation metadata, only SHA-256 token digest at rest. Two UUIDv4 values yield 244 bits of random entropy. Raw token returned once to the authorized issuing admin.
- Verified-email user identity, active tenant/admin membership; only student and lecturer roles; seven-day expiry, revocation, single redemption, existing memberships never overwritten.
- Tenant, issuer membership and invite row locking; serialized issue quota (30 per hour and 100 pending per institution). Recipient email locked on redemption.
- Five intentionally authenticated-only, narrowly scoped SECURITY DEFINER RPCs with fixed search path. No direct client access to invitation metadata.
- SQL regression tests on disposable native PostgreSQL and Supabase. Tests cover cross-tenant issuance, private schema/RPC grants, wrong email, unconfirmed email, revocation, replay, no admin invitation or role replacement.

- Recipient-only preview RPC returns institution name, role and expiry without joining. Admin-only history RPC returns at most 100 recent records, status and recipient email, never token or digest. Both use verified identity and active membership/tenant checks; accept revalidates independently.
- Authenticated Institution Workspace now includes admin issue/copy-once/history/confirm-revoke and recipient preview/confirm/join. Tokens live in component memory; no URL, localStorage, or automatic email delivery. No external providers or paid resources.
- Added SQL assertions for preview/history, expiry, suspended issuer and tenant, and hourly issue limit. Added real local browser test for issue/preview/join and two independent Auth sessions racing on the same token; one must succeed, one must fail. These additions await CI.

## Before production
- Verify latest full CI for the exact candidate. Review five SECURITY DEFINER RPCs, current advisor findings and institutional retention obligations; pending-invite quota and actual manual UI verification remain follow-up checks.
- Production frontend is still Phase 4; release tested Phase 5/6 separately before invitation activation. No real tenant or admin created. Do not include untested changes. No automatic email delivery or paid resources.
- First institution/admin provisioning remains a separately authorized trusted operation. Do not create real institution memberships from test fixtures.
- Apply 0015 only after reviewed test results and explicit release scope. No production change from this branch.
