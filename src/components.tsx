import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextStyle, View, ViewStyle } from 'react-native';
import { Theme, fonts } from './theme';

export function Card({
  theme,
  children,
  style,
}: {
  theme: Theme;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PillButton({
  theme,
  label,
  onPress,
  kind = 'primary',
  disabled = false,
}: {
  theme: Theme;
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost';
  disabled?: boolean;
}) {
  const bg = kind === 'primary' ? theme.accent : 'transparent';
  const fg = kind === 'primary' ? theme.onAccent : theme.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: bg,
          borderColor: theme.accent,
          borderWidth: kind === 'ghost' ? 1 : 0,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.pillLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return (
    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{children}</Text>
  );
}

export function ProBadge({ theme }: { theme: Theme }) {
  return (
    <View style={[styles.proBadge, { backgroundColor: theme.accentSoft }]}>
      <Text style={[styles.proBadgeText, { color: theme.accent }]}>PRO</Text>
    </View>
  );
}

/** Read-only star rating (0–5). Empty stars show faintly. */
export function Stars({
  rating,
  theme,
  size = 15,
}: {
  theme: Theme;
  rating: number;
  size?: number;
}) {
  return (
    <View style={styles.starsRow} accessibilityLabel={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text
          key={i}
          style={{
            fontSize: size,
            color: i <= rating ? theme.accent : theme.border,
          }}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

/** Interactive star picker. Tapping the current single star clears it. */
export function StarPicker({
  rating,
  onChange,
  theme,
}: {
  theme: Theme;
  rating: number;
  onChange: (r: number) => void;
}) {
  return (
    <View style={styles.starPickerRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable
          key={i}
          onPress={() => onChange(rating === i ? 0 : i)}
          hitSlop={6}
          accessibilityLabel={`Rate ${i} star${i === 1 ? '' : 's'}`}
        >
          <Text
            style={{
              fontSize: 34,
              marginRight: 6,
              color: i <= rating ? theme.accent : theme.border,
            }}
          >
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Hours typed by a person: "12", "12.5" or "12,5". Null when empty or not a number. */
export function parseHours(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Shows hours without trailing zeros: 12, 12.5, 12.25. */
export function hoursText(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/**
 * A number field that keeps what is typed and only reports it on blur or
 * submit, so clearing it to retype never saves a wrong value in between.
 * An empty or invalid entry goes back to the last saved value.
 */
export function NumberField({
  value,
  onCommit,
  style,
  placeholder,
  placeholderTextColor,
  decimals = false,
  maxLength = 5,
}: {
  value: number;
  onCommit: (n: number) => void;
  style?: TextStyle | TextStyle[];
  placeholder?: string;
  placeholderTextColor?: string;
  decimals?: boolean;
  maxLength?: number;
}) {
  const [text, setText] = useState(hoursText(value));
  useEffect(() => setText(hoursText(value)), [value]);
  const commit = () => {
    const n = parseHours(text);
    if (n == null) {
      setText(hoursText(value));
      return;
    }
    onCommit(decimals ? n : Math.round(n));
  };
  return (
    <TextInput
      style={style}
      value={text}
      onChangeText={setText}
      onBlur={commit}
      onSubmitEditing={commit}
      keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
      returnKeyType="done"
      maxLength={maxLength}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      selectTextOnFocus
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  pill: {
    borderRadius: 24,
    paddingVertical: 13,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  pillLabel: {
    fontSize: 16,
    fontWeight: fonts.weight.semibold,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: fonts.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 20,
  },
  proBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: fonts.weight.bold,
    letterSpacing: 0.5,
  },
  starsRow: { flexDirection: 'row' },
  starPickerRow: { flexDirection: 'row', alignItems: 'center' },
});
