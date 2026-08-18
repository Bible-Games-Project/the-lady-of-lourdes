import type { NpcId } from '../npc/types';
import type { LocationId } from '../world/locations';

export interface MissionObjective {
  id: string;
  textKey: string;
}

export interface Mission {
  id: string;
  /** 1-18, matching the 18 apparitions. */
  index: number;
  /** Localization key for the historical date, or null when not yet specified. */
  dateKey: string | null;
  titleKey: string | null;
  objectives: MissionObjective[];
  /** Which NPCs appear during this mission. */
  npcAvailability: Partial<Record<NpcId, boolean>>;
  /** Which locations are part of this mission's story. */
  locations: LocationId[];
  hasApparition: boolean;
  music: string | null;
  ambience: string | null;
  /** False = data placeholder only; not yet playable. */
  implemented: boolean;
}
