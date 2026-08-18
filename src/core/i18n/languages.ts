export type LanguageCode =
  | 'en'
  | 'es'
  | 'ca'
  | 'fr'
  | 'de'
  | 'it'
  | 'pt'
  | 'nl'
  | 'pl'
  | 'ru'
  | 'zh'
  | 'ja';

export interface LanguageInfo {
  code: LanguageCode;
  nativeName: string;
}

/** The 12 languages the final game will support. Order shown in the language picker. */
export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'es', nativeName: 'Español' },
  { code: 'ca', nativeName: 'Català' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'pt', nativeName: 'Português' },
  { code: 'nl', nativeName: 'Nederlands' },
  { code: 'pl', nativeName: 'Polski' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'zh', nativeName: '中文' },
  { code: 'ja', nativeName: '日本語' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

const SUPPORTED_CODES = new Set<string>(SUPPORTED_LANGUAGES.map((l) => l.code));

export function isSupportedLanguage(code: string): code is LanguageCode {
  return SUPPORTED_CODES.has(code);
}

/**
 * Detects the device/browser language and maps it to one of the 12 supported
 * languages. Falls back to English when the device language is not supported.
 */
export function detectDeviceLanguage(): LanguageCode {
  const candidates = navigator.languages && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];

  for (const raw of candidates) {
    if (!raw) continue;
    const primary = raw.split('-')[0].toLowerCase();
    if (isSupportedLanguage(primary)) {
      return primary;
    }
  }

  return DEFAULT_LANGUAGE;
}
