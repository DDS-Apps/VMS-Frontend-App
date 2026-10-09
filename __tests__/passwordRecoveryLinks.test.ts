import { parsePasswordRecoveryLink } from '@/utils/passwordRecoveryLinks';

describe('dedicated reset-link parsing', () => {
  it.each([
    'https://frontend.example/reset-password#token=fixture',
    'https://frontend.example/reset-password/?token=fixture',
    'vms://reset-password#token=fixture',
    'vms:///reset-password#token=fixture',
    'exp://127.0.0.1:5000/--/reset-password#token=fixture',
  ])('preserves reset intent for %s', url => {
    expect(parsePasswordRecoveryLink(url)).toEqual({ mode: 'reset', token: 'fixture' });
  });
  it.each(['/invite/example?token=invite', '/?token=invite', '/#access_token=sso', '/requests/new'])('does not intercept %s', path => {
    expect(parsePasswordRecoveryLink(`https://frontend.example${path}`)).toBeNull();
  });
  it.each(['', '#token=', '#token=a&token=b', '?token=a#token=b', '#token=%20', `#token=${'x'.repeat(4097)}`])('keeps malformed or missing credentials on the invalid-link page', suffix => {
    expect(parsePasswordRecoveryLink(`https://frontend.example/reset-password${suffix}`)).toEqual({ mode: 'reset', token: null });
  });
  it('accepts only supported locale hints and never reads a token on request pages', () => {
    expect(parsePasswordRecoveryLink('https://frontend.example/reset-password?lang=ar#token=fixture')).toEqual({ mode: 'reset', token: 'fixture', locale: 'ar' });
    expect(parsePasswordRecoveryLink('https://frontend.example/forgot-password?lang=other#token=fixture')).toEqual({ mode: 'request', token: null });
  });
});
