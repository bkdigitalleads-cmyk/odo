import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fonts } from '../theme';
import Icon from '../icons';
import { useApp } from '../state';
import { LockOverlay } from '../LockGate';
import { buildReportData, ReportData } from '../report';
import { fmtHours, PRIOR_HOURS_LABEL } from '../db';

/**
 * Free users' look at their DMV log: the same content as the PDF, drawn as a
 * paper page with a large SAMPLE watermark. Nothing here can leave the phone;
 * Share and Print close the preview and open the paywall.
 */

// Paper colors, the same in light and dark mode, like the printed PDF.
const PAPER = {
  bg: '#FFFFFF',
  ink: '#20242A',
  sub: '#5C6470',
  faint: '#98A0AC',
  rule: '#E7E3D8',
  amber: '#B07100',
  box: '#F6F3EA',
  boxBorder: '#E3D9BD',
};

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PdfPreview({
  visible,
  onClose,
  onLocked,
}: {
  visible: boolean;
  onClose: () => void;
  /** Share or Print tapped: the parent closes this and opens the paywall. */
  onLocked: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { dataVersion } = useApp();
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    if (!visible) return;
    setData(null);
    buildReportData().then(setData).catch(() => setData(null));
  }, [visible, dataVersion]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.cardAlt }]}>
        <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.bg }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Preview</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close preview">
            <Icon name="close" color={theme.textFaint} />
          </Pressable>
        </View>
        <Text style={[styles.note, { color: theme.textSecondary }]}>
          This is a preview of your DMV log. Get Odo Pro to share or print the real thing.
        </Text>

        <ScrollView contentContainerStyle={styles.scroll}>
          {!data ? (
            <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.page}>
              <Sheet r={data} />
              <View style={styles.watermarkLayer} pointerEvents="none">
                {[0, 1, 2].map((i) => (
                  <Text key={i} style={styles.watermark} accessibilityElementsHidden>
                    SAMPLE
                  </Text>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.bar,
            { borderTopColor: theme.border, backgroundColor: theme.bg, paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <BarButton label="Share" icon="share" onPress={onLocked} />
          <BarButton label="Print" icon="print" onPress={onLocked} />
        </View>
      </View>
      <LockOverlay />
    </Modal>
  );
}

function BarButton({ label, icon, onPress }: { label: string; icon: 'share' | 'print'; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.barBtn, { borderColor: theme.accent, opacity: pressed ? 0.8 : 1 }]}
      accessibilityLabel={`${label}, needs Odo Pro`}
    >
      <Icon name={icon} size={18} color={theme.accent} />
      <Text style={[styles.barBtnText, { color: theme.accent }]}>{label}</Text>
      <View style={[styles.proTag, { backgroundColor: theme.accentSoft }]}>
        <Text style={[styles.proTagText, { color: theme.accent }]}>PRO</Text>
      </View>
    </Pressable>
  );
}

/** The PDF's layout in native views, trimmed to the columns that fit a phone. */
function Sheet({ r }: { r: ReportData }) {
  return (
    <View>
      <Text style={styles.h1}>Supervised Driving Practice Log</Text>
      <Text style={styles.sub}>Generated {r.today} · Odo for iPhone</Text>
      <Text style={styles.who}>
        Driver: {r.driverName ? <Text style={styles.bold}>{r.driverName}</Text> : '______________'}
        {r.stateName ? `  ·  ${r.stateName}` : ''}
        {r.showGoal
          ? `  ·  Goal: ${r.goal.totalHours} hours${r.goal.nightHours > 0 ? ` (incl. ${r.goal.nightHours} at night)` : ''}${r.goalNote}`
          : ''}
      </Text>

      <View style={styles.summary}>
        <SumBox v={fmtHours(r.totalMin)} l="total supervised driving" />
        <SumBox v={fmtHours(r.nightMin)} l="of it at night" />
        <SumBox v={String(r.driveCount)} l="drives logged in Odo" />
      </View>
      {r.showGoal && (
        <>
          <View style={styles.goalTrack}>
            <View style={[styles.goalFill, { width: `${r.pct}%` }]} />
          </View>
          <Text style={styles.small}>
            {r.pct}% of the {r.goal.totalHours}-hour goal
          </Text>
        </>
      )}

      <View style={[styles.tr, styles.th]}>
        <Text style={[styles.thText, styles.cDate]}>Date</Text>
        <Text style={[styles.thText, styles.cNum]}>Day</Text>
        <Text style={[styles.thText, styles.cNum]}>Night</Text>
        <Text style={[styles.thText, styles.cNum]}>Total</Text>
        <Text style={[styles.thText, styles.cWho]}>Supervisor</Text>
      </View>
      {r.prior.totalMin > 0 && (
        <View style={[styles.tr, styles.priorRow]}>
          <Text style={[styles.td, styles.cDate, styles.bold]}>{PRIOR_HOURS_LABEL}</Text>
          <Text style={[styles.td, styles.cNum]}>{fmtHours(r.prior.dayMin)}</Text>
          <Text style={[styles.td, styles.cNum]}>{r.prior.nightMin > 0 ? fmtHours(r.prior.nightMin) : ''}</Text>
          <Text style={[styles.td, styles.cNum, styles.bold]}>{fmtHours(r.prior.totalMin)}</Text>
          <Text style={[styles.td, styles.cWho]} />
        </View>
      )}
      {r.drives.map((d) => (
        <View key={d.id} style={styles.tr}>
          <Text style={[styles.td, styles.cDate]}>{prettyDate(d.date)}</Text>
          <Text style={[styles.td, styles.cNum]}>{fmtHours(d.durationMin - d.nightMin)}</Text>
          <Text style={[styles.td, styles.cNum]}>{d.nightMin > 0 ? fmtHours(d.nightMin) : ''}</Text>
          <Text style={[styles.td, styles.cNum, styles.bold]}>{fmtHours(d.durationMin)}</Text>
          <Text style={[styles.td, styles.cWho]} numberOfLines={1}>
            {d.supervisor}
          </Text>
        </View>
      ))}
      {r.drives.length === 0 && r.prior.totalMin === 0 && (
        <Text style={[styles.small, { marginTop: 10 }]}>Your drives will appear here, one row each.</Text>
      )}
      <View style={[styles.tr, styles.totals]}>
        <Text style={[styles.td, styles.cDate, styles.bold]}>Totals</Text>
        <Text style={[styles.td, styles.cNum, styles.bold]}>{fmtHours(r.dayMin)}</Text>
        <Text style={[styles.td, styles.cNum, styles.bold]}>{fmtHours(r.nightMin)}</Text>
        <Text style={[styles.td, styles.cNum, styles.bold]}>{fmtHours(r.totalMin)}</Text>
        <Text style={[styles.td, styles.cWho]} />
      </View>

      <View style={styles.cert}>
        <Text style={styles.certText}>
          I certify that the supervised driving practice recorded above was completed as stated, with a licensed
          adult in the front passenger seat.
        </Text>
        <View style={styles.sigRow}>
          <Text style={styles.sig}>Parent / guardian signature</Text>
          <Text style={styles.sig}>Date</Text>
        </View>
      </View>
    </View>
  );
}

function SumBox({ v, l }: { v: string; l: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.boxV}>{v}</Text>
      <Text style={styles.boxL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 20, fontFamily: fonts.heading },
  note: { fontSize: 13, lineHeight: 18, textAlign: 'center', paddingHorizontal: 24, paddingTop: 12 },
  scroll: { padding: 16, paddingBottom: 32 },
  page: {
    backgroundColor: PAPER.bg,
    borderRadius: 6,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  watermarkLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  watermark: {
    fontFamily: fonts.display,
    fontSize: 84,
    letterSpacing: 6,
    color: 'rgba(197, 48, 48, 0.2)',
    transform: [{ rotate: '-28deg' }],
  },
  h1: { fontSize: 16, fontWeight: fonts.weight.bold, color: PAPER.ink },
  sub: { fontSize: 10, color: PAPER.sub, marginTop: 2 },
  who: { fontSize: 11, color: PAPER.ink, marginTop: 10 },
  bold: { fontWeight: fonts.weight.bold },
  summary: { flexDirection: 'row', gap: 6, marginTop: 10 },
  box: {
    flex: 1,
    backgroundColor: PAPER.box,
    borderColor: PAPER.boxBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  boxV: { fontSize: 14, fontWeight: fonts.weight.bold, color: PAPER.ink },
  boxL: { fontSize: 9, color: PAPER.sub, marginTop: 1 },
  goalTrack: { height: 7, backgroundColor: '#EEEAE0', borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  goalFill: { height: '100%', backgroundColor: PAPER.amber, borderRadius: 4 },
  small: { fontSize: 9.5, color: PAPER.sub, marginTop: 3 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: PAPER.rule, paddingVertical: 5, gap: 4 },
  th: { borderBottomWidth: 2, borderBottomColor: PAPER.amber, marginTop: 12 },
  thText: { fontSize: 8.5, fontWeight: fonts.weight.semibold, color: PAPER.sub, letterSpacing: 0.4, textTransform: 'uppercase' },
  td: { fontSize: 10, color: PAPER.ink },
  cDate: { flex: 2.3 },
  cNum: { flex: 1 },
  cWho: { flex: 1.6 },
  priorRow: { backgroundColor: PAPER.box, borderBottomColor: PAPER.boxBorder, borderBottomWidth: 2 },
  totals: { borderTopWidth: 2, borderTopColor: PAPER.amber, borderBottomWidth: 0 },
  cert: { marginTop: 18, borderWidth: 1, borderColor: '#D8D3C4', borderRadius: 8, padding: 10 },
  certText: { fontSize: 10, lineHeight: 14, color: PAPER.ink },
  sigRow: { flexDirection: 'row', gap: 20, marginTop: 22 },
  sig: { flex: 1, borderTopWidth: 1, borderTopColor: PAPER.ink, paddingTop: 3, fontSize: 9, color: PAPER.sub },
  bar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  barBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 24,
    paddingVertical: 12,
  },
  barBtnText: { fontSize: 16, fontWeight: fonts.weight.semibold },
  proTag: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  proTagText: { fontSize: 9, fontWeight: fonts.weight.bold, letterSpacing: 0.5 },
});
