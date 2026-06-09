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

- `Project URL` → goes into env as `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → goes into env as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 5. Add to env vars

### Local (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### Vercel
Settings → Environment Variables → add both, scope to Production + Preview + Development → redeploy with **"Use existing Build Cache" UNCHECKED**.

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
