import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DDIcon } from '@/components/DDIcon';
import { ThemedText } from '@/components/ThemedText';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { formatTime12, isValidTime, parseTime12, timeOptions } from '@/utils/timeInput';
import type { TimeFieldProps } from './TimeField.types';

// react-dom is already a runtime dependency; this module is never loaded on native.
const { createPortal } = require('react-dom') as {
  createPortal: (children: React.ReactNode, container: Element) => React.ReactPortal;
};

export function TimeField({
  value, onTimeSelect, label, style, disabled, minuteInterval = 5, onValidityChange,
}: TimeFieldProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const listId = useId();
  const [draft, setDraft] = useState(() => formatTime12(value, isRTL));
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 240 });
  const anchor = useRef<View>(null);
  const popup = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const validity = useRef(onValidityChange);
  validity.current = onValidityChange;
  const interactingPopup = useRef(false);
  const lastCommit = useRef<number | undefined>(undefined);
  const valueStamp = isValidTime(value) ? value.getTime() : NaN;
  const options = useMemo(() => timeOptions(value, minuteInterval), [valueStamp, minuteInterval]);

  useEffect(() => {
    setDraft(formatTime12(value, isRTL));
    setError(!isValidTime(value));
    validity.current?.(isValidTime(value));
  }, [valueStamp, isRTL]);
  useEffect(() => () => {
    validity.current?.(true);
  }, []);

  const locate = useCallback(() => {
    const node = anchor.current as unknown as HTMLElement | null;
    const rect = node?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - 8;
    const height = Math.max(40, Math.min(240, Math.max(below, rect.top - 8)));
    const top = below >= Math.min(240, rect.top - 8) ? rect.bottom + 4 : Math.max(4, rect.top - height - 4);
    setPosition({ top, left: Math.max(4, rect.left), width: Math.min(rect.width, window.innerWidth - 8), height });
  }, []);

  const commit = useCallback((time: Date) => {
    let applied = time;
    if ((!isValidTime(value) || time.getHours() !== value.getHours() || time.getMinutes() !== value.getMinutes())
      && lastCommit.current !== time.getTime()) {
      lastCommit.current = time.getTime();
      const result = onTimeSelect(time);
      if (isValidTime(result)) applied = result;
    }
    setDraft(formatTime12(applied, isRTL));
    setError(false);
    validity.current?.(true);
    setOpen(false);
  }, [isRTL, onTimeSelect, valueStamp]);

  const commitDraft = () => {
    const parsed = parseTime12(draft, value);
    if (parsed) commit(parsed);
    else {
      setError(true);
      validity.current?.(false);
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    locate();
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      const field = anchor.current as unknown as HTMLElement | null;
      if (!field?.contains(target) && !popup.current?.contains(target)) commitDraft();
    };
    const reposition = (event: Event) => {
      if (!popup.current?.contains(event.target as Node)) locate();
    };
    document.addEventListener('pointerdown', closeOutside, true);
    window.addEventListener('resize', locate);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside, true);
      window.removeEventListener('resize', locate);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, draft, locate, commit]);

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, listId]);

  function openList() {
    if (disabled || options.length === 0) return;
    const selected = parseTime12(draft, value) ?? value;
    const minutes = selected.getHours() * 60 + selected.getMinutes();
    setActiveIndex(Math.min(options.length - 1, Math.round(minutes / minuteInterval)));
    setNavigating(false);
    locate();
    setOpen(true);
  }

  return (
    <View style={{ minWidth: 0, flexShrink: 1 }}>
      <View
        ref={anchor}
        style={[style, {
          flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center',
          gap: Spacing.sm, borderColor: error ? theme.error : StyleSheet.flatten(style)?.borderColor,
        }]}
      >
        <DDIcon name="clock" size={18} color={theme.primary} />
        <input
          ref={input}
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
          aria-invalid={error}
          aria-describedby={error ? `${listId}-error` : undefined}
          autoComplete="off"
          disabled={disabled}
          value={draft}
          placeholder={isRTL ? '٢:٣٠ م' : '2:30 PM'}
          style={{
            flex: 1, minWidth: 0, width: '100%', border: 0, outline: 0, padding: 0,
            background: 'transparent', color: theme.text, fontSize: 16, lineHeight: '26px',
            fontFamily: Typography.body.fontFamily, textAlign: isRTL ? 'right' : 'left',
            direction: isRTL ? 'rtl' : 'ltr',
          }}
          onFocus={openList}
          onChange={event => {
            const text = event.target.value;
            setDraft(text);
            lastCommit.current = undefined;
            setNavigating(false);
            const parsed = parseTime12(text, value);
            const valid = parsed !== null;
            if (parsed) {
              const minutes = parsed.getHours() * 60 + parsed.getMinutes();
              setActiveIndex(Math.min(options.length - 1, Math.round(minutes / minuteInterval)));
            }
            setError(!valid);
            validity.current?.(valid);
          }}
          onBlur={event => {
            // Commit before a Save click, but do not remove an option before its click.
            if (!interactingPopup.current && !popup.current?.contains(event.relatedTarget as Node | null)) commitDraft();
          }}
          onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              if (!open) openList();
              else setActiveIndex(index => Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
              setNavigating(true);
            } else if (event.key === 'Enter') {
              event.preventDefault();
              // Edited text always wins; selecting a suggestion never discards an invalid draft silently.
              const parsed = parseTime12(draft, value);
              if (open && navigating) commit(options[activeIndex]);
              else if (parsed) commit(parsed);
              else commitDraft();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              setDraft(formatTime12(value, isRTL));
              setError(false);
              validity.current?.(isValidTime(value));
            }
          }}
        />
        <button
          type="button"
          aria-label={t('time.selectTime')}
          disabled={disabled}
          onMouseDown={event => event.preventDefault()}
          onClick={() => { input.current?.focus(); if (open) commitDraft(); else openList(); }}
          style={{ border: 0, background: 'transparent', padding: 2, cursor: disabled ? 'default' : 'pointer', display: 'flex' }}
        >
          <DDIcon name="chevron-down" size={18} color={theme.textSecondary} />
        </button>
      </View>
      {error ? (
        <ThemedText nativeID={`${listId}-error`} accessibilityRole="alert" style={[Typography.caption, { color: theme.error, marginTop: 4 }]}>
          {t('time.invalidTime')}
        </ThemedText>
      ) : null}
      {open && typeof document !== 'undefined' ? createPortal(
        <div
          ref={popup}
          id={listId}
          role="listbox"
          aria-label={label}
          onPointerDownCapture={() => { interactingPopup.current = true; }}
          onPointerUpCapture={() => { interactingPopup.current = false; }}
          onPointerCancel={() => { interactingPopup.current = false; }}
          style={{
            position: 'fixed', ...position, zIndex: 2147483647, overflowY: 'auto',
            background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)', direction: isRTL ? 'rtl' : 'ltr',
          }}
        >
          {options.map((time, index) => (
            <button
              key={index} id={`${listId}-${index}`} role="option" type="button" tabIndex={-1}
              aria-selected={index === activeIndex}
              onMouseDown={event => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => { commit(time); input.current?.focus(); setOpen(false); }}
              style={{
                display: 'block', width: '100%', border: 0, padding: '10px 14px', cursor: 'pointer',
                background: index === activeIndex ? theme.surfaceSecondary : theme.surface,
                color: theme.text, fontSize: 16, fontFamily: Typography.body.fontFamily,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >{formatTime12(time, isRTL)}</button>
          ))}
        </div>,
        (anchor.current as unknown as HTMLElement | null)?.closest?.('[aria-modal="true"], [role="dialog"]') ?? document.body,
      ) : null}
    </View>
  );
}
