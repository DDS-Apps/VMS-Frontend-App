import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Platform, Pressable, TextInputProps, ViewStyle, StyleProp } from 'react-native';
import { DDIcon } from '@/components/DDIcon';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArabicFontScaling } from '@/utils/rtlStyles';
import { DirectionalRow } from '@/components/DirectionalRow';

const INPUT_HEIGHT = 56;
const INPUT_FONT_SIZE = 17;
const ICON_SIZE = 20;

interface SearchInputProps extends Omit<TextInputProps, 'style'> {
  onClear?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  showClearButton?: boolean;
}

export function SearchInput({
  value,
  onChangeText,
  onClear,
  placeholder,
  containerStyle,
  showClearButton = true,
  onFocus,
  onBlur,
  ...textInputProps
}: SearchInputProps) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleClear = () => {
    onChangeText?.('');
    onClear?.();
  };

  // Scale font size for Arabic
  const scaledFontSize = isRTL 
    ? Math.round(INPUT_FONT_SIZE * ArabicFontScaling.body * 10) / 10 
    : INPUT_FONT_SIZE;

  const searchIcon = <DDIcon name="search" size={ICON_SIZE} variant="muted" />;
  const inputEl = (
    <TextInput
      style={[
        styles.input,
        { 
          color: theme.text,
          textAlign: isRTL ? 'right' : 'left',
          writingDirection: isRTL ? 'rtl' : 'ltr',
          fontSize: scaledFontSize,
        },
        Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {},
      ]}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      value={value}
      onChangeText={onChangeText}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...textInputProps}
    />
  );
  const clearButton = showClearButton && value && value.length > 0 ? (
    <Pressable onPress={handleClear} hitSlop={8}>
      <DDIcon name="x" size={18} variant="muted" />
    </Pressable>
  ) : null;

  return (
    <DirectionalRow
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: isFocused ? theme.primary : theme.border,
          borderWidth: isFocused ? 2 : 1,
        },
        containerStyle,
      ]}
      alignItems="center"
    >
      {searchIcon}
      {inputEl}
      {clearButton}
    </DirectionalRow>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: INPUT_HEIGHT,
    borderRadius: BorderRadius.sm,
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: INPUT_FONT_SIZE,
    fontFamily: 'Inter_400Regular',
    height: '100%',
  },
});

export default SearchInput;
