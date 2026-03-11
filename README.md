# Scan2Sustain (Next.js)

This repo has been migrated to Next.js so the frontend and backend deploy together on Vercel.

## Local dev

1. Create `.env.local` (copy from `.env.local.example`) and fill:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
2. Install deps: `npm.cmd install`
3. Run: `npm.cmd run dev`
4. Open: `http://localhost:3000/?loc=Test&type=washroom&floor=1`

## API routes (serverless)

- `POST /api/submit-complaint`
- `GET /api/complaints`
- `POST /api/complete-task`
- `POST /api/send-whatsapp`

## Deployment (Vercel)

- Import the repo in Vercel.
- Add the same environment variables in Vercel project settings.
- Deploy.

Legacy folders `backend/`, `frontend/`, and `api/` are kept for reference; Next.js uses `app/` now.
