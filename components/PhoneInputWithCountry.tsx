import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { DDIcon } from '@/components/DDIcon';
import { DirectionalRow } from '@/components/DirectionalRow';
import Spacer from '@/components/Spacer';
import { Spacing, BorderRadius, Typography, FontFamily, getInputFontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  COUNTRIES,
  CountryData,
  DEFAULT_COUNTRY_CODE,
  getCountryByCode,
  parsePhoneWithCountry,
  formatNationalNumber,
} from '@/constants/countryData';

interface PhoneInputWithCountryProps {
  value: string;
  onChangeText: (fullNumber: string) => void;
  placeholder?: string;
  error?: string;
  label?: string;
  required?: boolean;
  editable?: boolean;
  testID?: string;
}

// Get flag image URL from flagcdn.com
const getFlagUrl = (countryCode: string) => {
  return `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`;
};

// Flag Avatar Component with fallback
const FlagAvatar = ({ 
  countryCode, 
  size = 24 
}: { 
  countryCode: string; 
  size?: number;
}) => {
  const { theme } = useTheme();
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    // Fallback to country code text
    return (
      <View 
        style={[
          styles.flagAvatar, 
          styles.flagFallback,
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            backgroundColor: theme.surfaceSecondary,
          }
        ]}
      >
        <ThemedText style={[styles.flagFallbackText, { fontSize: size * 0.4 }]}>
          {countryCode}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.flagAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image
        source={{ uri: getFlagUrl(countryCode) }}
        style={[styles.flagImage, { width: size, height: size, borderRadius: size / 2 }]}
        contentFit="cover"
        onError={() => setHasError(true)}
        cachePolicy="memory-disk"
      />
    </View>
  );
};

export const PhoneInputWithCountry = ({
  value,
  onChangeText,
  placeholder,
  error,
  label,
  required = false,
  editable = true,
  testID,
}: PhoneInputWithCountryProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL, locale } = useLanguage();
  const insets = useSafeAreaInsets();

  // Parse initial value to get country and national number
  const parsedValue = useMemo(() => {
    if (value) {
      const parsed = parsePhoneWithCountry(value);
      if (parsed) {
        return parsed;
      }
    }
    return null;
  }, [value]);

  const [selectedCountry, setSelectedCountry] = useState<CountryData>(
    parsedValue?.country || getCountryByCode(DEFAULT_COUNTRY_CODE) || COUNTRIES[0]
  );
  const [nationalNumber, setNationalNumber] = useState(
    parsedValue?.nationalNumber || ''
  );
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Update internal state when value prop changes
  useEffect(() => {
    if (value) {
      const parsed = parsePhoneWithCountry(value);
      if (parsed) {
        if (parsed.country.code !== selectedCountry.code) {
          setSelectedCountry(parsed.country);
        }
        if (parsed.nationalNumber !== nationalNumber.replace(/\s/g, '')) {
          setNationalNumber(parsed.nationalNumber);
        }
      }
    } else {
      setNationalNumber('');
    }
  }, [value]);

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) {
      return COUNTRIES;
    }
    const query = searchQuery.toLowerCase();
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.nameAr.includes(query) ||
        country.dialCode.includes(query) ||
        country.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleCountrySelect = useCallback((country: CountryData) => {
    setSelectedCountry(country);
    setShowCountryPicker(false);
    setSearchQuery('');
    
    // Update the full number with new country code
    const digits = nationalNumber.replace(/\D/g, '');
    if (digits) {
      onChangeText(`${country.dialCode}${digits}`);
    }
  }, [nationalNumber, onChangeText]);

  const handlePhoneChange = useCallback((text: string) => {
    const normalized = text.replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660))
                           .replace(/[\u06F0-\u06F9]/g, (c) => String(c.charCodeAt(0) - 0x06F0));
    const digits = normalized.replace(/\D/g, '');
    
    // Limit to country's max length
    const limitedDigits = digits.slice(0, selectedCountry.maxLength);
    
    // Format for display
    const formatted = formatNationalNumber(limitedDigits, selectedCountry.format);
    setNationalNumber(formatted);
    
    // Send full international format to parent
    if (limitedDigits) {
      onChangeText(`${selectedCountry.dialCode}${limitedDigits}`);
    } else {
      onChangeText('');
    }
  }, [selectedCountry, onChangeText]);

  const renderCountryItem = useCallback(({ item }: { item: CountryData }) => {
    const isSelected = item.code === selectedCountry.code;
    const displayName = locale === 'ar' ? item.nameAr : item.name;
    
    return (
      <Pressable
        onPress={() => handleCountrySelect(item)}
        style={[
          styles.countryItem,
          { 
            backgroundColor: isSelected ? theme.surfaceSecondary : 'transparent',
            borderBottomColor: theme.border,
          },
        ]}
      >
        <DirectionalRow style={styles.countryItemContent} gap={Spacing.md}>
          <FlagAvatar countryCode={item.code} size={32} />
          <View style={styles.countryInfo}>
            <ThemedText style={[styles.countryName, { color: theme.text }]} numberOfLines={1}>
              {displayName}
            </ThemedText>
            <ThemedText style={[styles.dialCode, { color: theme.textSecondary, writingDirection: 'ltr' }]}>
              {item.dialCode}
            </ThemedText>
          </View>
          {isSelected && (
            <DDIcon name="check" size={20} color={theme.primary} />
          )}
        </DirectionalRow>
      </Pressable>
    );
  }, [selectedCountry, handleCountrySelect, theme, locale]);

  const displayedNumber = useMemo(() => {
    const digits = nationalNumber.replace(/\D/g, '');
    return formatNationalNumber(digits, selectedCountry.format);
  }, [nationalNumber, selectedCountry]);

  const computedFontFamily = getInputFontFamily(displayedNumber, isRTL);
  const computedPaddingTop = isRTL ? 14 : 10;
  const computedPaddingBottom = isRTL ? 4 : 10;

  console.log('[PhoneInput] ==============================');
  console.log('[PhoneInput] isRTL:', isRTL);
  console.log('[PhoneInput] Platform.OS:', Platform.OS);
  console.log('[PhoneInput] fontFamily:', computedFontFamily);
  console.log('[PhoneInput] fontSize:', 16);
  console.log('[PhoneInput] paddingTop:', computedPaddingTop, '| paddingBottom:', computedPaddingBottom);
  console.log('[PhoneInput] container minHeight:', 48);
  console.log('[PhoneInput] displayedNumber:', displayedNumber || '(empty)');
  console.log('[PhoneInput] selectedCountry:', selectedCountry.code, selectedCountry.dialCode);

  const handlePhoneContainerLayout = (e: any) => {
    const { width, height } = e.nativeEvent.layout;
    console.log('[PhoneInput] Container onLayout -> width:', width, 'height:', height);
  };

  const handlePhoneInputLayout = (e: any) => {
    const { width, height, x, y } = e.nativeEvent.layout;
    console.log('[PhoneInput] TextInput onLayout -> width:', width, 'height:', height, 'x:', x, 'y:', y);
    console.log('[PhoneInput] Available text space = inputHeight - paddingTop - paddingBottom =', height - computedPaddingTop - computedPaddingBottom);
  };

  return (
    <View style={styles.container}>
      {label && (
        <>
          <ThemedText
            style={[
              Typography.label,
              { color: error ? theme.error : theme.textSecondary },
            ]}
          >
            {label.toUpperCase()}{required ? ' *' : ''}
          </ThemedText>
          <Spacer height={Spacing.xs} />
        </>
      )}
      
      <DirectionalRow
        style={[
          styles.inputContainer,
          {
            backgroundColor: editable === false ? theme.surfaceSecondary : theme.background,
            borderColor: error ? theme.error : theme.border,
            opacity: editable === false ? 0.6 : 1,
          },
        ]}
        onLayout={handlePhoneContainerLayout}
      >
        {/* Country Code Button */}
        <Pressable
          onPress={() => editable && setShowCountryPicker(true)}
          style={[
            styles.countryButton,
            { borderEndColor: theme.border },
          ]}
          disabled={!editable}
          testID={testID ? `${testID}-country-picker` : undefined}
        >
          <DirectionalRow gap={Spacing.xs} style={styles.countryButtonContent}>
            <FlagAvatar countryCode={selectedCountry.code} size={20} />
            <ThemedText style={[styles.dialCodeText, { color: theme.text, writingDirection: 'ltr' }]}>
              {selectedCountry.code} {selectedCountry.dialCode}
            </ThemedText>
            <DDIcon name="chevron-down" size={14} color={theme.textSecondary} />
          </DirectionalRow>
        </Pressable>

        {/* Phone Number Input */}
        <TextInput
          style={[
            styles.phoneInput,
            {
              color: theme.text,
              textAlign: isRTL ? 'right' : 'left',
              fontFamily: getInputFontFamily(displayedNumber, isRTL),
              textAlignVertical: 'center',
              ...(isRTL ? { paddingTop: 14, paddingBottom: 4 } : {}),
            },
          ]}
          value={displayedNumber}
          onChangeText={handlePhoneChange}
          onLayout={handlePhoneInputLayout}
          placeholder={placeholder || selectedCountry.format.replace(/X/g, '0')}
          placeholderTextColor={theme.textSecondary}
          keyboardType="phone-pad"
          editable={editable}
          testID={testID}
        />
      </DirectionalRow>

      {error && (
        <>
          <Spacer height={Spacing.xs} />
          <ThemedText style={[Typography.caption, { color: theme.error }]}>
            {error}
          </ThemedText>
        </>
      )}

      {/* Country Picker Modal - Half Screen */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCountryPicker(false)}
        transparent={Platform.OS === 'android'}
      >
        {Platform.OS === 'android' ? (
          // Android: Custom half-screen overlay
          <View style={styles.androidModalOverlay}>
            <Pressable 
              style={styles.androidModalBackdrop} 
              onPress={() => setShowCountryPicker(false)}
            >
              <View style={{ flex: 1 }} />
            </Pressable>
            <View
              style={[
                styles.androidModalContent,
                { 
                  backgroundColor: theme.background,
                  paddingBottom: insets.bottom,
                  height: Dimensions.get('window').height * 0.7,
                },
              ]}
            >
              {/* Modal Header */}
              <DirectionalRow style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <ThemedText style={[Typography.title, { color: theme.text, flex: 1 }]}>
                  {t('form.selectCountry')}
                </ThemedText>
                <Pressable
                  onPress={() => {
                    setShowCountryPicker(false);
                    setSearchQuery('');
                  }}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <DDIcon name="x" size={24} color={theme.text} />
                </Pressable>
              </DirectionalRow>

              {/* Search Input */}
              <View style={[styles.searchContainer, { backgroundColor: theme.surfaceSecondary }]}>
                <DirectionalRow gap={Spacing.sm} style={styles.searchInputRow}>
                  <DDIcon name="search" size={18} color={theme.textSecondary} />
                  <TextInput
                    style={[
                      styles.searchInput,
                      {
                        color: theme.text,
                        textAlign: isRTL ? 'right' : 'left',
                        fontFamily: getInputFontFamily(searchQuery, isRTL),
                      },
                    ]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={t('common.search')}
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')}>
                      <DDIcon name="x-circle" size={18} color={theme.textSecondary} />
                    </Pressable>
                  )}
                </DirectionalRow>
              </View>

              {/* Country List */}
              <FlatList
                data={filteredCountries}
                renderItem={renderCountryItem}
                keyExtractor={(item) => item.code}
                style={styles.countryList}
                contentContainerStyle={styles.countryListContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
                      {t('common.noResults')}
                    </ThemedText>
                  </View>
                }
              />
            </View>
          </View>
        ) : (
          // iOS: Native pageSheet
          <KeyboardAvoidingView
            style={[styles.modalContainer, { backgroundColor: theme.background }]}
            behavior="padding"
          >
            <ThemedView style={[styles.modalContent, { backgroundColor: theme.background }]}>
              {/* Modal Header */}
              <DirectionalRow style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <ThemedText style={[Typography.title, { color: theme.text, flex: 1 }]}>
                  {t('form.selectCountry')}
                </ThemedText>
                <Pressable
                  onPress={() => {
                    setShowCountryPicker(false);
                    setSearchQuery('');
                  }}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <DDIcon name="x" size={24} color={theme.text} />
                </Pressable>
              </DirectionalRow>

              {/* Search Input */}
              <View style={[styles.searchContainer, { backgroundColor: theme.surfaceSecondary }]}>
                <DirectionalRow gap={Spacing.sm} style={styles.searchInputRow}>
                  <DDIcon name="search" size={18} color={theme.textSecondary} />
                  <TextInput
                    style={[
                      styles.searchInput,
                      {
                        color: theme.text,
                        textAlign: isRTL ? 'right' : 'left',
                        fontFamily: getInputFontFamily(searchQuery, isRTL),
                      },
                    ]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={t('common.search')}
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')}>
                      <DDIcon name="x-circle" size={18} color={theme.textSecondary} />
                    </Pressable>
                  )}
                </DirectionalRow>
              </View>

              {/* Country List */}
              <FlatList
                data={filteredCountries}
                renderItem={renderCountryItem}
                keyExtractor={(item) => item.code}
                style={styles.countryList}
                contentContainerStyle={[styles.countryListContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
                      {t('common.noResults')}
                    </ThemedText>
                  </View>
                }
              />
            </ThemedView>
          </KeyboardAvoidingView>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    minHeight: 48,
  },
  countryButton: {
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderEndWidth: 1,
    minHeight: 48,
  },
  countryButtonContent: {
    alignItems: 'center',
  },
  flagAvatar: {
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  flagFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagFallbackText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  flagImage: {
    width: '100%',
    height: '100%',
  },
  dialCodeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    paddingVertical: 10,
  },
  // Android half-screen modal
  androidModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  androidModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  androidModalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  // iOS modal
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  closeButton: {
    padding: Spacing.xs,
  },
  searchContainer: {
    margin: Spacing.md,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  searchInputRow: {
    alignItems: 'center',
    flex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
    minHeight: 32,
  },
  countryList: {
    flex: 1,
  },
  countryListContent: {
    paddingBottom: Spacing.xxl,
  },
  countryItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
    justifyContent: 'center',
  },
  countryItemContent: {
    alignItems: 'center',
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
  dialCode: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
  },
  emptyState: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
});

export default PhoneInputWithCountry;
