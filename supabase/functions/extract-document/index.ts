import { createClient } from "npm:@supabase/supabase-js@^2.89.0";
import { z } from "npm:zod@^3.25.76";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BUCKET = "patient-documents";

const RequestSchema = z.object({
  patient_id: z.string().uuid(),
  document_path: z.string().min(1),
});

const ExtractionSchema = z.object({
  provider_name: z.string().nullable().optional().default(null),
  document_date: z.string().nullable().optional().default(null),
  diagnoses: z.array(z.string()).nullable().optional().default([]),
  medications: z.array(
    z.object({
      name: z.string().nullable().optional().default(null),
      dosage: z.string().nullable().optional().default(null),
      frequency: z.string().nullable().optional().default(null),
    })
  ).nullable().optional().default([]),
  allergies: z.array(z.string()).nullable().optional().default([]),
  vitals_summary: z.string().nullable().optional().default(null),
  lab_results_summary: z.string().nullable().optional().default(null),
  follow_up_instructions: z.string().nullable().optional().default(null),
  summary: z.string().nullable().optional().default(null),
});

function base64FromBytes(bytes: Uint8Array): string {
  const bin = Array.from(bytes).map((b) => String.fromCharCode(b)).join("");
  return btoa(bin);
}

function chunksFromExtraction(
  path: string,
  extraction: z.infer<typeof ExtractionSchema>,
): { content: string; metadata: Record<string, unknown> }[] {
  const chunks: { content: string; metadata: Record<string, unknown> }[] = [];

  if (extraction.summary) {
    chunks.push({
      content: `Document summary: ${extraction.summary}`,
      metadata: { type: "summary", path },
    });
  }

  if (extraction.provider_name || extraction.document_date) {
    chunks.push({
      content: `Provider: ${extraction.provider_name ?? "unknown"}. Date: ${extraction.document_date ?? "unknown"}.`,
      metadata: { type: "metadata", path },
    });
  }

  if (extraction.diagnoses?.length) {
    chunks.push({
      content: `Diagnoses: ${extraction.diagnoses.join("; ")}`,
      metadata: { type: "diagnoses", path },
    });
  }

  if (extraction.medications?.length) {
    const meds = extraction.medications
      .map((m) => `${m.name ?? "Unknown"} ${m.dosage ?? ""} ${m.frequency ?? ""}`.trim())
      .join("; ");
    chunks.push({
      content: `Medications: ${meds}`,
      metadata: { type: "medications", path },
    });
  }

  if (extraction.allergies?.length) {
    chunks.push({
      content: `Allergies: ${extraction.allergies.join("; ")}`,
      metadata: { type: "allergies", path },
    });
  }

  if (extraction.vitals_summary) {
    chunks.push({
      content: `Vitals: ${extraction.vitals_summary}`,
      metadata: { type: "vitals", path },
    });
  }

  if (extraction.lab_results_summary) {
    chunks.push({
      content: `Lab results: ${extraction.lab_results_summary}`,
      metadata: { type: "lab_results", path },
    });
  }

  if (extraction.follow_up_instructions) {
    chunks.push({
      content: `Follow-up instructions: ${extraction.follow_up_instructions}`,
      metadata: { type: "follow_up", path },
    });
  }

  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { patient_id, document_path } = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("documents")
    .eq("id", patient_id)
    .maybeSingle();

  if (patientError || !patient) {
    return new Response(JSON.stringify({ error: "Patient not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const docs = Array.isArray(patient.documents) ? patient.documents as Record<string, unknown>[] : [];
  const doc = docs.find((d) => d.path === document_path);
  if (!doc) {
    return new Response(JSON.stringify({ error: "Document not found on patient record" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(document_path, 60 * 10);

  if (signedError || !signed?.signedUrl) {
    return new Response(JSON.stringify({ error: "Could not access document", details: signedError?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const signedUrl = signed.signedUrl;
  const fileType = (doc.type as string) || "application/octet-stream";
  const fileName = (doc.name as string) || "document";

  const fileResponse = await fetch(signedUrl);
  if (!fileResponse.ok) {
    return new Response(JSON.stringify({ error: "Could not download document" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fileBytes = new Uint8Array(await fileResponse.arrayBuffer());
  const base64Data = base64FromBytes(fileBytes);
  const dataUrl = `data:${fileType};base64,${base64Data}`;

  let contentBlock: unknown;
  if (fileType.startsWith("image/")) {
    contentBlock = { type: "image_url", image_url: { url: dataUrl } };
  } else {
    contentBlock = { type: "file", file: { filename: fileName, file_data: dataUrl } };
  }

  const chatBody = {
    model: "google/gemini-3.6-flash",
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          {
            type: "text",
            text: "Extract structured medical information from this document. If a field is not present, return null. Keep summaries concise and factual. Do not invent information. Return only the JSON object requested.",
          },
        ],
      },
    ],
  };

  let extraction: z.infer<typeof ExtractionSchema> | null = null;
  try {
    const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify(chatBody),
    });

    if (!chatResponse.ok) {
      const errText = await chatResponse.text();
      throw new Error(`Gateway returned ${chatResponse.status}: ${errText}`);
    }

    const chatJson = await chatResponse.json();
    const assistantText = chatJson.choices?.[0]?.message?.content as string | undefined;
    if (!assistantText) {
      throw new Error("No content in model response");
    }

    // Parse JSON from the assistant response (model may wrap it in markdown fences).
    const jsonMatch = assistantText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const rawJson = jsonMatch ? jsonMatch[1].trim() : assistantText.trim();
    const parsedJson = JSON.parse(rawJson);
    extraction = ExtractionSchema.parse(parsedJson);
  } catch (err) {
    console.error("Extraction failed:", err);
    const updatedDocs = docs.map((d) =>
      d.path === document_path ? { ...d, status: "failed", extractedAt: new Date().toISOString() } : d
    );
    await supabase.from("patients").update({ documents: updatedDocs }).eq("id", patient_id);
    return new Response(JSON.stringify({ error: "Extraction failed", details: err instanceof Error ? err.message : String(err) }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Remove any previous chunks for this document before inserting fresh ones.
  await supabase.from("document_chunks").delete().eq("document_path", document_path);

  const chunks = chunksFromExtraction(document_path, extraction);
  if (chunks.length > 0) {
    const embeddingsResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-embedding-001",
        input: chunks.map((c) => c.content),
      }),
    });

    if (!embeddingsResponse.ok) {
      const errText = await embeddingsResponse.text();
      console.error("Embedding failed:", errText);
    } else {
      const embeddingsBody = await embeddingsResponse.json();
      const embeddings = (embeddingsBody.data ?? []) as { embedding: number[] }[];
      const rows = chunks.map((c, i) => ({
        patient_id,
        document_path,
        content: c.content,
        embedding: embeddings[i]?.embedding ?? [],
        metadata: c.metadata,
      }));
      const { error: insertError } = await supabase.from("document_chunks").insert(rows);
      if (insertError) {
        console.error("Chunk insert failed:", insertError);
      }
    }
  }

  const extractedAt = new Date().toISOString();
  const updatedDocs = docs.map((d) =>
    d.path === document_path
      ? {
          ...d,
          extractedData: extraction,
          status: "processed",
          extractedAt,
        }
      : d
  );

  const { error: updateError } = await supabase
    .from("patients")
    .update({ documents: updatedDocs })
    .eq("id", patient_id);

  if (updateError) {
    console.error("Failed to update patient documents:", updateError);
  }

  return new Response(
    JSON.stringify({
      success: true,
      extracted: extraction,
      document_path,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
