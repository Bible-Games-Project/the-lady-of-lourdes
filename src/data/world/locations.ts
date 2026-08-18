import { K } from '../../core/i18n/keys';

export type LocationId =
  | 'cachot'
  | 'grotto'
  | 'hospice'
  | 'presbytery'
  | 'maisonCenac'
  | 'tribunal'
  | 'church';

export interface LocationDefinition {
  id: LocationId;
  nameKey: string;
  /** First mission index this location's interior/story becomes available. `null` = not yet implemented (locked). */
  interactableFromMission: number | null;
}

export const LOCATIONS: Record<LocationId, LocationDefinition> = {
  cachot: { id: 'cachot', nameKey: K.LOCATION_CACHOT, interactableFromMission: 1 },
  grotto: { id: 'grotto', nameKey: K.LOCATION_GROTTO, interactableFromMission: 1 },
  hospice: { id: 'hospice', nameKey: K.LOCATION_HOSPICE, interactableFromMission: null },
  presbytery: { id: 'presbytery', nameKey: K.LOCATION_PRESBYTERY, interactableFromMission: null },
  maisonCenac: { id: 'maisonCenac', nameKey: K.LOCATION_MAISON_CENAC, interactableFromMission: null },
  tribunal: { id: 'tribunal', nameKey: K.LOCATION_TRIBUNAL, interactableFromMission: null },
  church: { id: 'church', nameKey: K.LOCATION_CHURCH, interactableFromMission: null },
};

export function isLocationUnlocked(id: LocationId, currentMissionIndex: number): boolean {
  const def = LOCATIONS[id];
  return def.interactableFromMission !== null && currentMissionIndex >= def.interactableFromMission;
}
