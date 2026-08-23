import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme, fonts, Theme } from '../theme';
import { Card, PillButton } from '../components';
import { useApp } from '../state';
import {
  countDrives,
  deleteDrive,
  getDrive,
  insertDrive,
  updateDrive,
  Weather,
  WEATHER_OPTIONS,
  ROAD_OPTIONS,
  fmtHours,
} from '../db';
import { maybeRequestReview } from '../reviews';

interface Props {
  visible: boolean;
  driveId: number | null; // null = new drive
  onClose: () => void;
}

const TIMER_KEY = 'odo.driveTimer.startedAt.v1';

function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function DriveFormModal({ visible, driveId, onClose }: Props) {
  const theme = useTheme();
  const { settings, updateSettings, bumpData } = useApp();
  const [date, setDate] = useState(todayIso());
  const [minutesText, setMinutesText] = useState('');
  const [nightText, setNightText] = useState('');
  const [weather, setWeather] = useState<Weather>('Clear');
  const [roads, setRoads] = useState<string[]>([]);
  const [supervisor, setSupervisor] = useState('');
  const [milesText, setMilesText] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const editing = driveId !== null;

  const reset = useCallback(() => {
    setDate(todayIso());
    setMinutesText('');
    setNightText('');
    setWeather('Clear');
    setRoads([]);
    setSupervisor(settings.supervisorName);
    setMilesText('');
    setNotes('');
  }, [settings.supervisorName]);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      if (driveId !== null) {
        const d = await getDrive(driveId);
        if (d) {
          setDate(d.date);
          setMinutesText(String(d.durationMin));
          setNightText(d.nightMin > 0 ? String(d.nightMin) : '');
          setWeather(d.weather || 'Clear');
          setRoads(d.roads ? d.roads.split(',') : []);
          setSupervisor(d.supervisor);
          setMilesText(d.miles > 0 ? String(d.miles) : '');
          setNotes(d.notes);
        }
      } else {
        reset();
        try {
          const raw = await AsyncStorage.getItem(TIMER_KEY);
          if (raw) setTimerStart(Number(raw));
        } catch {
          // timer state is a convenience only
        }
      }
    })();
  }, [visible, driveId, reset]);

  // Tick once a minute while the timer runs so the elapsed label stays live.
  useEffect(() => {
    if (timerStart != null && visible) {
      tick.current = setInterval(() => setNow(Date.now()), 30_000);
      return () => {
        if (tick.current) clearInterval(tick.current);
      };
    }
    return undefined;
  }, [timerStart, visible]);

  const startTimer = async () => {
    const t = Date.now();
    setTimerStart(t);
    setNow(t);
    try {
      await AsyncStorage.setItem(TIMER_KEY, String(t));
    } catch {
      // non-fatal
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const stopTimer = async () => {
    if (timerStart == null) return;
    const elapsedMin = Math.max(1, Math.round((Date.now() - timerStart) / 60000));
    setMinutesText(String(elapsedMin));
    setTimerStart(null);
    try {
      await AsyncStorage.removeItem(TIMER_KEY);
    } catch {
      // non-fatal
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const discardTimer = async () => {
    setTimerStart(null);
    try {
      await AsyncStorage.removeItem(TIMER_KEY);
    } catch {
      // non-fatal
    }
  };

  const toggleRoad = (r: string) => {
    setRoads((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const save = async () => {
    const durationMin = Math.round(Number(minutesText) || 0);
    if (durationMin <= 0) {
      Alert.alert('How long was the drive?', 'Enter the minutes behind the wheel (or use the timer).');
      return;
    }
    const nightMin = Math.round(Number(nightText) || 0);
    if (nightMin > durationMin) {
      Alert.alert('Night minutes too high', 'Night minutes can’t exceed the total drive time.');
      return;
    }
    setSaving(true);
    try {
      const input = {
        date,
        durationMin,
        nightMin,
        weather,
        roads: roads.join(','),
        supervisor: supervisor.trim(),
        miles: Number(milesText) || 0,
        notes,
      };
      if (editing && driveId !== null) {
        await updateDrive(driveId, input);
      } else {
        await insertDrive(input);
        if (supervisor.trim() && !settings.supervisorName) {
          updateSettings({ supervisorName: supervisor.trim() });
        }
        maybeRequestReview(await countDrives());
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      bumpData();
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!editing || driveId === null) return;
    Alert.alert('Delete this drive?', 'Its time comes off your totals. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDrive(driveId);
          bumpData();
          onClose();
        },
      },
    ]);
  };

  const cancel = () => {
    reset();
    onClose();
  };

  const durationMin = Math.round(Number(minutesText) || 0);
  const elapsed =
    timerStart != null ? Math.max(0, Math.round((now - timerStart) / 60000)) : 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={cancel}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={cancel} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {editing ? 'Edit drive' : 'Log a drive'}
          </Text>
          <Pressable onPress={save} hitSlop={10} disabled={saving}>
            <Text style={[styles.headerBtn, { color: theme.accent, fontWeight: fonts.weight.bold }]}>
              {saving ? '…' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!editing && (
            <Card theme={theme} style={{ ...styles.fieldCard, backgroundColor: theme.cardAlt }}>
              {timerStart == null ? (
                <View style={styles.timerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.timerTitle, { color: theme.text }]}>Drive timer</Text>
                    <Text style={[styles.timerSub, { color: theme.textFaint }]}>
                      Start when you pull out, stop when you park.
                    </Text>
                  </View>
                  <PillButton theme={theme} label="Start" onPress={startTimer} />
                </View>
              ) : (
                <View style={styles.timerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.timerTitle, { color: theme.accent }]}>
                      Driving… {fmtHours(Math.max(1, elapsed))}
                    </Text>
                    <Pressable onPress={discardTimer} hitSlop={6}>
                      <Text style={[styles.timerSub, { color: theme.textFaint }]}>
                        discard timer
                      </Text>
                    </Pressable>
                  </View>
                  <PillButton theme={theme} label="Stop" onPress={stopTimer} />
                </View>
              )}
            </Card>
          )}

          <Card theme={theme} style={styles.fieldCard}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Date</Text>
            <View style={styles.dateRow}>
              <Pressable onPress={() => setDate(shiftDate(date, -1))} hitSlop={8}>
                <Text style={[styles.dateArrow, { color: theme.accent }]}>‹</Text>
              </Pressable>
              <Text style={[styles.dateText, { color: theme.text }]}>{prettyDate(date)}</Text>
              <Pressable
                onPress={() => date < todayIso() && setDate(shiftDate(date, 1))}
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.dateArrow,
                    { color: date < todayIso() ? theme.accent : theme.border },
                  ]}
                >
                  ›
                </Text>
              </Pressable>
            </View>
          </Card>

          <Card theme={theme} style={styles.fieldCard}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Minutes behind the wheel{durationMin > 0 ? `  ·  ${fmtHours(durationMin)}` : ''}
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={minutesText}
              onChangeText={setMinutesText}
              placeholder="45"
              placeholderTextColor={theme.textFaint}
              keyboardType="number-pad"
              maxLength={3}
            />
            <View style={styles.quickRow}>
              {[15, 30, 45, 60, 90].map((m) => (
                <QuickChip
                  key={m}
                  theme={theme}
                  label={fmtHours(m)}
                  onPress={() => setMinutesText(String(m))}
                />
              ))}
            </View>
          </Card>

          <Card theme={theme} style={styles.fieldCard}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Of which at night (minutes)
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={nightText}
              onChangeText={setNightText}
              placeholder="0"
              placeholderTextColor={theme.textFaint}
              keyboardType="number-pad"
              maxLength={3}
            />
            <View style={styles.quickRow}>
              <QuickChip theme={theme} label="None" onPress={() => setNightText('')} />
              <QuickChip theme={theme} label="Half" onPress={() => setNightText(String(Math.round(durationMin / 2)))} />
              <QuickChip theme={theme} label="All 🌙" onPress={() => setNightText(String(durationMin))} />
            </View>
          </Card>

          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Weather</Text>
          <View style={styles.chipsRow}>
            {WEATHER_OPTIONS.map((w) => {
              const active = weather === w;
              return (
                <SelectChip
                  key={w}
                  theme={theme}
                  label={w}
                  active={active}
                  onPress={() => setWeather(w)}
                />
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Roads</Text>
          <View style={styles.chipsRow}>
            {ROAD_OPTIONS.map((r) => (
              <SelectChip
                key={r}
                theme={theme}
                label={r}
                active={roads.includes(r)}
                onPress={() => toggleRoad(r)}
              />
            ))}
          </View>

          <Card theme={theme} style={styles.fieldCard}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Supervising adult</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={supervisor}
              onChangeText={setSupervisor}
              placeholder="Mom"
              placeholderTextColor={theme.textFaint}
            />
          </Card>

          <Card theme={theme} style={styles.fieldCard}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Miles (optional)</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={milesText}
              onChangeText={setMilesText}
              placeholder="12"
              placeholderTextColor={theme.textFaint}
              keyboardType="decimal-pad"
            />
          </Card>

          <Card theme={theme} style={styles.fieldCard}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notes, { color: theme.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="First time merging onto the highway — smooth!"
              placeholderTextColor={theme.textFaint}
              multiline
            />
          </Card>

          {editing && (
            <View style={{ marginTop: 18 }}>
              <PillButton theme={theme} label="Delete drive" kind="ghost" onPress={onDelete} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function QuickChip({
  theme,
  label,
  onPress,
}: {
  theme: Theme;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.quickChip, { backgroundColor: theme.cardAlt }]}
    >
      <Text style={[styles.quickChipText, { color: theme.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function SelectChip({
  theme,
  label,
  active,
  onPress,
}: {
  theme: Theme;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.selectChip,
        {
          backgroundColor: active ? theme.accent : theme.card,
          borderColor: active ? theme.accent : theme.border,
        },
      ]}
    >
      <Text
        style={[
          styles.selectChipText,
          { color: active ? (theme.isDark ? '#15171A' : '#FFFFFF') : theme.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: fonts.weight.bold },
  scroll: { padding: 20, paddingBottom: 60 },
  fieldCard: { marginBottom: 12, paddingVertical: 12 },
  label: { fontSize: 12, fontWeight: fonts.weight.semibold, marginBottom: 4 },
  input: { fontSize: 17, paddingVertical: 2 },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timerTitle: { fontSize: 16, fontWeight: fonts.weight.bold },
  timerSub: { fontSize: 12, marginTop: 2 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dateArrow: { fontSize: 30, fontWeight: fonts.weight.bold, paddingHorizontal: 10 },
  dateText: { fontSize: 17, fontWeight: fonts.weight.semibold },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  quickChip: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  quickChipText: { fontSize: 13, fontWeight: fonts.weight.medium },
  sectionLabel: { fontSize: 12, fontWeight: fonts.weight.semibold, marginBottom: 8, marginTop: 4 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  selectChip: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  selectChipText: { fontSize: 13, fontWeight: fonts.weight.medium },
});
