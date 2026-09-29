// Polyfill Intl.PluralRules — Hermes (React Native) ships without it, which makes
// i18next's v4 plural resolver warn and fall back to legacy handling. Must be
// imported before i18next initializes below.
import 'intl-pluralrules';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import type { Language } from '@/src/types';

import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';

export const SUPPORTED_LANGUAGES = ['de', 'en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'de';

const resources = {
  de: { translation: de },
  en: { translation: en },
  es: { translation: es },
} as const;

/** The OS-preferred language if we support it, else the default. */
export function deviceLanguage(): SupportedLanguage {
  const locales = getLocales();
  for (const l of locales) {
    const code = (l.languageCode ?? '').toLowerCase();
    if ((SUPPORTED_LANGUAGES as readonly string[]).includes(code)) {
      return code as SupportedLanguage;
    }
  }
  return DEFAULT_LANGUAGE;
}

/** Resolve a stored setting ('system' | code) to a concrete supported code. */
export function resolveLanguage(setting: Language): SupportedLanguage {
  if (setting !== 'system' && (SUPPORTED_LANGUAGES as readonly string[]).includes(setting)) {
    return setting as SupportedLanguage;
  }
  return deviceLanguage();
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: deviceLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    compatibilityJSON: 'v4',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

/** Apply a stored language setting to the live i18n instance. */
export function applyLanguage(setting: Language): void {
  const lng = resolveLanguage(setting);
  if (i18n.language !== lng) i18n.changeLanguage(lng);
}

export default i18n;
