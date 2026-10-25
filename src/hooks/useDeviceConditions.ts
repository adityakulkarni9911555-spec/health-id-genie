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

interface ConnectionLike extends EventTarget {
  saveData?: boolean;
  effectiveType?: string;
}

type DeviceNavigator = Navigator & {
  connection?: ConnectionLike;
  mozConnection?: ConnectionLike;
  webkitConnection?: ConnectionLike;
  deviceMemory?: number;
  getBattery?: () => Promise<BatteryLike>;
};

interface BatteryLike extends EventTarget {
  level: number;
  charging: boolean;
}

const getConnection = (): ConnectionLike | null => {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as DeviceNavigator;
  return (
    nav.connection ||
    nav.mozConnection ||
    nav.webkitConnection ||
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
  let frameId: number | null = null;
  let sampleTimer: number | null = null;

  const stop = () => {
    if (frameId !== null) cancelAnimationFrame(frameId);
    if (sampleTimer !== null) window.clearTimeout(sampleTimer);
    frameId = null;
    sampleTimer = null;
    frames = 0;
    slowWindows = 0;
  };

  const tick = (now: number) => {
    frameId = null;
    if (document.hidden) return;
    frames += 1;
    const elapsed = now - windowStart;
    if (elapsed >= 2000) {
      const fps = (frames * 1000) / elapsed;
      if (fps < 20) {
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
      // Sample briefly every 30 seconds instead of keeping a frame loop alive.
      sampleTimer = window.setTimeout(start, 30000);
      return;
    }
    frameId = requestAnimationFrame(tick);
  };

  const start = () => {
    sampleTimer = null;
    if (document.hidden || frameId !== null) return;
    frames = 0;
    windowStart = performance.now();
    frameId = requestAnimationFrame(tick);
  };

  document.addEventListener('visibilitychange', () => {
    stop();
    if (!document.hidden) sampleTimer = window.setTimeout(start, 1000);
  });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', () => {
    if (!document.hidden && frameId === null && sampleTimer === null) {
      sampleTimer = window.setTimeout(start, 1000);
    }
  });
  sampleTimer = window.setTimeout(start, 3000);
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
  const deviceMemory = (navigator as DeviceNavigator).deviceMemory;
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
  const nav = navigator as DeviceNavigator;
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
