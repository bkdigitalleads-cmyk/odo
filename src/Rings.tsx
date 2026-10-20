import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Theme, fonts } from './theme';
import Icon from './icons';

/**
 * Two concentric progress rings drawn like lanes of road: an asphalt track
 * with a dashed center line, painted over as the hours come in.
 *   outer: total hours toward the state goal (lane yellow)
 *   inner: night hours (night blue), hidden when the state has no night rule
 * The center says how much is left, in hours.
 */
const SIZE = 232;
const OUTER_W = 20;
const INNER_W = 16;
const GAP = 7;

export default function Rings({
  theme,
  totalMin,
  totalGoalMin,
  nightMin,
  nightGoalMin,
}: {
  theme: Theme;
  totalMin: number;
  totalGoalMin: number;
  nightMin: number;
  nightGoalMin: number;
}) {
  const c = SIZE / 2;
  const outerR = c - OUTER_W / 2;
  const innerR = outerR - OUTER_W / 2 - GAP - INNER_W / 2;
  const showNight = nightGoalMin > 0;
  const pct = (v: number, max: number) => (max > 0 ? Math.min(1, v / max) : 0);

  const totalLeft = Math.max(0, totalGoalMin - totalMin);
  const nightLeft = Math.max(0, nightGoalMin - nightMin);
  let big: string;
  let small: string;
  let done = false;
  if (totalLeft > 0) {
    [big, small] = left(totalLeft, false);
  } else if (showNight && nightLeft > 0) {
    [big, small] = left(nightLeft, true);
  } else {
    done = true;
    big = 'Goal';
    small = 'met';
  }

  const a11y = done
    ? 'Goal met'
    : `${big} ${small}. ${Math.round(pct(totalMin, totalGoalMin) * 100)} percent of total hours${
        showNight ? `, ${Math.round(pct(nightMin, nightGoalMin) * 100)} percent of night hours` : ''
      }.`;

  return (
    <View style={styles.wrap} accessible accessibilityRole="progressbar" accessibilityLabel={a11y}>
      <Svg width={SIZE} height={SIZE}>
        <Lane cx={c} r={outerR} width={OUTER_W} theme={theme} />
        <Progress cx={c} r={outerR} width={OUTER_W} pct={pct(totalMin, totalGoalMin)} color={theme.lane} />
        {showNight && (
          <>
            <Lane cx={c} r={innerR} width={INNER_W} theme={theme} />
            <Progress cx={c} r={innerR} width={INNER_W} pct={pct(nightMin, nightGoalMin)} color={theme.night} />
          </>
        )}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {done && <Icon name="flag" size={26} color={theme.success} />}
        <Text style={[styles.big, { color: done ? theme.success : theme.text }]}>{big}</Text>
        <Text style={[styles.small, { color: theme.textSecondary }]}>{small}</Text>
      </View>
    </View>
  );
}

/** "36" "hrs to go" or "4" "night hrs to go"; under an hour, "45" "min to go". */
function left(min: number, night: boolean): [string, string] {
  const unit = min < 60 ? 'min' : Math.ceil(min / 60) === 1 ? 'hr' : 'hrs';
  return [String(min < 60 ? min : Math.ceil(min / 60)), `${night ? 'night ' : ''}${unit} to go`];
}

function Lane({ cx, r, width, theme }: { cx: number; r: number; width: number; theme: Theme }) {
  return (
    <>
      <Circle cx={cx} cy={cx} r={r} stroke={theme.asphalt} strokeWidth={width} fill="none" />
      <Circle
        cx={cx}
        cy={cx}
        r={r}
        stroke={theme.laneDash}
        strokeWidth={1.5}
        strokeDasharray="7 7"
        fill="none"
      />
    </>
  );
}

function Progress({
  cx,
  r,
  width,
  pct,
  color,
}: {
  cx: number;
  r: number;
  width: number;
  pct: number;
  color: string;
}) {
  if (pct <= 0) return null;
  const circ = 2 * Math.PI * r;
  return (
    <Circle
      cx={cx}
      cy={cx}
      r={r}
      stroke={color}
      strokeWidth={width}
      strokeLinecap={pct >= 1 ? 'butt' : 'round'}
      strokeDasharray={`${circ * pct} ${circ}`}
      fill="none"
      // Start at 12 o'clock and run clockwise.
      transform={`rotate(-90 ${cx} ${cx})`}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignSelf: 'center' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  big: { fontFamily: fonts.display, fontSize: 56, lineHeight: 60, marginTop: 6 },
  small: { fontFamily: fonts.heading, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: -2 },
});
