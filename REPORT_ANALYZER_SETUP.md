# Report Analyzer and Vercel API — Setup & Configuration

The Report Analyzer sends the real contents of an uploaded medical report to a
secure server-side function (`analyze-report`), which calls OpenRouter with a
server-only API key. The key is never present in frontend code, the browser
bundle, or any `VITE_` variable.

## Architecture

- **Frontend:** `src/pages/ReportAnalyzerPage.tsx` (existing page, preserved design).
- **Extraction:** `src/lib/reportExtraction.ts` — PDF text via PDF.js, scanned
  PDF pages rendered to images, image resizing, DOCX via mammoth, TXT/CSV as text.
- **Lovable Cloud backend:** `supabase/functions/analyze-report/index.ts` — authenticates the
  signed-in user, validates the payload, applies a per-user hourly rate limit, calls OpenRouter,
  and validates the response.
- **Vercel backend:** `api/analyze-report.ts` — provides the same analysis through
  `/api/analyze-report`, reading `OPENROUTER_API_KEY` only on the server. It uses the user's
  authenticated session and the configured public database key; it does not need a service-role key.
- **Messaging API:** `api/messages.ts` — `GET /api/messages` reads the signed-in account's
  messages, while `POST /api/messages` sends a private message. It accepts Basic authentication
  (email and password) or a Bearer access token and calls the existing protected database functions.
- **AI provider:** OpenRouter (`https://openrouter.ai/api/v1/chat/completions`).
- **Default model:** `deepseek/deepseek-v4.1-flash` (override with `OPENROUTER_MODEL`).

## Required configuration

Configure server-side variables in Lovable Cloud secrets or Vercel's project environment settings,
depending on where the endpoint runs:

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | Yes | Your OpenRouter key, from https://openrouter.ai/keys |
| `OPENROUTER_MODEL` | No | Defaults to `deepseek/deepseek-v4.1-flash` |
| `OPENROUTER_HTTP_REFERER` | No | Your deployed site URL, for OpenRouter attribution |
| `OPENROUTER_APP_NAME` | No | Defaults to `Health Connect Report Analyzer` |
| `ALLOWED_ORIGINS` | No | Lovable Cloud function CORS setting. |
| `VERCEL_ALLOWED_ORIGINS` | No | Optional comma-separated external website origins allowed to call the Vercel API. Same-origin calls are allowed by default. |
| `VITE_SUPABASE_URL` | Yes for Vercel | Public Lovable Cloud project URL used by the app and the authenticated API client. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes for Vercel | Public publishable key used by the app and API; never use a service-role key here. |
| `VITE_REPORT_ANALYSIS_API` | No | Set to `vercel` to force `/api/analyze-report`; set to `cloud` to force the Lovable Cloud function. If blank, `*.vercel.app` uses Vercel and other domains use Lovable Cloud. |

If `OPENROUTER_API_KEY` is missing, the function returns a clear
"service not configured" error — it never falls back to fake results.

## How the frontend reaches the backend

The page uses the Lovable Cloud function in the Lovable preview. On Vercel it sends the report
to `/api/analyze-report` and includes the signed-in user's short-lived access token. The Vercel
handler verifies that token before processing the report. Set `VITE_REPORT_ANALYSIS_API=vercel`
when using a custom Vercel domain so the page chooses the Vercel endpoint there too.

## Vercel messaging REST API

Both endpoints use the same authenticated account and row protections as the app. No service-role
key is required or accepted.

- `GET /api/messages` returns the signed-in account's inbox and sent messages. It returns the rows
  supplied by the existing private-message function (up to its current 200-message limit).
- `POST /api/messages` accepts JSON with `recipient_id` (account UUID) and `body` (1–4000
  characters); the sender is always taken from the authenticated session.
- Authentication: `Authorization: Basic <base64(email:password)>` or
  `Authorization: Bearer <access-token>`. Basic authentication sends the password for each
  request, so use HTTPS only and never call it from browser code; prefer Bearer tokens for
  integrations. The API does not return or store the sign-in token.

Example requests (replace the placeholders locally; do not paste credentials into shared logs):

```sh
curl -u you@example.com https://YOUR_DOMAIN/api/messages

curl -u you@example.com \
  -H 'Content-Type: application/json' \
  -d '{"recipient_id":"RECIPIENT_ACCOUNT_UUID","body":"Hello"}' \
  https://YOUR_DOMAIN/api/messages
```

## Local development

1. Get an OpenRouter key at https://openrouter.ai/keys.
2. For Lovable preview, store it as `OPENROUTER_API_KEY` in Lovable Cloud secrets.
3. For Vercel, set `OPENROUTER_API_KEY`, `VITE_SUPABASE_URL`, and
   `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel's environment settings. Set
   `VITE_REPORT_ANALYSIS_API=vercel` if the site uses a custom domain.
4. For local Vercel testing, copy `.env.example` to `.env.local`, fill in the required values,
   set `VITE_REPORT_ANALYSIS_API=vercel`, then run `npx vercel dev`. `.env.local` is ignored by
   Git; do not put the real OpenRouter key in `.env.example`, a `VITE_` variable, or frontend source.
5. Upload a synthetic or anonymized report and confirm the returned analysis reflects its contents.

## Verifying key safety

- The OpenRouter key is read only inside server-side functions (`Deno.env` on Lovable Cloud and
  `process.env` on Vercel); it must never be configured with a `VITE_` prefix.
- On Vercel, the browser calls `/api/analyze-report`; OpenRouter is called server-to-server.

## Limits & safety behavior

- Files up to 10 MB; up to 8 PDF pages (4 rendered page images for scanned
  PDFs); total request payload ~3.5 MB. Oversized reports are rejected with a
  clear message asking the user to split the document.
- 10 analyses per user per hour (best-effort, per serverless instance).
- Reports are not stored in the database or logged; content lives only for the
  duration of the request.
- Vercel's in-memory rate limiter is best-effort and may reset between serverless instances.
- Basic-auth API calls must use HTTPS. Bearer tokens are preferred for clients that can securely
  obtain and manage a signed-in session.

## Before production

1. Set `VERCEL_ALLOWED_ORIGINS` if external origins must call the Vercel endpoints; same-origin
   requests are allowed by default.
2. Set `OPENROUTER_HTTP_REFERER` to your deployed site URL.
3. If you need image-based analysis (scanned PDFs, photos of reports), confirm
   the configured model supports image input; otherwise the function returns a
   provider error instead of guessing.
4. For durable, cross-instance rate limiting, add a database-backed rate limit
   (the current limiter is per-instance).
