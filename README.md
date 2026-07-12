# Brand Strategy Builder

An AI-powered tool that stress-tests business ideas before helping entrepreneurs build their brand. Pitch a rough idea and the app challenges it like a skeptical investor: a viability score, hard market realities, contradictions in your thinking, and tough founder questions that push back on your answers. It runs live online market research (real competitors, current trends, entry challenges — with cited sources), guides you through a full brand strategy workbook, and finishes with a generated brand guide (palette, fonts, voice, personas) exportable as a PDF.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in your keys (all optional — missing keys degrade gracefully):
   - `GEMINI_API_KEY` — AI stress-test, evaluation, brand guide, and research synthesis.
   - `TAVILY_API_KEY` — live web market research (free at [tavily.com](https://tavily.com)).
   - `SUPABASE_URL` / `SUPABASE_ANON_KEY` — user accounts + cloud save.
3. Run the app: `npm run dev`

## Feature configuration

- **AI + live market research** — `GEMINI_API_KEY` powers all Gemini calls. Live research uses **Tavily** (independent web search, no Google) to fetch real sources, then Gemini structures them. Without `TAVILY_API_KEY`, research shows a labeled offline preview.
- **User accounts & cloud saving** — uses **Supabase** (Postgres + email/password auth). Requires `SUPABASE_URL` + `SUPABASE_ANON_KEY`. When unconfigured, the app runs in local-only mode and saves to the browser's localStorage. Each user's workspace is stored as one row in the `workspaces` table, protected by Row-Level Security.

## Supabase setup (one-time)

1. Create a free project at [supabase.com](https://supabase.com) → copy the **Project URL** and **anon public key** (Settings → API).
2. In the SQL editor, run:

   ```sql
   create table public.workspaces (
     user_id uuid primary key references auth.users on delete cascade,
     data jsonb not null default '{}',
     updated_at timestamptz not null default now()
   );

   alter table public.workspaces enable row level security;

   create policy "own workspace" on public.workspaces
     for all
     using (auth.uid() = user_id)
     with check (auth.uid() = user_id);
   ```
3. (Optional) Authentication → Providers → Email → turn **off** "Confirm email" for instant signup, or leave it on to require email verification.
4. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` as env vars wherever the app runs (locally in `.env.local`; on Render in the dashboard).

## Deploy (Render)

The app is a single full-stack service (Express serves the API and the built SPA). It deploys from `render.yaml`:

1. Push to GitHub.
2. [render.com](https://render.com) → **New → Blueprint** → connect the repo (reads `render.yaml`).
3. Set env vars in the Render dashboard: `GEMINI_API_KEY`, `TAVILY_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
4. Health check: `GET /healthz` reports `{ status, gemini, liveSearch, accounts }`.

A `Dockerfile` is also included if you prefer a container host (e.g. Cloud Run).
