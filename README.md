# Talent Portfolio AI

Premium SaaS starter for student and employee portfolios, certificate evidence, career growth and skills development. No company branding.

> **Current stage:** Functional UI preview only. Auth, certificate uploads, portfolio publishing and real AI assessments are not implemented yet.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Supabase Auth, PostgreSQL, Storage (database migration prepared, integration pending)
- Vercel deployment (respect plan terms: Hobby is non-commercial)

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Supabase setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`; fill the public Supabase URL and anon key only.
3. Apply `supabase/migrations/0001_initial.sql` with the Supabase SQL editor.
4. Implement authenticated CRUD and private Storage policies before enabling user data.

**Never commit secrets or service_role keys.**

## Current demo pages

- `/` — Marketing landing page
- `/dashboard` — User overview
- `/portfolio` — Portfolio preview
- `/certificates` — Certificate Vault preview
- `/skills` — Skills Analysis preview

## Roadmap

1. Supabase authentication, onboarding, editable personal profile.
2. Project CRUD and encrypted-in-transit private certificate storage.
3. Portfolio templates, visibility controls, CV PDF export.
4. Evidence-based career gap analysis, growth plan and QA.

See [workflow documentation](docs/WORKFLOW.md).

## Privacy and verification

Data is private by default with owner-scoped RLS policies. A public portfolio must use deliberately disclosed profile fields. Certificate files need private buckets and authorized, short-lived downloads. User-uploaded evidence must not be labeled verified until issuer confirmation.
