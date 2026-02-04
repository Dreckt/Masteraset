// src/env.d.ts
// Central place for Cloudflare Pages/Workers env typings used by getEnv()

declare global {
  interface Env {
    // D1 Database binding
    DB: any;

    // Pokémon TCG API key (optional)
    POKEMONTCG_API_KEY?: string;
  }
}

export {};
