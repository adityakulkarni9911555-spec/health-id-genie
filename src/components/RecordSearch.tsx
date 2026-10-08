import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, Sparkles, FileText, ExternalLink, Info } from 'lucide-react';
import { getSignedDocumentUrl } from '@/lib/patientDocuments';

interface RecordSearchProps {
  patientId: string;
}

interface SearchMatch {
  id: string;
  document_path: string;
  content: string;
  similarity: number;
  ref?: number;
  document_name?: string;
  document_date?: string | null;
  uploaded_at?: string | null;
  provider_name?: string | null;
}

const fmtDate = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const EXAMPLES = [
  'What medicines was I prescribed?',
  'Any allergy noted in my reports?',
  'When was my last blood test?',
];

export const RecordSearch = ({ patientId }: RecordSearchProps) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [matches, setMatches] = useState<SearchMatch[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  const viewOriginal = async (path: string) => {
    setOpening(path);
    try {
      const url = await getSignedDocumentUrl(path);
      if (!url) throw new Error('no url');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast({ title: 'Could not open document', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setOpening(null);
    }
  };
  const { toast } = useToast();

  const runSearch = async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setLoading(true);
    setAnswer(null);
    setMatches(null);
    setNotFound(false);
    try {
      const { data, error } = await supabase.functions.invoke('search-records', {
        body: { patient_id: patientId, query: trimmed },
      });
      if (error) throw error;
      setAnswer(data?.answer ?? null);
      setNotFound(!!data?.not_found);
      setMatches((data?.results ?? []) as SearchMatch[]);
    } catch (err) {
      console.error(err);
      toast({
        title: 'Search failed',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-section no-print">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Search className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">Search your records</h3>
          <p className="text-sm text-muted-foreground">
            Ask in plain language — Medora searches inside your analysed documents.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. what did the doctor prescribe for my fever?"
          className="input-touch flex-1"
          aria-label="Search your health records"
        />
        <Button type="submit" className="btn-touch" disabled={loading || query.trim().length < 2}>
          {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Search className="w-5 h-5 mr-2" />}
          Search
        </Button>
      </form>

      <div className="flex flex-wrap gap-2 mt-3">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setQuery(ex);
              runSearch(ex);
            }}
            className="text-xs px-3 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      {answer && (
        <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">AI-generated answer</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{answer}</p>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            AI-generated from your uploaded medical records. Verify important information against the original document.
          </p>
        </div>
      )}

      {notFound && matches && matches.length > 0 && !loading && (
        <p className="mt-5 text-sm text-muted-foreground">Information not found in your uploaded records.</p>
      )}

      {matches && matches.length === 0 && !loading && (
        <p className="mt-5 text-sm text-muted-foreground">
          Nothing matched yet. Upload a document and tap “Analyze with AI” so it becomes searchable.
        </p>
      )}

      {matches && matches.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Sources</p>
          <ul className="space-y-2">
            {matches.map((m) => {
              const docDate = fmtDate(m.document_date);
              const upDate = fmtDate(m.uploaded_at);
              return (
                <li key={m.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    {m.ref && <span className="font-semibold text-foreground">[{m.ref}]</span>}
                    <span className="truncate font-medium text-foreground">
                      {m.document_name || m.document_path.split('/').pop()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {[m.provider_name, docDate ? `Date from document: ${docDate}` : upDate ? `Upload date: ${upDate}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="text-sm text-foreground">{m.content}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 px-2 text-primary"
                    onClick={() => viewOriginal(m.document_path)}
                    disabled={opening === m.document_path}
                  >
                    {opening === m.document_path ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-1" />
                    )}
                    View original
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
