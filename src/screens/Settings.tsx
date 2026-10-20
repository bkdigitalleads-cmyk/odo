import Constants from 'expo-constants';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme, fonts } from '../theme';
import { Card, SectionTitle, ProBadge, NumberField } from '../components';
import Icon from '../icons';
import { useApp } from '../state';
import { deleteAllData, PRIOR_HOURS_LABEL } from '../db';
import { STATE_REQS, getStateReq, CUSTOM_CODE } from '../states';
import { restorePurchases, isBillingAvailable } from '../purchases';

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://bkdigitalleads-cmyk.github.io/odo/privacy.html';

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings, updateSettings, isPro, setIsPro, showPaywall, bumpData, goal } = useApp();
  const [busy, setBusy] = useState(false);
  const [statePickerOpen, setStatePickerOpen] = useState(false);

  const stateReq = getStateReq(settings.stateCode);
  // A state with no hour minimum (AR, MS) gets editable goal inputs too (AUDIT 1).
  const isCustom = settings.customTotalHours != null || (stateReq != null && stateReq.totalHours == null);

  const pickState = async (code: string) => {
    // Custom, or a state with no hour minimum: an editable goal (AUDIT 1).
    if (code === CUSTOM_CODE || getStateReq(code)?.totalHours == null) {
      await updateSettings({
        stateCode: code,
        customTotalHours: settings.customTotalHours ?? goal.totalHours,
        customNightHours: settings.customNightHours ?? goal.nightHours,
      });
    } else {
      await updateSettings({
        stateCode: code,
        customTotalHours: null,
        customNightHours: null,
      });
    }
    setStatePickerOpen(false);
  };

  const onToggleLock = async () => {
    if (!isPro) {
      showPaywall();
      return;
    }
    if (!settings.lockEnabled) {
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hw || !enrolled) {
        Alert.alert(
          'Face ID unavailable',
          'Set up Face ID or a device passcode in iOS Settings first.'
        );
        return;
      }
    }
    await updateSettings({ lockEnabled: !settings.lockEnabled });
  };

  const onRestore = async () => {
    if (!isBillingAvailable()) {
      Alert.alert('Unavailable', 'Purchases are not available right now.');
      return;
    }
    setBusy(true);
    const res = await restorePurchases();
    setBusy(false);
    if (res.ok) {
      setIsPro(res.isPro);
      Alert.alert(
        res.isPro ? 'Restored!' : 'No purchases found',
        res.isPro
          ? 'Your Pro access is back.'
          : 'We couldn’t find a previous purchase on this Apple ID.'
      );
    } else {
      Alert.alert('Restore failed', res.error ?? 'Please try again.');
    }
  };

  const onDeleteAll = () => {
    Alert.alert(
      'Delete your entire log?',
      'Every drive is permanently erased from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await deleteAllData();
            bumpData();
          },
        },
      ]
    );
  };

  const rowText = (label: string, pro?: boolean) => (
    <View style={styles.rowLabel}>
      <Text style={[styles.rowText, { color: theme.text }]}>{label}</Text>
      {pro && !isPro ? <ProBadge theme={theme} /> : null}
    </View>
  );

  const stateLabel =
    settings.stateCode === CUSTOM_CODE
      ? 'Custom goal'
      : stateReq
        ? stateReq.name
        : 'Choose your state';

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

      {!isPro && (
        <Pressable onPress={showPaywall}>
          <Card theme={theme} style={{ ...styles.upsell, backgroundColor: theme.accentSoft }}>
            <Text style={[styles.upsellTitle, { color: theme.accent }]}>Odo Pro</Text>
            <Text style={[styles.upsellSub, { color: theme.text }]}>
              Unlimited drives · DMV-ready PDF log · CSV export · Face ID lock
            </Text>
          </Card>
        </Pressable>
      )}

      <SectionTitle theme={theme}>Practice goal</SectionTitle>
      <Card theme={theme}>
        <Pressable onPress={() => setStatePickerOpen(true)} style={styles.row}>
          {rowText('State')}
          <Text style={[styles.rowValue, { color: theme.accent }]}>{stateLabel} ›</Text>
        </Pressable>
        <View style={[styles.goalBox, { backgroundColor: theme.cardAlt }]}>
          <Text style={[styles.goalText, { color: theme.textSecondary }]}>
            {goal.totalHours} supervised hours
            {goal.nightHours > 0 ? `, including ${goal.nightHours} at night` : ''}
            {goal.source === 'default'
              ? stateReq
                ? ' (a common default, since your state sets no minimum; change it below)'
                : ' (a common default until you pick your state above)'
              : ''}
          </Text>
          {stateReq?.note ? (
            <Text style={[styles.goalNote, { color: theme.textFaint }]}>{stateReq.note}</Text>
          ) : null}
        </View>
        {isCustom && (
          <View style={styles.customRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.customLabel, { color: theme.textSecondary }]}>Total hours</Text>
              {/* Saves on blur, so clearing the field to retype never saves 1 (AUDIT 3). */}
              <NumberField
                style={[styles.customInput, { color: theme.text, borderColor: theme.border }]}
                maxLength={3}
                value={settings.customTotalHours ?? goal.totalHours}
                onCommit={(n) => {
                  const total = Math.max(1, n);
                  updateSettings({
                    customTotalHours: total,
                    customNightHours: Math.min(settings.customNightHours ?? goal.nightHours, total),
                  });
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.customLabel, { color: theme.textSecondary }]}>Night hours</Text>
              <NumberField
                style={[styles.customInput, { color: theme.text, borderColor: theme.border }]}
                maxLength={3}
                value={settings.customNightHours ?? goal.nightHours}
                onCommit={(n) => {
                  const total = settings.customTotalHours ?? goal.totalHours;
                  updateSettings({ customTotalHours: total, customNightHours: Math.min(n, total) });
                }}
              />
            </View>
          </View>
        )}
        <Text style={[styles.disclaimer, { color: theme.textFaint }]}>
          State numbers are provided as a convenience. Always confirm current rules with your
          state's DMV. You can set a custom goal any time.
        </Text>
      </Card>

      <SectionTitle theme={theme}>Hours before Odo</SectionTitle>
      <Card theme={theme}>
        <Text style={[styles.goalText, { color: theme.textSecondary }]}>
          Hours from a paper log or another app. They count toward the goal and print on the log
          as their own row: {PRIOR_HOURS_LABEL}.
        </Text>
        <View style={styles.customRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.labelRow}>
              <Icon name="sun" size={13} color={theme.textSecondary} />
              <Text style={[styles.customLabel, { color: theme.textSecondary, marginBottom: 0 }]}>Day hours</Text>
            </View>
            <NumberField
              decimals
              style={[styles.customInput, { color: theme.text, borderColor: theme.border }]}
              value={settings.priorDayMin / 60}
              onCommit={(h) => updateSettings({ priorDayMin: Math.round(Math.min(h, 999) * 60) })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.labelRow}>
              <Icon name="moon" size={13} color={theme.textSecondary} />
              <Text style={[styles.customLabel, { color: theme.textSecondary, marginBottom: 0 }]}>Night hours</Text>
            </View>
            <NumberField
              decimals
              style={[styles.customInput, { color: theme.text, borderColor: theme.border }]}
              value={settings.priorNightMin / 60}
              onCommit={(h) => updateSettings({ priorNightMin: Math.round(Math.min(h, 999) * 60) })}
            />
          </View>
        </View>
      </Card>

      <SectionTitle theme={theme}>Names on the log</SectionTitle>
      <Card theme={theme}>
        <Text style={[styles.customLabel, { color: theme.textSecondary }]}>Driver</Text>
        <TextInput
          style={[styles.nameInput, { color: theme.text }]}
          value={settings.driverName}
          onChangeText={(v) => updateSettings({ driverName: v })}
          placeholder="Jordan Kershner"
          placeholderTextColor={theme.textFaint}
        />
        <Text style={[styles.customLabel, { color: theme.textSecondary, marginTop: 12 }]}>
          Usual supervising adult
        </Text>
        <TextInput
          style={[styles.nameInput, { color: theme.text }]}
          value={settings.supervisorName}
          onChangeText={(v) => updateSettings({ supervisorName: v })}
          placeholder="Mom"
          placeholderTextColor={theme.textFaint}
        />
      </Card>

      <SectionTitle theme={theme}>Security</SectionTitle>
      <Card theme={theme}>
        <View style={styles.row}>
          {rowText('Lock with Face ID', true)}
          <Switch
            value={settings.lockEnabled}
            onValueChange={onToggleLock}
            trackColor={{ true: theme.accent }}
          />
        </View>
      </Card>

      <SectionTitle theme={theme}>Privacy & data</SectionTitle>
      <Card theme={theme}>
        <Text style={[styles.privacyNote, { color: theme.textSecondary }]}>
          Works offline, anywhere you drive. Your log is saved on this iPhone, and you can export
          a copy from the Log tab whenever you like.
        </Text>
      </Card>

      <SectionTitle theme={theme}>Purchases</SectionTitle>
      <Card theme={theme}>
        <Pressable onPress={onRestore} disabled={busy} style={styles.row}>
          {rowText('Restore purchases')}
          <Text style={{ color: theme.textFaint }}>›</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(TERMS_URL)} style={styles.row}>
          {rowText('Terms of Use (EULA)')}
          <Text style={{ color: theme.textFaint }}>›</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} style={styles.row}>
          {rowText('Privacy Policy')}
          <Text style={{ color: theme.textFaint }}>›</Text>
        </Pressable>
      </Card>

      <SectionTitle theme={theme}>Danger zone</SectionTitle>
      <Card theme={theme}>
        <Pressable onPress={onDeleteAll} style={styles.row}>
          <Text style={[styles.rowText, { color: theme.danger }]}>Delete all drives</Text>
        </Pressable>
      </Card>

      <Text style={[styles.version, { color: theme.textFaint }]}>
        Odo v{Constants.expoConfig?.version ?? ''} · Made with care in NYC
      </Text>

      <Modal
        visible={statePickerOpen}
        animationType="slide"
        onRequestClose={() => setStatePickerOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <View style={[styles.pickerHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Your state</Text>
            <Pressable onPress={() => setStatePickerOpen(false)} hitSlop={10}>
              <Text style={[styles.rowText, { color: theme.accent }]}>Done</Text>
            </Pressable>
          </View>
          <FlatList
            data={[
              ...STATE_REQS,
              { code: CUSTOM_CODE, name: 'Custom goal…', totalHours: null, nightHours: 0 },
            ]}
            keyExtractor={(s) => s.code}
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
            renderItem={({ item }) => {
              const active =
                item.code === settings.stateCode ||
                (item.code === CUSTOM_CODE && settings.stateCode === CUSTOM_CODE);
              return (
                <Pressable
                  onPress={() => pickState(item.code)}
                  style={[
                    styles.stateRow,
                    { borderBottomColor: theme.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.rowText,
                      { color: active ? theme.accent : theme.text },
                      active && { fontWeight: fonts.weight.bold },
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text style={[styles.stateReqText, { color: theme.textFaint }]}>
                    {item.code === CUSTOM_CODE
                      ? ''
                      : item.totalHours != null
                        ? `${item.totalHours}h${item.nightHours ? ` · ${item.nightHours} night` : ''}`
                        : 'no minimum'}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 48 },
  title: { fontSize: 30, fontFamily: fonts.display, marginBottom: 8 },
  upsell: { marginTop: 8, borderWidth: 0 },
  upsellTitle: { fontSize: 18, fontFamily: fonts.heading, marginBottom: 4 },
  upsellSub: { fontSize: 14, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    minHeight: 40,
  },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 16 },
  rowValue: { fontSize: 16, fontWeight: fonts.weight.semibold },
  goalBox: { borderRadius: 10, padding: 12, marginTop: 4 },
  goalText: { fontSize: 14, lineHeight: 20 },
  goalNote: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  customRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  customLabel: { fontSize: 12, fontWeight: fonts.weight.semibold, marginBottom: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  customInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  nameInput: { fontSize: 17, paddingVertical: 2 },
  disclaimer: { fontSize: 11, lineHeight: 16, marginTop: 12 },
  privacyNote: { fontSize: 13, lineHeight: 19, paddingVertical: 4 },
  version: { textAlign: 'center', marginTop: 28, fontSize: 12 },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerTitle: { fontSize: 18, fontFamily: fonts.heading },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stateReqText: { fontSize: 13 },
});
