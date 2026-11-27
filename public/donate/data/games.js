/*
 * Bible Games Project games shown in the "Our games" section, in this order.
 *
 * To add a game, copy one entry and fill it in. Fields:
 *   title        Game title as it should appear.
 *   description  One or two short sentences, taken from the game's official store page or
 *                written by the maintainer. Leave '' if there is no approved text yet (the card
 *                then shows only the title; never put "coming soon"-style wording here).
 *   status       'Released', 'In development', 'Upcoming' or '' (no badge).
 *   image        Path to REAL artwork or a screenshot of the game, e.g. 'assets/games/my-game.webp'
 *                (landscape, about 1200x675). Leave '' to show a clean title cover instead.
 *                Never use generated or generic images to represent a game.
 *   imageAlt     Short description of the image for screen readers.
 *   links        Official store pages: [{ label: 'Steam', url: 'https://...' }, ...].
 *
 * Descriptions, statuses and links for TRUE CHRIST, The Lost Sheep and Didactic Jesus come from
 * their official Steam, App Store, Google Play and biblegamesproject.com pages (November 2026).
 * TODO (maintainer): Eden to Heaven and Bibledoo have no public page yet: add their description,
 * status and artwork. Real artwork is still missing for every game except The Lady of Lourdes.
 */
window.BGP_GAMES = [
  {
    title: 'TRUE CHRIST',
    description: 'A 3D adventure through the life of Jesus that explores both His humanity and His divinity, including His miracles, healings and exorcisms.',
    status: 'Upcoming',
    image: '',
    imageAlt: '',
    links: [
      { label: 'Steam', url: 'https://store.steampowered.com/app/4244150/True_Christ/' },
    ],
  },
  {
    title: 'Eden to Heaven',
    description: '',
    status: '',
    image: '',
    imageAlt: '',
    links: [],
  },
  {
    title: 'Bibledoo',
    description: '',
    status: '',
    image: '',
    imageAlt: '',
    links: [],
  },
  {
    title: 'The Lost Sheep',
    description: 'Based on the parable of the lost sheep: two parallel stories, a lost sheep searching for its way home and a man finding forgiveness and a new life in Jesus.',
    status: 'Released',
    image: '',
    imageAlt: '',
    links: [
      { label: 'Steam', url: 'https://store.steampowered.com/app/2298350/The_Lost_Sheep/' },
      { label: 'App Store', url: 'https://apps.apple.com/app/the-lost-sheep-bible-game/id6740145333' },
      { label: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.JoanSabe.TheLostSheep' },
    ],
  },
  {
    title: 'Didactic Jesus',
    description: 'A free role-playing game about the life of Jesus. Play as Jesus, Mary, Joseph, the Wise Men and the Apostles while a teacher explains each moment of the Gospel.',
    status: 'Released',
    image: '',
    imageAlt: '',
    links: [
      { label: 'Steam', url: 'https://store.steampowered.com/app/2138140/Didactic_Jesus_Game/' },
      { label: 'Google Play (demo)', url: 'https://play.google.com/store/apps/details?id=com.biblegamesproject.didacticjesusgame' },
    ],
  },
  {
    title: 'The Lady of Lourdes',
    description: 'Walk with Bernadette through the eighteen apparitions at the Grotto of Massabielle, Lourdes, 1858.',
    status: 'In development',
    image: 'assets/games/the-lady-of-lourdes.webp',
    imageAlt: 'Pixel-art scene from The Lady of Lourdes: Bernadette kneels before the Grotto, where Our Lady appears in white and blue.',
    links: [],
  },
];
