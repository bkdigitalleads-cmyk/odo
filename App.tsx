import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { useTheme, fonts, FONT_FILES } from './src/theme';
import Icon, { IconName } from './src/icons';
import { AppProvider, useApp, ONBOARDED_KEY } from './src/state';
import LockGate from './src/LockGate';
import HomeScreen from './src/screens/Home';
import ReportScreen from './src/screens/Report';
import SettingsScreen from './src/screens/Settings';
import DriveFormModal from './src/screens/DriveForm';
import PaywallModal from './src/screens/Paywall';
import Onboarding from './src/screens/Onboarding';
import Welcome, { TrialSteps } from './src/screens/Welcome';
import { countDrives } from './src/db';
import { maybeRequestReviewOnLaunch } from './src/reviews';

const PRIVACY_URL = 'https://bkdigitalleads-cmyk.github.io/odo/privacy.html';

type Tab = 'drives' | 'log' | 'settings';

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'drives', label: 'Drives', icon: 'car' },
  { key: 'log', label: 'Log', icon: 'log' },
  { key: 'settings', label: 'Settings', icon: 'gear' },
];

function Shell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, isPro, showPaywall, paywallVisible } = useApp();
  const [tab, setTab] = useState<Tab>('drives');
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  // New installs: value screens, setup questions, trial and reminder screens, then the paywall.
  const [step, setStep] = useState<'welcome' | 'setup' | 'trial' | 'paywall'>('welcome');
  const paywallOpened = useRef(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    if (!ready || onboarded !== null) return;
    (async () => {
      if ((await AsyncStorage.getItem(ONBOARDED_KEY)) === '1') return setOnboarded(true);
      // Anyone who already has drives, or is Pro, has used Odo: no onboarding.
      if (isPro || (await countDrives()) > 0) {
        AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
        return setOnboarded(true);
      }
      setOnboarded(false);
    })().catch(() => setOnboarded(true)); // fail open: never trap the user
  }, [ready, onboarded, isPro]);

  const openOnboardingPaywall = () => {
    if (paywallOpened.current) return;
    paywallOpened.current = true;
    setStep('paywall');
    showPaywall();
  };

  const finishOnboarding = () => {
    setOnboarded(true);
    AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
  };

  // When the onboarding paywall closes (purchase or close button), onboarding is done.
  useEffect(() => {
    if (paywallOpened.current && !paywallVisible && onboarded === false) finishOnboarding();
  }, [paywallVisible, onboarded]);

  const openNewDrive = () => {
    setEditingId(null);
    setFormVisible(true);
  };

  const openDrive = (id: number) => {
    setEditingId(id);
    setFormVisible(true);
  };

  if (!ready || onboarded === null) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  if (!onboarded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        {step === 'welcome' && <Welcome onDone={() => setStep('setup')} />}
        {step === 'setup' && <Onboarding onDone={() => setStep('trial')} />}
        {step === 'trial' && <TrialSteps onDone={openOnboardingPaywall} />}
        <PaywallModal privacyUrl={PRIVACY_URL} onboarding />
      </View>
    );
  }

  return (
    <LockGate>
      <LaunchReview />
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        <View style={{ flex: 1 }}>
          {tab === 'drives' && <HomeScreen onAddDrive={openNewDrive} onOpenDrive={openDrive} />}
          {tab === 'log' && <ReportScreen />}
          {tab === 'settings' && <SettingsScreen />}
        </View>
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={styles.tabItem}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Icon name={t.icon} size={24} color={active ? theme.accent : theme.textFaint} />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? theme.accent : theme.textFaint },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <DriveFormModal
          visible={formVisible}
          driveId={editingId}
          onClose={() => setFormVisible(false)}
        />
        <PaywallModal privacyUrl={PRIVACY_URL} />
      </View>
    </LockGate>
  );
}

/** Once per launch, after any Face ID unlock: the "later calendar day" rating trigger. */
function LaunchReview() {
  useEffect(() => {
    maybeRequestReviewOnLaunch();
  }, []);
  return null;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="auto" />
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 11, fontWeight: fonts.weight.medium },
});
