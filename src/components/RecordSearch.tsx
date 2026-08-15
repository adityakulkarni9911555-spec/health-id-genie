import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, Sparkles, FileText } from 'lucide-react';

interface RecordSearchProps {
  patientId: string;
}

interface SearchMatch {
  id: string;
  document_path: string;
  content: string;
  similarity: number;
}

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
  const { toast } = useToast();

  const runSearch = async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setLoading(true);
    setAnswer(null);
    setMatches(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-records', {
        body: { patient_id: patientId, query: trimmed },
      });
      if (error) throw error;
      setAnswer(data?.answer ?? null);
      setMatches((data?.results ?? []) as SearchMatch[]);
    } catch (err) {
      console.error(err);
      toast({
        title: 'Search failed',
        description:
          err instanceof Error ? err.message : 'Please try again in a moment.',
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
            <span className="text-sm font-semibold">Answer from your records</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{answer}</p>
        </div>
      )}

      {matches && matches.length === 0 && !loading && (
        <p className="mt-5 text-sm text-muted-foreground">
          Nothing matched yet. Upload a document and tap “Analyze with AI” so it becomes searchable.
        </p>
      )}

      {matches && matches.length > 0 && (
        <ul className="mt-4 space-y-2">
          {matches.map((m) => (
            <li key={m.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate">{m.document_path.split('/').pop()}</span>
                <span className="ml-auto">{Math.round(m.similarity * 100)}% match</span>
              </div>
              <p className="text-sm text-foreground">{m.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
