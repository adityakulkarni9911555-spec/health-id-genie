/// <reference types="vite/client" />

// Ambient declaration for `process.env` used inside MCP tool handlers.
// Those files are bundled into a Supabase Edge Function at build time
// where `process.env` is provided by the Deno runtime.
declare const process: { env: Record<string, string | undefined> };
