import type { LanguageCode } from '../../core/i18n/languages';
import type { PartialLocaleDict } from './types';
import { en } from './en';
import { es } from './es';
import { ca } from './ca';
import { fr } from './fr';
import { de } from './de';
import { it } from './it';
import { pt } from './pt';
import { nl } from './nl';
import { pl } from './pl';
import { ru } from './ru';
import { zh } from './zh';
import { ja } from './ja';

export const LOCALES: Record<LanguageCode, PartialLocaleDict> = {
  en,
  es,
  ca,
  fr,
  de,
  it,
  pt,
  nl,
  pl,
  ru,
  zh,
  ja,
};
