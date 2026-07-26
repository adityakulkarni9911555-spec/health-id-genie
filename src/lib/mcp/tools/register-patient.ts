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
  name: "register_patient",
  title: "Register a new patient",
  description:
    "Create a new patient record with basic demographic, medical and emergency contact details.",
  inputSchema: {
    full_name: z.string().describe("Patient's full name."),
    date_of_birth: z.string().describe("Date of birth in YYYY-MM-DD format."),
    phone_number: z.string().describe("10-digit Indian mobile number."),
    gender: z.enum(["male", "female", "other"]),
    emergency_contact: z.string().describe("10-digit emergency contact number."),
    blood_group: z
      .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
      .optional(),
    height: z.string().optional().describe("Height in cm as a string."),
    weight: z.string().optional().describe("Weight in kg as a string."),
    allergies: z.array(z.string()).optional(),
    chronic_conditions: z.array(z.string()).optional(),
    insurance_provider: z.string().optional(),
    policy_number: z.string().optional(),
    tpa_contact: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const payload = {
      full_name: input.full_name.trim(),
      date_of_birth: input.date_of_birth,
      phone_number: input.phone_number.replace(/\D/g, ""),
      gender: input.gender,
      emergency_contact: input.emergency_contact.replace(/\D/g, ""),
      blood_group: input.blood_group ?? null,
      height: input.height ?? null,
      weight: input.weight ?? null,
      allergies: input.allergies ?? [],
      chronic_conditions: input.chronic_conditions ?? [],
      insurance_provider: input.insurance_provider ?? null,
      policy_number: input.policy_number ?? null,
      tpa_contact: input.tpa_contact ?? null,
    };

    const { data, error } = await supabaseForUser(ctx)
      .from("patients")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [
        {
          type: "text",
          text: `Patient registered. Health Card ID: ${data.id}`,
        },
      ],
      structuredContent: { patient: data },
    };
  },
});
