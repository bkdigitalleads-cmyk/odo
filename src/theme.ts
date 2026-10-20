import { useColorScheme } from 'react-native';

export interface Theme {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  textSecondary: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  /** Text and icons drawn on top of an accent fill. */
  onAccent: string;
  danger: string;
  border: string;
  success: string;
  /** Progress ring track: a band of road. */
  asphalt: string;
  /** Dashed lane line painted down the middle of the ring track. */
  laneDash: string;
  /** Lane-marking yellow for the total-hours ring. */
  lane: string;
  /** Night-hours ring and icons. */
  night: string;
  isDark: boolean;
}

// Road palette: asphalt neutrals with lane-marking amber. Day mode reads
// like a printed drive log; night mode is asphalt-dark with bright yellow.
// Unmistakably about driving, and visually unrelated to our other apps.
export const lightTheme: Theme = {
  bg: '#F7F6F3',
  card: '#FFFFFF',
  cardAlt: '#F0EEE8',
  text: '#20242A',
  textSecondary: '#5C6470',
  textFaint: '#98A0AC',
  accent: '#B07100',
  accentSoft: '#FBEFD3',
  onAccent: '#FFFFFF',
  danger: '#C53030',
  border: '#E5E2DA',
  success: '#2F7D4F',
  asphalt: '#3A3F46',
  laneDash: 'rgba(255,255,255,0.35)',
  lane: '#F2B705',
  night: '#8DB4E8',
  isDark: false,
};

export const darkTheme: Theme = {
  bg: '#15171A',
  card: '#1F2226',
  cardAlt: '#282C31',
  text: '#EFEEEA',
  textSecondary: '#AEB4BD',
  textFaint: '#767E89',
  accent: '#FFC93C',
  accentSoft: '#33301F',
  onAccent: '#15171A',
  danger: '#F56565',
  border: '#31353B',
  success: '#68B587',
  asphalt: '#2C3036',
  laneDash: 'rgba(239,238,234,0.22)',
  lane: '#FFC93C',
  night: '#8FB3E0',
  isDark: true,
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}

export const fonts = {
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  /**
   * Overpass (SIL OFL, assets/fonts/OFL.txt), a free take on the Highway
   * Gothic lettering on US road signs. Numbers and headings only; body text
   * stays the system font. Loaded in App.tsx, keyed by these names. Never
   * combine with fontWeight: the weight is in the file.
   */
  display: 'Overpass-ExtraBold',
  heading: 'Overpass-Bold',
};

/** Font files for useFonts in App.tsx. */
export const FONT_FILES = {
  [fonts.display]: require('../assets/fonts/Overpass_800ExtraBold.ttf'),
  [fonts.heading]: require('../assets/fonts/Overpass_700Bold.ttf'),
};
