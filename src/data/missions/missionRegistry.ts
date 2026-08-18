import { K } from '../../core/i18n/keys';
import { mission01 } from './mission01';
import type { Mission } from './types';

function placeholderMission(index: number, dateKey: string | null): Mission {
  return {
    id: `mission${String(index).padStart(2, '0')}`,
    index,
    dateKey,
    titleKey: null,
    objectives: [],
    npcAvailability: {},
    locations: [],
    hasApparition: false,
    music: null,
    ambience: null,
    implemented: false,
  };
}

// Dates for missions 4-17 were not specified in the design brief (only 1, 2,
// 3 and 18 were given as examples) — left null rather than invented. Fill
// them in as real content is provided for each apparition.
export const MISSIONS: Mission[] = [
  mission01,
  placeholderMission(2, K.MISSION_2_DATE),
  placeholderMission(3, K.MISSION_3_DATE),
  placeholderMission(4, null),
  placeholderMission(5, null),
  placeholderMission(6, null),
  placeholderMission(7, null),
  placeholderMission(8, null),
  placeholderMission(9, null),
  placeholderMission(10, null),
  placeholderMission(11, null),
  placeholderMission(12, null),
  placeholderMission(13, null),
  placeholderMission(14, null),
  placeholderMission(15, null),
  placeholderMission(16, null),
  placeholderMission(17, null),
  placeholderMission(18, K.MISSION_18_DATE),
];

export function getMission(index: number): Mission | undefined {
  return MISSIONS.find((m) => m.index === index);
}
