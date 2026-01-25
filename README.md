What this project is

MasteraSet is a trading-card collection tracker built to solve a problem most hobby sites get wrong:

Cards must sort by their true set numbering, not alphabetically.

It supports:

Weiss Schwarz

Pokémon

Sports cards

Any future card game with weird numbering, promos, foils, or secret cards

This system stores every physical printing of a card separately so users can track master sets accurately.

Tech Stack
Layer	Tech
Frontend	Next.js 14 (App Router)
Hosting	Cloudflare Pages
Backend	Cloudflare Workers
Database	Cloudflare D1 (SQLite)
Auth	Cookie-based user login
Import	CSV import system

Everything runs serverless.

How to run the site locally

From inside Ubuntu / WSL:

cd /mnt/c/Users/Derek/OneDrive/Desktop/Masteraset
npm install
npm run build
npx wrangler pages dev .vercel/output/static


Then open:

http://localhost:8788

Database (D1)

Tables include:

games

sets

cards

printings

user_items

The most important table is printings — this represents:

“This exact physical card that someone owns”

A single character can have:

Normal

Foil

Secret

Promo
Each is a separate printing.

How card ordering works

Each printing is broken into sortable fields:

Field	Meaning
num_prefix	E, HY, etc
num_value	38
num_suffix	a, b, SP
rarity_rank	Numeric priority
promo_bucket	Push promos to bottom
numbered_bucket	Keep real set numbers first

So this:

5HY WE43 E38 (Common)
5HY WE43 E38 (Uncommon)
5HY WE43 E38 (RR)
5HY WE43 E38 (SP)
5HY WE43 E39


Sorts correctly.

Rarity priority

These are supported:

C
U
R
RR
RRR
SR
SP
SSP
SEC
IGP
AGR
XR
PR


They are ranked so variants of the same number always group together.

Promos (PR) are last unless they have real numbering.

CSV Import System

You import cards using CSV files into the printings table.

Important fields:

Column	Purpose
game_slug	weiss, pokemon, etc
set_code	WE43, PFL, etc
card_canonical_name	True name
collector_number_raw	What is printed
rarity_code	RR, SP, IGP, etc
variant	Normal, Foil, Signed
is_promo	1 or 0

During import:

The system parses collector_number_raw

Assigns numeric + prefix values

Assigns rarity_rank

Assigns promo bucket

That makes sorting future-proof for any game.

Why this is different from other trackers

Most sites sort cards alphabetically or by release.

MasteraSet sorts by:

How collectors think.

It respects:

Hidden rares

Secret numbers

Foil variants

Weiss-style duplicates

Pokémon over-set cards

What was already built

✔ Login system
✔ Set list
✔ Games list
✔ Card grid
✔ Quantity tracking
✔ Cloudflare deployment
✔ Weiss Schwarz rarity system
✔ Promo handling
✔ Correct sorting engine

The site is deployable — we had it running at:

http://localhost:8788