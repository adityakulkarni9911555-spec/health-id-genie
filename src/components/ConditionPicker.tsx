import { useMemo, useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CONDITION_GROUPS, ALL_LISTED_CONDITIONS } from '@/lib/conditionCatalog';

interface Props {
  value: string[];
  onToggle: (condition: string) => void;
  onAdd: (condition: string) => void;
}

export function ConditionPicker({ value, onToggle, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState('');
  const q = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      CONDITION_GROUPS.map((g) => ({ ...g, items: q ? g.items.filter((i) => i.toLowerCase().includes(q)) : g.items })).filter(
        (g) => g.items.length > 0,
      ),
    [q],
  );
  const extras = value.filter((v) => !ALL_LISTED_CONDITIONS.includes(v));

  const addCustom = () => {
    const v = custom.trim().slice(0, 80);
    if (v.length < 2 || value.some((c) => c.toLowerCase() === v.toLowerCase()) || value.length >= 30) return;
    onAdd(v);
    setCustom('');
  };

  return (
    <div className="space-y-4">
      {value.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Selected ({value.length})</p>
          <div className="flex flex-wrap gap-2">
            {value.map((c) => (
              <button key={c} type="button" onClick={() => onToggle(c)}
                className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground"
                aria-label={`Remove ${c}`}>
                {c} <X className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search long-term conditions" className="h-12 pl-9" />
      </div>

      <div className="max-h-[420px] space-y-4 overflow-y-auto rounded-xl border border-border p-3">
        {groups.length === 0 && <p className="text-sm text-muted-foreground">No match — add it below.</p>}
        {groups.map((g) => (
          <div key={g.group}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.group}</p>
            <div className="flex flex-wrap gap-2">
              {g.items.map((c) => {
                const on = value.includes(c);
                return (
                  <button key={c} type="button" aria-pressed={on} onClick={() => onToggle(c)}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
                      on ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-input bg-card text-foreground hover:border-primary/50'
                    }`}>
                    {on && <Check className="h-3.5 w-3.5" />}
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs text-muted-foreground">Not listed, or a short-term illness? Type it and tap Add.</p>
        <div className="flex gap-2">
          <Input value={custom} maxLength={80} onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            placeholder="e.g. Viral fever (this week)" className="h-12" />
          <Button type="button" variant="outline" className="h-12" onClick={addCustom}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </div>
        {extras.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Added by you: {extras.join(', ')}</p>}
      </div>
    </div>
  );
}
