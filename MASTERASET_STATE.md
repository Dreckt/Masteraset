# MASTERASET_STATE

Last updated: 2026-02-01  
Owner: Derek (Dreckt)  
Repo: Dreckt/Masteraset  
Hosting: Cloudflare Pages (Next.js on Pages adapter), D1

---

## Current Situation

Cloudflare Pages builds have been failing due to:
- Duplicate routing trees (`/app` and `/src/app`) causing edits to land in the wrong place and builds to compile against unexpected files.
- Inconsistent import patterns (`@/…` vs relative imports) causing “works locally / fails in Pages” behavior.
- Auth constants/types drifting (e.g., `SESSION_COOKIE_NAME` imported but not exported from the canonical auth module).

This has created a loop where fixes land in one tree but the build compiles another.

---

## Goal (Massive Fix)

**Single source of truth moving forward:**
- ✅ Use **ONLY** `src/app` for all Next.js App Router routes.
- ❌ Delete legacy `app/` directory entirely (no duplicates).
- ✅ Standardize imports so `@/` always works everywhere.
- ✅ Ensure auth constants/types are exported from one canonical module and imported consistently.

---

## Non-Negotiable Rules

1. There must be **no `app/` folder** at repo root after the fix.
2. All routes live under **`src/app/**`.
3. Imports must be standardized:
   - Use `@/…` imports (preferred)
   - `@/*` must map to `src/*` in `tsconfig.json`
4. Auth constant `SESSION_COOKIE_NAME` must exist and be exported from the canonical auth module used by all routes.
5. Local build must match Pages build:
   - `npm run build` must pass
   - `npx @cloudflare/next-on-pages` must pass (or equivalent Pages build command)

---

## Implementation Plan (Do This In Order)

### 0) Create safety branch
```bash
git checkout -b fix/unify-src-app
