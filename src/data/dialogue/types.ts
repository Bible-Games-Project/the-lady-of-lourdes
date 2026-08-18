import type { NpcId } from '../npc/types';

export interface DialogueLine {
  speaker: NpcId;
  textKey: string;
}

export type DialogueSequence = DialogueLine[];
