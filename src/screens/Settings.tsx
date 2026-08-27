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
import { Card, SectionTitle, ProBadge } from '../components';
import { useApp } from '../state';
import { deleteAllData } from '../db';
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
  const isCustom = settings.customTotalHours != null;

  const pickState = async (code: string) => {
    if (code === CUSTOM_CODE) {
      await updateSettings({
        stateCode: CUSTOM_CODE,
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
            {goal.source === 'default' ? ' (common default — pick your state above)' : ''}
          </Text>
          {stateReq?.note ? (
            <Text style={[styles.goalNote, { color: theme.textFaint }]}>{stateReq.note}</Text>
          ) : null}
        </View>
        {isCustom && (
          <View style={styles.customRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.customLabel, { color: theme.textSecondary }]}>Total hours</Text>
              <TextInput
                style={[styles.customInput, { color: theme.text, borderColor: theme.border }]}
                keyboardType="number-pad"
                maxLength={3}
                value={String(settings.customTotalHours ?? '')}
                onChangeText={(v) =>
                  updateSettings({ customTotalHours: Math.max(1, Number(v) || 0) || 1 })
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.customLabel, { color: theme.textSecondary }]}>Night hours</Text>
              <TextInput
                style={[styles.customInput, { color: theme.text, borderColor: theme.border }]}
                keyboardType="number-pad"
                maxLength={3}
                value={String(settings.customNightHours ?? '')}
                onChangeText={(v) => updateSettings({ customNightHours: Number(v) || 0 })}
              />
            </View>
          </View>
        )}
        <Text style={[styles.disclaimer, { color: theme.textFaint }]}>
          State numbers are provided as a convenience — always confirm current rules with
          your state's DMV. You can set a custom goal any time.
        </Text>
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
          Your driving log never leaves this iPhone. No account, no cloud, no location
          tracking. Use the Log tab to export a copy whenever you like.
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
        Odo v1.0.0 · Made with care in NYC
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
  title: { fontSize: 26, fontWeight: fonts.weight.bold, letterSpacing: -0.5, marginBottom: 8 },
  upsell: { marginTop: 8, borderWidth: 0 },
  upsellTitle: { fontSize: 17, fontWeight: fonts.weight.bold, marginBottom: 4 },
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
  pickerTitle: { fontSize: 17, fontWeight: fonts.weight.bold },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stateReqText: { fontSize: 13 },
});
