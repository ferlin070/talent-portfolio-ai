# Talentfolio AI — Fasa 2: Penerbitan & UX (serahan semakan)

**Branch:** `feature/phase2-publishing-ux`
**Berasaskan:** `security/phase1-hardening`
**Production:** JANGAN deploy atau jalankan SQL 0011 pada ghgroup production sebelum Fasa 1 diuji dengan selamat.
**Migrasi baharu:** `supabase/migrations/0011_phase2_publishing_controls.sql`. Migrasi 0001–0010 tidak diedit.

## 1. Fitur yang dibina

1. **Pilihan seksyen awam:** kemahiran, pendidikan, pengalaman kerja, projek/galeri, lokasi dan website. Nama, headline, bio dan foto profil sentiasa awam selepas diterbitkan; e-mel dan fail sijil kekal peribadi.
2. **Publish berpelayan:** API `/api/portfolio/publish` mengesahkan bearer token dengan Supabase Auth dan memanggil `publish_portfolio_v2` (SQL), bukannya menerima snapshot browser. API menghapus cache ISR untuk slug lama dan baharu selepas menukar slug.
3. **Kitaran penerbitan:** pratonton, dialog pengesahan dengan URL penuh dan senarai seksyen, proses publish, tanda perubahan belum diterbitkan dan nyahterbit dengan dialog. Fingerprint perubahan hanyalah indikator UI, bukan bukti kriptografi.
4. **Tuntutan pengguna:** "terbuka untuk peluang kerjaya" ialah pilihan eksplisit pengguna. Fallback lokasi "Malaysia", andaian "Available for collaboration" dan kiraan palsu ("infinity") dibuang daripada templat.
5. **Pratonton tema:** Classic (modern, minimal, tech) menggunakan komponen `public-portfolio-classic.tsx` sama seperti laman awam. Enam templat lain menggunakan komponen tema asal yang dikongsi, bukan screenshot palsu. Projek tidak lagi dihadkan kepada tiga atau enam dalam pratonton.
6. **SEO terkawal:** `generateMetadata` dengan tajuk, description, canonical, Open Graph, Twitter card, imej sosial dinamik, `robots.ts`, `sitemap.ts`, dan `noindex` pilihan. Sitemap menyenaraikan hanya portfolio diterbitkan dan `noindex=false`, menggunakan service key SERVER-ONLY. Jika service key tiada, homepage sahaja disertakan.
7. **Pendidikan dan pekerjaan:** tambah fungsi Edit, perubahan optimistik, mesej ralat yang jelas, dialog padam dan "Buat Asal" 6 saat.
8. **Dialog:** ganti kebanyakan `confirm()` sistem pada pengurusan projek, sijil, galeri, foto, kemahiran dan Gemini vault dengan dialog berlabel, Escape, pengurusan fokus dan focus trap. Kemahiran dan projek tanpa galeri mempunyai "Buat Asal" 6 saat. Projek bergaleri tidak boleh dipulihkan sewenang-wenangnya kerana fail fizikal dipadam.
9. **Analisis kemahiran:** padanan frasa dengan sempadan perkataan, bukan `includes` secara dua hala. Contoh "C" dan "R" tidak boleh memadankan kategori panjang. Target jawatan dipindahkan ke `data/career-targets.json` dengan enam pilihan ilustratif.
10. **Navigasi & Gemini:** buang entri Career Roadmap berganda, buang "LIVE DATA", CTA pengunjung menuju seksyen features, tambah foto/pendidikan/kerja pada pengiraan profil, dan letakkan multi-key + vault Gemini dalam "Pilihan lanjutan".

## 2. Persediaan penerbitan yang selamat

1. Gunakan projek Supabase **staging** atau clone (bukan database ghgroup production) yang mempunyai migrasi 0010.
2. Jalankan migrasi 0011 **selepas** 0010. Periksa fungsi `publish_portfolio_v2` dan `get_published_portfolio_seo` serta kolum `sections`, `noindex`, `open_to_opportunities`.
3. Pastikan `SUPABASE_SERVICE_ROLE_KEY` hanya server-side (sitemap dan padam akaun); jangan tambahkan `NEXT_PUBLIC_` kepada key tersebut.
4. Konfigurasi Authentication Site URL, redirect `/auth/callback`, confirmation e-mel dan SMTP sebagaimana Fasa 1.
5. Set environment Preview Vercel kepada Supabase staging. Tidak memadai menggunakan preview branch sambil pointing kepada database production yang belum bermigrasi.
6. Semak build dan jalankan `npm run test:phase2` dan `npm run build`.
7. Uji aplikasi menggunakan dua akaun test berasingan. Jangan jalankan pemadaman akaun pengguna sebenar.

## 3. Ujian penerimaan manual Fasa 2

- [ ] Pengguna A boleh mengubah pilihan seksyen, melihat draf yang sesuai, dan menerbitkan. Pengguna awam hanya melihat seksyen yang dipilih.
- [ ] Tanpa pilihan lokasi, tiada teks "Malaysia" yang dicipta secara automatik. Tanpa persetujuan peluang kerjaya, tiada "Open to opportunities" atau "Available for collaboration".
- [ ] Dialog menunjukkan URL penuh dan senarai seksyen sebelum Publish. Escape menutup; Tab terperangkap dalam dialog; fokus dipulangkan selepas tutup.
- [ ] Selepas edit profil atau projek, indikator "Ada perubahan belum diterbitkan" muncul. Selepas Publish semula, indikator hilang; selepas Unpublish, URL returns 404.
- [ ] Semasa slug ditukar, cache bagi URL lama juga dibatalkan, dan URL lama tidak terus memaparkan kandungan pengguna.
- [ ] Kesemua 9 tema sama dalam pratonton dan paparan awam pada desktop serta telefon. Galeri projek lengkap tanpa slice(0,3) atau slice(0,6).
- [ ] `noindex=true` -> metadata robots noindex dan slug tidak berada dalam sitemap. `noindex=false` -> metadata indexable; sitemap memerlukan key server-side dikonfigurasi.
- [ ] Pautan LinkedIn/WhatsApp hanya dipaparkan jika pengguna benar-benar menambahnya. Jangan cipta dakwaan yang tidak dibuktikan.
- [ ] Edit kelayakan/pekerjaan memuatkan data lama, menyimpan perubahan dan memaparkan ralat validasi. Revert optimistic update jika RLS/DB reject.
- [ ] Padam kemahiran, batalkan melalui Undo dalam 6 saat. Padam projek tanpa galeri, boleh Undo. Padam projek bergaleri perlu jelas bahawa fail tidak boleh dibatalkan selepas dipadam.
- [ ] Jawatan sasaran boleh dipilih daripada JSON; penilaian kemahiran masih penilaian kendiri. Kemahiran "C" tidak memadankan "Cloud Computing", dan "R" tidak memadankan "React".
- [ ] Gemini memaparkan hanya satu key secara lalai; vault/multi-key di bawah Advanced; key sebenar tidak dilog atau dieksport.
- [ ] Uji Keyboard, screen reader, dark mode dan breakpoints utama.

## 4. Ujian automatik

```bash
npm run test:phase2
npm run build
```

Enam unit tests:
- padanan frasa kemahiran pendek
- padanan alias sempadan perkataan
- semakan slug & reserved words
- default privacy toggle
- snapshot tanpa seksyen tersembunyi
- fingerprint konsisten merentas susunan keys

Ujian ini tidak menggantikan integration testing RLS, login, rollback database atau Playwright.

## 5. Rollback dan risiko

- **Kod:** deploy semula commit terakhir dari `security/phase1-hardening`, bukan commit feature Fasa 2.
- **SQL:** sebelum rollback, backup. Hapus `get_published_portfolio_seo` dan `publish_portfolio_v2`, pulihkan `tf_publication_guard` kepada versi 0010, kemudian pertimbangkan buang kolum tambahan. Ini tidak boleh dibalikkan secara automatik jika data `noindex` dan availability sudah digunakan; simpan data dahulu.
- **Privacy:** noindex tidak bermaksud pautan private; sesiapa yang mendapat URL masih boleh melihat portfolio terbit.
- **Cache:** ISR 300 saat hanya fallback; gunakan endpoint Publish untuk membatalkan halaman segera.
- **Service key:** sitemap memerlukan `SUPABASE_SERVICE_ROLE_KEY` server-only. Jangan expose dalam client bundle.
- **Draft hash:** fingerprint 32-bit ialah indikator visual, bukan penanda keselamatan.
- **Pendidikan/kerja Undo:** pemulihan selepas delete bergantung kepada keizinan INSERT RLS sedia ada.
- **Belum selesai:** staging database belum bermigrasi. Fasa 2 belum boleh dianggap disahkan end-to-end sehingga ujian staging lengkap.

Jangan teruskan ke Fasa 3 sehingga pemilik projek mengesahkan Fasa 2.
