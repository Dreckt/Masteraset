MasteraSet – Project Status & Handoff

Last updated: 2026-02-02
Owner: Derek (romad002 / Dreckt)
Repo: https://github.com/Dreckt/Masteraset

Prod: https://masteraset.com

Stack: Next.js App Router + Cloudflare Pages + D1
Build Adapter: @cloudflare/next-on-pages (with async_hooks patch)

1. What’s Working

App is deployed on Cloudflare Pages

D1 database connected (local + remote)

Games table is seeded:

name	slug
Pokémon	pokemon
One Piece	one-piece
Weiss Schwarz	weiss
Lorcana	lorcana
Magic: The Gathering	mtg

Pokémon Base Set (base1) fully seeded:

102 cards

Canonical IDs like: pokemon-base1-4-charizard

/pokemon/sets/base1 now returns data

Card list renders and is clickable

2. Pokémon Base Set Images (SUCCESS)

We performed a one-time pull from the PokémonTCG CDN (not API) and patched D1.

Image pull result

102 / 102 images downloaded

Stored locally at:

tmp/pokemon-images/base1/

CDN pattern
https://images.pokemontcg.io/base1/{number}.png


Example:

Charizard → https://images.pokemontcg.io/base1/4.png
Pikachu   → https://images.pokemontcg.io/base1/58.png

DB columns now populated
image_source   = pokemontcg_cdn
image_filename = base1/{num}.png
image_path     = https://images.pokemontcg.io/base1/{num}.png


Verified:

pokemon-base1-1-alakazam
pokemon-base1-4-charizard
pokemon-base1-58-pikachu

3. D1 Schema (Current)
games

| id (PK) | name | slug |

cards
column	type
id (PK)	TEXT
game_id (FK → games.id)	TEXT
canonical_name	TEXT
name_sort	TEXT
set_name	TEXT
card_id	TEXT
card_name	TEXT
rarity	TEXT
year	INTEGER
image_source	TEXT
image_filename	TEXT
image_path	TEXT
created_at	TEXT
4. Major Bugs We Hit (Now Understood)
A) Cloudflare Pages returned:
Not Found
content-type: text/plain
content-length: 9


This means Pages deployed static files only — the Next worker was missing.

Root cause

The Pages deployment did not include:

.vercel/output/static/_worker.js
.vercel/output/static/_routes.json


Without those, Cloudflare treats the site as static → all navigation breaks.

5. Required Permanent Fix (MANDATORY)

Always deploy the Next worker output, never the repo root.

Local build pipeline
rm -rf .vercel
npm ci
npx @cloudflare/next-on-pages

find .vercel/output/static/_worker.js/__next-on-pages-dist__/functions -type f -name "*.js" -print0 \
 | xargs -0 perl -pi -e 's/"async_hooks"/"node:async_hooks"/g; s/node:node:/node:/g'

Verify before deploy
ls .vercel/output/static/_worker.js
ls .vercel/output/static/_routes.json

Deploy to Pages
npx wrangler pages deployment create .vercel/output/static --project-name masteraset

6. Current Blocker

Site is intermittently serving plain Not Found instead of Next pages, which means the last deployment lost the worker artifacts.

Navigation breaks:

/

/games

/pokemon/sets

/pokemon/sets/base1

We must redeploy using the verified worker output folder.

7. Next Steps in New Chat

Rebuild locally

Confirm _worker.js + _routes.json

Redeploy via wrangler pages deployment create

Confirm homepage renders HTML again

Add image rendering on card pages using image_path

If you paste this file into the first message of the new chat, I’ll immediately continue from the correct state with zero re-explaining.
