import { K } from '../../core/i18n/keys';
import type { DialogueSequence } from './types';

/**
 * Ambient (non-mission) chats — flavor conversation with a background NPC that never advances an
 * objective, changes story state, or otherwise touches `MissionManager`. Repeatable: talking to the
 * same NPC again just replays the same short exchange.
 */
export const boyAmbientDialogue = [
  { speaker: 'boy', textKey: K.DIALOGUE_BOY_AMBIENT_1 },
  { speaker: 'bernadette', textKey: K.DIALOGUE_BERNADETTE_BOY_AMBIENT_1 },
  { speaker: 'boy', textKey: K.DIALOGUE_BOY_AMBIENT_2 },
  { speaker: 'bernadette', textKey: K.DIALOGUE_BERNADETTE_BOY_AMBIENT_2 },
  { speaker: 'boy', textKey: K.DIALOGUE_BOY_AMBIENT_3 },
] satisfies DialogueSequence;
