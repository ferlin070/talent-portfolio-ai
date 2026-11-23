# Talentfolio AI — Production Readiness Checklist

## Current deployment
- [x] Next.js premium responsive marketing website
- [x] Auth UI: email sign-up, sign-in, password reset
- [x] Student/worker profile CRUD
- [x] Project CRUD with selectable public visibility
- [x] Private certificate bucket (5 MB, PDF/PNG/JPG) and upload/download/delete UI
- [x] Skills self-assessment and rule-based career gap visualization
- [x] Public portfolio snapshots, three themes, publish/unpublish
- [x] Supabase owner-level RLS and snapshot-specific anonymous read
- [x] Vercel env variables configured without server secrets
- [x] Production build passing on Vercel

## External configuration / manual verification before genuine public launch
- [ ] Supabase Authentication > URL Configuration: set Site URL to `https://talent-portfolio-ai.vercel.app`; add `https://talent-portfolio-ai.vercel.app/**` to allowed Redirect URLs.
- [ ] Set up production custom SMTP and check email confirmations / password reset links. Default email sending is limited.
- [ ] Test signup → email confirmation → login → profile save, then password reset with a real consenting test account.
- [ ] Test file upload/download/delete with real PDF/JPG/PNG; reject >5 MB and unsupported files.
- [ ] Verify cross-user RLS access is denied for profiles, certificates, projects and private Storage.
- [ ] Verify published portfolio shows ONLY the snapshot and unpublish revokes access.
- [ ] Configure bot protection (CAPTCHA), rate limiting and sensible abuse quotas.
- [ ] Review privacy notice, terms, consent, user data export/deletion, backups and retention.
- [ ] Run responsive and accessibility tests on multiple browsers/devices, plus end-to-end regression.
- [ ] Use Vercel plan that permits commercial activity before any paid/commercial launch. Hobby is non-commercial.
- [ ] Test scaling against Supabase Free storage, database and bandwidth limits; establish backups/restore plan.
- [ ] Implement issuer verification before showing any “Verified” certificate status.
- [ ] AI model integration and evidence-backed scoring remain a separate future feature; current scores are SELF-ASSESSMENT, not AI certification.

## Supported routes
- `/`: public marketing
- `/auth`: email authentication
- `/dashboard`: account overview
- `/profile`: profile editor
- `/projects`: projects
- `/certificates`: private certificate vault
- `/skills`: self-assessed skills / career gap demo
- `/portfolio`: preview + publishing
- `/u/[slug]`: public portfolio (published snapshots only)

## Security decisions
- Never store or publish service_role or secret API keys.
- Certificate verification status cannot be assigned by certificate upload users.
- Profile records are private; public pages use a separate curated snapshot.
- Private Storage policies scope paths by first folder = auth user id.
- Avoid using `user_metadata` for authorization.
