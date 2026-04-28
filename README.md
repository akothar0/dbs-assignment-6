# Rolo

Rolo is a manual-first networking CRM for MBA recruiting. It tracks contacts,
interaction history, follow-up tasks, pipeline stages, and AI-assisted outreach
drafts.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Copy `.env.example` to `.env.local` and fill in the Clerk, Supabase, and
OpenAI values as each integration is enabled.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```

## V1 Scope

- Manual contact and interaction management
- Daily action queue
- Pipeline view
- Clerk authentication
- Supabase persistence and RLS
- OpenAI-powered editable outreach drafts

No Gmail sync, LinkedIn CSV import, enrichment API, Granola integration, or
auto-send is included in v1.

## Setup Notes

- Clerk setup: add `CLERK_SECRET_KEY` and
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to `.env.local`.
- Supabase setup: add `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then run
  `supabase/migrations/0001_initial_schema.sql` in the Supabase SQL editor.
- OpenAI setup: add `OPENAI_API_KEY`; the default model is `gpt-4.1-mini`.
- Deployment checklist: see `docs/deployment.md`.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
