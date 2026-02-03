import { Colors } from "@/constants/theme";

export type ThemeColors = typeof Colors.light;

export type Theme = ThemeColors;

export type StatusConfig = {
  label: string;
  text: string;
  bg: string;
  border: string;
  borderColor: string;
  icon?: string;
};
