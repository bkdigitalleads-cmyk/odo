import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, fonts } from '../theme';
import { Card, PillButton, ProBadge, SectionTitle } from '../components';
import { useApp } from '../state';
import { getStats, Stats, exportCsv, fmtHours } from '../db';
import { generateAndSharePdf } from '../report';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

export default function ReportScreen() {
  const theme = useTheme();
  const { isPro, showPaywall, dataVersion, goal } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getStats().then(setStats);
  }, [dataVersion]);

  const requirePro = (fn: () => void) => () => {
    if (!isPro) {
      showPaywall();
      return;
    }
    fn();
  };

  const onPdf = requirePro(async () => {
    if ((stats?.driveCount ?? 0) === 0) {
      Alert.alert('Nothing to export yet', 'Log a few drives first, then create the report.');
      return;
    }
    try {
      setBusy(true);
      await generateAndSharePdf();
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  });

  const onCsv = requirePro(async () => {
    try {
      setBusy(true);
      const csv = await exportCsv();
      const file = new File(Paths.cache, 'odo-driving-log.csv');
      if (file.exists) file.delete();
      file.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export your driving log',
        });
      }
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  });

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={[styles.title, { color: theme.text }]}>Driving log</Text>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        Every practice drive in one official-style log — dated entries, day and night
        totals, and signature lines, ready to hand to the DMV or driving school.
      </Text>

      <Card theme={theme} style={styles.statsCard}>
        <View style={styles.statRow}>
          <Stat label="Drives" value={String(stats?.driveCount ?? 0)} theme={theme} />
          <Stat label="Total" value={fmtHours(stats?.totalMin ?? 0)} theme={theme} />
          <Stat label="Night" value={fmtHours(stats?.nightMin ?? 0)} theme={theme} />
        </View>
        <Text style={[styles.goalLine, { color: theme.textFaint }]}>
          Goal: {goal.totalHours}h total{goal.nightHours > 0 ? ` · ${goal.nightHours}h night` : ''}
        </Text>
      </Card>

      <SectionTitle theme={theme}>Export</SectionTitle>
      <Card theme={theme} style={styles.exportCard}>
        <View style={styles.exportRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.exportTitleRow}>
              <Text style={[styles.exportTitle, { color: theme.text }]}>PDF driving log</Text>
              {!isPro && <ProBadge theme={theme} />}
            </View>
            <Text style={[styles.exportBody, { color: theme.textSecondary }]}>
              A clean, official-style practice log with totals and parent/guardian
              signature lines — print it or share it straight from your phone.
            </Text>
          </View>
        </View>
        <PillButton theme={theme} label={busy ? 'Working…' : 'Create PDF'} onPress={onPdf} disabled={busy} />
      </Card>

      <Card theme={theme} style={styles.exportCard}>
        <View style={styles.exportRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.exportTitleRow}>
              <Text style={[styles.exportTitle, { color: theme.text }]}>CSV spreadsheet</Text>
              {!isPro && <ProBadge theme={theme} />}
            </View>
            <Text style={[styles.exportBody, { color: theme.textSecondary }]}>
              Every drive as a spreadsheet — your data, yours to keep and back up.
            </Text>
          </View>
        </View>
        <PillButton theme={theme} label={busy ? 'Working…' : 'Export CSV'} onPress={onCsv} disabled={busy} kind="ghost" />
      </Card>

      <Text style={[styles.tip, { color: theme.textFaint }]}>
        Tip: check your state's exact paperwork rules before the road test — some states
        want their own form, and this log makes filling it out painless.
      </Text>
    </ScrollView>
  );
}

function Stat({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textFaint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 26, fontWeight: fonts.weight.bold, letterSpacing: -0.5 },
  sub: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  statsCard: { marginTop: 16, paddingVertical: 16 },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: fonts.weight.bold },
  statLabel: { fontSize: 12, marginTop: 2 },
  goalLine: { textAlign: 'center', fontSize: 12, marginTop: 10 },
  exportCard: { marginBottom: 12, gap: 12 },
  exportRow: { flexDirection: 'row' },
  exportTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportTitle: { fontSize: 16, fontWeight: fonts.weight.semibold },
  exportBody: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  tip: { fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 },
});
