/**
 * Central registry of every localization key used by the game.
 * Referencing K.SOMETHING instead of a raw string keeps typos from silently
 * producing missing translations.
 */
export const K = {
  COMMON_INTERACT: 'common.interact',
  COMMON_TALK: 'common.talk',
  COMMON_CONTINUE: 'common.continue',
  COMMON_BACK: 'common.back',
  COMMON_CLOSE: 'common.close',
  COMMON_ON: 'common.on',
  COMMON_OFF: 'common.off',

  HOME_PLAY: 'home.play',
  HOME_SETTINGS: 'home.settings',
  HOME_MORE_GAMES: 'home.moreGames',

  MORE_GAMES_TITLE: 'moreGames.title',
  MORE_GAMES_COMING_SOON: 'moreGames.comingSoon',

  SETTINGS_TITLE: 'settings.title',
  SETTINGS_LANGUAGE: 'settings.language',
  SETTINGS_MUSIC: 'settings.music',
  SETTINGS_SFX: 'settings.sfx',

  LANGUAGE_SELECT_TITLE: 'languageSelect.title',
  LANGUAGE_SELECT_SUBTITLE: 'languageSelect.subtitle',
  LANGUAGE_SELECT_CONFIRM: 'languageSelect.confirm',

  NPC_BERNADETTE_NAME: 'npc.bernadette.name',
  NPC_MOTHER_NAME: 'npc.mother.name',
  NPC_SISTER_NAME: 'npc.sister.name',
  NPC_FRIEND_NAME: 'npc.friend.name',
  NPC_LADY_NAME: 'npc.lady.name',

  LOCATION_CACHOT: 'location.cachot',
  LOCATION_GROTTO: 'location.grotto',
  LOCATION_HOSPICE: 'location.hospice',
  LOCATION_PRESBYTERY: 'location.presbytery',
  LOCATION_MAISON_CENAC: 'location.maisonCenac',
  LOCATION_TRIBUNAL: 'location.tribunal',
  LOCATION_CHURCH: 'location.church',
  LOCATION_LOCKED_NOTE: 'location.lockedNote',

  INTERACT_TALK: 'interact.talk',
  INTERACT_FIREWOOD: 'interact.firewood',
  INTERACT_PRAY: 'interact.pray',
  INTERACT_EXIT: 'interact.exit',

  OBJECTIVE_LABEL: 'objective.label',

  MISSION_1_DATE: 'mission.1.date',
  MISSION_1_TITLE: 'mission.1.title',
  MISSION_2_DATE: 'mission.2.date',
  MISSION_3_DATE: 'mission.3.date',
  MISSION_18_DATE: 'mission.18.date',

  MISSION_1_OBJ_TALK_TO_MOTHER: 'mission.1.objective.talkToMother',
  MISSION_1_OBJ_GATHER_FIREWOOD: 'mission.1.objective.gatherFirewood',
  MISSION_1_OBJ_GO_TO_MASSABIELLE: 'mission.1.objective.goToMassabielle',
  MISSION_1_OBJ_COLLECT_FIREWOOD: 'mission.1.objective.collectFirewood',
  MISSION_1_OBJ_REACH_RIVER: 'mission.1.objective.reachRiver',
  MISSION_1_OBJ_PRAY: 'mission.1.objective.pray',

  DIALOGUE_MOTHER_M1_1: 'dialogue.mother.m1.1',
  DIALOGUE_MOTHER_M1_2: 'dialogue.mother.m1.2',
  DIALOGUE_BERNADETTE_M1_1: 'dialogue.bernadette.m1.1',
  DIALOGUE_FRIEND_M1_1: 'dialogue.friend.m1.1',
  DIALOGUE_BERNADETTE_M1_2: 'dialogue.bernadette.m1.2',
  DIALOGUE_SISTER_M1_1: 'dialogue.sister.m1.1',

  NARRATION_CACHOT_INTRO: 'narration.cachotIntro',
  NARRATION_RIVER_STAY_BEHIND: 'narration.riverStayBehind',
  NARRATION_ALONE: 'narration.alone',
  NARRATION_SOMETHING_UNUSUAL: 'narration.somethingUnusual',

  FIREWOOD_PROGRESS: 'firewood.progress',

  APPARITION_DATE_CARD: 'apparition.dateCard',
  APPARITION_TITLE_CARD: 'apparition.titleCard',

  MISSION_COMPLETE_TITLE: 'missionComplete.title',
  MISSION_COMPLETE_CONTINUE: 'missionComplete.continue',
} as const;

export type LocalizationKey = (typeof K)[keyof typeof K];
