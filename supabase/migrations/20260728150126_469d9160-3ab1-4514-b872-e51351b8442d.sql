create extension if not exists vector;

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  document_path text not null,
  content text not null,
  embedding vector(3072) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.document_chunks to authenticated;
grant all on public.document_chunks to service_role;

alter table public.document_chunks enable row level security;

create policy "Users can manage their own document chunks"
on public.document_chunks
for all
to authenticated
using (exists (select 1 from public.patients p where p.id = patient_id and p.owner_id = auth.uid()))
with check (exists (select 1 from public.patients p where p.id = patient_id and p.owner_id = auth.uid()));

create index document_chunks_embedding_idx
on public.document_chunks using hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

create or replace function public.match_documents(
  query_embedding vector(3072),
  _patient_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  document_path text,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
security invoker
set search_path = public
as $$
  select
    d.id,
    d.document_path,
    d.content,
    d.metadata,
    1 - (d.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) as similarity
  from public.document_chunks d
  where d.patient_id = _patient_id
  order by d.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  limit match_count;
$$;