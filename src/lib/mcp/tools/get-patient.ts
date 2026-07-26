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
  name: "get_patient",
  title: "Get patient details",
  description:
    "Fetch the full record for one patient by health card ID (UUID) or by phone number.",
  inputSchema: {
    id: z.string().uuid().optional().describe("Patient UUID (health card ID)."),
    phone_number: z
      .string()
      .optional()
      .describe("10-digit Indian mobile number of the patient."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, phone_number }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (!id && !phone_number) {
      return {
        content: [{ type: "text", text: "Provide either id or phone_number." }],
        isError: true,
      };
    }
    const client = supabaseForUser(ctx);
    let query = client.from("patients").select("*").limit(1);
    if (id) query = query.eq("id", id);
    else query = query.eq("phone_number", phone_number!.replace(/\D/g, ""));

    const { data, error } = await query.maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: "No matching patient found." }] };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { patient: data },
    };
  },
});
