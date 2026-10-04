import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, ImagePlus, Loader2, Trash2, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  uploadPatientPhoto,
  removePatientPhoto,
  usePatientPhotoUrl,
} from '@/lib/patientPhoto';

interface Props {
  patientId: string;
  fullName: string;
  photoPath?: string;
  onChange: (path: string | undefined) => void;
}

export const ProfilePhotoUploader = ({ patientId, fullName, photoPath, onChange }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const url = usePatientPhotoUrl(photoPath);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const path = await uploadPatientPhoto(patientId, file, photoPath);
      onChange(path);
      toast({ title: 'Profile photo updated', description: 'It now appears on your health card.' });
    } catch (e) {
      toast({
        title: 'Could not save photo',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await removePatientPhoto(patientId, photoPath);
      onChange(undefined);
      toast({ title: 'Photo removed' });
    } catch (e) {
      toast({
        title: 'Could not remove photo',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-section no-print">
      <div className="flex items-center gap-4">
        <div className="relative w-[72px] h-[88px] rounded-xl overflow-hidden bg-primary/10 border border-border flex items-center justify-center flex-shrink-0">
          {url ? (
            <img src={url} alt={`${fullName} profile`} className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-primary" />
          )}
          {busy && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground">Profile photo</h3>
          <p className="text-sm text-muted-foreground mt-0.5 mb-3">
            Shown on your profile, health card and downloaded PDF. Only you can see it here.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="w-4 h-4 mr-1.5" />
              {photoPath ? 'Change photo' : 'Upload photo'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="w-4 h-4 mr-1.5" />
              Take selfie
            </Button>
            {photoPath && (
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={handleRemove}>
                <Trash2 className="w-4 h-4 mr-1.5" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
};
