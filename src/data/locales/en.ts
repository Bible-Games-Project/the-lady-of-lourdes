import { K } from '../../core/i18n/keys';
import type { LocaleDict } from './types';

/**
 * English is the canonical, fully-populated locale. Every other locale file
 * only needs to override the keys it has translations for; anything missing
 * falls back to this dictionary.
 */
export const en: LocaleDict = {
  [K.COMMON_INTERACT]: 'Interact',
  [K.COMMON_TALK]: 'Talk',
  [K.COMMON_CONTINUE]: 'Continue',
  [K.COMMON_BACK]: 'Back',
  [K.COMMON_CLOSE]: 'Close',
  [K.COMMON_ON]: 'ON',
  [K.COMMON_OFF]: 'OFF',

  [K.HOME_PLAY]: 'Play',
  [K.HOME_SETTINGS]: 'Settings',
  [K.HOME_MORE_GAMES]: 'More Games',

  [K.MORE_GAMES_TITLE]: 'More Games',
  [K.MORE_GAMES_COMING_SOON]: 'More games from Bible Games Project will appear here soon.',

  [K.SETTINGS_TITLE]: 'Settings',
  [K.SETTINGS_LANGUAGE]: 'Language',
  [K.SETTINGS_MUSIC]: 'Music',
  [K.SETTINGS_SFX]: 'Sound Effects',

  [K.LANGUAGE_SELECT_TITLE]: 'Choose your language',
  [K.LANGUAGE_SELECT_SUBTITLE]: 'You can change this later in Settings.',
  [K.LANGUAGE_SELECT_CONFIRM]: 'Confirm',

  [K.NPC_BERNADETTE_NAME]: 'Bernadette',
  [K.NPC_MOTHER_NAME]: 'Louise',
  [K.NPC_SISTER_NAME]: 'Toinette',
  [K.NPC_FRIEND_NAME]: 'Jeanne',
  [K.NPC_LADY_NAME]: 'The Lady',

  [K.LOCATION_CACHOT]: 'Le Cachot',
  [K.LOCATION_GROTTO]: 'Grotto of Massabielle',
  [K.LOCATION_HOSPICE]: 'Hospice',
  [K.LOCATION_PRESBYTERY]: 'Presbytery',
  [K.LOCATION_MAISON_CENAC]: 'Maison Cénac',
  [K.LOCATION_TRIBUNAL]: 'Tribunal',
  [K.LOCATION_CHURCH]: 'Parish Church',
  [K.LOCATION_LOCKED_NOTE]: 'This place is not yet part of the story.',

  [K.INTERACT_TALK]: 'Talk',
  [K.INTERACT_FIREWOOD]: 'Pick up firewood',
  [K.INTERACT_PRAY]: 'Pray',
  [K.INTERACT_EXIT]: 'Exit',

  [K.OBJECTIVE_LABEL]: 'Objective',

  [K.MISSION_1_DATE]: '11 February 1858',
  [K.MISSION_1_TITLE]: 'The First Apparition',
  [K.MISSION_2_DATE]: '14 February 1858',
  [K.MISSION_3_DATE]: '18 February 1858',
  [K.MISSION_18_DATE]: '16 July 1858',

  [K.MISSION_1_OBJ_TALK_TO_MOTHER]: 'Talk to your mother.',
  [K.MISSION_1_OBJ_GATHER_FIREWOOD]: 'Go with your sister to collect firewood.',
  [K.MISSION_1_OBJ_GO_TO_MASSABIELLE]: 'Follow Jeanne to Massabielle.',
  [K.MISSION_1_OBJ_COLLECT_FIREWOOD]: 'Collect firewood ({count}/{total}).',
  [K.MISSION_1_OBJ_REACH_RIVER]: 'Follow the others to the river.',
  [K.MISSION_1_OBJ_PRAY]: 'Pray the rosary.',

  [K.DIALOGUE_MOTHER_M1_1]: 'Bernadette, take your sister and go gather some firewood. We have none left.',
  [K.DIALOGUE_MOTHER_M1_2]: 'Be careful, and stay together.',
  [K.DIALOGUE_BERNADETTE_M1_1]: 'Yes, Mother. We will go.',
  [K.DIALOGUE_FRIEND_M1_1]: 'There you are. Come with me — I know where we can find firewood, near Massabielle.',
  [K.DIALOGUE_BERNADETTE_M1_2]: 'All right. Let us go together.',
  [K.DIALOGUE_SISTER_M1_1]: "I'm coming too.",

  [K.NARRATION_CACHOT_INTRO]: 'Le Cachot, Lourdes. Winter, 1858.',
  [K.NARRATION_RIVER_STAY_BEHIND]:
    'Bernadette has long suffered from asthma. Afraid of the cold water, she does not cross.',
  [K.NARRATION_ALONE]: 'Bernadette is alone.',
  [K.NARRATION_SOMETHING_UNUSUAL]: 'She hears something like a gust of wind.',

  [K.FIREWOOD_PROGRESS]: 'Firewood: {count}/{total}',

  [K.APPARITION_DATE_CARD]: '11 February 1858',
  [K.APPARITION_TITLE_CARD]: 'First Apparition',

  [K.MISSION_COMPLETE_TITLE]: 'Mission Complete',
  [K.MISSION_COMPLETE_CONTINUE]: 'Return to Lourdes',
};
