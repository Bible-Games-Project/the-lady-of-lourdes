import { Localization } from '../core/i18n/Localization';
import { SaveData } from '../core/SaveData';
import { MISSION_01_FIREWOOD_TARGET, MISSION_01_OBJECTIVES } from '../data/missions/mission01';
import type { Mission, MissionObjective } from '../data/missions/types';

/**
 * Tracks live progress through the current mission: which objective is
 * active and any mission-specific counters (currently just firewood).
 * Persists only mission *completion* to SaveData — in-progress state resets
 * if the player leaves before finishing, which is fine for a short mission.
 */
class MissionManagerService {
  private mission: Mission | null = null;
  private objectiveIndex = 0;
  private firewoodCollected = 0;

  startMission(mission: Mission): void {
    this.mission = mission;
    this.objectiveIndex = 0;
    this.firewoodCollected = 0;
    SaveData.setCurrentMission(mission.id);
  }

  getMission(): Mission | null {
    return this.mission;
  }

  getCurrentObjective(): MissionObjective | null {
    if (!this.mission) return null;
    return this.mission.objectives[this.objectiveIndex] ?? null;
  }

  /** Advances to the next objective. Call once the current one is fulfilled. */
  advanceObjective(): void {
    if (!this.mission) return;
    this.objectiveIndex = Math.min(this.objectiveIndex + 1, this.mission.objectives.length - 1);
  }

  /** True once the player's progress has reached (or passed) the objective with this id. */
  hasReachedObjective(objectiveId: string): boolean {
    if (!this.mission) return false;
    const index = this.mission.objectives.findIndex((o) => o.id === objectiveId);
    return index !== -1 && this.objectiveIndex >= index;
  }

  getObjectiveText(): string {
    const objective = this.getCurrentObjective();
    if (!objective) return '';
    if (objective.id === MISSION_01_OBJECTIVES.COLLECT_FIREWOOD) {
      return Localization.t(objective.textKey, {
        count: this.firewoodCollected,
        total: MISSION_01_FIREWOOD_TARGET,
      });
    }
    return Localization.t(objective.textKey);
  }

  addFirewood(): number {
    this.firewoodCollected = Math.min(this.firewoodCollected + 1, MISSION_01_FIREWOOD_TARGET);
    return this.firewoodCollected;
  }

  getFirewoodCollected(): number {
    return this.firewoodCollected;
  }

  isFirewoodTargetReached(): boolean {
    return this.firewoodCollected >= MISSION_01_FIREWOOD_TARGET;
  }

  completeMission(): void {
    if (!this.mission) return;
    SaveData.completeMission(this.mission.id);
    SaveData.setCurrentMission(null);
    this.mission = null;
    this.objectiveIndex = 0;
    this.firewoodCollected = 0;
  }
}

export const MissionManager = new MissionManagerService();
