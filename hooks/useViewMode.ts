/**
 * useViewMode
 * -----------
 * Persists the card/list view mode toggle across navigation for a given screen key.
 * Defaults to 'list' (table view) on first use.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ViewMode = 'card' | 'list';

const STORAGE_PREFIX = '@vms_viewmode_';

export function useViewMode(screenKey: string): [ViewMode, (mode: ViewMode) => void] {
  const storageKey = `${STORAGE_PREFIX}${screenKey}`;
  const [viewMode, setViewModeState] = useState<ViewMode>('list');

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((stored) => {
      if (stored === 'card' || stored === 'list') {
        setViewModeState(stored);
      }
    }).catch(() => {
      // Ignore storage errors; default stays 'list'
    });
  }, [storageKey]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    AsyncStorage.setItem(storageKey, mode).catch(() => {
      // Ignore storage errors
    });
  }, [storageKey]);

  return [viewMode, setViewMode];
}
