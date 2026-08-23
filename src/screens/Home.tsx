import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, fonts, Theme } from '../theme';
import { Card } from '../components';
import { useApp, FREE_DRIVE_LIMIT } from '../state';
import { getDrives, getStats, Drive, Stats, fmtHours } from '../db';
import { getStateReq } from '../states';

export default function HomeScreen({
  onAddDrive,
  onOpenDrive,
}: {
  onAddDrive: () => void;
  onOpenDrive: (id: number) => void;
}) {
  const theme = useTheme();
  const { isPro, showPaywall, dataVersion, goal, settings } = useApp();
  const [drives, setDrives] = useState<Drive[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    setDrives(await getDrives());
    setStats(await getStats());
  }, []);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  const atFreeLimit = !isPro && (stats?.driveCount ?? 0) >= FREE_DRIVE_LIMIT;
  const nearFreeLimit =
    !isPro && !atFreeLimit && (stats?.driveCount ?? 0) >= FREE_DRIVE_LIMIT - 3;

  const handleAdd = () => {
    if (atFreeLimit) {
      showPaywall();
      return;
    }
    onAddDrive();
  };

  const totalGoalMin = goal.totalHours * 60;
  const nightGoalMin = goal.nightHours * 60;
  const totalMin = stats?.totalMin ?? 0;
  const nightMin = stats?.nightMin ?? 0;
  const stateName = getStateReq(settings.stateCode)?.name;

  const subtitle = (d: Drive): string => {
    const parts: string[] = [fmtHours(d.durationMin)];
    if (d.nightMin > 0) parts.push(`${fmtHours(d.nightMin)} night`);
    if (d.weather && d.weather !== 'Clear') parts.push(d.weather);
    if (d.supervisor) parts.push(`with ${d.supervisor}`);
    return parts.join(' · ');
  };

  const renderItem = ({ item }: { item: Drive }) => (
    <Pressable onPress={() => onOpenDrive(item.id)}>
      <Card theme={theme} style={styles.itemCard}>
        <View style={styles.itemRow}>
          <View style={[styles.dateBadge, { backgroundColor: theme.cardAlt }]}>
            <Text style={[styles.dateBadgeDay, { color: theme.text }]}>
              {item.date.slice(8, 10)}
            </Text>
            <Text style={[styles.dateBadgeMon, { color: theme.textFaint }]}>
              {new Date(
                Number(item.date.slice(0, 4)),
                Number(item.date.slice(5, 7)) - 1,
                1
              )
                .toLocaleString('en-US', { month: 'short' })
                .toUpperCase()}
            </Text>
          </View>
          <View style={styles.itemBody}>
            <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
              {fmtHours(item.durationMin)} drive
              {item.nightMin > 0 ? '  🌙' : ''}
            </Text>
            <Text style={[styles.itemMeta, { color: theme.textFaint }]} numberOfLines={1}>
              {subtitle(item)}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={drives}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Text style={[styles.brand, { color: theme.accent }]}>Odo</Text>
            <Card theme={theme} style={styles.heroCard}>
              <Text style={[styles.heroValue, { color: theme.text }]}>
                {fmtHours(totalMin)}
              </Text>
              <Text style={[styles.heroLabel, { color: theme.textSecondary }]}>
                of {goal.totalHours}h supervised driving
                {goal.source === 'state' && stateName ? ` · ${stateName}` : ''}
                {goal.source === 'custom' ? ' · custom goal' : ''}
              </Text>
              <ProgressBar
                theme={theme}
                value={totalMin}
                max={totalGoalMin}
                style={{ marginTop: 12 }}
              />
              {nightGoalMin > 0 && (
                <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
                  <View style={styles.nightRow}>
                    <Text style={[styles.nightLabel, { color: theme.textSecondary }]}>
                      🌙 Night driving
                    </Text>
                    <Text style={[styles.nightValue, { color: theme.textSecondary }]}>
                      {fmtHours(nightMin)} / {goal.nightHours}h
                    </Text>
                  </View>
                  <ProgressBar
                    theme={theme}
                    value={nightMin}
                    max={nightGoalMin}
                    style={{ marginTop: 6 }}
                  />
                </View>
              )}
              <View style={styles.heroChips}>
                <Text style={[styles.heroChip, { color: theme.textFaint }]}>
                  {stats?.driveCount ?? 0} {(stats?.driveCount ?? 0) === 1 ? 'drive' : 'drives'}
                </Text>
                {(stats?.totalMiles ?? 0) > 0 && (
                  <Text style={[styles.heroChip, { color: theme.textFaint }]}>
                    {(stats?.totalMiles ?? 0).toFixed(0)} mi
                  </Text>
                )}
                {totalMin >= totalGoalMin && totalGoalMin > 0 && (
                  <Text style={[styles.heroChip, { color: theme.success }]}>Goal reached 🎉</Text>
                )}
              </View>
            </Card>

            {(atFreeLimit || nearFreeLimit) && (
              <Pressable onPress={showPaywall}>
                <Card theme={theme} style={{ ...styles.limitCard, backgroundColor: theme.accentSoft }}>
                  <Text style={[styles.limitText, { color: theme.accent }]}>
                    {atFreeLimit
                      ? `Free plan is full (${FREE_DRIVE_LIMIT} drives). Go Pro for unlimited →`
                      : `${FREE_DRIVE_LIMIT - (stats?.driveCount ?? 0)} free drives left. Go Pro for unlimited →`}
                  </Text>
                </Card>
              </Pressable>
            )}
            <View style={{ height: 14 }} />
          </View>
        }
        ListEmptyComponent={
          <Card theme={theme} style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🚗</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Log your first drive</Text>
            <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
              Every practice drive counts toward the license. Tap ＋ after you park —
              date, minutes, and night time are all it takes.
            </Text>
          </Card>
        }
      />
      <Pressable
        onPress={handleAdd}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
        ]}
        accessibilityLabel="Log a drive"
      >
        <Text style={[styles.fabPlus, { color: theme.isDark ? '#15171A' : '#FFFFFF' }]}>＋</Text>
      </Pressable>
    </View>
  );
}

function ProgressBar({
  theme,
  value,
  max,
  style,
}: {
  theme: Theme;
  value: number;
  max: number;
  style?: object;
}) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View
      style={[
        styles.barTrack,
        { backgroundColor: theme.cardAlt },
        style,
      ]}
      accessibilityRole="progressbar"
    >
      <View
        style={[
          styles.barFill,
          {
            backgroundColor: pct >= 1 ? theme.success : theme.accent,
            width: `${Math.round(pct * 100)}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 120 },
  brand: { fontSize: 15, fontWeight: fonts.weight.bold, marginBottom: 8, letterSpacing: 0.3 },
  heroCard: { alignItems: 'center', paddingVertical: 22 },
  heroValue: { fontSize: 44, fontWeight: fonts.weight.bold, letterSpacing: -1 },
  heroLabel: { fontSize: 13, fontWeight: fonts.weight.medium, marginTop: 2, textAlign: 'center' },
  nightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nightLabel: { fontSize: 13, fontWeight: fonts.weight.medium },
  nightValue: { fontSize: 13, fontWeight: fonts.weight.medium },
  heroChips: { flexDirection: 'row', gap: 14, marginTop: 14 },
  heroChip: { fontSize: 13, fontWeight: fonts.weight.medium },
  barTrack: {
    alignSelf: 'stretch',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 5 },
  limitCard: { marginTop: 10, paddingVertical: 12, borderWidth: 0 },
  limitText: { fontSize: 14, fontWeight: fonts.weight.semibold, textAlign: 'center' },
  itemCard: { marginBottom: 10, padding: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBadge: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadgeDay: { fontSize: 18, fontWeight: fonts.weight.bold },
  dateBadgeMon: { fontSize: 10, fontWeight: fonts.weight.semibold, letterSpacing: 0.5 },
  itemBody: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: fonts.weight.semibold },
  itemMeta: { fontSize: 13, marginTop: 2 },
  emptyCard: { alignItems: 'center', paddingVertical: 30 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: fonts.weight.bold },
  emptyBody: { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  fabPlus: { fontSize: 30, lineHeight: 34, fontWeight: fonts.weight.semibold },
});
