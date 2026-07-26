// Ambient declaration for Deno process.env used by MCP tool handlers.
// These files are bundled into a Supabase Edge Function at build time.
declare const process: { env: Record<string, string | undefined> };
