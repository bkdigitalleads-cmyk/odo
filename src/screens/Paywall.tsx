import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { useTheme, fonts } from '../theme';
import { PillButton } from '../components';
import { useApp } from '../state';
import { getOffering, purchasePackage, isBillingAvailable } from '../purchases';

const FEATURES: { icon: string; title: string; sub: string }[] = [
  { icon: '🚗', title: 'Unlimited drives', sub: 'Free logs 10 drives. Pro goes all the way to the license.' },
  { icon: '📄', title: 'DMV-ready PDF log', sub: 'Official-style practice log with totals and signature lines.' },
  { icon: '🌙', title: 'Night-hours tracking', sub: 'Day and night totals, matched to your state\u2019s rule.' },
  { icon: '🧾', title: 'CSV export', sub: 'The whole log as a spreadsheet, yours to keep.' },
  { icon: '🔒', title: 'Face ID lock', sub: 'The log stays your family\u2019s business.' },
];

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export default function PaywallModal({ privacyUrl }: { privacyUrl: string }) {
  const theme = useTheme();
  const { paywallVisible, hidePaywall, setIsPro } = useApp();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!paywallVisible) return;
    setLoading(true);
    (async () => {
      const off = await getOffering();
      setOffering(off);
      // Odo is time-boxed use — a permit lasts months, not years — so the
      // one-time Lifetime purchase is the hero and default; the small yearly
      // subscription is the anchor for price-sensitive families. The 10-drive
      // free tier is the funnel, so there's no separate time-limited trial.
      const lifetime =
        off?.lifetime ?? off?.annual ?? off?.availablePackages?.[0] ?? null;
      setSelected(lifetime);
      setLoading(false);
    })();
  }, [paywallVisible]);

  const buy = async () => {
    if (!selected) return;
    setPurchasing(true);
    const res = await purchasePackage(selected);
    setPurchasing(false);
    if (res.ok && res.isPro) {
      setIsPro(true);
      hidePaywall();
      Alert.alert('Welcome to Pro ✨', 'Every drive counts now — all the way to the license.');
    } else if (!res.userCancelled && res.error) {
      Alert.alert('Purchase failed', res.error);
    }
  };

  // Lifetime is the hero for this time-boxed app — show it first.
  const rank = (p: PurchasesPackage) =>
    p.packageType === 'LIFETIME' ? 0 : p.packageType === 'ANNUAL' ? 1 : 2;
  const packages = [...(offering?.availablePackages ?? [])].sort(
    (a, b) => rank(a) - rank(b),
  );

  return (
    <Modal
      visible={paywallVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={hidePaywall}
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable onPress={hidePaywall} hitSlop={12} style={styles.close}>
            <Text style={[styles.closeText, { color: theme.textFaint }]}>✕</Text>
          </Pressable>

          <Text style={[styles.title, { color: theme.text }]}>
            Every hour counts{'\n'}toward the license
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Log every practice drive, watch the state requirement fill up, and hand
            the DMV a clean, signed log — no paper forms in the glovebox.
          </Text>

          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.feature}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featureTitle, { color: theme.text }]}>{f.title}</Text>
                  <Text style={[styles.featureSub, { color: theme.textSecondary }]}>
                    {f.sub}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginVertical: 24 }} color={theme.accent} />
          ) : packages.length === 0 || !isBillingAvailable() ? (
            <Text style={[styles.unavailable, { color: theme.textSecondary }]}>
              Purchases aren’t available right now. Please try again later.
            </Text>
          ) : (
            <View style={styles.packages}>
              {packages.map((p) => {
                const active = selected?.identifier === p.identifier;
                const isAnnual = p.packageType === 'ANNUAL';
                const isLifetime = p.packageType === 'LIFETIME';
                const monthly =
                  isAnnual && p.product.price
                    ? `just ${(p.product.price / 12).toLocaleString(undefined, {
                        style: 'currency',
                        currency: p.product.currencyCode ?? 'USD',
                      })}/month`
                    : null;
                return (
                  <Pressable
                    key={p.identifier}
                    onPress={() => setSelected(p)}
                    style={[
                      styles.pkg,
                      {
                        borderColor: active ? theme.accent : theme.border,
                        backgroundColor: active ? theme.accentSoft : theme.card,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pkgTitle, { color: theme.text }]}>
                        {isAnnual ? 'Yearly' : isLifetime ? 'Lifetime' : p.product.title}
                      </Text>
                      {isLifetime && (
                        <Text style={[styles.pkgBadge, { color: theme.accent }]}>
                          Best value · pay once, keep forever
                        </Text>
                      )}
                      {isAnnual && (
                        <Text style={[styles.pkgBadge, { color: theme.textSecondary }]}>
                          {monthly ? `Or ${monthly}, billed yearly` : 'Or billed yearly'}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.pkgPrice, { color: theme.text }]}>
                      {p.product.priceString}
                      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                        {isAnnual ? '/yr' : isLifetime ? '' : '/mo'}
                      </Text>
                    </Text>
                  </Pressable>
                );
              })}
              <PillButton
                theme={theme}
                label={purchasing ? 'One moment…' : 'Continue'}
                onPress={buy}
                disabled={purchasing || !selected}
              />
              {selected?.packageType === 'LIFETIME' && (
                <Text style={[styles.noPayment, { color: theme.success }]}>
                  ✓ One-time purchase — no subscription
                </Text>
              )}
              <Text style={[styles.fine, { color: theme.textFaint }]}>
                Subscriptions auto-renew until cancelled. Cancel anytime in Settings.{' '}
                <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>
                  Terms
                </Text>{' '}
                ·{' '}
                <Text style={styles.link} onPress={() => Linking.openURL(privacyUrl)}>
                  Privacy
                </Text>
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingTop: 20, paddingBottom: 40 },
  close: { alignSelf: 'flex-end', padding: 4 },
  closeText: { fontSize: 22 },
  title: {
    fontSize: 28,
    fontWeight: fonts.weight.bold,
    letterSpacing: -0.5,
    marginTop: 8,
  },
  subtitle: { fontSize: 16, lineHeight: 23, marginTop: 8, marginBottom: 24 },
  features: { gap: 16, marginBottom: 28 },
  feature: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  featureIcon: { fontSize: 22 },
  featureTitle: { fontSize: 16, fontWeight: fonts.weight.semibold },
  featureSub: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  packages: { gap: 12 },
  pkg: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
  },
  pkgTitle: { fontSize: 16, fontWeight: fonts.weight.semibold },
  pkgBadge: { fontSize: 12, fontWeight: fonts.weight.semibold, marginTop: 2 },
  pkgPrice: { fontSize: 17, fontWeight: fonts.weight.bold },
  unavailable: { textAlign: 'center', marginVertical: 24, fontSize: 15 },
  noPayment: { fontSize: 13, textAlign: 'center', fontWeight: fonts.weight.semibold },
  fine: { fontSize: 12, textAlign: 'center', lineHeight: 17, marginTop: 4 },
  link: { textDecorationLine: 'underline' },
});
