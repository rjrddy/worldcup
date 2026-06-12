# Supabase setup (~10 minutes)

This walks you through what you need to do in the Supabase dashboard + Google Cloud Console **once**. Your code is already wired — these are the manual steps that can't be done from the codebase.

## 1. Create a Supabase project

1. Sign up / log in at https://supabase.com.
2. New project → pick any name (e.g. `worldcup-2026`), region close to you, set a strong DB password (save it).
3. Wait ~1 min for provisioning.

## 2. Run the schema

1. In the Supabase dashboard → **SQL Editor** → New query.
2. Paste the contents of [`supabase-schema.sql`](./supabase-schema.sql) and click **Run**.
3. You should see three tables in **Database → Tables**: `profiles`, `brackets`, plus the auto-created `auth.users` table.

## 3. Enable Google OAuth

In Supabase you can't enable Google without creating a Google OAuth client first.

### 3a. In Google Cloud Console (https://console.cloud.google.com)

1. Create a project (or reuse one).
2. **APIs & Services → OAuth consent screen** → External → fill out app name (e.g. `World Cup 2026`), support email, dev email → save through.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `worldcup-2026`
   - Authorized redirect URIs — add **both**:
     - `https://<your-project-ref>.supabase.co/auth/v1/callback` (find your project ref in Supabase → Project Settings → Reference ID)
     - `http://localhost:3000/auth/callback` (for local dev)
4. Copy the **Client ID** and **Client Secret**.

### 3b. In Supabase

1. **Authentication → Providers → Google** → enable.
2. Paste the Client ID and Client Secret.
3. Save.

### 3c. Add your site URL

1. **Authentication → URL Configuration**.
2. Site URL: `https://<your-app>.vercel.app` (or `http://localhost:3000` while local).
3. Redirect URLs (add both):
   - `http://localhost:3000/auth/callback`
   - `https://<your-app>.vercel.app/auth/callback`

## 4. Get your Supabase credentials

In Supabase → **Project Settings → API**:

- `Project URL` → env `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → env `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → env `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **server-only, never expose**

The `service_role` key is used by the live-data cron job to write to the `live_status` and `match_events` tables (it bypasses RLS by design). Keep it secret.

## 4b. Vercel Cron secret

Vercel auto-signs every cron request with a Bearer token. Generate a random secret and add to Vercel env:
- `CRON_SECRET` → any long random string. The cron route rejects unauthorized requests.

## 5. Add to env vars

### Local (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...      # server-only, do NOT prefix with NEXT_PUBLIC_
CRON_SECRET=                                  # any long random string
API_FOOTBALL_KEY=                             # already set
```

### Vercel
Settings → Environment Variables → add **all four**:
- `NEXT_PUBLIC_SUPABASE_URL` (scope: all environments)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (scope: all environments)
- `SUPABASE_SERVICE_ROLE_KEY` (**scope: Production only** — sensitive)
- `CRON_SECRET` (scope: all environments)
- `API_FOOTBALL_KEY` (already there if you set it up earlier)

Then redeploy with **"Use existing Build Cache" UNCHECKED**.

## Live updates (external cron — free on Vercel Hobby)

Vercel Hobby caps crons at **once per day**, which won't give near-real-time scores. Two ways around it:

### Option A — Vercel Pro ($20/mo)

Add this back to `vercel.json`:
```json
{ "crons": [{ "path": "/api/cron/refresh-live", "schedule": "* * * * *" }] }
```
Done. Vercel hits the route every minute automatically (Bearer-authed with `CRON_SECRET`).

### Option B — External cron (cron-job.org, free)

1. Sign up at https://cron-job.org (free)
2. **Create cronjob** → URL: `https://<your-vercel-domain>/api/cron/refresh-live`
3. Schedule: **every minute**
4. Advanced → **Request Method**: GET; **Request Headers**: add
   ```
   Authorization: Bearer <your CRON_SECRET value>
   ```
5. Save + enable. cron-job.org will ping every minute, the route checks the header, and updates Supabase.

### Option C — GitHub Actions (also free)

`.github/workflows/cron.yml`:
```yaml
name: Live data refresh
on:
  schedule:
    - cron: '* * * * *'
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" https://<your-vercel-domain>/api/cron/refresh-live
```
Add `CRON_SECRET` as a repo secret.

### Verify locally

```
curl http://localhost:3000/api/cron/refresh-live
# returns { "ok": true, "fixtures": N, "events": M }
```
(Locally no auth needed since `CRON_SECRET` is unset.)

## 6. Test it

Locally:
```
npm run dev
```

Visit http://localhost:3000, click **Sign in with Google** in the header, complete OAuth. You should:
- Get a profile row auto-created in `public.profiles`
- Land back on the home page with your avatar in the header
- Be able to visit `/profile` and pick a favorite team

## Troubleshooting

| Symptom | Fix |
|---|---|
| `redirect_uri_mismatch` from Google | The URL in Google Cloud Console must match Supabase's callback exactly. Re-check step 3a. |
| Sign-in completes but `/profile` says "not signed in" | Check cookies are being set — usually a redirect-URL config mismatch in step 3c. |
| "permission denied for table profiles" | The schema's RLS policies didn't apply. Re-run the SQL. |
| Avatar shows but `display_name` is empty | Some Google accounts don't return `full_name` in metadata. The profile page lets you edit it. |
