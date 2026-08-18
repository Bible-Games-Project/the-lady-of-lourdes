import { SAVE_KEY } from './constants';
import type { LanguageCode } from './i18n/languages';

export interface AudioSettings {
  enabled: boolean;
  volume: number; // 0..1
}

export interface SaveDataShape {
  version: 1;
  /** True once the player has confirmed a language, either on first launch or via Settings. */
  languageConfirmed: boolean;
  language: LanguageCode;
  music: AudioSettings;
  sfx: AudioSettings;
  progress: {
    currentMissionId: string | null;
    completedMissionIds: string[];
  };
}

function defaultSave(): SaveDataShape {
  return {
    version: 1,
    languageConfirmed: false,
    language: 'en',
    music: { enabled: true, volume: 0.6 },
    sfx: { enabled: true, volume: 0.8 },
    progress: {
      currentMissionId: null,
      completedMissionIds: [],
    },
  };
}

class SaveDataStore {
  private data: SaveDataShape;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveDataShape {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw) as Partial<SaveDataShape>;
      return { ...defaultSave(), ...parsed };
    } catch {
      return defaultSave();
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage unavailable (e.g. private browsing); progress just won't persist.
    }
  }

  get(): Readonly<SaveDataShape> {
    return this.data;
  }

  setLanguage(language: LanguageCode, confirmed = true): void {
    this.data.language = language;
    this.data.languageConfirmed = confirmed;
    this.persist();
  }

  setMusicSettings(settings: Partial<AudioSettings>): void {
    this.data.music = { ...this.data.music, ...settings };
    this.persist();
  }

  setSfxSettings(settings: Partial<AudioSettings>): void {
    this.data.sfx = { ...this.data.sfx, ...settings };
    this.persist();
  }

  setCurrentMission(missionId: string | null): void {
    this.data.progress.currentMissionId = missionId;
    this.persist();
  }

  completeMission(missionId: string): void {
    if (!this.data.progress.completedMissionIds.includes(missionId)) {
      this.data.progress.completedMissionIds.push(missionId);
    }
    this.persist();
  }

  isMissionCompleted(missionId: string): boolean {
    return this.data.progress.completedMissionIds.includes(missionId);
  }
}

export const SaveData = new SaveDataStore();
