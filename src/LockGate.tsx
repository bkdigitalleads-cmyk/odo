import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState as RNAppState, Keyboard, StyleSheet, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme, fonts } from './theme';
import { PillButton } from './components';
import Icon from './icons';
import { useApp } from './state';

const LockCtx = createContext<{ locked: boolean; unlock: () => void }>({
  locked: false,
  unlock: () => {},
});

/**
 * Face ID can never succeed on this phone any more (Face ID and the passcode
 * were removed). Keeping the lock on would trap the log behind it, and the
 * only way out would be deleting the app and the log with it.
 */
const CANNOT_AUTHENTICATE = new Set(['not_enrolled', 'passcode_not_set', 'not_available']);

/**
 * When Face ID lock is enabled, covers the app with an unlock screen
 * on launch and whenever the app returns from background.
 *
 * The app stays mounted underneath, so a drive that is half typed is still
 * there after unlocking (AUDIT 5).
 */
export default function LockGate({ children }: { children: React.ReactNode }) {
  const { settings, updateSettings, ready } = useApp();
  const [locked, setLocked] = useState(settings.lockEnabled);
  const authInFlight = useRef(false);
  const wasBackground = useRef(false);

  const unlock = useCallback(async () => {
    if (authInFlight.current) return;
    authInFlight.current = true;
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock your driving log',
      });
      if (res.success) {
        setLocked(false);
      } else if (CANNOT_AUTHENTICATE.has(res.error)) {
        setLocked(false);
        updateSettings({ lockEnabled: false }).catch(() => {});
      }
    } catch {
      // stay locked; the Unlock button tries again
    } finally {
      authInFlight.current = false;
    }
  }, [updateSettings]);

  // Lock state must follow the setting once loaded.
  useEffect(() => {
    if (!ready) return;
    setLocked(settings.lockEnabled);
    if (settings.lockEnabled) unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, settings.lockEnabled]);

  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state === 'background') {
        wasBackground.current = true;
        if (settings.lockEnabled) {
          Keyboard.dismiss();
          setLocked(true);
        }
      } else if (state === 'active' && wasBackground.current) {
        wasBackground.current = false;
        if (settings.lockEnabled) unlock();
      }
    });
    return () => sub.remove();
  }, [settings.lockEnabled, unlock]);

  const isLocked = settings.lockEnabled && locked;

  return (
    <LockCtx.Provider value={{ locked: isLocked, unlock }}>
      <View
        style={{ flex: 1 }}
        accessibilityElementsHidden={isLocked}
        importantForAccessibility={isLocked ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
      <LockOverlay />
    </LockCtx.Provider>
  );
}

/** True while the Face ID lock screen is up. */
export function useLocked(): boolean {
  return useContext(LockCtx).locked;
}

/**
 * The unlock screen. LockGate draws one over the root view; every Modal
 * that shows the log draws its own too (drive form, PDF preview), because
 * iOS presents Modals above the root view and a root overlay alone would
 * not cover them.
 */
export function LockOverlay() {
  const theme = useTheme();
  const { locked, unlock } = useContext(LockCtx);
  if (!locked) return null;

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.container, { backgroundColor: theme.bg }]}
      accessibilityViewIsModal
    >
      <View style={styles.icon}>
        <Icon name="lock" size={44} color={theme.accent} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>Odo is locked</Text>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        Your driving log is protected with Face ID.
      </Text>
      <View style={{ marginTop: 20 }}>
        <PillButton theme={theme} label="Unlock" onPress={unlock} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 32, zIndex: 1000 },
  icon: { marginBottom: 12 },
  title: { fontSize: 24, fontFamily: fonts.heading },
  sub: { fontSize: 15, marginTop: 6, textAlign: 'center' },
});
