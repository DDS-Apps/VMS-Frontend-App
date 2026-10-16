import { useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { NavigationContext } from '@react-navigation/native';

/** React Query's browser visibility handling does not cover native screens
 * retained in a navigation stack. Scope timers and reads to this visible view. */
export function useActiveVisitView() {
  const navigation = useContext(NavigationContext);
  const visible = () => Platform.OS === 'web'
    ? typeof document === 'undefined' || document.visibilityState !== 'hidden'
    : AppState.currentState == null || AppState.currentState === 'active';
  const [foreground, setForeground] = useState(visible);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);
  useEffect(() => {
    const focus = navigation?.addListener('focus', () => setFocused(true));
    const blur = navigation?.addListener('blur', () => setFocused(false));
    const change = () => setForeground(visible());
    const appState = AppState.addEventListener('change', change);
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', change);
    return () => {
      focus?.(); blur?.(); appState.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', change);
    };
  }, [navigation]);
  return foreground && focused;
}

export function useQrClock() {
  const active = useActiveVisitView();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}
