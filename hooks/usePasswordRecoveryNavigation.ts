import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BackHandler, Linking, Platform } from 'react-native';
import { parsePasswordRecoveryLink, type PasswordRecoveryRoute } from '@/utils/passwordRecoveryLinks';

type RecoveryPage = Omit<PasswordRecoveryRoute, 'mode'> & {
  mode: 'request' | 'reset' | 'success';
  initialEmail?: string;
  revision: number;
};

export function usePasswordRecoveryNavigation() {
  const revision = useRef(0);
  const [page, setPage] = useState<RecoveryPage | null>(() => {
    const route = Platform.OS === 'web' ? parsePasswordRecoveryLink(window.location.href) : null;
    return route ? { ...route, revision: 0 } : null;
  });
  const [showLogin, setShowLogin] = useState(false);

  const open = useCallback((route: PasswordRecoveryRoute & { initialEmail?: string }) => {
    setPage({ ...route, revision: ++revision.current });
    setShowLogin(false);
  }, []);
  const requestNewLink = useCallback((initialEmail?: string) => {
    if (Platform.OS === 'web') window.history.pushState({}, '', '/forgot-password');
    open({ mode: 'request', token: null, initialEmail });
  }, [open]);
  const backToLogin = useCallback(() => {
    if (Platform.OS === 'web') window.history.replaceState({}, '', '/');
    setPage(null);
    // A recovery link can be opened with an existing session. Do not silently
    // route to its dashboard or sign out an unrelated account.
    setShowLogin(true);
  }, []);
  const resetSuccess = useCallback(() => {
    setPage(previous => previous ? { ...previous, token: null, mode: 'success' } : null);
  }, []);
  const loginSuccess = useCallback(() => setShowLogin(false), []);

  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || !page) return;
    // Capture happened in memory before rendering. Never put secrets in history state.
    const path = page.mode === 'request' ? '/forgot-password' : '/reset-password';
    window.history.replaceState({}, '', path);
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [page?.revision, page?.mode]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleUrl = () => {
        const route = parsePasswordRecoveryLink(window.location.href);
        if (route) open(route);
        else setPage(null);
      };
      window.addEventListener('popstate', handleUrl);
      window.addEventListener('hashchange', handleUrl);
      return () => {
        window.removeEventListener('popstate', handleUrl);
        window.removeEventListener('hashchange', handleUrl);
      };
    }
    let mounted = true;
    let receivedWarmLink = false;
    const subscription = Linking.addEventListener('url', ({ url }) => {
      receivedWarmLink = true;
      const route = parsePasswordRecoveryLink(url);
      if (route) open(route);
    });
    void Linking.getInitialURL().then(url => {
      if (!mounted || receivedWarmLink || !url) return;
      const route = parsePasswordRecoveryLink(url);
      if (route) open(route);
    }).catch(() => { /* No raw URL/error logging. Normal login remains available. */ });
    return () => { mounted = false; subscription.remove(); };
  }, [open]);

  useEffect(() => {
    if (!page || Platform.OS === 'web') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      backToLogin();
      return true;
    });
    return () => subscription.remove();
  }, [!!page, backToLogin]);

  return { page, showLogin, requestNewLink, backToLogin, resetSuccess, loginSuccess };
}
