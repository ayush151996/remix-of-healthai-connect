# Report Analyzer — Setup & Configuration

The Report Analyzer sends the real contents of an uploaded medical report to a
secure server-side function (`analyze-report`), which calls OpenRouter with a
server-only API key. The key is never present in frontend code, the browser
bundle, or any `VITE_` variable.

## Architecture

- **Frontend:** `src/pages/ReportAnalyzerPage.tsx` (existing page, preserved design).
- **Extraction:** `src/lib/reportExtraction.ts` — PDF text via PDF.js, scanned
  PDF pages rendered to images, image resizing, DOCX via mammoth, TXT/CSV as text.
- **Backend:** `supabase/functions/analyze-report/index.ts` — a Lovable Cloud
  serverless function (the brief's Vercel function adapted to this project's
  hosting). It authenticates the signed-in user, validates the payload, applies
  a per-user hourly rate limit, calls OpenRouter, and validates the response.
- **AI provider:** OpenRouter (`https://openrouter.ai/api/v1/chat/completions`).
- **Default model:** `deepseek/deepseek-v4.1-flash` (override with `OPENROUTER_MODEL`).

## Required configuration

Set these in **Project Settings → Secrets** (server-side only):

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | Yes | Your OpenRouter key, from https://openrouter.ai/keys |
| `OPENROUTER_MODEL` | No | Defaults to `deepseek/deepseek-v4.1-flash` |
| `OPENROUTER_HTTP_REFERER` | No | Your deployed site URL, for OpenRouter attribution |
| `OPENROUTER_APP_NAME` | No | Defaults to `Health Connect Report Analyzer` |
| `ALLOWED_ORIGINS` | No | Comma-separated frontend origins for CORS. Empty = development mode (any origin). Set this before production. |

If `OPENROUTER_API_KEY` is missing, the function returns a clear
"service not configured" error — it never falls back to fake results.

## How the frontend reaches the backend

The page calls the function through the project's backend client
(`supabase.functions.invoke("analyze-report", ...)`), which automatically
attaches the signed-in user's session token. No API base URL configuration is
needed while the frontend and backend are hosted together on Lovable.

## Local development

1. Get an OpenRouter key at https://openrouter.ai/keys.
2. Add it via Project Settings → Secrets as `OPENROUTER_API_KEY` (the secure
   form stores it encrypted; it is never committed to Git).
3. Run `npm run dev` for the frontend. The function runs on Lovable Cloud, so
   no separate local server is required — the preview calls the deployed
   function directly.
4. Upload a real (synthetic or anonymized) report and confirm the analysis
   reflects its contents.

## Verifying key safety

- The browser bundle contains no `OPENROUTER_API_KEY` reference — the key is
  read only inside the serverless function via `Deno.env`.
- Network requests from the browser go only to the project's own backend
  function endpoint; OpenRouter is called server-to-server.

## Limits & safety behavior

- Files up to 10 MB; up to 8 PDF pages (4 rendered page images for scanned
  PDFs); total request payload ~3.5 MB. Oversized reports are rejected with a
  clear message asking the user to split the document.
- 10 analyses per user per hour (best-effort, per serverless instance).
- Reports are not stored in the database or logged; content lives only for the
  duration of the request.

## Before production

1. Set `ALLOWED_ORIGINS` to your real frontend origin(s).
2. Set `OPENROUTER_HTTP_REFERER` to your deployed site URL.
3. If you need image-based analysis (scanned PDFs, photos of reports), confirm
   the configured model supports image input; otherwise the function returns a
   provider error instead of guessing.
4. For durable, cross-instance rate limiting, add a database-backed rate limit
   (the current limiter is per-instance).
