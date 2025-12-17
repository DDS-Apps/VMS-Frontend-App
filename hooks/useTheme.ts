import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { createContext, useContext, useMemo } from 'react';

type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  theme: typeof Colors.light | typeof Colors.dark;
};

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  const colorScheme = useColorScheme();
  
  const fallbackValue = useMemo(() => {
    const isDark = colorScheme === "dark";
    const theme = Colors[colorScheme ?? "light"];
    return {
      theme,
      isDark,
      toggleTheme: () => {},
    };
  }, [colorScheme]);
  
  return context ?? fallbackValue;
}
