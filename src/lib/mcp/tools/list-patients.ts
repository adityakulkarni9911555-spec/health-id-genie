import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_patients",
  title: "List patients",
  description:
    "List patients in the Medora system. Supports optional search by name or phone number and a result limit.",
  inputSchema: {
    search: z
      .string()
      .optional()
      .describe("Optional case-insensitive fragment matching full_name or phone_number."),
    limit: z
      .number()
      .int()
      .optional()
      .describe("Max number of records to return (default 25, capped at 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const capped = Math.min(Math.max(limit ?? 25, 1), 100);
    let query = supabaseForUser(ctx)
      .from("patients")
      .select("id, full_name, phone_number, date_of_birth, gender, blood_group, created_at")
      .order("created_at", { ascending: false })
      .limit(capped);

    if (search && search.trim()) {
      const s = search.trim().replace(/[%,]/g, "");
      query = query.or(`full_name.ilike.%${s}%,phone_number.ilike.%${s}%`);
    }

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { patients: data ?? [] },
    };
  },
});
