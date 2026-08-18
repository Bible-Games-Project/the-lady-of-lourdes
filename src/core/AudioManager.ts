import Phaser from 'phaser';
import { SaveData } from './SaveData';

/**
 * Thin wrapper around Phaser's sound manager that respects the persisted
 * music/SFX on-off and volume settings. No audio assets are bundled yet
 * (none were provided) — play calls are safe no-ops until real files are
 * added under an `audio` key matching the requested key.
 */
class AudioManagerService {
  private sound: Phaser.Sound.BaseSoundManager | null = null;
  private music: Phaser.Sound.BaseSound | null = null;
  private musicKey: string | null = null;

  init(sound: Phaser.Sound.BaseSoundManager): void {
    this.sound = sound;
  }

  private hasAsset(key: string): boolean {
    return !!this.sound && this.sound.game.cache.audio.has(key);
  }

  playMusic(key: string, loop = true): void {
    if (!this.sound) return;
    if (this.musicKey === key && this.music?.isPlaying) return;

    this.stopMusic();
    this.musicKey = key;
    if (!this.hasAsset(key)) return;

    const { music } = SaveData.get();
    this.music = this.sound.add(key, { loop, volume: music.enabled ? music.volume : 0 });
    this.music.play();
  }

  stopMusic(): void {
    this.music?.stop();
    this.music?.destroy();
    this.music = null;
    this.musicKey = null;
  }

  playSfx(key: string): void {
    if (!this.sound) return;
    const { sfx } = SaveData.get();
    if (!sfx.enabled || !this.hasAsset(key)) return;
    this.sound.play(key, { volume: sfx.volume });
  }

  /** Re-applies current settings to whatever is playing (call after a settings change). */
  refresh(): void {
    const { music } = SaveData.get();
    if (this.music && 'setVolume' in this.music) {
      (this.music as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(
        music.enabled ? music.volume : 0,
      );
    }
  }
}

export const AudioManager = new AudioManagerService();
