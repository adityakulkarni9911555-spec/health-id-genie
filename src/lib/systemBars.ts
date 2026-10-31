import { Capacitor, registerPlugin } from '@capacitor/core';

const systemBars = registerPlugin<{
  setAppearance(options: { color: number; darkIcons: boolean }): Promise<void>;
}>('SystemBars');

export function syncSystemBars(dark: boolean) {
  const root = document.documentElement;
  // Resolve the same semantic surface used by the page, including dark mode.
  const probe = document.createElement('span');
  probe.style.color = 'hsl(var(--background))';
  probe.hidden = true;
  root.appendChild(probe);
  const channels = getComputedStyle(probe).color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  probe.remove();
  if (!channels || channels.length !== 3) return;
  const [r, g, b] = channels;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = `rgb(${r}, ${g}, ${b})`;
  if (Capacitor.getPlatform() !== 'android' || !Capacitor.isPluginAvailable('SystemBars')) return;
  const color = (255 << 24) | (r << 16) | (g << 8) | b;
  // Old APKs and interrupted bridges must not prevent the page from opening.
  void systemBars.setAppearance({ color, darkIcons: !dark }).catch(() => {});
}