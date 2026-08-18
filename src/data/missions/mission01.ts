import { K } from '../../core/i18n/keys';
import type { DialogueSequence } from '../dialogue/types';
import type { Mission } from './types';

export const MISSION_01_FIREWOOD_TARGET = 3;

export const MISSION_01_OBJECTIVES = {
  TALK_TO_MOTHER: 'talkToMother',
  GATHER_FIREWOOD: 'gatherFirewood',
  GO_TO_MASSABIELLE: 'goToMassabielle',
  COLLECT_FIREWOOD: 'collectFirewood',
  REACH_RIVER: 'reachRiver',
  PRAY: 'pray',
} as const;

/**
 * Dialogue for the first apparition mission, grouped by story beat. Historical
 * wording is intentionally minimal — only what the brief specifies. The Lady
 * never speaks on 11 February 1858 and no line is invented for her.
 */
export const mission01Dialogue = {
  motherIntro: [
    { speaker: 'mother', textKey: K.DIALOGUE_MOTHER_M1_1 },
    { speaker: 'bernadette', textKey: K.DIALOGUE_BERNADETTE_M1_1 },
    { speaker: 'mother', textKey: K.DIALOGUE_MOTHER_M1_2 },
  ] satisfies DialogueSequence,
  friendMeet: [
    { speaker: 'friend', textKey: K.DIALOGUE_FRIEND_M1_1 },
    { speaker: 'sister', textKey: K.DIALOGUE_SISTER_M1_1 },
    { speaker: 'bernadette', textKey: K.DIALOGUE_BERNADETTE_M1_2 },
  ] satisfies DialogueSequence,
};

export const mission01: Mission = {
  id: 'mission01',
  index: 1,
  dateKey: K.MISSION_1_DATE,
  titleKey: K.MISSION_1_TITLE,
  objectives: [
    { id: MISSION_01_OBJECTIVES.TALK_TO_MOTHER, textKey: K.MISSION_1_OBJ_TALK_TO_MOTHER },
    { id: MISSION_01_OBJECTIVES.GATHER_FIREWOOD, textKey: K.MISSION_1_OBJ_GATHER_FIREWOOD },
    { id: MISSION_01_OBJECTIVES.GO_TO_MASSABIELLE, textKey: K.MISSION_1_OBJ_GO_TO_MASSABIELLE },
    { id: MISSION_01_OBJECTIVES.COLLECT_FIREWOOD, textKey: K.MISSION_1_OBJ_COLLECT_FIREWOOD },
    { id: MISSION_01_OBJECTIVES.REACH_RIVER, textKey: K.MISSION_1_OBJ_REACH_RIVER },
    { id: MISSION_01_OBJECTIVES.PRAY, textKey: K.MISSION_1_OBJ_PRAY },
  ],
  npcAvailability: { mother: true, sister: true, friend: true, lady: true },
  locations: ['cachot', 'grotto'],
  hasApparition: true,
  music: null,
  ambience: 'river',
  implemented: true,
};
