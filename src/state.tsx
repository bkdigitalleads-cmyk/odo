import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initPurchases, getIsPro } from './purchases';
import { getStateReq } from './states';

export interface Settings {
  lockEnabled: boolean;
  /** Two-letter state code, '' until chosen, 'XX' = custom goal. */
  stateCode: string;
  /** Custom goal overrides (used when stateCode is 'XX', or user overrides). */
  customTotalHours: number | null;
  customNightHours: number | null;
  driverName: string;
  supervisorName: string;
}

const DEFAULT_SETTINGS: Settings = {
  lockEnabled: false,
  stateCode: '',
  customTotalHours: null,
  customNightHours: null,
  driverName: '',
  supervisorName: '',
};

const SETTINGS_KEY = 'odo.settings.v1';

/** Drives allowed on the free tier. */
export const FREE_DRIVE_LIMIT = 10;

export interface Goal {
  totalHours: number;
  nightHours: number;
  /** Where the numbers came from, for UI copy. */
  source: 'state' | 'custom' | 'default';
}

/** Resolve the active practice goal from settings (state preset or custom). */
export function resolveGoal(settings: Settings): Goal {
  if (settings.customTotalHours != null) {
    return {
      totalHours: settings.customTotalHours,
      nightHours: settings.customNightHours ?? 0,
      source: 'custom',
    };
  }
  const req = getStateReq(settings.stateCode);
  if (req && req.totalHours != null) {
    return { totalHours: req.totalHours, nightHours: req.nightHours, source: 'state' };
  }
  return { totalHours: 50, nightHours: 10, source: 'default' };
}

interface AppState {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  goal: Goal;
  isPro: boolean;
  setIsPro: (v: boolean) => void;
  refreshPro: () => Promise<void>;
  paywallVisible: boolean;
  showPaywall: () => void;
  hidePaywall: () => void;
  ready: boolean;
  /** Bumped whenever drive data changes, so screens refetch. */
  dataVersion: number;
  bumpData: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isPro, setIsPro] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } catch {
        // corrupted settings -> defaults
      }
      try {
        await initPurchases();
        setIsPro(await getIsPro());
      } catch {
        setIsPro(false);
      }
      setReady(true);
    })();
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      try {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        // non-fatal
      }
    },
    [settings]
  );

  const refreshPro = useCallback(async () => {
    setIsPro(await getIsPro());
  }, []);

  const goal = useMemo(() => resolveGoal(settings), [settings]);

  const value = useMemo<AppState>(
    () => ({
      settings,
      updateSettings,
      goal,
      isPro,
      setIsPro,
      refreshPro,
      paywallVisible,
      showPaywall: () => setPaywallVisible(true),
      hidePaywall: () => setPaywallVisible(false),
      ready,
      dataVersion,
      bumpData: () => setDataVersion((v) => v + 1),
    }),
    [settings, updateSettings, goal, isPro, refreshPro, paywallVisible, ready, dataVersion]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
