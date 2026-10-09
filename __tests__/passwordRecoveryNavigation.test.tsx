import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Linking, Platform } from 'react-native';
import { usePasswordRecoveryNavigation } from '@/hooks/usePasswordRecoveryNavigation';

let recovery: ReturnType<typeof usePasswordRecoveryNavigation>;
function Probe() { recovery = usePasswordRecoveryNavigation(); return null; }
let renderer: ReactTestRenderer;
const originalOS = Platform.OS;
const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
function restore(name: string, descriptor?: PropertyDescriptor) {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  else delete (globalThis as any)[name];
}

describe('public recovery navigation', () => {
  afterEach(() => {
    if (renderer) act(() => renderer.unmount());
    jest.restoreAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    restore('window', windowDescriptor);
    restore('document', documentDescriptor);
  });

  it('captures once, removes URL credentials, clears redeemed tokens and explicitly returns to login', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    const location = { href: 'https://frontend.example/reset-password?lang=ar#token=synthetic-secret' };
    const listeners: Record<string, () => void> = {};
    const replaceState = jest.fn((_data, _title, path) => { location.href = new URL(path, location.href).href; });
    const pushState = jest.fn((_data, _title, path) => { location.href = new URL(path, location.href).href; });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {
      location, history: { replaceState, pushState },
      addEventListener: (name: string, callback: () => void) => { listeners[name] = callback; },
      removeEventListener: jest.fn(),
    } });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: {
      createElement: () => ({ remove: jest.fn() }), head: { appendChild: jest.fn() },
    } });
    await act(async () => { renderer = create(<Probe />); });
    expect(recovery.page).toMatchObject({ mode: 'reset', token: 'synthetic-secret', locale: 'ar' });
    expect(location.href).toBe('https://frontend.example/reset-password');
    expect(replaceState).toHaveBeenCalledWith({}, '', '/reset-password');
    act(() => recovery.resetSuccess());
    expect(recovery.page).toMatchObject({ mode: 'success', token: null });
    act(() => recovery.backToLogin());
    expect(recovery.page).toBeNull();
    expect(recovery.showLogin).toBe(true);
    expect(location.href).toBe('https://frontend.example/');
    act(() => recovery.loginSuccess());
    expect(recovery.showLogin).toBe(false);
    act(() => recovery.requestNewLink('user@example.test'));
    expect(recovery.page).toMatchObject({ mode: 'request', token: null, initialEmail: 'user@example.test' });
    location.href = 'https://frontend.example/reset-password';
    act(() => listeners.popstate());
    expect(recovery.page).toMatchObject({ mode: 'reset', token: null });
  });

  it('preserves native cold and warm links without needing an authenticated navigator', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('vms://reset-password#token=cold');
    let incoming!: (event: { url: string }) => void;
    jest.spyOn(Linking, 'addEventListener').mockImplementation((_type, listener) => {
      incoming = listener;
      return { remove: jest.fn() };
    });
    await act(async () => { renderer = create(<Probe />); });
    expect(recovery.page).toMatchObject({ mode: 'reset', token: 'cold' });
    act(() => recovery.backToLogin());
    act(() => incoming({ url: 'https://frontend.example/reset-password#token=warm' }));
    expect(recovery.page).toMatchObject({ mode: 'reset', token: 'warm' });
    expect(recovery.showLogin).toBe(false);
  });

  it('does not let a delayed cold link overwrite a newer warm link', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    let resolve!: (url: string) => void;
    jest.spyOn(Linking, 'getInitialURL').mockImplementation(() => new Promise(done => { resolve = done; }));
    let incoming!: (event: { url: string }) => void;
    jest.spyOn(Linking, 'addEventListener').mockImplementation((_type, listener) => {
      incoming = listener;
      return { remove: jest.fn() };
    });
    await act(async () => { renderer = create(<Probe />); });
    act(() => incoming({ url: 'vms://reset-password#token=newer' }));
    await act(async () => resolve('vms://reset-password#token=older'));
    expect(recovery.page?.token).toBe('newer');
  });
});
