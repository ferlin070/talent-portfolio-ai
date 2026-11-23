# Talentfolio AI

A premium digital portfolio workspace for students and employees. Inspired by the supplied five-screen HTML design, now connected to a dedicated Supabase Free project.

**Live demo:** https://talent-portfolio-ai.vercel.app

## Implemented modules
- Public SaaS landing page
- User registration, login and reset password UI with Supabase Auth
- Personal dashboard with real account statistics
- Profile editing for students and workers
- Projects with opt-in public showcase
- Private certificate vault with file upload, signed URL access and deletion
- Skills self-assessment and **rule-based** career gap guidance
- Portfolio builder with Modern / Minimal / Tech themes and public publish/unpublish

## Tech stack
Next.js App Router, React, TypeScript, Tailwind CSS, Lucide, Supabase Auth/PostgreSQL/Storage, Vercel.

## Setup
```bash
npm install
cp .env.example .env.local
npm run dev
```
Configure:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
```
**Never commit service_role keys or .env.local.** On fresh Supabase installations, apply migrations from `supabase/migrations` in chronological order.

Configure Supabase Auth Site URL and Redirect URLs for the deployed domain, and email SMTP for a public launch.

## Deployment and limitations
See [production readiness checklist](docs/PRODUCTION_CHECKLIST.md).

The current Vercel team is on a Hobby plan: its terms limit usage to non-commercial projects. Upgrade or choose commercially permitted hosting **before commercial launch**.

Current Skills Analysis is based on user self-assessment and illustrative role targets; it is **not** a generative AI evaluation or third-party credential verification. Production authentication and multi-user security still need real-user end-to-end testing.

## Privacy
User data and certificate files are private via RLS. Public portfolios are generated from explicitly selected fields in a separate publication snapshot. Only verified issuers may mark uploaded credentials verified (issuer verification is not implemented).

## Development
See [workflow](docs/WORKFLOW.md) and [production checklist](docs/PRODUCTION_CHECKLIST.md).
