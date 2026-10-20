import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, fonts } from '../theme';
import { Card, PillButton, ProBadge, SectionTitle } from '../components';
import { useApp, priorMinutes } from '../state';
import { getStats, Stats, exportCsv, fmtHours } from '../db';
import { generateAndSharePdf } from '../report';
import { maybeRequestReviewAfterExport } from '../reviews';
import PdfPreview from './PdfPreview';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

export default function ReportScreen() {
  const theme = useTheme();
  const { isPro, showPaywall, dataVersion, goal, settings } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const prior = priorMinutes(settings);
  const hasEntries = (stats?.driveCount ?? 0) > 0 || prior.totalMin > 0;

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

  // Free: a SAMPLE preview with no way to share or print it.
  const onPreview = () => setPreviewOpen(true);

  // Share or Print in the preview: close it first (one sheet at a time on iOS), then the paywall.
  const onPreviewLocked = () => {
    setPreviewOpen(false);
    setTimeout(showPaywall, 400);
  };

  const onPdf = requirePro(async () => {
    if (!hasEntries) {
      Alert.alert('Nothing to export yet', 'Log a few drives first, then create the report.');
      return;
    }
    try {
      setBusy(true);
      await generateAndSharePdf();
      maybeRequestReviewAfterExport();
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  });

  const onCsv = requirePro(async () => {
    try {
      setBusy(true);
      const csv = await exportCsv(prior);
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
        Every practice drive in one official-style log: dated entries, day and night totals,
        and signature lines, ready to hand to the DMV or driving school.
      </Text>

      <Card theme={theme} style={styles.statsCard}>
        <View style={styles.statRow}>
          <Stat label="Drives" value={String(stats?.driveCount ?? 0)} theme={theme} />
          <Stat label="Total" value={fmtHours((stats?.totalMin ?? 0) + prior.totalMin)} theme={theme} />
          <Stat label="Night" value={fmtHours((stats?.nightMin ?? 0) + prior.nightMin)} theme={theme} />
        </View>
        <Text style={[styles.goalLine, { color: theme.textFaint }]}>
          Goal: {goal.totalHours}h total{goal.nightHours > 0 ? ` · ${goal.nightHours}h night` : ''}
        </Text>
        {prior.totalMin > 0 && (
          <Text style={[styles.goalLine, { color: theme.textFaint, marginTop: 2 }]}>
            Totals include {fmtHours(prior.totalMin)} logged before Odo, shown as its own row on the log.
          </Text>
        )}
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
              {isPro
                ? 'A clean, official-style practice log with totals and parent or guardian signature lines. Print it or share it straight from your phone.'
                : 'See exactly what the DMV will get. Sharing and printing the log come with Pro.'}
            </Text>
          </View>
        </View>
        {isPro ? (
          <PillButton theme={theme} label={busy ? 'Working…' : 'Create PDF'} onPress={onPdf} disabled={busy} />
        ) : (
          <PillButton theme={theme} label="Preview my PDF" onPress={onPreview} />
        )}
      </Card>

      <Card theme={theme} style={styles.exportCard}>
        <View style={styles.exportRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.exportTitleRow}>
              <Text style={[styles.exportTitle, { color: theme.text }]}>CSV spreadsheet</Text>
              {!isPro && <ProBadge theme={theme} />}
            </View>
            <Text style={[styles.exportBody, { color: theme.textSecondary }]}>
              Every drive as a spreadsheet. Your data, yours to keep and back up.
            </Text>
          </View>
        </View>
        <PillButton theme={theme} label={busy ? 'Working…' : 'Export CSV'} onPress={onCsv} disabled={busy} kind="ghost" />
      </Card>

      <Text style={[styles.tip, { color: theme.textFaint }]}>
        Tip: check your state's exact paperwork rules before the road test. Some states want
        their own form, and this log makes filling it out painless.
      </Text>
      <PdfPreview visible={previewOpen} onClose={() => setPreviewOpen(false)} onLocked={onPreviewLocked} />
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
  title: { fontSize: 30, fontFamily: fonts.display },
  sub: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  statsCard: { marginTop: 16, paddingVertical: 16 },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 26, fontFamily: fonts.display },
  statLabel: { fontSize: 12, marginTop: 2 },
  goalLine: { textAlign: 'center', fontSize: 12, marginTop: 10 },
  exportCard: { marginBottom: 12, gap: 12 },
  exportRow: { flexDirection: 'row' },
  exportTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportTitle: { fontSize: 17, fontFamily: fonts.heading },
  exportBody: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  tip: { fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 },
});
