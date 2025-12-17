import React, { useState, forwardRef } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  Platform, 
  Pressable,
  TextInputProps,
  ViewStyle,
  StyleProp,
  I18nManager
} from 'react-native';
import { DDIcon, IconName } from '@/components/DDIcon';
import { ThemedText } from '@/components/ThemedText';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/contexts/LanguageContext';

const INPUT_ICON_SIZE = 22;
const INPUT_FONT_SIZE = 17;
const INPUT_HEIGHT = 56;

interface StyledInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  showPasswordToggle?: boolean;
}

export const StyledInput = forwardRef<TextInput, StyledInputProps>(({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  showPasswordToggle,
  secureTextEntry,
  onFocus,
  onBlur,
  ...textInputProps
}, ref) => {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getInputContainerStyle = () => {
    return [
      styles.inputContainer,
      {
        backgroundColor: theme.surface,
        borderColor: error ? theme.error : (isFocused ? theme.primary : theme.border),
        borderWidth: isFocused ? 2 : 1,
      },
    ];
  };

  const effectiveSecureTextEntry = showPasswordToggle 
    ? secureTextEntry && !isPasswordVisible 
    : secureTextEntry;

  return (
    <View style={containerStyle}>
      {label ? (
        <ThemedText style={[Typography.label, { color: theme.textSecondary, marginBottom: Spacing.xs, textAlign: isRTL ? 'right' : 'left' }]}>
          {label.toUpperCase()}
        </ThemedText>
      ) : null}
      
      <View style={[getInputContainerStyle(), { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {leftIcon ? (
          <DDIcon name={leftIcon} size={INPUT_ICON_SIZE} variant="muted" />
        ) : null}
        
        <TextInput
          ref={ref}
          style={[
            styles.input,
            { color: theme.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
            Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {},
            !leftIcon ? { paddingStart: 0 } : null,
          ]}
          placeholderTextColor={theme.textSecondary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={effectiveSecureTextEntry}
          {...textInputProps}
        />
        
        {showPasswordToggle && secureTextEntry !== undefined ? (
          <Pressable 
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            hitSlop={8}
          >
            <DDIcon 
              name={isPasswordVisible ? 'eye-off' : 'eye'} 
              size={20} 
              variant="muted" 
            />
          </Pressable>
        ) : rightIcon ? (
          <Pressable 
            onPress={onRightIconPress}
            hitSlop={8}
            disabled={!onRightIconPress}
          >
            <DDIcon name={rightIcon} size={20} variant="muted" />
          </Pressable>
        ) : null}
      </View>
      
      {error ? (
        <ThemedText style={[Typography.caption, { color: theme.error, marginTop: Spacing.xs, textAlign: isRTL ? 'right' : 'left' }]}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
});

StyledInput.displayName = 'StyledInput';

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    height: INPUT_HEIGHT,
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: INPUT_FONT_SIZE,
    fontFamily: 'Inter_400Regular',
    height: '100%',
  },
});

export default StyledInput;
