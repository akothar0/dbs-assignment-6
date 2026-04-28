# Vercel Deployment

Rolo deploys as a standard Next.js app on Vercel. Authentication is handled by
Clerk, database access by Supabase with Clerk third-party auth, and draft
generation by Anthropic.

## Before Deploying

1. Apply `supabase/migrations/0001_initial_schema.sql` in the Supabase SQL
   editor.
2. Confirm the Supabase project is linked to Clerk as a third-party auth
   provider.
3. Confirm local `.env.local` has the same keys you plan to add to Vercel.
4. Run:

```bash
npm run lint
npm run build
```

## Vercel Environment Variables

Add these in the Vercel project settings for Preview and Production:

```bash
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Do not add `SUPABASE_SERVICE_ROLE_KEY` unless you later create server-only
admin jobs that need it. The current app does not require it.

## Clerk Dashboard Checks

- Add the Vercel production domain after the first deploy.
- Keep local development allowed at `http://localhost:3000` and
  `http://localhost:3001`.
- If you switch away from modal auth, configure sign-in/sign-up redirect URLs.

## Supabase Checks

- RLS must be enabled by the migration.
- Policies expect `auth.jwt() ->> 'sub'` to equal the Clerk user id stored in
  each row's `user_id`.
- If database reads return empty data for a signed-in user, first confirm the
  Clerk/Supabase third-party auth link and the publishable key.

## Deploy Flow

1. Push `main` to GitHub.
2. Import `akothar0/dbs-assignment-6` into Vercel.
3. Add the environment variables above.
4. Deploy from `main`.
5. Sign up or sign in, complete onboarding, add a contact, log an interaction,
   and generate an AI draft.
