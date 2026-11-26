# Phase 4 — Stabilization / release gate

Base: b968a9a (Phase 3); preview branch only. Do not merge or promote until owner sign-off.

## Read-only preflight (25 Nov 2026)
- Talentfolio database has nine recorded migrations; public portfolio table exists, but no portfolio RPCs are installed.
- A published row exists for the sample slug kaihara; preview HTTP lookup returned 404 before this patch.
- Migration 0010 (security hardening) and 0011 (publishing controls) are in source, not installed in the inspected database.
- Six existing-data checks returned zero conflicts: reserved slugs, oversized snapshots, profile field limits, project field limits, duplicate skill groups, duplicate project covers.
- No Supabase development branches exist. Vercel environment variable targets include production, preview and development. Separate preview DB binding is not confirmed.

## Patch
Invalid slugs and successful empty RPC results use notFound; RPC errors or unexpected response shape throw a generic error and emit only a minimal diagnostic. No direct table fallback; do not bypass the publication security model. Static source regression test runs with existing prebuild checks.

## Required staging acceptance
1. Provision an isolated Supabase test environment (check plan/cost; obtain approval before provisioning); configure preview-only Supabase URL and anon key without exposing secrets.
2. Reproduce base schema 0001–0009, then apply 0010_phase1_security.sql and 0011_phase2_publishing_controls.sql in order. Review SECURITY DEFINER functions, grants, RLS, and old snapshots before release.
3. Use synthetic users A/B. Verify published slug succeeds; absent/unpublished slug 404; failed backend distinguishable from missing slug; anon cannot bulk-list publications or read private certificates; cross-user writes denied; owner publish v2, privacy flags, quota and gallery cover behavior pass.
4. Validate browser accessibility, all templates, login/reset, resume print, PDF/Word and Gemini on staging. Verify noindex semantics and production canonical policy.
5. Review actual build/test results and record evidence. Do not deploy production or alter production DB until approved.

Preflight is not a migration dry run; no database schema or data was changed. The error handling patch does not install missing RPCs.
