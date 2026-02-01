# MasteraSet Project State

## Stack
- Next.js App Router
- Cloudflare Pages via next-on-pages
- D1 database
- Repo: Dreckt/masteraset
- Root: src/app (NOT app/)

## Runtime
- All API routes must be edge-safe
- Use:
  export const runtime = "edge";
  export const dynamic = "force-dynamic";

## Known Issues
- /api/admin/import/printings was NOT emitted in Pages build
- Missing:
  __next-on-pages-dist__/functions/api/admin/import/printings.func.js

## Current Fix In Progress
- Rebuilding printings route to be Pages-safe
- Removing all Node APIs
- Using getRequestContext() for env bindings

## File Under Repair
src/app/api/admin/import/printings/route.ts

## Expected Behavior
- GET → 200 JSON (exists check)
- POST → imports printings into D1
- No 404

## Build / Test Commands
npx @cloudflare/next-on-pages
npx wrangler pages dev .vercel/output/static
curl http://127.0.0.1:8788/api/admin/import/printings
