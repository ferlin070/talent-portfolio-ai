# Talentfolio AI — Fasa 1 Keselamatan (branch security/phase1-hardening)

> **Status:** Kod dan migrasi disediakan pada branch keselamatan. Migrasi **BELUM** digunakan pada production. Tiada service-role key dimasukkan ke GitHub. Jangan gabung ke main sebelum semakan RLS dan ujian staging selesai.

## Perkara yang sudah diaudit

- Stack: Next.js 15 App Router, React 19, Supabase Auth/Postgres/Storage, Vercel.
- Jadual `portfolio_publications` mempunyai polisi `anon SELECT USING (published=true)`, yang membenarkan enumerasi semua portfolio terbit.
- Butang Publish lama membentuk snapshot di browser, kemudian menulis terus ke `portfolio_publications`.
- Project gallery menggunakan dua UPDATE berasingan untuk menetapkan cover.
- Endpoint Gemini tidak mempunyai kuota server-side, dan bergantung pada `content-length` yang boleh dipalsukan.
- Browser session sebelumnya bergantung pada default localStorage Supabase client; laluan dashboard tidak dilindungi middleware berasaskan cookie.
- Rekod sebenar tidak mempunyai skill berganda (case-insensitive), saiz snapshot terbesar 4,570 bait, dan teks profil/projek sedia ada berada dalam had baru; migration boleh disemak tanpa memadam kandungan.
- RLS sedia ada untuk data pemilik dan bucket Certificate Vault kekal.

## Persiapan manual wajib sebelum merge

1. Buka Supabase project `qdehpujevmstqueysoss` dalam akaun ghgroup. Guna projek staging/backup untuk ujian sebelum membuat perubahan database sebenar. Simpan SQL rollback dan backup skema. Migrasi baru: `supabase/migrations/0010_phase1_security.sql`.
2. Setelah menerima kelulusan, gunakan Supabase CLI atau Dashboard SQL Editor untuk migrasi 0010 dalam transaksi. **Jangan** jalankan 0001–0009 semula.
3. Setelah migrasi tersedia, pastikan RPC `get_published_portfolio`, `publish_portfolio`, `set_project_cover`, `consume_api_quota` wujud. `anon` tidak boleh `SELECT` jadual `portfolio_publications` terus.
4. Supabase **Authentication → Providers/Email**: aktifkan e-mel confirmation, semak Site URL `https://talent-portfolio-ai.vercel.app`, tambah redirect `/auth/callback` dan `/auth?mode=recovery`, tetapkan SMTP untuk production. Aktifkan leaked password protection jika tersedia dalam pelan. Aktifkan CAPTCHA jika sesuai. Semak tetapan email template (PKCE).
5. Vercel Settings → Environment Variables: tambah `SUPABASE_SERVICE_ROLE_KEY` **server-only**, tidak memakai prefix `NEXT_PUBLIC_`. Hadkan kepada environment yang perlu sahaja. Pengurus deployment hendaklah memeriksa kebocoran secret dalam logs dan bundle selepas build.
6. Supabase Edge Function secrets: simpan `CLEANUP_JOB_SECRET` (token rawak panjang), `SUPABASE_SERVICE_ROLE_KEY` (dikendalikan oleh Supabase). Deploy `cleanup-orphaned-objects` dengan pengesahan JWT dimatikan **hanya kerana** endpoint memeriksa secret Bearer sendiri, lalu jadualkan panggilan POST melalui Supabase Cron berautentikasi. Jangan gunakan secret itu dalam URL atau commit. Jika Cron tidak tersedia, proses queue secara manual atau tambah penjadual luaran yang selamat.
7. Jika integrasi menggunakan Google AI Studio, semak bahawa model `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.8-flash` benar-benar tersedia bagi API key pengguna. Model endpoint boleh berbeza menurut project/billing; jangan andaikan semua key mempunyai akses.
8. Jalankan build, lint, ujian multi-user dan regression dalam deployment preview. **Deploy production hanya selepas ujian keselamatan lulus.**

## SQL QA — read-only selepas migrasi (jalankan di staging)

```sql
select schemaname,tablename,policyname,cmd,roles,qual
  from pg_policies where tablename='portfolio_publications';

select routine_name, security_type from information_schema.routines
 where routine_schema='public'
   and routine_name in ('get_published_portfolio','publish_portfolio',
                         'set_project_cover','consume_api_quota');

select conname, pg_get_constraintdef(oid) from pg_constraint
 where conrelid in ('public.profiles'::regclass,'public.projects'::regclass,
                    'public.portfolio_publications'::regclass);

select tablename, rowsecurity from pg_tables
 where schemaname='public' and tablename in ('api_usage','storage_cleanup_jobs');

select bucket_id, count(*) from storage.objects
 where bucket_id in ('project-gallery','certificates','profile-photos')
 group by bucket_id;
```

## Manual acceptance tests — security

1. Anonymous Data API `GET /rest/v1/portfolio_publications?select=*` returns denied/empty, even if published data exists.
2. Anonymous RPC `get_published_portfolio("a-published-slug")` returns exactly one published record with slug/template/snapshot and no private email/certificate paths. Missing/unpublished slug returns no rows.
3. User A can update only A's profile and call `publish_portfolio`; cannot inspect User B's `skills`, `certificates`, `projects`, `project_images` or publication. Include Storage signed URLs & direct access tests.
4. Direct REST write with arbitrary `snapshot` never persists caller-supplied data when published; trigger always reconstructs from owner's records.
5. Reserved, duplicate, too short, too long and invalid-character slugs are rejected. Test collision across two accounts and confirm a clear user-friendly message.
6. Attempt 13th gallery image; expect database rejection. Attempt 31st certificate; reject. Test concurrent uploads against the quotas. Profile storage rejects a 6th file; normal avatar replacement (upload then remove old) still works.
7. `set_project_cover` with an image belonging to another account fails. Concurrent requests leave exactly one cover.
8. Delete project and certificate, verify cleanup job queue; run protected cleanup worker once and confirm metadata/file deletion. Unauthorized function call must return 401.
9. Gemini with unconfirmed email returns 403; 6th analysis/hour and 11th connection test/hour return 429 plus `Retry-After`; oversized body, even without Content-Length, returns 413.
10. Gemini vault v1 decrypts using 250000 PBKDF2 and re-saves as v2 (600000). Wrong passphrase fails safely; no raw key is stored.
11. Test SSR login, email confirmation, password recovery, protected direct links and session expiry. Authenticated visitor redirected from login page.
12. Export JSON and delete account with typed matching email. Validate stored files removed first, user records cascaded, no service-role key in browser bundle.
13. Inspect CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy and Permissions-Policy in response headers.
14. Regression: nine portfolio themes, gallery image URLs, certificate private storage, Resume Studio and Gemini report export.

## Known limitations / caveats

- Migrasi tidak boleh dianggap lulus sehingga diuji di database staging. Database production hanya satu projek aktif yang disahkan semasa audit.
- Menggugurkan polisi anon sebelum versi RPC client dideploy boleh menyebabkan portfolio awam sementara tidak boleh dibuka. Jalankan cutover dalam maintenance window.
- User interface Fasa 2–4 (publishing controls, CSS overhaul, Vitest/Playwright, komponen modular) belum dibuat dan jangan dicampur dalam migrasi keselamatan.
- CSP `script-src 'unsafe-inline'` digunakan kerana Next.js 15 mengeluarkan bootstrap scripts inline. Ini masih lebih lemah daripada CSP nonce ketat; pertimbangkan nonce-based rendering selepas ujian pengaruh prestasi.
- URL gambar galeri snapshot kini relative dan ditukarkan kepada URL storage Supabase yang dipercayai dalam `/u/[slug]`.
- Edge cleanup queue memerlukan function, secret dan jadual Cron disediakan secara manual sebelum pembersihan berkala berjalan.
- Fungsi hapus akaun mungkin mengambil masa jika pengguna mempunyai ribuan fail; pemadaman berkelompok dan opsyen job asinkron adalah penambahbaikan seterusnya.
- Projek asal belum memiliki lockfile npm yang disahkan. Sebelum merge, hasilkan `package-lock.json` daripada versi dependency yang dipin dan commit. Jangan menganggap Vercel build menggantikan ujian local npm ci.

## Rollback

Migrasi 0010 mengandungi arahan rollback dalam komen. Elakkan kembali kepada polisi anon SELECT melainkan benar-benar kecemasan, kerana ia membuka semula risiko enumerasi. Untuk rollback aplikasi, kembalikan deployment preview sebelumnya dan pulihkan database kepada backup staging (jangan bergantung pada rollback kod semata-mata selepas skema berubah).

## Keutamaan keselamatan selepas kelulusan Fasa 1

Fasa 2 adalah penerbitan & UX, Fasa 3 UI/prestasi, Fasa 4 refactor/ujian/CI. Jangan mulakan sebelum pemilik projek meluluskan hasil Fasa 1.
