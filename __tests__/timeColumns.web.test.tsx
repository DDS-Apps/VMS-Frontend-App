import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TimeColumns } from '@/components/time/TimeColumns.web';

let mockRTL = false;
let mockDark = false;

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      primary: '#f58220', border: '#888',
      text: mockDark ? '#fff' : '#222',
      textSecondary: mockDark ? '#ccc' : '#555',
    },
  }),
}));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ isRTL: mockRTL, t: (key: string) => key }),
}));

describe('web time-picker columns', () => {
  it.each([
    ['English light', false, false],
    ['English dark', false, true],
    ['Arabic light', true, false],
    ['Arabic dark', true, true],
  ])('selects all 60 minutes in AM and PM: %s', async (_name, rtl, dark) => {
    mockRTL = rtl as boolean;
    mockDark = dark as boolean;
    for (const hour of [4, 16]) {
      const reference = new Date(2026, 9, 26, hour, 35);
      const onChange = jest.fn();
      const onDone = jest.fn();
      let renderer!: ReactTestRenderer;
      await act(async () => {
        renderer = create(
          <TimeColumns id="test" value={reference} onChange={onChange} onDone={onDone} />,
        );
      });
      for (let minute = 0; minute < 60; minute++) {
        const option = renderer.root.findByProps({ id: `test-minute-${minute}` });
        const label = String(minute).padStart(2, '0');
        expect(option.props.children).toBe(mockRTL
          ? label.replace(/\d/g, digit => String.fromCharCode(0x660 + Number(digit)))
          : label);
        await act(async () => option.props.onClick());
        expect(onChange).toHaveBeenCalledTimes(minute + 1);
        const selected: Date = onChange.mock.calls[minute][0];
        expect([
          selected.getFullYear(), selected.getMonth(), selected.getDate(),
          selected.getHours(), selected.getMinutes(),
        ]).toEqual([2026, 9, 26, hour, minute]);
        expect(reference.getMinutes()).toBe(35);
      }
      await act(async () => {
        renderer.root.findAllByType('button').find(button => button.props.children === 'common.done')!
          .props.onClick();
      });
      expect(onDone).toHaveBeenCalledTimes(1);
      await act(async () => renderer.unmount());
    }
  });

  it('supports keyboard selection of 00 and 09 without changing the hour', async () => {
    const onChange = jest.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <TimeColumns id="keyboard" value={new Date(2026, 9, 26, 16, 10)}
          onChange={onChange} onDone={jest.fn()} />,
      );
    });
    const column = renderer.root.findByProps({ id: 'keyboard-minute', role: 'listbox' });
    for (const [key, minute] of [['Home', 0], ['ArrowUp', 9]] as const) {
      const preventDefault = jest.fn();
      await act(async () => column.props.onKeyDown({ key, preventDefault, stopPropagation: jest.fn() }));
      expect(preventDefault).toHaveBeenCalled();
      const selected: Date = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(selected.getHours()).toBe(16);
      expect(selected.getMinutes()).toBe(minute);
    }
    await act(async () => renderer.unmount());
  });
});
