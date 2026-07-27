import { useDeviceConditions } from '@/hooks/useDeviceConditions';
import { BatteryLow, Gauge, WifiOff } from 'lucide-react';

export const DeviceConditionBanner = () => {
  const { powerSaver, batteryLevel, charging, saveData, slowConnection } =
    useDeviceConditions();

  if (!powerSaver) return null;

  const pct =
    typeof batteryLevel === 'number' ? Math.round(batteryLevel * 100) : null;

  const reason =
    pct !== null && !charging && batteryLevel! <= 0.2
      ? `Battery ${pct}% — power-saving mode on`
      : saveData
      ? 'Data Saver on — using lightweight mode'
      : slowConnection
      ? 'Slow connection — lightweight mode on'
      : 'Lightweight mode on';

  const Icon =
    pct !== null && pct <= 20 && !charging
      ? BatteryLow
      : saveData
      ? Gauge
      : WifiOff;

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-sm"
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="leading-tight">
        {reason}. Animations and background sync are reduced to save power.
      </span>
    </div>
  );
};
