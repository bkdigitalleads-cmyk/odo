import React, { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, fonts } from '../theme';
import { PillButton, parseHours } from '../components';
import Icon from '../icons';
import { useApp } from '../state';
import { STATE_REQS, CUSTOM_CODE, getStateReq } from '../states';

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

/** Same fallback the Settings custom goal starts from. */
const FALLBACK_GOAL = { total: 50, night: 10 };

/** Setup questions after the value screens: state, hours already driven, source. */
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const { updateSettings } = useApp();
  const [step, setStep] = useState<'state' | 'prior' | 'source'>('state');
  const [enteringPrior, setEnteringPrior] = useState(false);
  const [dayText, setDayText] = useState('');
  const [nightText, setNightText] = useState('');
  const [priorError, setPriorError] = useState('');

  const pickState = (code: string) => {
    // Custom, or a state with no hour minimum: start from an editable 50/10 goal
    // so Settings shows the inputs (AUDIT 1).
    const needsGoal = code === CUSTOM_CODE || getStateReq(code)?.totalHours == null;
    updateSettings(
      needsGoal
        ? { stateCode: code, customTotalHours: FALLBACK_GOAL.total, customNightHours: FALLBACK_GOAL.night }
        : { stateCode: code, customTotalHours: null, customNightHours: null }
    ).catch(() => {});
    setStep('prior');
  };

  const savePrior = () => {
    const day = parseHours(dayText) ?? 0;
    const night = parseHours(nightText) ?? 0;
    if ((dayText.trim() && parseHours(dayText) == null) || (nightText.trim() && parseHours(nightText) == null)) {
      setPriorError('Use numbers only, like 12 or 12.5.');
      return;
    }
    if (day > 999 || night > 999) {
      setPriorError('That looks like a lot. Check the hours and try again.');
      return;
    }
    updateSettings({ priorDayMin: Math.round(day * 60), priorNightMin: Math.round(night * 60) }).catch(() => {});
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
          <Text style={[styles.title, { color: theme.text }]}>Which state's license?</Text>
          <Text style={[styles.body, { color: theme.textSecondary, marginTop: 8 }]}>
            We'll set your required practice hours automatically. You can change this or set a
            custom goal any time.
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
              <View style={styles.stateNameCol}>
                <Text style={[styles.stateName, { color: theme.text }]}>{item.name}</Text>
                {getStateReq(item.code)?.note ? (
                  <Text style={[styles.stateNote, { color: theme.textFaint }]}>{getStateReq(item.code)?.note}</Text>
                ) : null}
              </View>
              {item.code === CUSTOM_CODE ? null : item.totalHours != null ? (
                <View style={styles.stateReqRow}>
                  <Text style={[styles.stateReq, { color: theme.textFaint }]}>{item.totalHours}h</Text>
                  {item.nightHours > 0 && (
                    <>
                      <Icon name="moon" size={12} color={theme.textFaint} />
                      <Text style={[styles.stateReq, { color: theme.textFaint }]}>{item.nightHours}</Text>
                    </>
                  )}
                </View>
              ) : (
                <Text style={[styles.stateReq, { color: theme.textFaint }]}>no minimum</Text>
              )}
            </Pressable>
          )}
        />
      </View>
    );
  }

  if (step === 'prior') {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.centerWrap}>
          <View style={[styles.iconBadge, { backgroundColor: theme.asphalt }]}>
            <Icon name="road" size={32} color={theme.lane} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Already logged some hours?</Text>
          <Text style={[styles.body, { color: theme.textSecondary, marginTop: 10 }]}>
            If you kept a paper log or used another app, add those hours here. They count toward
            your goal, and your PDF shows them on their own line.
          </Text>

          {enteringPrior ? (
            <View style={{ marginTop: 24 }}>
              <View style={styles.priorRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.priorLabelRow}>
                    <Icon name="sun" size={14} color={theme.textSecondary} />
                    <Text style={[styles.priorLabel, { color: theme.textSecondary }]}>Day hours</Text>
                  </View>
                  <TextInput
                    style={[styles.priorInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                    value={dayText}
                    onChangeText={(t) => {
                      setDayText(t);
                      setPriorError('');
                    }}
                    placeholder="0"
                    placeholderTextColor={theme.textFaint}
                    keyboardType="decimal-pad"
                    maxLength={5}
                    autoFocus
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.priorLabelRow}>
                    <Icon name="moon" size={14} color={theme.textSecondary} />
                    <Text style={[styles.priorLabel, { color: theme.textSecondary }]}>Night hours</Text>
                  </View>
                  <TextInput
                    style={[styles.priorInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                    value={nightText}
                    onChangeText={(t) => {
                      setNightText(t);
                      setPriorError('');
                    }}
                    placeholder="0"
                    placeholderTextColor={theme.textFaint}
                    keyboardType="decimal-pad"
                    maxLength={5}
                  />
                </View>
              </View>
              <Text style={[styles.hint, { color: priorError ? theme.danger : theme.textFaint }]}>
                {priorError || 'You can change these later in Settings.'}
              </Text>
              <View style={{ marginTop: 18 }}>
                <PillButton theme={theme} label="Save and continue" onPress={savePrior} />
              </View>
            </View>
          ) : (
            <View style={styles.choiceList}>
              <Pressable
                onPress={() => setEnteringPrior(true)}
                style={({ pressed }) => [
                  styles.choiceBtn,
                  { backgroundColor: pressed ? theme.accentSoft : theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.choiceText, { color: theme.text }]}>Yes, enter my starting hours</Text>
              </Pressable>
              <Pressable
                onPress={() => setStep('source')}
                style={({ pressed }) => [
                  styles.choiceBtn,
                  { backgroundColor: pressed ? theme.accentSoft : theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.choiceText, { color: theme.text }]}>Starting from zero</Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.centerWrap}>
        <View style={[styles.iconBadge, { backgroundColor: theme.asphalt }]}>
          <Icon name="question" size={32} color={theme.lane} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Where did you hear about Odo?</Text>
        <Text style={[styles.body, { color: theme.textSecondary, marginTop: 10 }]}>
          One tap. It helps us make the app better.
        </Text>
        <View style={styles.choiceList}>
          {SOURCES.map((s) => (
            <Pressable
              key={s}
              onPress={() => pickSource(s)}
              style={({ pressed }) => [
                styles.choiceBtn,
                { backgroundColor: pressed ? theme.accentSoft : theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.choiceText, { color: theme.text }]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 30, lineHeight: 34, fontFamily: fonts.display },
  body: { fontSize: 17, lineHeight: 24 },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  stateWrap: { paddingTop: 40, paddingHorizontal: 28, paddingBottom: 16 },
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
  stateNameCol: { flex: 1, paddingRight: 10 },
  stateName: { fontSize: 16, fontWeight: fonts.weight.medium },
  stateNote: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  stateReqRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stateReq: { fontSize: 13 },
  centerWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  choiceList: { marginTop: 28, gap: 12 },
  choiceBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  choiceText: { fontSize: 17, fontWeight: fonts.weight.medium },
  priorRow: { flexDirection: 'row', gap: 12 },
  priorLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  priorLabel: { fontSize: 13, fontWeight: fonts.weight.semibold },
  priorInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 24,
    fontFamily: fonts.display,
  },
  hint: { fontSize: 13, marginTop: 10 },
});
