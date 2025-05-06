// Bible curriculum path models and references
// Path.ts: Defines the data structures for Bible paths, units, and references
// revert too this later

import { ImageSourcePropType } from 'react-native';

// Represents a range of chapters within a specific book
export interface BibleReference {
  bookId: number; // Numeric ID for the book (e.g., 1 for Genesis)
  bookName: string; // Human-readable book name (e.g., "Genesis")
  chapters: number[]; // Array of chapter numbers
}

// Represents a single learning unit within a path
export interface Unit {
  id: string; // Unique identifier for the unit (e.g., 'gen-1')
  title: string; // Title of the unit (e.g., "Creation & Choice")
  description: string; // One sentence description of the unit conten
  reference: BibleReference | BibleReference[]; // The Bible chapters covered
  icon: string; // Icon name from @expo/vector-icons
  // Add other properties like description, xp reward, etc. later
}

// Represents a complete study path
export interface Path {
  id: string; // Unique identifier for the path (e.g., 'genesis-beginnings')
  title: string; // Title of the path (e.g., "Genesis: Beginnings")
  description: string; // Description of the path (e.g., "The beginning of the Bible")
  color: string; // Color of the path (e.g., "yellow")
  icon: string; // Icon name from @expo/vector-icons
  units: Unit[]; // Array of units within the path
  image?: ImageSourcePropType; // Image source for the path
  riveName?: string; // Name of the Rive animation resource
  artboardName?: string; // Name of the artboard in the Rive animation
}

// Mapping from Bible book names to their numeric IDs
// Based on common Bible API conventions
export const BIBLE_BOOK_IDS: { [key: string]: number } = {
  Genesis: 1,
  Exodus: 2,
  Leviticus: 3,
  Numbers: 4,
  Deuteronomy: 5,
  Joshua: 6,
  Judges: 7,
  Ruth: 8,
  '1 Samuel': 9,
  '2 Samuel': 10,
  '1 Kings': 11,
  '2 Kings': 12,
  '1 Chronicles': 13,
  '2 Chronicles': 14,
  Ezra: 15,
  Nehemiah: 16,
  Esther: 17,
  Job: 18,
  Psalms: 19,
  Proverbs: 20,
  Ecclesiastes: 21,
  'Song of Songs': 22,
  Isaiah: 23,
  Jeremiah: 24,
  Lamentations: 25,
  Ezekiel: 26,
  Daniel: 27,
  Hosea: 28,
  Joel: 29,
  Amos: 30,
  Obadiah: 31,
  Jonah: 32,
  Micah: 33,
  Nahum: 34,
  Habakkuk: 35,
  Zephaniah: 36,
  Haggai: 37,
  Zechariah: 38,
  Malachi: 39,
  Matthew: 40,
  Mark: 41,
  Luke: 42,
  John: 43,
  Acts: 44,
  Romans: 45,
  '1 Corinthians': 46,
  '2 Corinthians': 47,
  Galatians: 48,
  Ephesians: 49,
  Philippians: 50,
  Colossians: 51,
  '1 Thessalonians': 52,
  '2 Thessalonians': 53,
  '1 Timothy': 54,
  '2 Timothy': 55,
  Titus: 56,
  Philemon: 57,
  Hebrews: 58,
  James: 59,
  '1 Peter': 60,
  '2 Peter': 61,
  '1 John': 62,
  '2 John': 63,
  '3 John': 64,
  Jude: 65,
  Revelation: 66,
};

// Placeholder mapping for chapter counts per book ID
// In a real app, this should come from a reliable source or API
export const BIBLE_CHAPTER_COUNTS: { [key: number]: number } = {
  1: 50, // Genesis
  2: 40, // Exodus
  3: 27, // Leviticus
  // ... add counts for all 66 books
  19: 150, // Psalms
  40: 28, // Matthew
  41: 16, // Mark
  42: 24, // Luke
  43: 21, // John
  44: 28, // Acts
  45: 16, // Romans
  // ... etc.
  66: 22, // Revelation
};

// Helper to generate chapter number arrays
const generateChapters = (start: number, end: number): number[] => {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

// Helper to create BibleReference object
const createRef = (bookName: string, chapters: number[]): BibleReference => {
  const bookId = BIBLE_BOOK_IDS[bookName];
  if (!bookId) {
    console.warn(`Book ID not found for: ${bookName}`);
    // Return a placeholder or handle error appropriately
    return { bookId: 0, bookName, chapters: [] };
  }
  return { bookId, bookName, chapters };
};

// Bible reading curriculum generated 2025-04-27.
// Helpers presumed in project scope:
// • createRef(book: string, chapters: number[]) => ScriptureReference
// • generateChapters(start: number, end: number) => number[]
// • Path, Unit interfaces already declared

export const BIBLE_PATHS: Path[] = [
  /** 1 ▸ Genesis */
  {
    id: 'genesis-beginnings',
    title: 'Genesis: Beginnings',
    color: 'yellow',
    icon: 'leaf',
    description:
      'Travel from the dawn of creation to the death of Joseph. These origin stories lay the foundation for every major theme that follows in Scripture.',
    image: require('../../assets/icons/noahsArc.png'),
    riveName: 'homeLamb',
    artboardName: 'lamb-reading',
    units: [
      {
        id: 'gen-1',
        title: 'Creation & Choice',
        reference: createRef('Genesis', generateChapters(1, 3)),
        description:
          "God speaks the cosmos into being and crowns it with image-bearing humans. In Eden they are invited to trust the Creator's wisdom or define good and evil for themselves.",
        icon: 'globe',
      },
      {
        id: 'gen-2',
        title: 'Cain, Abel',
        reference: createRef('Genesis', generateChapters(4, 6)),
        description:
          'Jealousy drives the first murder and violence multiplies across the earth. Even in judgment, God marks Cain with mercy and preserves a faithful remnant.',
        icon: 'people',
      },
      {
        id: 'gen-3',
        title: 'Noah & the Flood',
        reference: createRef('Genesis', generateChapters(7, 9)),
        description:
          "Waters of judgment cleanse a corrupt world, yet grace carries Noah's family to a new start. A rainbow covenant promises that God's long-range plan is redemption, not destruction.",
        icon: 'water',
      },
      {
        id: 'gen-4',
        title: 'Nations & Babel',
        reference: createRef('Genesis', generateChapters(10, 12)),
        description:
          'Humanity scatters into distinct peoples after a prideful tower-project. Out of the confusion God calls one man, Abram, to become a blessing to all nations.',
        icon: 'language',
      },
      {
        id: 'gen-5',
        title: "Abraham's Call",
        reference: createRef('Genesis', generateChapters(12, 17)),
        description:
          "God establishes a binding promise of land, descendants, and global blessing. Abraham's faith is tested repeatedly yet ultimately credited as righteousness.",
        icon: 'star',
      },
      {
        id: 'gen-6',
        title: "Isaac's Family",
        reference: createRef('Genesis', generateChapters(21, 24)),
        description:
          'A miraculous son carries the covenant line forward. His marriage to Rebekah ensures the promise continues despite human weakness.',
        icon: 'people',
      },
      {
        id: 'gen-7',
        title: 'Jacob & Esau',
        reference: createRef('Genesis', generateChapters(25, 28)),
        description:
          "Twin brothers struggle for birthright and blessing, revealing God's sovereign choice. Jacob experiences both deception and divine encounter on his way out of Canaan.",
        icon: 'swap-horizontal',
      },
      {
        id: 'gen-8',
        title: "Jacob's Sojourn & Return",
        reference: createRef('Genesis', generateChapters(29, 33)),
        description:
          "Years of exile, marriage, and family drama refine Jacob's character. A mysterious night-wrestling match prepares him to face Esau and reclaim his new name—Israel.",
        icon: 'walk',
      },
      {
        id: 'gen-9',
        title: 'Joseph: Dreams to Dungeon',
        reference: createRef('Genesis', generateChapters(37, 41)),
        description:
          "Joseph's coat, dreams, and betrayal plunge him into slavery and prison. Yet every setback becomes a setup for God's providential rise to Egyptian power.",
        icon: 'bed',
      },
      {
        id: 'gen-10',
        title: 'Joseph: Famine & Forgiveness',
        reference: createRef('Genesis', generateChapters(42, 47)),
        description:
          'Global famine reunites Joseph with the brothers who wronged him. Tears of reconciliation show how God turns evil intentions into saving purposes.',
        icon: 'leaf',
      },
      {
        id: 'gen-11',
        title: 'Jacob Blesses & Joseph Dies',
        reference: createRef('Genesis', generateChapters(48, 50)),
        description:
          "A dying patriarch blesses twelve sons and foretells their futures. Joseph's final act of faith is requesting his bones be carried to the promised land.",
        icon: 'hand-right',
      },
    ],
  },

  /** 2 ▸ Exodus */
  {
    id: 'exodus-deliverance-law',
    title: 'Exodus: Deliverance & Law',
    color: 'red',
    icon: 'repeat',
    description:
      "Witness God break Israel's chains and forge a nation by covenant at Sinai. Liberation is not merely freedom from Pharaoh but freedom for worship and holy living.",
    image: require('../../assets/icons/pyramids.png'),
    riveName: 'homeLamb',
    artboardName: 'lamb-idle',
    units: [
      {
        id: 'exo-1',
        title: "Bondage & Moses' Birth",
        reference: createRef('Exodus', generateChapters(1, 4)),
        description:
          'A new pharaoh enslaves Israel and orders infant sons killed. God preserves baby Moses and appears in a burning bush to recruit him as deliverer.',
        icon: 'person',
      },
      {
        id: 'exo-2',
        title: 'Confronting Pharaoh',
        reference: createRef('Exodus', generateChapters(5, 10)),
        description:
          "Nine escalating plagues expose Egypt's gods as powerless. Each refusal hardens Pharaoh's heart and magnifies Yahweh's supremacy.",
        icon: 'warning',
      },
      {
        id: 'exo-3',
        title: 'Passover & Red Sea',
        reference: createRef('Exodus', generateChapters(11, 15)),
        description:
          "The death of the firstborn breaks Egypt's resistance, and the Passover lamb becomes Israel's rescue symbol. Walls of water then open a path of freedom and close upon pursuing armies.",
        icon: 'water',
      },
      {
        id: 'exo-4',
        title: 'Wilderness Provision',
        reference: createRef('Exodus', generateChapters(16, 18)),
        description:
          "Bread from heaven and water from rock sustain a complaining people. Early battles and Jethro's counsel shape community leadership.",
        icon: 'nutrition',
      },
      {
        id: 'exo-5',
        title: 'Sinai & Ten Words',
        reference: createRef('Exodus', generateChapters(19, 24)),
        description:
          "Thunder, fire, and trumpet blasts announce God's arrival on the mountain. Israel vows obedience as the Ten Commandments anchor a comprehensive covenant.",
        icon: 'document-text',
      },
      {
        id: 'exo-6',
        title: 'Tabernacle Blueprint',
        reference: createRef('Exodus', generateChapters(25, 31)),
        description:
          'Detailed designs reveal that God intends to dwell among His people. Every measurement, fabric, and furnishing is a portable echo of Eden.',
        icon: 'home',
      },
      {
        id: 'exo-7',
        title: 'Golden Calf & Renewal',
        reference: createRef('Exodus', generateChapters(32, 34)),
        description:
          'Impatience births idolatry when Israel molds a calf from gold. Moses pleads for mercy, and God renews the covenant while revealing His compassionate name.',
        icon: 'alert',
      },
      {
        id: 'exo-8',
        title: 'Tabernacle Completed',
        reference: createRef('Exodus', generateChapters(35, 40)),
        description:
          "Skilled artisans follow God's pattern precisely. The cloud and fiery glory move in, signaling that Israel's King has taken up residence.",
        icon: 'home',
      },
    ],
  },

  /** 3 ▸ Wilderness Years */
  {
    id: 'wilderness-testing-provision',
    title: 'Wilderness: Testing & Provision',
    color: 'green',
    icon: 'navigate',
    description:
      'Leviticus instructs a redeemed people how to live with a holy God, while Numbers and Deuteronomy chronicle forty years of wandering discipline. These books prove that grace precedes law and that hearts, not geography, determine readiness for promise.',
    image: require('../../assets/icons/wilderness.png'),
    riveName: 'homeLamb',
    artboardName: 'lamb-eating',
    units: [
      {
        id: 'wild-1',
        title: 'Offerings & Consecration',
        reference: createRef('Leviticus', generateChapters(1, 5)),
        description:
          'Five core sacrifices explain atonement and fellowship. The rituals teach that sin has a cost and that nearness to God is a gift.',
        icon: 'flame',
      },
      {
        id: 'wild-2',
        title: 'Priesthood & Purity',
        reference: createRef('Leviticus', generateChapters(6, 10)),
        description:
          "Ordination of Aaron's sons shows the joy and danger of sacred duty. Tragedy strikes when strange fire ignores God's holiness.",
        icon: 'person',
      },
      {
        id: 'wild-3',
        title: 'Atonement & Ethics',
        reference: createRef('Leviticus', generateChapters(16, 19)),
        description:
          'The Day of Atonement purges both sanctuary and people once a year. Immediately God links forgiveness to everyday justice and neighbor-love.',
        icon: 'heart',
      },
      {
        id: 'wild-4',
        title: 'Festivals & Vows',
        reference: createRef('Leviticus', generateChapters(23, 27)),
        description:
          "Sabbaths, feasts, and jubilee weave worship into Israel's calendar. Vows and tithes underline that time, land, and life belong to the Lord.",
        icon: 'calendar',
      },
      {
        id: 'wild-5',
        title: 'Census & Camp',
        reference: createRef('Numbers', generateChapters(1, 4)),
        description:
          'A precise head-count arranges tribes around the tabernacle like spokes around a hub. God dwells at the center, visually preaching His priority.',
        icon: 'people',
      },
      {
        id: 'wild-6',
        title: 'Complaints & Spies',
        reference: createRef('Numbers', generateChapters(11, 14)),
        description:
          "Grumbling spreads like wildfire and culminates in unbelief at Canaan's borders. Forty years of wandering become the price of fear.",
        icon: 'chatbubble',
      },
      {
        id: 'wild-7',
        title: "Balaam's Oracles",
        reference: createRef('Numbers', generateChapters(22, 24)),
        description:
          'A hired seer cannot curse those whom God has blessed. Instead, he foretells a star and scepter that will rise from Israel.',
        icon: 'star',
      },
      {
        id: 'wild-8',
        title: 'Plains of Moab',
        reference: createRef('Numbers', generateChapters(25, 31)),
        description:
          'Sexual seduction and idolatry provoke deadly judgment, yet a second census prepares a new generation. Cities of refuge and Midianite war close the book.',
        icon: 'location',
      },
      {
        id: 'wild-9',
        title: "Moses' First Farewell",
        reference: createRef('Deuteronomy', generateChapters(1, 6)),
        description:
          "Standing on the border, Moses retells Israel's story to kindle trust. The Shema calls every heart and home to covenant love.",
        icon: 'megaphone',
      },
      {
        id: 'wild-10',
        title: 'Covenant Renewal',
        reference: createRef('Deuteronomy', generateChapters(27, 30)),
        description:
          'Mountains of blessing and curse dramatize the stakes of obedience. Moses pleads, "Choose life," pointing to circumcised hearts as the true hope.',
        icon: 'refresh',
      },
      {
        id: 'wild-11',
        title: "Moses' Farewell",
        reference: createRef('Deuteronomy', generateChapters(31, 34)),
        description:
          "Joshua is commissioned as successor, and Moses views the land from Nebo's peak. The greatest prophet is buried by God Himself, awaiting a greater one to come.",
        icon: 'person',
      },
    ],
  },

  /** 4 ▸ Kingdoms & Prophets */
  {
    id: 'kingdoms-prophets',
    title: 'Kingdoms & Prophets',
    color: 'orange',
    icon: 'trophy',
    description:
      "From conquest to exile, Israel's monarchy rises, fractures, and falls while prophets call kings back to covenant loyalty. These narratives show that political power without spiritual fidelity ends in ruin.",
    image: require('../../assets/icons/castle.png'),
    riveName: 'homeLamb',
    artboardName: 'lamb-drinking',
    units: [
      {
        id: 'kp-1',
        title: 'Joshua & Conquest',
        reference: createRef('Joshua', generateChapters(1, 7)),
        description:
          'Courageous obedience parts the Jordan and topples Jericho. Early compromise at Ai warns that hidden sin can derail public victory.',
        icon: 'shield',
      },
      {
        id: 'kp-2',
        title: "Judges' Cycles",
        reference: createRef('Judges', generateChapters(1, 7)),
        description:
          'Israel drifts into a downward spiral of idolatry, oppression, and deliverance. Each judge offers temporary relief but points to the need for a faithful king.',
        icon: 'reload',
      },
      {
        id: 'kp-3',
        title: 'Rise of Saul',
        reference: createRef('1 Samuel', generateChapters(8, 14)),
        description:
          'People demand a king and God grants Saul, whose tall stature masks insecure heart. Early victories soon give way to rash vows and disobedience.',
        icon: 'trending-up',
      },
      {
        id: 'kp-4',
        title: 'David on the Run',
        reference: createRef('1 Samuel', generateChapters(15, 21)),
        description:
          'Anointing shifts to David, sparking royal jealousy. Wilderness caves become training grounds for the future shepherd-king.',
        icon: 'footsteps',
      },
      {
        id: 'kp-5',
        title: "David's Reign",
        reference: createRef('2 Samuel', generateChapters(1, 7)),
        description:
          'Jerusalem becomes capital and God promises an eternal dynasty. Yet private sin with Bathsheba will sow public turmoil.',
        icon: 'ribbon',
      },
      {
        id: 'kp-6',
        title: 'Solomon & Temple',
        reference: createRef('1 Kings', generateChapters(1, 7)),
        description:
          "Wisdom, wealth, and worship reach their zenith as the temple is dedicated. Sadly Solomon's many marriages plant seeds of idolatry.",
        icon: 'business',
      },
      {
        id: 'kp-7',
        title: 'Kingdom Divides',
        reference: createRef('1 Kings', generateChapters(12, 16)),
        description:
          'Harsh policies split the kingdom into Israel and Judah. Golden calves at Dan and Bethel institutionalize covenant breach.',
        icon: 'git-branch',
      },
      {
        id: 'kp-8',
        title: 'Elijah & Elisha',
        reference: createRef('1 Kings', generateChapters(17, 22)),
        description:
          "Fire from heaven and chariots of whirlwind highlight prophetic power. Successor Elisha doubles the miracles to prove God's ongoing presence.",
        icon: 'flame',
      },
      {
        id: 'kp-9',
        title: 'Assyrian Exile',
        reference: createRef('2 Kings', generateChapters(17, 19)),
        description:
          "Relentless idolatry ends in Samaria's fall and deportation. Hezekiah's faith, however, momentarily stays Assyria's hand against Judah.",
        icon: 'airplane',
      },
      {
        id: 'kp-10',
        title: 'Babylonian Exile',
        reference: createRef('2 Kings', generateChapters(23, 25)),
        description:
          "Despite Josiah's reforms, Judah collapses under Babylonian siege. The book closes with a captive king eating at an enemy's table—yet hinting at future hope.",
        icon: 'planet',
      },
    ],
  },

  // INSERTED SECTION: Psalms Wisdom & Insight
  {
    id: 'psalms-wisdom',
    title: 'Psalms: Wisdom & Insight',
    color: 'gold',
    icon: 'bulb',
    description: `Eight wisdom-psalm clusters that sharpen discernment, sustain trust, and ignite lifelong delight in God's Word.`,
    image: require('../../assets/icons/owlIcon.png'),
    riveName: 'homeLamb',
    artboardName: 'lamb-reading',
    units: [
      {
        id: 'psw-1',
        title: 'Two Roads',
        reference: createRef('Psalms', generateChapters(1, 3)),
        description:
          'Blessed vs. wicked: a life rooted by streams shows the only path that prospers.',
        icon: 'walk',
      },
      {
        id: 'psw-2',
        title: 'Shelter & Trust',
        reference: createRef('Psalms', generateChapters(11, 16)),
        description: 'When dangers loom, these prayers model confident refuge in the Lord.',
        icon: 'shield',
      },
      {
        id: 'psw-3',
        title: 'Creation & Torah',
        reference: createRef('Psalms', generateChapters(19, 24)),
        description: `The skies proclaim glory while God's perfect law revives the soul.`,
        icon: 'sunny',
      },
      {
        id: 'psw-4',
        title: 'Fret Not Evil',
        reference: createRef('Psalms', generateChapters(37, 41)),
        description: 'Patience and generosity outlast the temporary triumph of evildoers.',
        icon: 'time',
      },
      {
        id: 'psw-5',
        title: 'True Wealth',
        reference: createRef('Psalms', generateChapters(49, 53)),
        description: 'Riches cannot ransom a soul; eternal perspective is real security.',
        icon: 'cash',
      },
      {
        id: 'psw-6',
        title: 'Wisdom in Adversity',
        reference: createRef('Psalms', generateChapters(90, 94)),
        description: 'Moses teaches us to number our days; laments become declarations of faith.',
        icon: 'calendar',
      },
      {
        id: 'psw-7',
        title: 'Delighting in the Word',
        reference: createRef('Psalms', generateChapters(119, 122)),
        description: 'An alphabet of devotion exalts Scripture as light, life, and liberty.',
        icon: 'book',
      },
      {
        id: 'psw-8',
        title: 'Final Hallelujahs',
        reference: createRef('Psalms', generateChapters(145, 150)),
        description: 'Wise living crescendos in universal praise—let everything that has breath!',
        icon: 'musical-notes',
      },
    ],
  },

  /** 6 ▸ Major Prophets */
  {
    id: 'major-prophets',
    title: 'Major Prophets',
    color: 'purple',
    icon: 'megaphone',
    description:
      'Isaiah, Jeremiah, Ezekiel, and Daniel thunder judgment yet spotlight hope in a coming Messiah and restored creation. Their visions stretch from their own troubled century to the very end of days.',
    image: require('../../assets/icons/oracle.png'),
    riveName: 'homeLamb',
    artboardName: 'lamb-sleepy',
    units: [
      {
        id: 'maj-1',
        title: 'Isaiah: Vision & Call',
        reference: createRef('Isaiah', generateChapters(1, 6)),
        description:
          'Holy, holy, holy shakes the temple and Isaiah volunteers despite unclean lips. The commissioning anticipates both hardened listeners and a preserved stump.',
        icon: 'eye',
      },
      {
        id: 'maj-2',
        title: 'Isaiah: The Servant',
        reference: createRef('Isaiah', generateChapters(40, 46)),
        description:
          "The exile horizon turns silky with promises of a highway home. Four servant songs climax in a wounded healer who bears others' sins.",
        icon: 'bandage',
      },
      {
        id: 'maj-3',
        title: 'Jeremiah: Early Oracles',
        reference: createRef('Jeremiah', generateChapters(1, 6)),
        description:
          'A reluctant youth receives a mission to uproot and to plant. Almond branch and boiling pot visions frame looming Babylonian invasion.',
        icon: 'megaphone',
      },
      {
        id: 'maj-4',
        title: 'Jeremiah: Laments',
        reference: createRef('Jeremiah', generateChapters(18, 23)),
        description:
          'Confessions pour out as the prophet wrestles with loneliness and danger. Yet amid tears he announces a new covenant written on hearts, not stone.',
        icon: 'sad',
      },
      {
        id: 'maj-5',
        title: 'Ezekiel: Wheels & Glory',
        reference: createRef('Ezekiel', generateChapters(1, 7)),
        description:
          "Exiles by the Kebar River behold a storm-throne vision beyond imagination. Judgment oracles explain why God's glory departs the temple.",
        icon: 'aperture',
      },
      {
        id: 'maj-6',
        title: 'Ezek: New Hope',
        reference: createRef('Ezekiel', generateChapters(36, 39)),
        description:
          'Dry bones rattle back to life, picturing national resurrection. A future Davidic shepherd and a decisive victory over Gog seal the promise.',
        icon: 'expand',
      },
      {
        id: 'maj-7',
        title: 'Daniel: Faithful in Exile',
        reference: createRef('Daniel', generateChapters(1, 6)),
        description:
          'Diet tests, fiery furnaces, and lion dens showcase uncompromising loyalty. Each deliverance foreshadows an everlasting kingdom not cut by human hands.',
        icon: 'paw',
      },
    ],
  },

  /** 7 ▸ Minor Prophets */
  {
    id: 'minor-prophets',
    title: 'Minor Prophets',
    color: 'pink',
    icon: 'megaphone',
    description:
      'Twelve shorter books amplify covenant themes of justice, mercy, and eschatological hope. Though "minor" in length, their messages are major in urgency.',
    image: require('../../assets/icons/scale.png'),
    riveName: 'successLamb',
    artboardName: 'heart-hold',
    units: [
      {
        id: 'min-1',
        title: 'Hosea: Covenant Love',
        reference: createRef('Hosea', generateChapters(1, 4)),
        description:
          "A faithful husband pursues an unfaithful wife to dramatize God's relentless grace. Even judgment passages end with a promise of renewed intimacy.",
        icon: 'heart',
      },
      {
        id: 'min-2',
        title: 'Joel: Day of the LORD',
        reference: createRef('Joel', generateChapters(1, 3)),
        description:
          'Locust devastation becomes a sermon on cosmic reckoning. Yet God also pledges an outpoured Spirit for all flesh.',
        icon: 'sunny',
      },
      {
        id: 'min-3',
        title: 'Amos: Justice Rolls',
        reference: createRef('Amos', generateChapters(1, 4)),
        description:
          'A shepherd-prophet targets affluent complacency with roaring indictments. True worship, he insists, must overflow in righteousness.',
        icon: 'scale',
      },
      {
        id: 'min-4',
        title: 'Micah: Justice & Hope',
        reference: createRef('Micah', generateChapters(1, 5)),
        description:
          "Rural Micah challenges urban corruption and foretells Bethlehem's ruler. The famous call to do justice, love mercy, and walk humbly rings out.",
        icon: 'shield',
      },
      {
        id: 'min-5',
        title: 'Habakkuk: Faith in Crisis',
        reference: createRef('Habakkuk', generateChapters(1, 3)),
        description:
          'A prophet argues with God about unanswered violence. By the end he sings: "The righteous will live by faith."',
        icon: 'help',
      },
      {
        id: 'min-6',
        title: 'Zephaniah: Purifying Fire',
        reference: createRef('Zephaniah', generateChapters(1, 3)),
        description:
          'Sweeping day-of-the-LORD announcements purge earth and sky. Yet a humble remnant will sing as God rejoices over them.',
        icon: 'flame',
      },
      {
        id: 'min-7',
        title: 'Haggai & Zech',
        reference: [createRef('Haggai', generateChapters(1, 2)), createRef('Zechariah', [1])],
        description:
          "Returned exiles stall on rebuilding the temple until prophetic urgency stirs them. Initial night visions in Zechariah confirm that God's angel armies stand behind the project.",
        icon: 'home',
      },
      {
        id: 'min-8',
        title: 'Zech: Glory Visions',
        reference: createRef('Zechariah', generateChapters(2, 4)),
        description:
          "Flying scrolls, lampstands, and a crowned high priest forecast messianic triumph. Jerusalem's future extends far beyond walls of stone.",
        icon: 'eye',
      },
      {
        id: 'min-9',
        title: 'Malachi: Final Word',
        reference: createRef('Malachi', generateChapters(1, 4)),
        description:
          'A skeptical post-exilic community is confronted about tithes, divorce, and apathy. The closing promise of Elijah hints at the coming of John the Baptist.',
        icon: 'mail',
      },
    ],
  },

  /** 8 ▸ Gospels */
  {
    id: 'gospels-life-of-christ',
    title: 'Gospels: The Life of Christ',
    color: 'crimson',
    icon: 'bookmark',
    description:
      "Four complementary portraits unveil Jesus' birth, ministry, sacrifice, and resurrection. Reading them side-by-side highlights both unique emphases and a united proclamation: the kingdom has come.",
    image: require('../../assets/icons/jesus.png'),
    riveName: 'successLamb',
    artboardName: 'success-stars',
    units: [
      {
        id: 'gos-1',
        title: 'Birth & Boyhood',
        reference: createRef('Luke', generateChapters(1, 3)),
        description:
          'Angelic announcements overshadow Nazareth and Bethlehem. A twelve-year-old Jesus astounds temple teachers, foreshadowing His mission.',
        icon: 'star',
      },
      {
        id: 'gos-2',
        title: 'Baptism & Early Call',
        reference: createRef('Matthew', generateChapters(3, 5)),
        description:
          "Heaven opens over the Jordan as the Spirit descends like a dove. Wilderness temptations test the Son's obedience before public ministry begins.",
        icon: 'water',
      },
      {
        id: 'gos-3',
        title: 'Sermon on the Mount',
        reference: createRef('Matthew', generateChapters(5, 7)),
        description:
          'Jesus redefines righteousness, confronting both legalism and hypocrisy. Beatitudes bless outsiders while heart-level commands raise the moral bar.',
        icon: 'triangle',
      },
      {
        id: 'gos-4',
        title: 'Parables of Grace',
        reference: createRef('Luke', generateChapters(15, 17)),
        description:
          "Sheep, coins, and prodigal sons illustrate heaven's joy over one repentant sinner. Kingdom grace scandalizes the self-righteous but embraces the lost.",
        icon: 'chatbubble',
      },
      {
        id: 'gos-5',
        title: 'Signs & Power',
        reference: createRef('Mark', generateChapters(1, 5)),
        description:
          'Demons are silenced, storms are stilled, and paralytics walk. Each miracle is a billboard for the authority of the King.',
        icon: 'flash',
      },
      {
        id: 'gos-6',
        title: 'Upper Room & Prayer',
        reference: createRef('John', generateChapters(12, 17)),
        description:
          "Foot-washing models servant leadership on the eve of betrayal. Jesus' high-priestly prayer secures unity and joy for future disciples.",
        icon: 'home',
      },
      {
        id: 'gos-7',
        title: 'Passion & Cross',
        reference: createRef('John', generateChapters(18, 19)),
        description:
          'Roman trials, a crown of thorns, and crucifixion fulfill ancient prophecies. "It is finished" signals that the debt of sin is paid in full.',
        icon: 'add',
      },
      {
        id: 'gos-8',
        title: 'Resurrection & Commission',
        reference: createRef('John', generateChapters(20, 21)),
        description:
          'An empty tomb turns mourning into mission. The risen Lord restores Peter and sends believers to the ends of the earth.',
        icon: 'sunny',
      },
    ],
  },

  /** 9 ▸ Acts */
  {
    id: 'acts-early-church',
    title: 'Acts & Early Church',
    color: 'indigo',
    icon: 'people',
    description:
      "Luke's sequel chronicles how the risen Christ continues His work through the Spirit-empowered church. Geographic and ethnic barriers crumble as the gospel races from Jerusalem to Rome.",
    image: require('../../assets/icons/church.png'),
    riveName: 'successLamb',
    artboardName: 'lamb-eyes',
    units: [
      {
        id: 'act-1',
        title: 'Pentecost & Peter',
        reference: createRef('Acts', generateChapters(1, 4)),
        description:
          "Wind, fire, and multilingual praise launch a new era. Peter's bold preaching turns thousands of skeptics into a Spirit-filled community.",
        icon: 'flame',
      },
      {
        id: 'act-2',
        title: 'Growth & Opposition',
        reference: createRef('Acts', generateChapters(5, 7)),
        description:
          "Miracles multiply even as arrests escalate. Stephen's martyrdom seeds a wider gospel dispersion.",
        icon: 'trending-up',
      },
      {
        id: 'act-3',
        title: 'Saul to Paul',
        reference: createRef('Acts', generateChapters(8, 9)),
        description:
          'A persecutor is blinded by resurrected glory and reborn as apostle. Baptism and early preaching astonish former allies and foes alike.',
        icon: 'flash',
      },
      {
        id: 'act-4',
        title: 'Peter & Gentiles',
        reference: createRef('Acts', generateChapters(10, 12)),
        description:
          "Cornelius' household receives the Spirit, proving the gospel is borderless. Meanwhile divine jailbreaks and angelic interventions keep leaders mobile.",
        icon: 'globe',
      },
      {
        id: 'act-5',
        title: "Paul's 1st Journey",
        reference: createRef('Acts', generateChapters(13, 15)),
        description:
          'Synagogue sermons stir both revival and riots across Cyprus and Asia Minor. The Jerusalem council clarifies that salvation is by grace, not circumcision.',
        icon: 'walk',
      },
      {
        id: 'act-6',
        title: "Paul's 2nd Journey",
        reference: createRef('Acts', generateChapters(16, 18)),
        description:
          'A Macedonian vision ferries the gospel into Europe. Prison hymns in Philippi and philosophers in Athens hear the same risen Christ.',
        icon: 'boat',
      },
      {
        id: 'act-7',
        title: "Paul's 3rd Journey",
        reference: createRef('Acts', generateChapters(19, 21)),
        description:
          'Ephesus sees city-wide impact and bonfires of magic scrolls. Farewell tears at Miletus reveal the depth of gospel friendships.',
        icon: 'footsteps',
      },
      {
        id: 'act-8',
        title: 'Trials & Rome',
        reference: createRef('Acts', generateChapters(22, 28)),
        description:
          "Courtrooms, conspiracies, and shipwreck cannot mute the witness. Acts ends with Paul proclaiming the kingdom unhindered in Caesar's capital.",
        icon: 'business',
      },
    ],
  },

  /** 10 ▸ Paul's Letters */
  {
    id: 'pauline-epistles',
    title: "Paul's Letters",
    color: 'blue',
    icon: 'mail',
    description:
      "These epistles apply Christ's gospel to doctrine, discipleship, and daily life. Written to diverse churches and leaders, they trace a roadmap from sin to glory and from chaos to order.",
    image: require('../../assets/icons/apostlePaul.png'),
    riveName: 'successLamb',
    artboardName: 'success-hearts',
    units: [
      {
        id: 'paul-1',
        title: 'Romans: Gospel Explained',
        reference: createRef('Romans', generateChapters(1, 7)),
        description:
          "Paul unfolds humanity's universal need and God's surprising solution of justification by faith. The letter's logical argument has sparked revivals for centuries.",
        icon: 'document-text',
      },
      {
        id: 'paul-2',
        title: 'Corinthians: Church Issues',
        reference: createRef('1 Corinthians', generateChapters(1, 7)),
        description:
          'Divisions, immorality, and worship chaos plague a gifted yet immature church. Paul prescribes cross-shaped love as the only cure.',
        icon: 'people',
      },
      {
        id: 'paul-3',
        title: 'Galatians: Grace vs Law',
        reference: createRef('Galatians', generateChapters(1, 6)),
        description:
          'Judaizers add circumcision to the gospel, provoking a fiery rebuttal. Freedom in the Spirit replaces slavery to external rules.',
        icon: 'scale',
      },
      {
        id: 'paul-4',
        title: 'Ephesians: Unity in Christ',
        reference: createRef('Ephesians', generateChapters(1, 6)),
        description:
          'Cosmic praise for electing grace flows into practical unity among Jews and Gentiles. Marriage, parenting, and spiritual warfare all hinge on identity in Christ.',
        icon: 'link',
      },
      {
        id: 'paul-5',
        title: 'Philippians: Joy in Trial',
        reference: createRef('Philippians', generateChapters(1, 4)),
        description:
          'A prisoner writes the happiest letter in the New Testament. The secret of contentment is knowing that to live is Christ and to die is gain.',
        icon: 'happy',
      },
      {
        id: 'paul-6',
        title: 'Colossians: Christ Supreme',
        reference: createRef('Colossians', generateChapters(1, 4)),
        description:
          'False philosophies shrink Jesus; Paul paints Him as creator, sustainer, and reconciler. Complete sufficiency in Christ dethrones every competing "ism."',
        icon: 'star',
      },
      {
        id: 'paul-7',
        title: '1 Thess: Hope While Waiting',
        reference: createRef('1 Thessalonians', generateChapters(1, 5)),
        description:
          "New believers endure persecution with steadfast faith. Paul clarifies that the Lord's return will reunite the living and the dead.",
        icon: 'time',
      },
      {
        id: 'paul-8',
        title: '2 Thess: Steadfast',
        reference: createRef('2 Thessalonians', generateChapters(1, 3)),
        description:
          'Confusion about end-times timetables is corrected with calm assurance. Idleness is rebuked because future hope fuels present diligence.',
        icon: 'alarm',
      },
      {
        id: 'paul-9',
        title: '1 Timothy: Guarding Gospel',
        reference: createRef('1 Timothy', generateChapters(1, 6)),
        description:
          'A young pastor is charged to silence false teachers and model integrity. Instructions shape healthy doctrine, prayer, and leadership.',
        icon: 'shield',
      },
      {
        id: 'paul-10',
        title: 'Titus: Healthy Churches',
        reference: createRef('Titus', generateChapters(1, 3)),
        description:
          'On Crete, grace trains believers to say "No" to ungodliness and "Yes" to good works. Elders must embody this transformation for the sake of witness.',
        icon: 'medkit',
      },
    ],
  },

  /** 11 ▸ General Epistles */
  {
    id: 'general-epistles',
    title: 'General Epistles',
    color: 'cyan',
    icon: 'mail-open',
    description:
      'Written by several authors, these letters emphasize authentic faith expressed in love and endurance. They broaden the pastoral voice beyond Paul and anchor believers amid trials and heresies.',
    image: require('../../assets/icons/epistles.png'),
    riveName: 'successLamb',
    artboardName: 'chest',
    units: [
      {
        id: 'genep-1',
        title: 'Heb: Christ Supreme',
        reference: createRef('Hebrews', generateChapters(1, 7)),
        description:
          'Better priest, better covenant, better sacrifice—Jesus surpasses every shadow. The warning passages urge hearers not to drift back to lesser things.',
        icon: 'trending-up',
      },
      {
        id: 'genep-2',
        title: 'James: Faith in Action',
        reference: createRef('James', generateChapters(1, 5)),
        description:
          'True religion bridles the tongue and cares for the vulnerable. Works are not a rival to faith but its inevitable fruit.',
        icon: 'hammer',
      },
      {
        id: 'genep-3',
        title: 'Suffering & Holiness',
        reference: createRef('1 Peter', generateChapters(1, 5)),
        description:
          "Exiles on earth receive living hope through Christ's resurrection. Holiness and humble submission weaponize believers against slander.",
        icon: 'sparkles',
      },
      {
        id: 'genep-4',
        title: '1 John: True Love',
        reference: createRef('1 John', generateChapters(1, 5)),
        description:
          "John refutes proto-Gnostic denial of Christ's incarnation. Walking in light naturally overflows in brother-love.",
        icon: 'heart',
      },
      {
        id: 'genep-5',
        title: 'Jude & Johns',
        reference: [createRef('Jude', [1]), createRef('2 John', [1]), createRef('3 John', [1])],
        description:
          'Tiny letters pack a punch against false teachers and for faithful hospitality. They remind us that truth and love must travel together.',
        icon: 'mail',
      },
    ],
  },

  /** 12 ▸ Revelation */
  {
    id: 'revelation-end-new',
    title: 'Revelation: The End & New Beginning',
    color: 'scarlet',
    icon: 'planet',
    description:
      "John's apocalypse peels back the curtain on cosmic conflict and ultimate victory. Symbolic visions strengthen saints to conquer by the Lamb's blood and faithful testimony.",
    image: require('../../assets/icons/hell.png'),
    riveName: 'homeLamb',
    artboardName: 'lamb-angry',
    units: [
      {
        id: 'rev-1',
        title: 'Seven Churches',
        reference: createRef('Revelation', generateChapters(1, 3)),
        description:
          'Seven real congregations receive customized commendations and corrections. The risen Christ walks among His lampstands, trimming wicks for brighter witness.',
        icon: 'mail',
      },
      {
        id: 'rev-2',
        title: 'Throne & Seals',
        reference: createRef('Revelation', generateChapters(4, 8)),
        description:
          'A rainbow-encircled throne anchors worship above. As the Lamb breaks seals, judgment and redemption advance hand in hand.',
        icon: 'ribbon',
      },
      {
        id: 'rev-3',
        title: 'Rev: Trumpets',
        reference: createRef('Revelation', generateChapters(9, 13)),
        description:
          "Cosmic plagues and demonic forces unleash warnings yet leave many unrepentant. Two faithful witnesses and a war in heaven assure that evil's rage is limited.",
        icon: 'megaphone',
      },
      {
        id: 'rev-4',
        title: 'Bowls & Babylon',
        reference: createRef('Revelation', generateChapters(14, 18)),
        description:
          "Final bowls finish God's wrath and topple the seductive city called Babylon. Heaven erupts in hallelujahs over just judgments.",
        icon: 'wine',
      },
      {
        id: 'rev-5',
        title: 'New Creation',
        reference: createRef('Revelation', generateChapters(19, 22)),
        description:
          'A white-horse rider defeats the beast and resurrects His people. New heavens and new earth emerge as God dwells with humanity forever.',
        icon: 'earth',
      },
    ],
  },
];
