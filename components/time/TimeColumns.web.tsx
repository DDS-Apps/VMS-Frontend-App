import React, { useEffect, useRef } from 'react';
import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { toArabicNumerals } from '@/utils/formatters';
import { parseTime12 } from '@/utils/timeInput';

interface ColumnProps {
  id: string;
  label: string;
  items: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}

function Column({ id, label, items, selected, onSelect }: ColumnProps) {
  const { theme } = useTheme();
  const list = useRef<HTMLDivElement>(null);
  const index = items.findIndex(item => item.value === selected);
  useEffect(() => {
    if (list.current) list.current.scrollTop = Math.max(0, index * 32 - (list.current.clientHeight - 32) / 2);
  }, [index]);
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div id={`${id}-label`} style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center', textTransform: 'capitalize', paddingBottom: 6 }}>
        {label}
      </div>
      <div
        ref={list} id={id} role="listbox" aria-labelledby={`${id}-label`}
        aria-activedescendant={`${id}-${selected}`} tabIndex={0}
        onKeyDown={event => {
          let next = index;
          if (event.key === 'ArrowDown') next = Math.min(items.length - 1, index + 1);
          else if (event.key === 'ArrowUp') next = Math.max(0, index - 1);
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = items.length - 1;
          else return;
          event.preventDefault();
          event.stopPropagation();
          onSelect(items[next].value);
        }}
        style={{ height: 176, overflowY: 'auto', overscrollBehavior: 'contain', outlineColor: theme.primary }}
      >
        {items.map(item => (
          <button
            id={`${id}-${item.value}`} key={item.value} type="button" role="option"
            tabIndex={-1} aria-selected={item.value === selected}
            onMouseDown={event => event.preventDefault()}
            onClick={() => onSelect(item.value)}
            style={{
              display: 'block', width: '100%', height: 32, border: 0, borderRadius: 4,
              background: item.value === selected ? theme.primary : 'transparent',
              color: item.value === selected ? '#fff' : theme.text,
              cursor: 'pointer', fontSize: 16, fontFamily: Typography.body.fontFamily,
            }}
          >{item.label}</button>
        ))}
      </div>
    </div>
  );
}

export function TimeColumns({ id, value, onChange, onDone }: {
  id: string;
  value: Date;
  onChange: (value: Date) => void;
  onDone: () => void;
}) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const hour = value.getHours() % 12 || 12;
  const minute = value.getMinutes();
  const period = value.getHours() >= 12 ? 'PM' : 'AM';
  const number = (value: number) => {
    const text = String(value).padStart(2, '0');
    return isRTL ? toArabicNumerals(text) : text;
  };
  function change(part: 'hour' | 'minute' | 'period', selected: string) {
    const next = parseTime12(
      `${part === 'hour' ? selected : hour}:${part === 'minute' ? selected : String(minute).padStart(2, '0')} ${part === 'period' ? selected : period}`,
      value,
    );
    if (next) onChange(next);
  }
  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        <Column
          id={`${id}-hour`} label={t('time.hour')} selected={String(hour)}
          items={Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: number(index + 1) }))}
          onSelect={selected => change('hour', selected)}
        />
        <Column
          id={`${id}-minute`} label={t('time.minute')} selected={String(minute)}
          items={Array.from({ length: 60 }, (_, index) => ({ value: String(index), label: number(index) }))}
          onSelect={selected => change('minute', selected)}
        />
        <Column
          id={`${id}-period`} label={`${t('time.am')} / ${t('time.pm')}`} selected={period}
          items={[{ value: 'AM', label: t('time.am') }, { value: 'PM', label: t('time.pm') }]}
          onSelect={selected => change('period', selected)}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${theme.border}`, marginTop: 8, paddingTop: 8 }}>
        <button
          type="button" onMouseDown={event => event.preventDefault()} onClick={onDone}
          style={{
            border: 0, borderRadius: 6, background: theme.primary, color: '#fff',
            padding: '8px 18px', fontSize: 14, fontFamily: Typography.body.fontFamily, cursor: 'pointer',
          }}
        >{t('common.done')}</button>
      </div>
    </>
  );
}
