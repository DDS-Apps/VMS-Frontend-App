import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { DDIcon } from "@/components/DDIcon";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface SelectionCheckboxProps {
  isSelected: boolean;
  onToggle: () => void;
  size?: number;
  disabled?: boolean;
}

export const SelectionCheckbox = ({ 
  isSelected, 
  onToggle, 
  size = 22,
  disabled = false 
}: SelectionCheckboxProps) => {
  const { theme } = useTheme();
  
  return (
    <Pressable 
      onPress={onToggle}
      disabled={disabled}
      style={[
        styles.checkbox,
        { 
          width: size,
          height: size,
          borderRadius: BorderRadius.sm,
          borderColor: isSelected ? theme.primary : theme.border,
          backgroundColor: isSelected ? theme.primary : 'transparent',
          opacity: disabled ? 0.5 : 1,
        }
      ]}
    >
      {isSelected ? (
        <DDIcon name="check" size={size * 0.64} color={theme.buttonText} />
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  checkbox: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
