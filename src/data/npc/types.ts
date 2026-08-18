import type { CharacterId } from '../../pixelart/characters';

/** NPC identity reuses the pixel-art character catalog so every NPC has a matching sprite/portrait. */
export type NpcId = CharacterId;

export interface NpcDefinition {
  id: NpcId;
  /** Empty string for unnamed background villagers — their name is not shown in dialogue. */
  nameKey: string;
}
