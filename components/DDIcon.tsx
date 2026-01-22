import React, { useContext } from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { LanguageContext } from '@/contexts/LanguageContext';
import { ICON_PATHS, IconName } from '@/constants/iconPaths';

export type { IconName } from '@/constants/iconPaths';

type IconVariant = 'primary' | 'card' | 'muted' | 'danger' | 'success' | 'warning' | 'default';

interface DDIconProps {
  name: IconName;
  size?: number;
  color?: string;
  variant?: IconVariant;
  directionAware?: boolean;
}

const DIRECTIONAL_ICONS: Record<string, string> = {
  'chevron-left': 'chevron-right',
  'chevron-right': 'chevron-left',
  'arrow-left': 'arrow-right',
  'arrow-right': 'arrow-left',
  'log-in': 'log-out',
  'log-out': 'log-in',
};

export const DDIcon: React.FC<DDIconProps> = ({
  name,
  size = 20,
  color,
  variant = 'default',
  directionAware = false,
}) => {
  const { theme } = useTheme();
  const languageContext = useContext(LanguageContext);
  const isRTL = languageContext?.isRTL ?? false;

  const getVariantColor = (): string => {
    if (color) return color;

    switch (variant) {
      case 'primary':
        return theme.primary;
      case 'card':
        return theme.cardIcon;
      case 'muted':
        return theme.textSecondary;
      case 'danger':
        return theme.error;
      case 'success':
        return theme.success;
      case 'warning':
        return theme.warning;
      case 'default':
      default:
        return theme.text;
    }
  };

  const getIconName = (): IconName => {
    let iconName = name;
    
    if (directionAware && isRTL) {
      const rtlName = DIRECTIONAL_ICONS[name];
      if (rtlName && rtlName in ICON_PATHS) {
        iconName = rtlName as IconName;
      }
    }

    return iconName;
  };

  const iconName = getIconName();
  const pathData = ICON_PATHS[iconName] || ICON_PATHS['help-circle'] || 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01';
  const iconColor = getVariantColor();

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={iconColor}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={pathData} />
    </Svg>
  );
};
