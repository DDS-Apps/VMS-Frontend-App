import React, { useState, forwardRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
  Pressable,
  TextInputProps,
  ViewStyle,
  StyleProp,
  I18nManager,
} from "react-native";
import { DDIcon, IconName } from "@/components/DDIcon";
import { ThemedText } from "@/components/ThemedText";
import {
  Spacing,
  BorderRadius,
  Typography,
  FontFamily,
  getInputFontFamily,
} from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArabicFontScaling } from "@/utils/rtlStyles";
import { DirectionalRow } from "@/components/DirectionalRow";

const INPUT_ICON_SIZE = 22;
const INPUT_FONT_SIZE = 17;
const INPUT_HEIGHT = 56;

interface StyledInputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  showPasswordToggle?: boolean;
}

export const StyledInput = forwardRef<TextInput, StyledInputProps>(
  (
    {
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
    },
    ref,
  ) => {
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

    const isDisabled = textInputProps.editable === false;

    const computedFontFamily = getInputFontFamily(
      textInputProps.value ?? textInputProps.defaultValue,
      isRTL,
    );
    const computedFontSize = isRTL
      ? Math.round(INPUT_FONT_SIZE * ArabicFontScaling.body * 10) / 10
      : INPUT_FONT_SIZE;
    const computedPaddingTop = isRTL ? Spacing.md : 0;
    const computedPaddingBottom = isRTL ? Spacing.xs : 0;

    console.log("[StyledInput] ==============================");
    console.log("[StyledInput] label:", label);
    console.log("[StyledInput] isRTL:", isRTL);
    console.log("[StyledInput] Platform.OS:", Platform.OS);
    console.log("[StyledInput] fontFamily:", computedFontFamily);
    console.log("[StyledInput] fontSize:", computedFontSize);
    console.log(
      "[StyledInput] ArabicFontScaling.body:",
      ArabicFontScaling.body,
    );
    console.log(
      "[StyledInput] paddingTop:",
      computedPaddingTop,
      "| paddingBottom:",
      computedPaddingBottom,
    );
    console.log("[StyledInput] paddingVertical (base):", Spacing.sm);
    console.log("[StyledInput] container paddingVertical:", Spacing.sm, "(no height/minHeight)");
    console.log(
      "[StyledInput] value:",
      textInputProps.value?.substring(0, 20) ?? "(empty)",
    );

    const handleContainerLayout = (e: any) => {
      const { width, height } = e.nativeEvent.layout;
      console.log(
        "[StyledInput] Container onLayout -> width:",
        width,
        "height:",
        height,
      );
    };

    const handleInputLayout = (e: any) => {
      const { width, height, x, y } = e.nativeEvent.layout;
      console.log(
        "[StyledInput] TextInput onLayout -> width:",
        width,
        "height:",
        height,
        "x:",
        x,
        "y:",
        y,
      );
      console.log(
        "[StyledInput] Available text space = inputHeight - paddingTop - paddingBottom =",
        height - computedPaddingTop - computedPaddingBottom,
      );
    };

    const getInputContainerStyle = () => {
      return [
        styles.inputContainer,
        {
          backgroundColor: isDisabled ? theme.surfaceSecondary : theme.surface,
          borderColor: error
            ? theme.error
            : isFocused
              ? theme.primary
              : theme.border,
          borderWidth: isFocused ? 2 : 1,
          opacity: isDisabled ? 0.6 : 1,
        },
      ];
    };

    const effectiveSecureTextEntry = showPasswordToggle
      ? secureTextEntry && !isPasswordVisible
      : secureTextEntry;

    return (
      <View style={containerStyle}>
        {label ? (
          <ThemedText
            style={[
              Typography.label,
              { color: theme.textSecondary, marginBottom: Spacing.xs },
            ]}
          >
            {label.toUpperCase()}
          </ThemedText>
        ) : null}

        <DirectionalRow
          style={getInputContainerStyle()}
          alignItems="center"
          onLayout={handleContainerLayout}
        >
          {leftIcon ? (
            <DDIcon name={leftIcon} size={INPUT_ICON_SIZE} variant="muted" />
          ) : null}

          <TextInput
            ref={ref}
            style={[
              styles.input,
              {
                color: theme.text,
                fontFamily: getInputFontFamily(
                  textInputProps.value ?? textInputProps.defaultValue,
                  isRTL,
                ),
                writingDirection: isRTL ? "rtl" : "ltr",
                textAlign: isRTL ? "right" : "left",
                textAlignVertical: "center",
                fontSize: isRTL
                  ? Math.round(INPUT_FONT_SIZE * ArabicFontScaling.body * 10) /
                    10
                  : INPUT_FONT_SIZE,
                ...(isRTL
                  ? { paddingTop: Spacing.md, paddingBottom: Spacing.xs }
                  : {}),
              },
              Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {},
              !leftIcon ? { paddingStart: 0 } : null,
            ]}
            placeholderTextColor={theme.textSecondary}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onLayout={handleInputLayout}
            scrollEnabled={false}
            secureTextEntry={effectiveSecureTextEntry}
            {...textInputProps}
          />

          {showPasswordToggle && secureTextEntry !== undefined ? (
            <Pressable
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              hitSlop={8}
            >
              <DDIcon
                name={isPasswordVisible ? "eye-off" : "eye"}
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
        </DirectionalRow>

        {error ? (
          <ThemedText
            style={[
              Typography.caption,
              { color: theme.error, marginTop: Spacing.xs },
            ]}
          >
            {error}
          </ThemedText>
        ) : null}
      </View>
    );
  },
);

StyledInput.displayName = "StyledInput";

const styles = StyleSheet.create({
  inputContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: INPUT_FONT_SIZE,
    fontFamily: "AlbertSans_400Regular",
  },
});

export default StyledInput;
