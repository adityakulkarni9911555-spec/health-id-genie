import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, X, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SecureDocumentViewerProps {
  name: string;
  url: string;
  type: string | null;
  /** Short session identifier burned into the watermark */
  sessionId: string;
  onClose: () => void;
}

/**
 * Full-screen viewer for emergency medical records.
 * - Burns a forensic watermark (session + timestamp) across the document.
 * - Shields the report header band, which on Indian lab reports carries the
 *   patient's address, phone and billing details. Clinicians can reveal it.
 * - Blocks right-click / drag-save / text selection / printing.
 */
export const SecureDocumentViewer = ({
  name,
  url,
  type,
  sessionId,
  onClose,
}: SecureDocumentViewerProps) => {
  const [revealHeader, setRevealHeader] = useState(false);

  const stamp = useMemo(() => {
    const now = new Date();
    const time = now.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `MEDORA CLINICAL ACCESS · ${time} · SESSION ${sessionId} · DPDP ACT PROTECTED`;
  }, [sessionId]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const isImage = (type ?? '').startsWith('image/') || /\.(png|jpe?g|webp|gif|heic)$/i.test(name);

  return (
    <div
      className="fixed inset-0 z-50 bg-background/98 backdrop-blur-sm flex flex-col no-print"
      role="dialog"
      aria-modal="true"
      aria-label={`Protected view of ${name}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header controls */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-[11px] text-muted-foreground">
            Protected view · access logged
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px]"
          onClick={() => setRevealHeader((v) => !v)}
        >
          {revealHeader ? (
            <>
              <EyeOff className="w-4 h-4 mr-1.5" />
              Hide identity
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-1.5" />
              Reveal identity
            </>
          )}
        </Button>
        <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={onClose} aria-label="Close document">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-2 px-4 py-2 bg-primary/5 border-b border-border">
        <ShieldAlert className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Personal details (address, phone, billing) are shielded. Clinical
          findings are fully visible. This view is stamped with the session ID
          and time — photographs and screenshots remain traceable.
        </p>
      </div>

      {/* Document surface */}
      <div className="relative flex-1 overflow-auto bg-muted/30">
        <div className="relative min-h-full w-full select-none">
          {isImage ? (
            <img
              src={url}
              alt={name}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className="w-full h-auto pointer-events-none"
            />
          ) : (
            <iframe
              src={url}
              title={name}
              className="w-full h-full min-h-[70vh] border-0 bg-white"
            />
          )}

          {/* Identity shield over the report header band */}
          {!revealHeader && (
            <div className="absolute inset-x-0 top-0 h-[18%] min-h-[90px] pointer-events-none">
              <div className="absolute inset-0 backdrop-blur-xl bg-foreground/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-semibold tracking-wide uppercase text-background bg-foreground/60 rounded-full px-3 py-1">
                  Patient identity shielded
                </span>
              </div>
            </div>
          )}

          {/* Forensic watermark */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.16]"
          >
            <div className="absolute -inset-1/2 rotate-[-30deg] flex flex-col gap-10 justify-center">
              {Array.from({ length: 14 }).map((_, i) => (
                <p
                  key={i}
                  className="whitespace-nowrap text-foreground font-semibold text-[13px] tracking-wider"
                >
                  {`${stamp}   ·   ${stamp}   ·   ${stamp}`}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="px-4 py-2 text-center text-[11px] text-muted-foreground border-t border-border bg-card">
        {stamp}
      </p>
    </div>
  );
};
