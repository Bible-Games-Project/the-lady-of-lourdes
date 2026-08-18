import { LOCALES } from '../../data/locales';
import { en } from '../../data/locales/en';
import type { LanguageCode } from './languages';
import { DEFAULT_LANGUAGE } from './languages';

type Listener = (language: LanguageCode) => void;

/**
 * Centralized localization service. All user-facing text must be looked up
 * through `t()` instead of being hard-coded in UI components, so the whole
 * game can be re-skinned to any of the 12 supported languages.
 */
class LocalizationService {
  private language: LanguageCode = DEFAULT_LANGUAGE;
  private listeners: Listener[] = [];

  setLanguage(code: LanguageCode): void {
    if (this.language === code) return;
    this.language = code;
    for (const listener of this.listeners) listener(code);
  }

  getLanguage(): LanguageCode {
    return this.language;
  }

  onLanguageChange(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** Translates a key, with optional {var} interpolation, falling back to English then the key itself. */
  t(key: string, vars?: Record<string, string | number>): string {
    const dict = LOCALES[this.language];
    let text = dict[key as keyof typeof dict] ?? en[key as keyof typeof en] ?? key;

    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
      }
    }

    return text;
  }
}

export const Localization = new LocalizationService();
