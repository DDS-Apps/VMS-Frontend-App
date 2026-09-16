import React from 'react';
import { act, create } from 'react-test-renderer';

// Minimal stand-in for React Navigation's focus effect: behaves like the real
// hook (runs the callback when focused, re-runs when its identity changes) and
// lets the test fire focus events directly.
const mockFocusCallbacks = new Set<() => void | (() => void)>();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      useEffect(() => {
        mockFocusCallbacks.add(callback);
        const cleanup = callback();
        return () => {
          mockFocusCallbacks.delete(callback);
          if (typeof cleanup === 'function') cleanup();
        };
      }, [callback]);
    },
  };
});

import { useRefetchOnRefocus } from '@/hooks/useRefetchOnRefocus';

function fireFocus() {
  act(() => {
    mockFocusCallbacks.forEach((callback) => {
      callback();
    });
  });
}

function Harness({
  refetchers,
  enabled,
}: {
  refetchers: Array<(options?: { cancelRefetch?: boolean }) => unknown>;
  enabled?: boolean;
}) {
  useRefetchOnRefocus(refetchers, enabled);
  return null;
}

beforeEach(() => {
  mockFocusCallbacks.clear();
});

describe('useRefetchOnRefocus', () => {
  it('skips the first focus and refetches on later focuses without cancelling in-flight fetches', () => {
    const refetchA = jest.fn();
    const refetchB = jest.fn();

    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(<Harness refetchers={[refetchA, refetchB]} />);
    });

    expect(refetchA).not.toHaveBeenCalled();
    expect(refetchB).not.toHaveBeenCalled();

    fireFocus();
    expect(refetchA).toHaveBeenCalledTimes(1);
    expect(refetchA).toHaveBeenCalledWith({ cancelRefetch: false });
    expect(refetchB).toHaveBeenCalledTimes(1);

    fireFocus();
    expect(refetchA).toHaveBeenCalledTimes(2);

    act(() => tree.unmount());
  });

  it('uses the latest refetchers even though the focus callback identity is stable', () => {
    const first = jest.fn();
    const second = jest.fn();

    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(<Harness refetchers={[first]} />);
    });
    act(() => {
      tree.update(<Harness refetchers={[second]} />);
    });

    expect(mockFocusCallbacks.size).toBe(1);
    fireFocus();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    act(() => tree.unmount());
  });

  it('does nothing while disabled', () => {
    const refetch = jest.fn();

    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(<Harness refetchers={[refetch]} enabled={false} />);
    });

    fireFocus();
    fireFocus();
    expect(refetch).not.toHaveBeenCalled();

    act(() => {
      tree.update(<Harness refetchers={[refetch]} enabled />);
    });
    fireFocus();
    expect(refetch).toHaveBeenCalledTimes(1);

    act(() => tree.unmount());
  });
});
