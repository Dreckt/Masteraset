📄 PROJECT_STATE.md
# MasteraSet Project State

This document captures what has been built so a new ChatGPT session can continue without losing context.

---

## Current Status

MasteraSet is a **working deployable web app**.

It already supports:
- Games
- Sets
- Cards
- Printings
- User ownership tracking
- Correct card ordering

The site has run successfully on:

http://localhost:8788

using:



npx wrangler pages dev .vercel/output/static


---

## What is implemented

### Frontend
- Next.js App Router
- Game list page
- Set list page
- Card grid page
- Filters:
  - Rarity
  - Language
  - Variant
  - Name search
- Quantity tracking (+ / –)

---

### Backend
- Cloudflare Workers
- Cloudflare D1 (SQLite)

Tables:
- `games`
- `sets`
- `cards`
- `printings`
- `user_items`

---

### Card Ordering Engine

Every card printing is sorted using:

1. Set order override
2. Numbered bucket
3. Promo bucket
4. Numeric value
5. Prefix
6. Suffix
7. Rarity rank
8. Variant rank

This is what makes Weiss and Pokémon finally sort correctly.

---

### Weiss Schwarz Support

These are already implemented:

- Multi-rarity per same number
- SP, SSP, SEC
- IGP foil
- Promo handling
- Proper E38 → E39 grouping

---

## What is broken / incomplete

### TCGPlayer Scraping
We successfully:
- Captured the page
- Exported a CSV

But:
- The table export contained UI text (`Select table row`)
- Needs proper API scraping from TCGPlayer backend

---

## What should be done next

1. Build a proper TCGPlayer API scraper
2. Normalize Weiss Schwarz price guide → CSV
3. Import into `printings`
4. Add Pokémon support

---

## How to resume in a new chat

Tell ChatGPT:

> I have a Next.js + Cloudflare Pages project at  
> C:\Users\Derek\OneDrive\Desktop\Masteraset  
> Please read README.md, IMPORT_SPEC.md, and PROJECT_STATE.md and continue.

---

MasteraSet is not a prototype — it is already a functioning collector platform.