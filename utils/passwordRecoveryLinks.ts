export type PasswordRecoveryRoute = {
  mode: 'request' | 'reset';
  token: string | null;
  locale?: 'en' | 'ar';
};

/** Only explicit recovery paths may read reset tokens; invitation/SSO URLs are untouched. */
export function parsePasswordRecoveryLink(url: string): PasswordRecoveryRoute | null {
  try {
    const parsed = new URL(url);
    const path = (parsed.protocol === 'https:' || parsed.protocol === 'http:'
      ? parsed.pathname
      : `/${parsed.hostname}${parsed.pathname}`).replace(/\/+$/, '').replace(/^\/--/, '');
    const nativePath = parsed.pathname.replace(/^\/--/, '').replace(/\/+$/, '');
    const recoveryPath = [path, nativePath].find(value =>
      value === '/forgot-password' || value === '/reset-password');
    if (!recoveryPath) return null;
    const fragment = new URLSearchParams(parsed.hash.slice(1));
    const candidates = [...fragment.getAll('token'), ...parsed.searchParams.getAll('token')];
    const token = candidates.length === 1 && candidates[0].length <= 4096 &&
      candidates[0].length > 0 && !/[\s\u0000-\u001f]/.test(candidates[0])
      ? candidates[0] : null;
    const language = parsed.searchParams.get('lang');
    return {
      mode: recoveryPath === '/forgot-password' ? 'request' : 'reset',
      token: recoveryPath === '/reset-password' ? token : null,
      ...(language === 'ar' || language === 'en' ? { locale: language } : {}),
    };
  } catch {
    return null;
  }
}
