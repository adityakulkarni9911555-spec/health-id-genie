import { Capacitor, registerPlugin } from '@capacitor/core';

interface CardFilePlugin {
  savePdf(options: { data: string; filename: string }): Promise<{ saved: boolean }>;
}
const CardFile = registerPlugin<CardFilePlugin>('CardFile');

export type PdfFile = { blob: Blob; filename: string };

export async function deliverPdf({ blob, filename }: PdfFile): Promise<'saved' | 'shared' | 'cancelled'> {
  if (Capacitor.isNativePlatform()) {
    if (!Capacitor.isPluginAvailable('CardFile')) {
      throw new Error('Install the updated Medora Android app to save your card. This version does not support PDF saving.');
    }
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result.split(',')[1] ?? '') : reject(new Error('Could not prepare your card.'));
      reader.onerror = () => reject(new Error('Could not prepare your card.'));
      reader.readAsDataURL(blob);
    });
    const result = await CardFile.savePdf({ data, filename });
    return result.saved ? 'saved' : 'cancelled';
  }

  const file = new File([blob], filename, { type: 'application/pdf' });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Medora health card' });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
      throw new Error('Could not open file sharing. Please try again.');
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'saved';
}