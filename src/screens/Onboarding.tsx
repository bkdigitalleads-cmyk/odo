import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, fonts } from '../theme';
import { PillButton } from '../components';
import { useApp } from '../state';
import { STATE_REQS, CUSTOM_CODE } from '../states';

const { width } = Dimensions.get('window');

/**
 * Stored locally only (never leaves the device). Doubles as backup
 * attribution and as a future paywall-routing signal by traffic source.
 */
export const SOURCE_KEY = 'odo.source.v1';

const SOURCES = [
  'App Store search',
  'TikTok / Instagram',
  'Parent or friend',
  'Somewhere else',
];

const SLIDES: { icon: string; title: string; body: string }[] = [
  {
    icon: '🚗',
    title: 'Every practice drive,\nlogged in seconds',
    body: 'Park, tap ＋, done. Date, minutes, night time and who supervised — the whole drive captured before you’re out of the driveway.',
  },
  {
    icon: '⏱️',
    title: 'Watch the hours\nadd up',
    body: 'Your state’s required hours — total and night — fill up drive by drive. Always know exactly how far from the license you are.',
  },
  {
    icon: '📄',
    title: 'A log the DMV\nwill love',
    body: 'One tap turns your drives into an official-style PDF with totals and signature lines. No crumpled paper log in the glovebox.',
  },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const { updateSettings } = useApp();
  const [page, setPage] = useState(0);
  const [step, setStep] = useState<'slides' | 'state' | 'source'>('slides');
  const scrollRef = useRef<ScrollView>(null);
  const last = page === SLIDES.length - 1;

  const next = () => {
    if (last) {
      setStep('state');
      return;
    }
    const target = page + 1;
    scrollRef.current?.scrollTo({ x: target * width, animated: true });
    setPage(target);
  };

  const pickState = (code: string) => {
    updateSettings({ stateCode: code }).catch(() => {});
    setStep('source');
  };

  const pickSource = (source: string) => {
    AsyncStorage.setItem(SOURCE_KEY, source).catch(() => {});
    onDone();
  };

  if (step === 'state') {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.stateWrap}>
          <Text style={[styles.title, { color: theme.text }]}>
            Which state's license?
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary, marginTop: 8 }]}>
            We'll set your required practice hours automatically. You can change this
            or set a custom goal any time.
          </Text>
        </View>
        <FlatList
          data={[
            ...STATE_REQS,
            { code: CUSTOM_CODE, name: 'Somewhere else / custom', totalHours: null, nightHours: 0 },
          ]}
          keyExtractor={(s) => s.code}
          contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => pickState(item.code)}
              style={({ pressed }) => [
                styles.stateBtn,
                {
                  backgroundColor: pressed ? theme.accentSoft : theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.stateName, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.stateReq, { color: theme.textFaint }]}>
                {item.code === CUSTOM_CODE
                  ? ''
                  : item.totalHours != null
                    ? `${item.totalHours}h${item.nightHours ? ` · ${item.nightHours}🌙` : ''}`
                    : 'no minimum'}
              </Text>
            </Pressable>
          )}
        />
      </View>
    );
  }

  if (step === 'source') {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.sourceWrap}>
          <Text style={[styles.title, { color: theme.text }]}>
            Where did you hear about Odo?
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary, marginTop: 10 }]}>
            One tap — it helps us make the app better.
          </Text>
          <View style={styles.sourceList}>
            {SOURCES.map((s) => (
              <Pressable
                key={s}
                onPress={() => pickSource(s)}
                style={({ pressed }) => [
                  styles.sourceBtn,
                  {
                    backgroundColor: pressed ? theme.accentSoft : theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.sourceText, { color: theme.text }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {SLIDES.map((s) => (
          <View key={s.title} style={[styles.slide, { width }]}>
            <Text style={styles.icon}>{s.icon}</Text>
            <Text style={[styles.title, { color: theme.text }]}>{s.title}</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === page ? theme.accent : theme.border },
              ]}
            />
          ))}
        </View>
        <PillButton theme={theme} label={last ? 'Set up my log' : 'Continue'} onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  icon: { fontSize: 56, marginBottom: 20 },
  title: {
    fontSize: 28,
    fontWeight: fonts.weight.bold,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 14,
  },
  body: { fontSize: 17, lineHeight: 25, textAlign: 'center' },
  footer: { padding: 24, paddingBottom: 40, gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stateWrap: { paddingTop: 40, paddingHorizontal: 32, paddingBottom: 16 },
  stateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  stateName: { fontSize: 16, fontWeight: fonts.weight.medium },
  stateReq: { fontSize: 13 },
  sourceWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  sourceList: { marginTop: 28, gap: 12 },
  sourceBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  sourceText: { fontSize: 17, fontWeight: fonts.weight.medium },
});
