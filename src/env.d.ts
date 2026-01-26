// src/env.d.ts

declare global {
  // This is the environment type returned by getRequestContext().env
  // Add all Pages bindings + secrets here.
  interface CloudflareEnv {
    DB: D1Database;

    // Secrets / vars
    POKEMONTCG_API_KEY?: string;
    ADMIN_IMPORT_TOKEN?: string;
  }
}

export {};
