# Supabase and Clerk Setup

Rolo uses Clerk for authentication and Supabase for Postgres, with Supabase
configured to trust Clerk session tokens through third-party auth.

## Required Environment Variables

```bash
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

`SUPABASE_SERVICE_ROLE_KEY` is not used by the app runtime. Keep it out of
browser-exposed code and only use it for administrative scripts if needed later.

## Apply the Schema

Open the Supabase SQL editor for the linked project and run:

```sql
-- contents of supabase/migrations/0001_initial_schema.sql
```

The migration enables RLS on every user-owned table. Policies compare
`user_id` to the Clerk session token `sub` claim:

```sql
user_id = auth.jwt() ->> 'sub'
```

## Important Note

Do not add Supabase Auth cookie middleware for this app. Clerk owns auth, and
Supabase requests are authorized with Clerk session tokens via `accessToken`.
