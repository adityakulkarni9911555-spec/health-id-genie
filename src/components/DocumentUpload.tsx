import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileText, Upload, X, Loader2, Paperclip } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface PatientDocument {
  path: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

interface DocumentUploadProps {
  documents: PatientDocument[];
  onChange: (docs: PatientDocument[]) => void;
  /** When provided, files are uploaded immediately under this folder. */
  uploadImmediately?: {
    upload: (file: File) => Promise<PatientDocument>;
  };
  /** When true, files are held as pending uploads (used pre-registration). */
  pendingFiles?: File[];
  onPendingChange?: (files: File[]) => void;
  maxSizeMB?: number;
  disabled?: boolean;
}

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'application/pdf',
]);
const ACCEPT = Array.from(ALLOWED_TYPES).join(',');
const MAX_FILES = 10;

export const DocumentUpload = ({
  documents,
  onChange,
  uploadImmediately,
  pendingFiles = [],
  onPendingChange,
  maxSizeMB = 10,
  disabled,
}: DocumentUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);

    if (documents.length + pendingFiles.length + list.length > MAX_FILES) {
      toast({
        title: 'Too many files',
        description: `You can attach up to ${MAX_FILES} files.`,
        variant: 'destructive',
      });
      return;
    }

    for (const file of list) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds ${maxSizeMB} MB.`,
          variant: 'destructive',
        });
        return;
      }
      if (file.type && !ALLOWED_TYPES.has(file.type)) {
        toast({
          title: 'Unsupported file type',
          description: `${file.name} must be a PDF or image (PNG, JPG, WEBP, HEIC).`,
          variant: 'destructive',
        });
        return;
      }
    }


    if (uploadImmediately) {
      setUploading(true);
      try {
        const uploaded: PatientDocument[] = [];
        for (const file of list) {
          const doc = await uploadImmediately.upload(file);
          uploaded.push(doc);
        }
        onChange([...documents, ...uploaded]);
        toast({
          title: 'Uploaded',
          description: `${uploaded.length} file(s) added to the record.`,
        });
      } catch (err) {
        console.error(err);
        toast({
          title: 'Upload failed',
          description: 'Could not upload one or more files. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setUploading(false);
      }
    } else if (onPendingChange) {
      onPendingChange([...pendingFiles, ...list]);
    }

    if (inputRef.current) inputRef.current.value = '';
  };

  const removePending = (idx: number) => {
    if (!onPendingChange) return;
    onPendingChange(pendingFiles.filter((_, i) => i !== idx));
  };

  const removeUploaded = (idx: number) => {
    onChange(documents.filter((_, i) => i !== idx));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-foreground flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-primary" />
        Documents & Reports
        <span className="text-xs font-normal text-muted-foreground">
          (PDF or images, up to {maxSizeMB} MB each)
        </span>
      </Label>

      <div
        className="rounded-2xl border-2 border-dashed border-input bg-card hover:border-primary/50 transition-colors p-5 md:p-6 text-center cursor-pointer"
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
          )}
          <p className="text-sm md:text-base font-medium text-foreground">
            {uploading ? 'Uploading…' : 'Tap or drop files to upload'}
          </p>
          <p className="text-xs text-muted-foreground">
            Prescriptions, reports, ID proofs, insurance card
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={disabled || uploading}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Choose files
          </Button>
        </div>
      </div>

      {(pendingFiles.length > 0 || documents.length > 0) && (
        <ul className="space-y-2">
          {documents.map((doc, idx) => (
            <li
              key={`u-${idx}`}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
            >
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(doc.size)} · Uploaded
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeUploaded(idx)}
                aria-label={`Remove ${doc.name}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </li>
          ))}
          {pendingFiles.map((file, idx) => (
            <li
              key={`p-${idx}`}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(file.size)} · Ready to upload
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removePending(idx)}
                aria-label={`Remove ${file.name}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
