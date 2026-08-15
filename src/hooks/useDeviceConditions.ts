import { useEffect, useState } from 'react';

export interface DeviceConditions {
  batteryLevel: number | null; // 0..1 or null if unknown
  charging: boolean | null;
  saveData: boolean;
  lowMemory: boolean;
  slowConnection: boolean;
  reducedMotion: boolean;
  /** True when sustained frame-rate loss suggests the device is throttling (overheating). */
  thermalThrottling: boolean;
  /** True when we should aggressively reduce work (animations, polling, media). */
  powerSaver: boolean;
}

interface BatteryLike extends EventTarget {
  level: number;
  charging: boolean;
}

const getConnection = (): any => {
  if (typeof navigator === 'undefined') return null;
  return (
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection ||
    null
  );
};

const readReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
};

let cached: DeviceConditions | null = null;
const listeners = new Set<(c: DeviceConditions) => void>();

const publish = (next: DeviceConditions) => {
  cached = next;
  // Toggle global classes so CSS can react app-wide.
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('power-saver', next.powerSaver);
    document.documentElement.classList.toggle('save-data', next.saveData);
  }
  listeners.forEach((l) => l(next));
};

// Browsers expose no thermal API, so we infer heat-related throttling from a
// sustained drop in frame rate while the tab is visible.
let thermalThrottling = false;

const startThermalWatch = (onChange: () => void) => {
  if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') return;
  let frames = 0;
  let windowStart = performance.now();
  let slowWindows = 0;

  const tick = (now: number) => {
    frames += 1;
    const elapsed = now - windowStart;
    if (elapsed >= 2000) {
      const fps = (frames * 1000) / elapsed;
      const visible = typeof document === 'undefined' || !document.hidden;
      if (visible && fps < 20) {
        slowWindows += 1;
      } else if (fps > 40) {
        slowWindows = 0;
      }
      const next = slowWindows >= 3;
      if (next !== thermalThrottling) {
        thermalThrottling = next;
        onChange();
      }
      frames = 0;
      windowStart = now;
    }
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
};

const compute = (
  battery: BatteryLike | null,
  reducedMotion: boolean
): DeviceConditions => {
  const conn = getConnection();
  const saveData = !!conn?.saveData;
  const effectiveType: string | undefined = conn?.effectiveType;
  const slowConnection =
    !!effectiveType && ['slow-2g', '2g', '3g'].includes(effectiveType);
  const deviceMemory = (navigator as any).deviceMemory as number | undefined;
  const lowMemory = typeof deviceMemory === 'number' && deviceMemory <= 2;

  const batteryLevel = battery ? battery.level : null;
  const charging = battery ? battery.charging : null;
  const lowBattery =
    batteryLevel !== null && !charging && batteryLevel <= 0.2;

  const powerSaver =
    saveData ||
    lowBattery ||
    thermalThrottling ||
    (lowMemory && slowConnection) ||
    reducedMotion;

  return {
    batteryLevel,
    charging,
    saveData,
    lowMemory,
    slowConnection,
    reducedMotion,
    thermalThrottling,
    powerSaver,
  };
};

let initialized = false;

const init = async () => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  let battery: BatteryLike | null = null;
  const nav: any = navigator;
  if (typeof nav.getBattery === 'function') {
    try {
      battery = await nav.getBattery();
    } catch {
      battery = null;
    }
  }

  const refresh = () => publish(compute(battery, readReducedMotion()));

  if (battery) {
    battery.addEventListener('levelchange', refresh);
    battery.addEventListener('chargingchange', refresh);
  }

  const conn = getConnection();
  conn?.addEventListener?.('change', refresh);

  const mm = window.matchMedia('(prefers-reduced-motion: reduce)');
  mm.addEventListener?.('change', refresh);

  startThermalWatch(refresh);

  refresh();
};

export const useDeviceConditions = (): DeviceConditions => {
  const [state, setState] = useState<DeviceConditions>(
    () =>
      cached ?? {
        batteryLevel: null,
        charging: null,
        saveData: false,
        lowMemory: false,
        slowConnection: false,
        reducedMotion: readReducedMotion(),
        thermalThrottling: false,
        powerSaver: false,
      }
  );

  useEffect(() => {
    listeners.add(setState);
    init();
    if (cached) setState(cached);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
};
