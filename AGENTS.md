<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Rolo Project Notes

- Rolo is a Next.js App Router app using Clerk auth, Supabase Postgres/RLS, and OpenAI for outreach drafts.
- Use `src/proxy.ts` with `clerkMiddleware()` for protected routes; do not add Pages Router files.
- Supabase auth is handled through Clerk third-party auth and Clerk session tokens. Do not add Supabase Auth cookie middleware.
- User-owned Supabase rows must be scoped by Clerk `user_id` and RLS policies comparing `user_id` to `auth.jwt() ->> 'sub'`.
- Server-only OpenAI code lives in `src/lib/openai.ts`; client components must never read `OPENAI_API_KEY`.
- Required local env vars are `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `OPENAI_API_KEY`.
- `OPENAI_MODEL` is optional and defaults to `gpt-4.1-mini`.
