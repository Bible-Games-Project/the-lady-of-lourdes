import { K } from '../../core/i18n/keys';
import type { NpcDefinition, NpcId } from './types';

export const NPCS: Record<NpcId, NpcDefinition> = {
  bernadette: { id: 'bernadette', nameKey: K.NPC_BERNADETTE_NAME },
  mother: { id: 'mother', nameKey: K.NPC_MOTHER_NAME },
  sister: { id: 'sister', nameKey: K.NPC_SISTER_NAME },
  friend: { id: 'friend', nameKey: K.NPC_FRIEND_NAME },
  lady: { id: 'lady', nameKey: K.NPC_LADY_NAME },
  villagerMale: { id: 'villagerMale', nameKey: '' },
  villagerFemale: { id: 'villagerFemale', nameKey: '' },
};
