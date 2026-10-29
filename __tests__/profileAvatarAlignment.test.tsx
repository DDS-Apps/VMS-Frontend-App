import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Platform, StyleSheet, Text, View } from 'react-native';
import ts from 'typescript';
import { Typography, containsArabic, getLocaleFontFamily, FontFamily } from '@/constants/theme';
import { getInitials } from '@/utils/formatters';

const source = fs.readFileSync(path.resolve(__dirname, '../screens/Common/SettingsScreen.tsx'), 'utf8');
const start = source.indexOf('<View style={[styles.avatar,');
const avatarJSX = source.slice(start, source.indexOf('</View>', start) + '</View>'.length);
const styleBody = source.match(/avatarInitials:\s*\{([^}]+)\}/)![1];
const avatarInitials = new Function('Typography', `return ({${styleBody}});`)(Typography);
const code = ts.transpileModule(
  `function Avatar({ userName }) { return (${avatarJSX}); }`,
  { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 } },
).outputText;
const Avatar = new Function(
  'React', 'View', 'Text', 'styles', 'theme', 'Typography',
  'getLocaleFontFamily', 'containsArabic', 'getInitials',
  `${code}; return Avatar;`,
)(
  React, View, Text,
  { avatar: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center' }, avatarInitials },
  { primary: '#f80' }, Typography, getLocaleFontFamily, containsArabic, getInitials,
);

describe('Profile avatar initials alignment', () => {
  const originalOS = Platform.OS;
  afterEach(() => { Platform.OS = originalOS; });

  it.each(['ios', 'android', 'web'] as const)('centers Latin and Arabic initials on %s', os => {
    Platform.OS = os;
    for (const name of ['Fating Buffet', 'محمد أحمد']) {
      let tree!: ReactTestRenderer;
      act(() => { tree = create(<Avatar userName={name} />); });
      const initials = getInitials(name);
      const label = tree.root.findByType(Text);
      expect(label.props.children).toBe(initials);
      expect(StyleSheet.flatten(label.props.style)).toMatchObject({
        fontFamily: containsArabic(initials) ? FontFamily.arabicBold : FontFamily.latinBold,
        fontSize: 20,
        includeFontPadding: false,
        textAlign: 'center',
        textAlignVertical: 'center',
      });
      expect(StyleSheet.flatten(label.props.style).lineHeight).toBeUndefined();
      expect(label.props.adjustsFontSizeToFit).toBe(true);
      expect(label.props.numberOfLines).toBe(1);
      act(() => tree.unmount());
    }
  });

  it('retains the existing avatar size and parent centering', () => {
    expect(source).toMatch(/avatar:\s*\{\s*width: 60,\s*height: 60,/);
    expect(source).toMatch(/profileContainer:\s*\{\s*alignItems: 'center',/);
    expect(source).toContain('source={{ uri: userPhotoUrl }}');
  });
});
