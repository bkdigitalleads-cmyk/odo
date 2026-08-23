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
  danger: string;
  border: string;
  success: string;
  isDark: boolean;
}

// Road palette: asphalt neutrals with lane-marking amber. Day mode reads
// like a printed drive log; night mode is asphalt-dark with bright yellow —
// unmistakably about driving, and visually unrelated to our other apps.
export const lightTheme: Theme = {
  bg: '#F7F6F3',
  card: '#FFFFFF',
  cardAlt: '#F0EEE8',
  text: '#20242A',
  textSecondary: '#5C6470',
  textFaint: '#98A0AC',
  accent: '#B07100',
  accentSoft: '#FBEFD3',
  danger: '#C53030',
  border: '#E5E2DA',
  success: '#2F7D4F',
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
  danger: '#F56565',
  border: '#31353B',
  success: '#68B587',
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
};
