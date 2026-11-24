# Talentfolio AI — Gemini BYOK & Prompt Generator Pro

## Prompt Generator Pro
- Five content areas: **Work Experience**, **Education**, **Skills**, **Project Showcase**, **Professional Profile**.
- Five target formats: Portfolio Website, ATS Resume, LinkedIn, Interview, Application/Internship.
- Language: Bahasa Melayu Malaysia, English, or both versions.
- Tone: Professional, Corporate, Technical/Evidence-based, Friendly Professional, Concise.
- Length: Concise, Medium, Detailed.
- Structured fact collection: item title, organization, time period, target, responsibilities, technology, impact/results, proof, raw notes, and prohibited claims.
- Direct copy of a detailed, evidence-first prompt for use in external AI; no automated API call or local storage for raw notes.
- The prompt warns against inventing certificates, employers, results, and unverified metrics.

## Gemini Skills Intelligence (user-provided API keys)
- Each signed-in user can enter **1–5 Gemini API keys manually**.
- Keys exist only in in-memory React state in the current open page; they are cleared when the page reloads or component unmounts. They are **not** persisted to database, localStorage, cookies, GitHub or Vercel environment variables.
- Keys are sent over HTTPS to `POST /api/skills/analyze`, an authenticated server-only Next.js endpoint. They must not appear in query strings, responses, error messages or logs.
- The API validates Supabase access token and uses the caller's JWT to read only their own RLS-scoped skill, project, educational, work and certificate summary.
- Explicit user consent before transmitting profile data to Google Gemini.
- Model choices: `gemini-3.8-flash` and `gemini-3.5-flash-lite`. The allowlist is fixed server-side to prevent use of arbitrary models.
- Sequential fallback to the next supplied key when a key is rate-limited, temporarily unavailable or invalid. Maximum **5 calls** per user click. No keys are returned to browser by the API.
- Response shows the key slot and safe generic error statuses, not key values.
- Multiple keys **do not guarantee extra quota**: according to Google, limits apply per Google Cloud project, not per key.
- Includes copy-only analysis prompt fallback when a user does not have a Gemini key.

## To test
1. Login and navigate to /skills.
2. Input your Gemini key(s) manually. Do not share them in screenshots or support messages.
3. Choose Gemini 3.8 Flash or 3.5 Flash-Lite, consent, and generate an analysis.
4. Test with an invalid key followed by a valid key: it should skip the invalid key, and return a result from the next key if permitted.
5. Refresh page: keys must disappear.
6. Test multiple users; verify isolation through Supabase RLS.
7. Confirm response never includes a raw key; confirm server logs do not log request bodies.
8. Test a rate-limited key and a separate-project key, respecting all providers' quotas and terms.
9. Prompt Generator Pro: test all five categories, all output formats and languages, clipboard, long text and mobile screen.

## Security and product caveats
- This is **bring-your-own-key**. Browser users can inspect requests from their own browser; do not share your device/browser session with untrusted users. Never paste API keys into chat or upload them to screenshots.
- The app is acting as an API proxy and **does not independently validate ownership of a provided key**. Charges and quotas belong to the owning Google Cloud project; be transparent about that risk.
- Do not circumvent provider quotas or service terms by adding keys. Rate-limits are project-based.
- No persistent vault or per-user encrypted key storage exists yet. Adding encrypted persistence, account-level spending controls and tamper-proof rate limits would be a separate production feature.
- There is no test key stored in the repo, so the live provider call requires a user with an actual Gemini API key.

## Source documentation
- Google API keys: https://ai.google.dev/gemini-api/docs/api-key
- GenerateContent: https://ai.google.dev/api/generate-content
- Rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Google AI Studio API key: https://aistudio.google.com/apikey
