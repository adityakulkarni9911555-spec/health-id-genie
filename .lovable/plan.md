# Medora AI Integration Plan

You selected four AI features. The best starting point is **Smart Document Reading** — it reduces manual entry, improves record quality, and powers the other three features. I recommend a phased rollout so each feature ships and validates before the next.

## Phase 1 — Smart Document Reading (start here)

Goal: When a user uploads a prescription, lab report, discharge summary, or health record, AI extracts structured data and offers to fill the patient's profile.

### Database changes
- Add `document_chunks` table:
  - `id uuid`, `patient_id uuid`, `document_path text`, `content text`, `embedding vector(3072)`, `metadata jsonb`, `created_at timestamptz`
  - RLS: owner-only read/write
  - HNSW index on `embedding::halfvec(3072)`
- Extend the `documents` JSONB items to include `extracted_data jsonb` and `status text` (`pending | processed | failed`).

### Backend
- New Supabase Edge Function: `extract-document`
  - Accepts `patient_id` + `document_path`
  - Creates a short-lived signed URL for the file
  - Calls `google/gemini-3.6-flash` (or `google/gemini-2.5-pro` for complex scans) with the document image/PDF and a structured-output schema
  - Extracts: medicines, diagnoses, allergies, dates, doctor/hospital name, and any vitals
  - Saves extracted text chunks + embeddings to `document_chunks`
  - Updates the document item with `extracted_data` and `status: processed`

### Frontend
- Update `DocumentUpload.tsx` to show an "Analyze with AI" option after upload.
- Add an "Apply to profile" flow that pre-fills registration/editing fields from extracted data (user confirms before saving).

## Phase 2 — Natural-Language Record Search

Goal: Users type questions like "show my 2023 thyroid reports" and get the right documents.

### Backend
- New Edge Function: `search-documents`
  - Embeds the query with `google/gemini-embedding-001`
  - Calls the `match_documents` SQL function against `document_chunks`
  - Returns ranked snippets with signed document URLs

### Frontend
- Add a search bar to the health card / documents view.
- Show result snippets grouped by document.

## Phase 3 — Emergency One-Page Summary

Goal: When a doctor scans the QR code, they see a concise AI-generated critical summary alongside raw records.

### Backend
- New Edge Function: `generate-emergency-summary`
  - Gathers patient profile + recent document chunks
  - Calls `google/gemini-3.6-flash` with a strict prompt to produce: current conditions, allergies, active medications, recent events, and emergency contact
  - Returns markdown summary (no raw data stored; generated on demand)

### Frontend
- Update `Emergency.tsx` to request and render the summary above the document list.
- Keep the existing zero-persistence behavior: summary lives only in memory and is wiped on page close.

## Phase 4 — Health Assistant Chatbot

Goal: A private in-app chat that answers questions about the user's own records and general wellness.

### Decisions already made
- One continuous conversation (not threaded)
- Database-persisted history

### Database changes
- Create `chat_messages` table:
  - `id uuid`, `user_id uuid`, `role text`, `content text`, `parts jsonb`, `created_at timestamptz`
  - RLS: users can only read/write their own messages

### Backend
- New Edge Function: `chat`
  - Streaming response via AI SDK `streamText` + `toUIMessageStreamResponse`
  - On each message: embed the query, retrieve relevant `document_chunks`, inject them as context
  - Model: `google/gemini-3.6-flash` for cost-efficient RAG chat
  - `onFinish`: persist the assistant message to `chat_messages`

### Frontend
- Add a floating chat button on the health card screen.
- Build the chat UI using AI Elements (`conversation`, `message`, `prompt-input`, `shimmer`).
- Load existing messages from the database on open.

## Privacy & Security

- All AI calls happen in Supabase Edge Functions; `LOVABLE_API_KEY` and patient data never reach the browser.
- Documents are chunked and stored with owner-only RLS.
- Emergency summary is generated on demand and never cached.
- Chat history is scoped to the authenticated user.
- No patient data is used to train models; Lovable AI Gateway passes data through without retention.

## Models

- Document extraction & chat: `google/gemini-3.6-flash` (default), with `google/gemini-2.5-pro` as fallback for poor-quality scans.
- Embeddings: `google/gemini-embedding-001`.
- All model IDs are exact Gateway-allowed values.

## Suggested first step

Approve this plan and I'll start with **Phase 1: Smart Document Reading**, which immediately improves the upload experience and lays the vector-search foundation for Phases 2–4.