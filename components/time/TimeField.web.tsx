import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DDIcon } from '@/components/DDIcon';
import { ThemedText } from '@/components/ThemedText';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { formatTime12, isValidTime, parseTime12 } from '@/utils/timeInput';
import { TimeColumns } from './TimeColumns.web';
import type { TimeFieldProps } from './TimeField.types';

// react-dom is already a runtime dependency; this module is never loaded on native.
const { createPortal } = require('react-dom') as {
  createPortal: (children: React.ReactNode, container: Element) => React.ReactPortal;
};

export function TimeField({
  value, onTimeSelect, label, style, disabled, onValidityChange,
}: TimeFieldProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const listId = useId();
  const [draft, setDraft] = useState(() => formatTime12(value, isRTL));
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [pickerTime, setPickerTime] = useState(value);
  const [pickerDirty, setPickerDirty] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 264 });
  const anchor = useRef<View>(null);
  const popup = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const validity = useRef(onValidityChange);
  validity.current = onValidityChange;
  const interactingPopup = useRef(false);
  const lastCommit = useRef<number | undefined>(undefined);
  const focusColumnOnOpen = useRef(false);
  const valueStamp = isValidTime(value) ? value.getTime() : NaN;

  useEffect(() => {
    setDraft(formatTime12(value, isRTL));
    setPickerTime(value);
    setPickerDirty(false);
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
    const maxHeight = Math.max(40, Math.min(264, Math.max(below, rect.top - 8)));
    const top = below >= Math.min(264, rect.top - 8) ? rect.bottom + 4 : Math.max(4, rect.top - maxHeight - 4);
    const width = Math.min(Math.max(rect.width, 224), 320, window.innerWidth - 8);
    const alignedLeft = isRTL ? rect.right - width : rect.left;
    setPosition({ top, left: Math.max(4, Math.min(alignedLeft, window.innerWidth - width - 4)), width, maxHeight });
  }, [isRTL]);

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
    if (open && focusColumnOnOpen.current) {
      focusColumnOnOpen.current = false;
      document.getElementById(`${listId}-hour`)?.focus();
    }
  }, [open, listId]);

  function openList() {
    if (disabled || !isValidTime(value)) return;
    const selected = parseTime12(draft, value) ?? value;
    setPickerTime(new Date(selected));
    setPickerDirty(false);
    interactingPopup.current = false;
    locate();
    setOpen(true);
  }

  function applyPicker() {
    input.current?.focus();
    commit(new Date(pickerTime));
  }

  function discard() {
    input.current?.focus();
    setOpen(false);
    setDraft(formatTime12(value, isRTL));
    setPickerDirty(false);
    setError(!isValidTime(value));
    validity.current?.(isValidTime(value));
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
          aria-autocomplete="none"
          aria-haspopup="dialog"
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
            setPickerDirty(false);
            const parsed = parseTime12(text, value);
            const valid = parsed !== null;
            if (parsed) {
              setPickerTime(parsed);
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
              if (!open) {
                focusColumnOnOpen.current = true;
                openList();
              } else document.getElementById(`${listId}-hour`)?.focus();
            } else if (event.key === 'Enter') {
              event.preventDefault();
              if (open && pickerDirty) applyPicker();
              else commitDraft();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              discard();
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
          role="dialog"
          aria-label={label}
          onPointerDownCapture={() => { interactingPopup.current = true; }}
          onPointerUpCapture={() => { interactingPopup.current = false; }}
          onPointerCancel={() => { interactingPopup.current = false; }}
          onBlur={event => {
            const next = event.relatedTarget as Node | null;
            const field = anchor.current as unknown as HTMLElement | null;
            if (!popup.current?.contains(next) && !field?.contains(next)) commitDraft();
          }}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              discard();
            } else if (event.key === 'Enter') {
              event.preventDefault();
              applyPicker();
            }
          }}
          style={{
            position: 'fixed', ...position, zIndex: 2147483647, overflowY: 'auto',
            padding: 8, boxSizing: 'border-box', fontFamily: Typography.body.fontFamily,
            background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)', direction: isRTL ? 'rtl' : 'ltr',
          }}
        >
          <TimeColumns
            id={listId} value={pickerTime}
            onChange={time => { setPickerTime(time); setPickerDirty(true); }}
            onDone={applyPicker}
          />
        </div>,
        (anchor.current as unknown as HTMLElement | null)?.closest?.('[aria-modal="true"], [role="dialog"]') ?? document.body,
      ) : null}
    </View>
  );
}
