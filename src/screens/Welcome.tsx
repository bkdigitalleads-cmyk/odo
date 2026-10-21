import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fonts, Theme } from '../theme';
import { PillButton } from '../components';
import Icon, { IconName } from '../icons';
import { getOffering } from '../purchases';
import { getTrialEligibleIds, trialLabel } from '../trial';
import { requestReminderPermission } from '../reminder';

/**
 * First launch, in this order (App.tsx runs it):
 *   1-3. Welcome: three value screens, outcomes for the parent
 *   4-6. Onboarding.tsx: state, hours already driven, where they heard of Odo
 *   a.   TrialSteps "Try Odo Pro free"                      } only when RevenueCat says this
 *   b.   TrialSteps "We'll remind you before your trial ends" } Apple ID can get the free trial
 *   then the onboarding paywall.
 * In Free mode (Lifetime launch offer at 0) a and b are skipped.
 */
const VALUE: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'log',
    title: 'Walk into the DMV with the log done.',
    body: 'Every practice drive becomes a clean, signed log with your state’s totals, ready to print or hand over.',
  },
  {
    icon: 'flag',
    title: 'Always know how many hours are left.',
    body: 'Your state’s day and night requirement fills up drive by drive. No spreadsheets, no math at the kitchen table.',
  },
  {
    icon: 'timer',
    title: 'Log a drive before you’re out of the car.',
    body: 'Start the timer when you pull out, stop it when you park. Works offline, anywhere you drive.',
  },
];

interface TrialOffer {
  /** "3 days free" */
  label: string;
  /** "$4.99/week" */
  then: string;
}

let offerPromise: Promise<TrialOffer | null> | null = null;

/** The trial to offer, or null when not eligible, in Free mode, or the store can't answer. */
async function loadTrialOffer(): Promise<TrialOffer | null> {
  const off = await getOffering();
  if (!off) return null;
  if (off.lifetime && off.lifetime.product.price === 0) return null;
  // Weekly is the only plan with a trial, and Yearly is hidden from 1.0.7.
  const pkg = off.weekly;
  if (!pkg) return null;
  const label = trialLabel(pkg, await getTrialEligibleIds([pkg]));
  if (!label) return null;
  return { label, then: `${pkg.product.priceString}/week` };
}

/** Starts the eligibility check early; it is ready long before the trial screen. */
function trialOffer(): Promise<TrialOffer | null> {
  if (!offerPromise) offerPromise = loadTrialOffer().catch(() => null);
  return offerPromise;
}

export default function Welcome({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [step, setStep] = useState(0);

  useEffect(() => {
    trialOffer();
  }, []);

  const next = () => (step < VALUE.length - 1 ? setStep(step + 1) : onDone());
  const v = VALUE[step];

  return (
    <Screen
      theme={theme}
      icon={v.icon}
      title={v.title}
      body={v.body}
      dots={{ count: VALUE.length, active: step }}
      button="Continue"
      onPress={next}
    />
  );
}

/** The trial and reminder screens. Calls onDone right away when no trial is on offer. */
export function TrialSteps({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [offer, setOffer] = useState<TrialOffer | null | undefined>(undefined);
  const [step, setStep] = useState<'trial' | 'remind'>('trial');
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    let live = true;
    trialOffer().then((o) => {
      if (!live) return;
      if (o) setOffer(o);
      else onDone();
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!offer) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (step === 'trial') {
    return (
      <Screen
        theme={theme}
        icon="key"
        title="Try Odo Pro free"
        body={`${offer.label}, then ${offer.then}. Unlimited drives, the DMV-ready PDF, CSV export, and Face ID lock. Cancel anytime.`}
        button="Continue"
        onPress={() => setStep('remind')}
        noPayment
      />
    );
  }

  return (
    <Screen
      theme={theme}
      icon="bell"
      title={'We’ll remind you before your trial ends'}
      body={'We’ll send you a reminder 1 day before your free trial ends, so there are no surprises.'}
      button="Continue"
      waiting={waiting}
      onPress={async () => {
        // Ask for notifications, then on to the paywall whatever the answer.
        setWaiting(true);
        await requestReminderPermission();
        setWaiting(false);
        onDone();
      }}
    />
  );
}

function Screen({
  theme,
  icon,
  title,
  body,
  dots,
  button,
  onPress,
  waiting = false,
  noPayment = false,
}: {
  theme: Theme;
  icon: IconName;
  title: string;
  body: string;
  dots?: { count: number; active: number };
  button: string;
  onPress: () => void;
  waiting?: boolean;
  noPayment?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={styles.wrap}>
        <View style={[styles.iconBadge, { backgroundColor: theme.asphalt }]}>
          <Icon name={icon} size={34} color={theme.lane} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text>
      </View>
      {dots && (
        <View style={styles.dots}>
          {Array.from({ length: dots.count }, (_, i) => (
            <View
              key={i}
              style={[styles.dash, { backgroundColor: i === dots.active ? theme.accent : theme.border }]}
            />
          ))}
        </View>
      )}
      <View style={styles.footer}>
        {waiting ? (
          <ActivityIndicator color={theme.accent} style={{ height: 50 }} />
        ) : (
          <PillButton theme={theme} label={button} onPress={onPress} />
        )}
        {noPayment && (
          <View style={styles.noPaymentRow}>
            <Icon name="check" size={15} color={theme.success} strokeWidth={2.5} />
            <Text style={[styles.noPayment, { color: theme.success }]}>No payment now</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  wrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 32, lineHeight: 36, fontFamily: fonts.display },
  body: { fontSize: 17, lineHeight: 24, marginTop: 12 },
  // Lane-line dashes instead of dots.
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20 },
  dash: { width: 18, height: 4, borderRadius: 2 },
  footer: { paddingHorizontal: 24, gap: 12 },
  noPaymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  noPayment: { fontSize: 13, textAlign: 'center', fontWeight: fonts.weight.semibold },
});
