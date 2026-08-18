import type { LocalizationKey } from '../../core/i18n/keys';

/** A full dictionary. Only en.ts is required to implement every key. */
export type LocaleDict = Record<LocalizationKey, string>;

/** Other locales may be partial; missing keys fall back to English. */
export type PartialLocaleDict = Partial<LocaleDict>;
