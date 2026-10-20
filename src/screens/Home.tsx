import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, fonts } from '../theme';
import { Card } from '../components';
import Icon from '../icons';
import Rings from '../Rings';
import { useApp, priorMinutes } from '../state';
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
  const { isPro, showPaywall, dataVersion, goal, settings, freeDriveLimit } = useApp();
  const [drives, setDrives] = useState<Drive[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    setDrives(await getDrives());
    setStats(await getStats());
  }, []);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  const driveCount = stats?.driveCount ?? 0;
  const atFreeLimit = !isPro && driveCount >= freeDriveLimit;

  const handleAdd = () => {
    if (atFreeLimit) {
      showPaywall();
      return;
    }
    onAddDrive();
  };

  // Hours from before Odo count toward the goal like any drive.
  const prior = priorMinutes(settings);
  const totalGoalMin = goal.totalHours * 60;
  const nightGoalMin = goal.nightHours * 60;
  const totalMin = (stats?.totalMin ?? 0) + prior.totalMin;
  const nightMin = (stats?.nightMin ?? 0) + prior.nightMin;
  const stateName = getStateReq(settings.stateCode)?.name;
  const goalLabel =
    goal.source === 'state' && stateName
      ? stateName
      : goal.source === 'custom'
        ? 'Custom goal'
        : 'Pick your state in Settings';

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
            <View style={styles.itemNameRow}>
              <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                {fmtHours(item.durationMin)} drive
              </Text>
              {item.nightMin > 0 && <Icon name="moon" size={15} color={theme.night} />}
            </View>
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
            <View style={styles.topRow}>
              <Text style={[styles.brand, { color: theme.accent }]}>ODO</Text>
              {!isPro && (
                <Pressable
                  onPress={showPaywall}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.proBtn,
                    { borderColor: theme.accent, opacity: pressed ? 0.7 : 1 },
                  ]}
                  accessibilityLabel="Get Odo Pro"
                >
                  <Text style={[styles.proBtnText, { color: theme.accent }]}>PRO</Text>
                </Pressable>
              )}
            </View>

            <Card theme={theme} style={styles.heroCard}>
              <Rings
                theme={theme}
                totalMin={totalMin}
                totalGoalMin={totalGoalMin}
                nightMin={nightMin}
                nightGoalMin={nightGoalMin}
              />
              <View style={styles.legend}>
                <Legend
                  color={theme.lane}
                  label="Total"
                  value={`${fmtHours(totalMin)} of ${goal.totalHours}h`}
                />
                {nightGoalMin > 0 && (
                  <Legend
                    color={theme.night}
                    label="Night"
                    value={`${fmtHours(nightMin)} of ${goal.nightHours}h`}
                  />
                )}
              </View>
              <Text style={[styles.goalLabel, { color: theme.textFaint }]}>
                {goalLabel}
                {'  ·  '}
                {driveCount} {driveCount === 1 ? 'drive' : 'drives'}
                {(stats?.totalMiles ?? 0) > 0 ? `  ·  ${(stats?.totalMiles ?? 0).toFixed(0)} mi` : ''}
              </Text>
              {prior.totalMin > 0 && (
                <Text style={[styles.goalLabel, { color: theme.textFaint, marginTop: 2 }]}>
                  Includes {fmtHours(prior.totalMin)} logged before Odo
                </Text>
              )}
            </Card>

            {!isPro && (
              <Pressable onPress={showPaywall}>
                <Card theme={theme} style={{ ...styles.limitCard, backgroundColor: theme.accentSoft }}>
                  <Text style={[styles.limitText, { color: theme.accent }]}>
                    {atFreeLimit
                      ? `You've used your ${freeDriveLimit} free drives. Get Pro to keep logging.`
                      : `${freeDriveLimit - driveCount} free ${freeDriveLimit - driveCount === 1 ? 'drive' : 'drives'} left. Get Pro for unlimited.`}
                  </Text>
                </Card>
              </Pressable>
            )}
            <View style={{ height: 14 }} />
          </View>
        }
        ListEmptyComponent={
          <Card theme={theme} style={styles.emptyCard}>
            <View style={[styles.emptyBadge, { backgroundColor: theme.asphalt }]}>
              <Icon name="car" size={30} color={theme.lane} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>First drive? Let's log it.</Text>
            <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
              Buckle up, drive, park. Then tap the + and add the minutes. Every drive moves you
              closer to the license.
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
        <Icon name="plus" size={28} color={theme.onAccent} strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.legendValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 120 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  brand: { fontSize: 22, fontFamily: fonts.display, letterSpacing: 2 },
  proBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  proBtnText: { fontSize: 13, fontFamily: fonts.display, letterSpacing: 1.5 },
  heroCard: { alignItems: 'center', paddingVertical: 22 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 5, borderRadius: 2 },
  legendLabel: { fontSize: 13, fontWeight: fonts.weight.medium },
  legendValue: { fontSize: 15, fontFamily: fonts.heading },
  goalLabel: { fontSize: 12, fontWeight: fonts.weight.medium, marginTop: 10, textAlign: 'center' },
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
  dateBadgeDay: { fontSize: 20, lineHeight: 22, fontFamily: fonts.display },
  dateBadgeMon: { fontSize: 10, fontWeight: fonts.weight.semibold, letterSpacing: 0.5 },
  itemBody: { flex: 1 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { fontSize: 16, fontWeight: fonts.weight.semibold },
  itemMeta: { fontSize: 13, marginTop: 2 },
  emptyCard: { alignItems: 'center', paddingVertical: 30 },
  emptyBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 20, fontFamily: fonts.heading },
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
});
