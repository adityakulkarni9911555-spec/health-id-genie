import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'patient-documents';
const OUT_W = 360;
const OUT_H = 440; // 18:22, same ratio as the card photo box
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

/** Center-crop and downscale any image to a compact JPEG. */
async function cropToCardPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process this image.');
  const scale = Math.max(OUT_W / bitmap.width, OUT_H / bitmap.height);
  const sw = OUT_W / scale;
  const sh = OUT_H / scale;
  const sx = (bitmap.width - sw) / 2;
  const sy = (bitmap.height - sh) * 0.3; // bias toward the top so faces stay in frame
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, OUT_W, OUT_H);
  ctx.drawImage(bitmap, sx, Math.max(0, sy), sw, sh, 0, 0, OUT_W, OUT_H);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not process this image.'))),
      'image/jpeg',
      0.86,
    ),
  );
}

export async function uploadPatientPhoto(
  patientId: string,
  file: File,
  previousPath?: string,
): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('Image is too large (max 12 MB).');

  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error('You must be signed in to add a photo.');

  const blob = await cropToCardPhoto(file);
  const path = `${userId}/${patientId}/profile/photo_${Date.now()}.jpg`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (upErr) throw upErr;

  const { error: dbErr } = await supabase
    .from('patients')
    .update({ photo_path: path })
    .eq('id', patientId);
  if (dbErr) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw dbErr;
  }

  if (previousPath) await supabase.storage.from(BUCKET).remove([previousPath]);
  return path;
}

export async function removePatientPhoto(patientId: string, path?: string): Promise<void> {
  const { error } = await supabase.from('patients').update({ photo_path: null }).eq('id', patientId);
  if (error) throw error;
  if (path) await supabase.storage.from(BUCKET).remove([path]);
}

export async function getPhotoSignedUrl(path: string, expiresIn = 60 * 60): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Signed URL for the owner's profile photo (private bucket). */
export function usePatientPhotoUrl(path?: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    getPhotoSignedUrl(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return url;
}

/** Photo as a data URL for embedding in the PDF. */
export async function fetchPhotoDataUrl(path: string): Promise<string | null> {
  const url = await getPhotoSignedUrl(path, 120);
  if (!url) return null;
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
