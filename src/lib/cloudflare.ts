import { getRequestContext } from "@cloudflare/next-on-pages";

export type Env = {
  DB: D1Database;
  // Add email provider secrets when ready:
  // RESEND_API_KEY?: string;
  // APP_URL?: string;
};

export function getEnv(): Env {
  const ctx = getRequestContext();
  return ctx.env as unknown as Env;
}

export function nowIso() {
  return new Date().toISOString();
}

export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
