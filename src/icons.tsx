/**
 * Odo's own line icons, drawn with react-native-svg on a 24x24 grid so they
 * match each other (and the road-sign font) instead of mixing emoji styles.
 */
import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'car'
  | 'log'
  | 'gear'
  | 'moon'
  | 'sun'
  | 'lock'
  | 'infinity'
  | 'timer'
  | 'bell'
  | 'key'
  | 'check'
  | 'close'
  | 'plus'
  | 'share'
  | 'print'
  | 'flag'
  | 'road'
  | 'question';

interface Props {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

export default function Icon({ name, size = 22, color, strokeWidth = 2 }: Props) {
  const p = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {draw(name, p, color)}
    </Svg>
  );
}

function draw(name: IconName, p: object, color: string) {
  switch (name) {
    case 'car':
      return (
        <>
          <Path d="M5 16V11.5L7 6.5C7.3 5.7 8 5.2 8.9 5.2H15.1C16 5.2 16.7 5.7 17 6.5L19 11.5V16" {...p} />
          <Path d="M3.5 16H20.5V18.5C20.5 19.1 20.1 19.5 19.5 19.5H18C17.4 19.5 17 19.1 17 18.5V16" {...p} />
          <Path d="M7 16V18.5C7 19.1 6.6 19.5 6 19.5H4.5C3.9 19.5 3.5 19.1 3.5 18.5V16" {...p} />
          <Line x1="5" y1="11.5" x2="19" y2="11.5" {...p} />
          <Circle cx="8" cy="13.8" r="0.6" {...p} />
          <Circle cx="16" cy="13.8" r="0.6" {...p} />
        </>
      );
    case 'log':
      return (
        <>
          <Path d="M7 3.5H14L18.5 8V19.5C18.5 20.1 18.1 20.5 17.5 20.5H7C6.4 20.5 6 20.1 6 19.5V4.5C6 3.9 6.4 3.5 7 3.5Z" {...p} />
          <Path d="M14 3.5V8H18.5" {...p} />
          <Line x1="9" y1="12" x2="15.5" y2="12" {...p} />
          <Line x1="9" y1="15.5" x2="15.5" y2="15.5" {...p} />
        </>
      );
    case 'gear':
      return (
        <>
          <Circle cx="12" cy="12" r="3" {...p} />
          <Path
            d="M12 2.8V5M12 19V21.2M21.2 12H19M5 12H2.8M18.5 5.5L16.9 7.1M7.1 16.9L5.5 18.5M18.5 18.5L16.9 16.9M7.1 7.1L5.5 5.5"
            {...p}
          />
          <Circle cx="12" cy="12" r="7" {...p} />
        </>
      );
    case 'moon':
      return <Path d="M20 14.5A8 8 0 1 1 9.5 4A6.5 6.5 0 0 0 20 14.5Z" {...p} />;
    case 'sun':
      return (
        <>
          <Circle cx="12" cy="12" r="4" {...p} />
          <Path d="M12 2.5V4.5M12 19.5V21.5M2.5 12H4.5M19.5 12H21.5M5.3 5.3L6.7 6.7M17.3 17.3L18.7 18.7M5.3 18.7L6.7 17.3M17.3 6.7L18.7 5.3" {...p} />
        </>
      );
    case 'lock':
      return (
        <>
          <Rect x="5" y="10.5" width="14" height="10" rx="2" {...p} />
          <Path d="M8 10.5V7.5A4 4 0 0 1 16 7.5V10.5" {...p} />
          <Line x1="12" y1="14.5" x2="12" y2="16.5" {...p} />
        </>
      );
    case 'infinity':
      return (
        <Path
          d="M12 12C10.5 9.8 9 8.5 7 8.5A3.5 3.5 0 0 0 7 15.5C9 15.5 10.5 14.2 12 12ZM12 12C13.5 14.2 15 15.5 17 15.5A3.5 3.5 0 0 0 17 8.5C15 8.5 13.5 9.8 12 12Z"
          {...p}
        />
      );
    case 'timer':
      return (
        <>
          <Circle cx="12" cy="13.5" r="7.5" {...p} />
          <Line x1="12" y1="13.5" x2="15" y2="10.5" {...p} />
          <Line x1="10" y1="2.8" x2="14" y2="2.8" {...p} />
          <Line x1="12" y1="2.8" x2="12" y2="6" {...p} />
        </>
      );
    case 'bell':
      return (
        <>
          <Path d="M6 16.5V11A6 6 0 0 1 18 11V16.5L19.5 18H4.5L6 16.5Z" {...p} />
          <Path d="M10 20.5A2.2 2.2 0 0 0 14 20.5" {...p} />
        </>
      );
    case 'key':
      return (
        <>
          <Circle cx="8" cy="12" r="4" {...p} />
          <Path d="M12 12H21M18 12V15M15.5 12V14" {...p} />
        </>
      );
    case 'check':
      return <Path d="M5 12.5L10 17.5L19 7" {...p} />;
    case 'close':
      return <Path d="M6 6L18 18M18 6L6 18" {...p} />;
    case 'plus':
      return <Path d="M12 5V19M5 12H19" {...p} />;
    case 'share':
      return (
        <>
          <Path d="M12 3.5V14.5M8 7.5L12 3.5L16 7.5" {...p} />
          <Path d="M8 10.5H6.5C5.9 10.5 5.5 10.9 5.5 11.5V19.5C5.5 20.1 5.9 20.5 6.5 20.5H17.5C18.1 20.5 18.5 20.1 18.5 19.5V11.5C18.5 10.9 18.1 10.5 17.5 10.5H16" {...p} />
        </>
      );
    case 'print':
      return (
        <>
          <Path d="M7 9V3.5H17V9" {...p} />
          <Path d="M7 17H5C4.4 17 4 16.6 4 16V10C4 9.4 4.4 9 5 9H19C19.6 9 20 9.4 20 10V16C20 16.6 19.6 17 19 17H17" {...p} />
          <Rect x="7" y="14" width="10" height="6.5" {...p} />
        </>
      );
    case 'flag':
      return (
        <>
          <Line x1="5.5" y1="3.5" x2="5.5" y2="21" {...p} />
          <Path d="M5.5 4.5H18L15.5 8.5L18 12.5H5.5" {...p} />
        </>
      );
    case 'road':
      return (
        <>
          <Path d="M8.5 3.5L4 20.5M15.5 3.5L20 20.5" {...p} />
          <Path d="M12 4V6.5M12 10V13M12 16.5V20" {...p} />
        </>
      );
    case 'question':
      return (
        <>
          <Path d="M4.5 5.5H19.5C20.1 5.5 20.5 5.9 20.5 6.5V15.5C20.5 16.1 20.1 16.5 19.5 16.5H10L6 20V16.5H4.5C3.9 16.5 3.5 16.1 3.5 15.5V6.5C3.5 5.9 3.9 5.5 4.5 5.5Z" {...p} />
          <Path d="M10.2 9.3A1.9 1.9 0 1 1 12.6 11.1C12.2 11.3 12 11.6 12 12" {...p} />
          <Circle cx="12" cy="14.2" r="0.4" fill={color} stroke={color} />
        </>
      );
  }
}
