import React from 'react';
import { act, create } from 'react-test-renderer';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const seen: string[] = [];

function Harness({ value }: { value: string }) {
  const debounced = useDebouncedValue(value, 300);
  seen.push(debounced);
  return null;
}

const render = (renderer: ReturnType<typeof create> | null, value: string) => {
  const element = <Harness value={value} />;
  if (!renderer) return create(element);
  renderer.update(element);
  return renderer;
};

beforeEach(() => {
  jest.useFakeTimers();
  seen.length = 0;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('returns the initial value immediately and later values only after they settle', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = render(null, 'a');
    });
    expect(seen).toEqual(['a']);

    act(() => {
      render(renderer, 'ab');
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    act(() => {
      render(renderer, 'abc');
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    // 400 ms after the first edit, but only 200 ms after the last one.
    expect(seen[seen.length - 1]).toBe('a');

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(seen[seen.length - 1]).toBe('abc');
    expect(seen.filter((value) => value === 'ab')).toHaveLength(0);

    act(() => {
      renderer.unmount();
    });
  });

  it('does not emit when the value returns to the settled one inside the window', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = render(null, 'a');
    });
    act(() => {
      render(renderer, 'ab');
    });
    act(() => {
      render(renderer, 'a');
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(seen.every((value) => value === 'a')).toBe(true);

    act(() => {
      renderer.unmount();
    });
  });
});
