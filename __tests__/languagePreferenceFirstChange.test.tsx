import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Platform } from 'react-native';
import type { SupportedLocale } from '@/utils/localeManager';

let mockActiveLocale: SupportedLocale = 'en';
const mockSaveLocal = jest.fn(async (locale: SupportedLocale) => { mockActiveLocale = locale; });
const mockSaveProfile = jest.fn<Promise<void>, [SupportedLocale]>();

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: mockActiveLocale, setLocale: mockSaveLocal }),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ updateLanguagePreference: mockSaveProfile }),
}));

import { useLanguagePreference } from '@/hooks/useLanguagePreference';

describe('first language selection', () => {
  const originalPlatform = Platform.OS;
  let change!: (locale: SupportedLocale) => Promise<void>;
  let renderer!: TestRenderer.ReactTestRenderer;

  function Probe() {
    change = useLanguagePreference();
    return null;
  }

  beforeEach(async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    mockActiveLocale = 'en';
    mockSaveLocal.mockClear();
    mockSaveProfile.mockReset();
    mockSaveProfile.mockResolvedValue();
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });
  });

  afterEach(() => {
    act(() => renderer.unmount());
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });

  it('applies Arabic on the first selection even while the server is still saving', async () => {
    let finish!: () => void;
    mockSaveProfile.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    let pending!: Promise<void>;
    await act(async () => {
      pending = change('ar');
      await Promise.resolve();
    });

    expect(mockActiveLocale).toBe('ar');
    expect(mockSaveLocal).toHaveBeenCalledTimes(1);
    expect(mockSaveProfile).toHaveBeenCalledWith('ar');
    await act(async () => { finish(); await pending; });
  });

  it('restores the previous language if saving the preference fails', async () => {
    mockSaveProfile.mockRejectedValueOnce(new Error('save failed'));
    await act(async () => {
      await expect(change('ar')).rejects.toThrow('save failed');
    });
    expect(mockSaveLocal.mock.calls).toEqual([['ar'], ['en']]);
    expect(mockActiveLocale).toBe('en');
  });

  it('saves on native before restarting into the new direction', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    let finish!: () => void;
    mockSaveProfile.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    let pending!: Promise<void>;
    await act(async () => {
      pending = change('ar');
      await Promise.resolve();
    });
    expect(mockSaveLocal).not.toHaveBeenCalled();
    await act(async () => { finish(); await pending; });
    expect(mockActiveLocale).toBe('ar');
  });
});