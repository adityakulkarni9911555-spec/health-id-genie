import { createClient } from "npm:@supabase/supabase-js@^2.89.0";
import { z } from "npm:zod@^3.25.76";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const RequestSchema = z.object({
  patient_id: z.string().uuid(),
  query: z.string().min(2).max(300),
  match_count: z.number().int().min(1).max(10).optional().default(6),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid request", details: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "AI is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // User-scoped client: RLS + security-invoker RPC guarantee owner-only results.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({ model: "google/gemini-embedding-001", input: [body.query] }),
  });

  if (!embeddingResponse.ok) {
    const errText = await embeddingResponse.text();
    console.error("Embedding failed:", errText);
    return new Response(JSON.stringify({ error: "Search is temporarily unavailable" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const embeddingBody = await embeddingResponse.json();
  const embedding: number[] | undefined = embeddingBody?.data?.[0]?.embedding;
  if (!embedding?.length) {
    return new Response(JSON.stringify({ error: "Search is temporarily unavailable" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: matches, error } = await supabase.rpc("match_documents", {
    query_embedding: JSON.stringify(embedding),
    _patient_id: body.patient_id,
    match_count: body.match_count,
  });

  if (error) {
    console.error("match_documents failed:", error.message);
    return new Response(JSON.stringify({ error: "Search failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = (matches ?? []) as {
    id: string;
    document_path: string;
    content: string;
    metadata: Record<string, unknown>;
    similarity: number;
  }[];

  let answer: string | null = null;
  if (results.length > 0) {
    const context = results
      .map((r, i) => `[${i + 1}] (${r.document_path.split("/").pop()}) ${r.content}`)
      .join("\n");

    const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You answer questions about a person's own medical records. Use ONLY the provided excerpts. Be concise (max 3 sentences). If the excerpts do not answer the question, say you could not find it. Never invent medical advice.",
          },
          { role: "user", content: `Question: ${body.query}\n\nExcerpts:\n${context}` },
        ],
      }),
    });

    if (chatResponse.ok) {
      const chatBody = await chatResponse.json();
      answer = chatBody?.choices?.[0]?.message?.content ?? null;
    } else {
      console.error("Chat failed:", await chatResponse.text());
    }
  }

  return new Response(JSON.stringify({ answer, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
