# Brand Strategy Builder

An AI-powered tool that stress-tests business ideas before helping entrepreneurs build their brand. Pitch a rough idea and the app challenges it like a skeptical investor: a viability score, hard market realities, contradictions in your thinking, and tough founder questions that push back on your answers. It runs live online market research (real competitors, current trends, entry challenges — with cited sources), guides you through a full brand strategy workbook, and finishes with a generated brand guide (palette, fonts, voice, personas) exportable as a PDF.

View your app in AI Studio: https://ai.studio/apps/6913a46d-41e1-4bb9-b5d3-d9a984003122

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` in `.env.local` to your Gemini API key.
   Without a key the app still runs, using simulated "offline preview" responses.
3. Run the app:
   `npm run dev`

## Feature configuration

- **AI stress-testing & live market research** — requires `GEMINI_API_KEY`. Market research uses Gemini with Google Search grounding, so results are based on real web sources (cited in the UI).
- **User accounts & cloud saving** — requires `firebase-applet-config.json` to contain a Firebase web app config (AI Studio injects this automatically when deployed). Enable the **Google** sign-in provider in the Firebase console. When unconfigured, the app runs in local-only mode and saves to the browser's localStorage.
- All gathered material (workbook, stress-test results, challenge answers, market research, brand guide) is autosaved to the signed-in user's account under `users/{uid}/workspaces/default` in Firestore, matching `firestore.rules`.

## Firebase console setup (one-time)

The app is wired to the `brand-strategy-builder` Firebase project (`firebase-applet-config.json`). Before accounts work, in the [Firebase console](https://console.firebase.google.com/project/brand-strategy-builder):

1. **Authentication → Sign-in method →** enable **Google**.
2. **Firestore Database →** create the database (production mode).
3. **Authentication → Settings → Authorized domains →** add your production domain (localhost is allowed by default).
4. Publish rules: `firebase deploy --only firestore:rules`.

## Deploy (Firebase Hosting + Cloud Run)

The app has an Express backend, so it runs as a container on Cloud Run with Firebase Hosting in front as the CDN/URL layer (`firebase.json` rewrites all traffic to the Cloud Run service).

```bash
# 1. Build the container and deploy to Cloud Run (from the project root).
#    --source . uses the Dockerfile. Set the Gemini key as a runtime env var
#    (NOT baked into the image; .env.local is excluded via .dockerignore).
gcloud run deploy brand-strategy-builder \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_KEY_HERE

# 2. Point Firebase Hosting at that Cloud Run service.
firebase deploy --only hosting
```

Notes:
- The Cloud Run `serviceId`/`region` in `firebase.json` must match the `gcloud run deploy` name/region (defaults: `brand-strategy-builder` / `us-central1`).
- For a rotating or sensitive key, use Secret Manager instead of `--set-env-vars`: `--set-secrets GEMINI_API_KEY=gemini-api-key:latest`.
- After `firebase deploy --only hosting`, the app is live at `https://brand-strategy-builder.web.app`.
