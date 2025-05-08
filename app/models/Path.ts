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
  prayer?: string; // Prayer for the unit (optional – injected later if omitted)
  reflectionPrompt?: string; // Reflection prompt (optional – injected later if omitted)
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
  4: 36, // Numbers
  5: 34, // Deuteronomy
  6: 24, // Joshua
  7: 21, // Judges
  8: 4,  // Ruth
  9: 31, // 1 Samuel
  10: 24, // 2 Samuel
  11: 22, // 1 Kings
  12: 25, // 2 Kings
  13: 29, // 1 Chronicles
  14: 36, // 2 Chronicles
  15: 10, // Ezra
  16: 13, // Nehemiah
  17: 10, // Esther
  18: 42, // Job
  19: 150, // Psalms
  20: 31, // Proverbs
  21: 12, // Ecclesiastes
  22: 8,  // Song of Songs
  23: 66, // Isaiah
  24: 52, // Jeremiah
  25: 5,  // Lamentations
  26: 48, // Ezekiel
  27: 12, // Daniel
  28: 14, // Hosea
  29: 3,  // Joel
  30: 9,  // Amos
  31: 1,  // Obadiah
  32: 4,  // Jonah
  33: 7,  // Micah
  34: 3,  // Nahum
  35: 3,  // Habakkuk
  36: 3,  // Zephaniah
  37: 2,  // Haggai
  38: 14, // Zechariah
  39: 4,  // Malachi
  40: 28, // Matthew
  41: 16, // Mark
  42: 24, // Luke
  43: 21, // John
  44: 28, // Acts
  45: 16, // Romans
  46: 16, // 1 Corinthians
  47: 13, // 2 Corinthians
  48: 6,  // Galatians
  49: 6,  // Ephesians
  50: 4,  // Philippians
  51: 4,  // Colossians
  52: 5,  // 1 Thessalonians
  53: 3,  // 2 Thessalonians
  54: 6,  // 1 Timothy
  55: 4,  // 2 Timothy
  56: 3,  // Titus
  57: 1,  // Philemon
  58: 13, // Hebrews
  59: 5,  // James
  60: 5,  // 1 Peter
  61: 3,  // 2 Peter
  62: 5,  // 1 John
  63: 1,  // 2 John
  64: 1,  // 3 John
  65: 1,  // Jude
  66: 22  // Revelation
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
        prayer: `Creator God, You made light and everything good. Thank You for making me in Your image. Forgive me when I follow my own way. Help me show Your love and care today.`,
        reflectionPrompt: `Where do I try to decide right and wrong for myself? How can I trust God's wisdom today?`,
      },
      {
        id: 'gen-2',
        title: 'Cain, Abel',
        reference: createRef('Genesis', generateChapters(4, 6)),
        description:
          'Jealousy drives the first murder and violence multiplies across the earth. Even in judgment, God marks Cain with mercy and preserves a faithful remnant.',
        icon: 'people',
        prayer: `God, You see my heart. Take away jealousy or anger in me. Help me bring You my best with a thankful spirit.`,
        reflectionPrompt: `Is there someone I envy? How can I celebrate them and worship God instead?`,
      },
      {
        id: 'gen-3',
        title: 'Noah & the Flood',
        reference: createRef('Genesis', generateChapters(7, 9)),
        description:
          "Waters of judgment cleanse a corrupt world, yet grace carries Noah's family to a new start. A rainbow covenant promises that God's long-range plan is redemption, not destruction.",
        icon: 'water',
        prayer: `Lord, You saved Noah and his family. Thank You for rescuing me too. Help me walk with You even when others don't.`,
        reflectionPrompt: `What small "ark" of obedience can I build today to stay close to God?`,
      },
      {
        id: 'gen-4',
        title: 'Nations & Babel',
        reference: createRef('Genesis', generateChapters(10, 12)),
        description:
          'Humanity scatters into distinct peoples after a prideful tower-project. Out of the confusion God calls one man, Abram, to become a blessing to all nations.',
        icon: 'language',
        prayer: `God of all nations, pride divides us but You want to bless everyone. Keep me humble and ready to bless others.`,
        reflectionPrompt: `Where am I building my own tower? How can I trust and obey God instead?`,
      },
      {
        id: 'gen-5',
        title: "Abraham's Call",
        reference: createRef('Genesis', generateChapters(12, 17)),
        description:
          "God establishes a binding promise of land, descendants, and global blessing. Abraham's faith is tested repeatedly yet ultimately credited as righteousness.",
        icon: 'star',
        prayer: `Faithful God of Abraham, You call ordinary pilgrims into extraordinary promises. Strengthen my faith to obey without knowing all the details. May my life point others to Your unfailing covenant love.`,
        reflectionPrompt: `What first step of obedience is God highlighting for you—however small—that would demonstrate trust in His promise?`,
      },
      {
        id: 'gen-6',
        title: "Isaac's Family",
        reference: createRef('Genesis', generateChapters(21, 24)),
        description:
          'A miraculous son carries the covenant line forward. His marriage to Rebekah ensures the promise continues despite human weakness.',
        icon: 'people',
        prayer: `God of Generations, You laughed with Sarah and Abraham over impossible births. Thank You for bringing life out of barrenness. Teach me to steward the gifts You've entrusted, passing faith to the next generation.`,
        reflectionPrompt: `How can you intentionally nurture faith in someone younger this week?`,
      },
      {
        id: 'gen-7',
        title: 'Jacob & Esau',
        reference: createRef('Genesis', generateChapters(25, 28)),
        description:
          "Twin brothers struggle for birthright and blessing, revealing God's sovereign choice. Jacob experiences both deception and divine encounter on his way out of Canaan.",
        icon: 'swap-horizontal',
        prayer: `God of Jacob and Esau, You work through messy families and surprising choices. Heal my broken relationships and rename my identity in Your grace. Make reconciliation greater than rivalry.`,
        reflectionPrompt: `Where do you sense God inviting you to seek forgiveness or extend mercy within your family story?`,
      },
      {
        id: 'gen-8',
        title: "Jacob's Sojourn & Return",
        reference: createRef('Genesis', generateChapters(29, 33)),
        description:
          "Years of exile, marriage, and family drama refine Jacob's character. A mysterious night-wrestling match prepares him to face Esau and reclaim his new name—Israel.",
        icon: 'walk',
        prayer: `God Who Wrestles, thank You that You meet me in the dark nights of fear. As Jacob limped toward daylight with a new name, mark me with humble dependence that clings to Your blessing.`,
        reflectionPrompt: `What personal struggle could become a place of deeper encounter with God if you hold on to Him?`,
      },
      {
        id: 'gen-9',
        title: 'Joseph: Dreams to Dungeon',
        reference: createRef('Genesis', generateChapters(37, 41)),
        description:
          "Joseph's coat, dreams, and betrayal plunge him into slavery and prison. Yet every setback becomes a setup for God's providential rise to Egyptian power.",
        icon: 'bed',
        prayer: `Sovereign Redeemer, You guided Joseph from pit to palace. Turn my setbacks into setups for Your purposes. Help me forgive those who wrong me and trust Your unseen hand.`,
        reflectionPrompt: `How might God be using an unfair circumstance in your life to shape future fruit?`,
      },
      {
        id: 'gen-10',
        title: 'Joseph: Famine & Forgiveness',
        reference: createRef('Genesis', generateChapters(42, 47)),
        description:
          'Global famine reunites Joseph with the brothers who wronged him. Tears of reconciliation show how God turns evil intentions into saving purposes.',
        icon: 'leaf',
        prayer: `God of Providence, You wove famine into forgiveness and saved many lives through Joseph. Teach me to see trials through the lens of Your larger story and respond with compassionate generosity.`,
        reflectionPrompt: `Who needs to hear words of grace from you that could turn past hurt into present healing?`,
      },
      {
        id: 'gen-11',
        title: 'Jacob Blesses & Joseph Dies',
        reference: createRef('Genesis', generateChapters(48, 50)),
        description:
          "A dying patriarch blesses twelve sons and foretells their futures. Joseph's final act of faith is requesting his bones be carried to the promised land.",
        icon: 'hand-right',
        prayer: `Eternal God, as Jacob blessed his sons and Joseph trusted in future deliverance, orient my hope beyond the grave. May my final words and daily choices alike testify that You will surely come.`,
        reflectionPrompt: `If today were your last, what legacy of faith would you want to leave—and what step can you take toward that today?`,
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
        prayer: `Deliverer God, You heard Israel's groans in bondage. Hear oppressed hearts today and raise deliverers. Form courage in me like Moses to confront injustice with humility.`,
        reflectionPrompt: `Where is God nudging you to step out of comfort and speak up for someone in chains?`,
      },
      {
        id: 'exo-2',
        title: 'Confronting Pharaoh',
        reference: createRef('Exodus', generateChapters(5, 10)),
        description:
          "Nine escalating plagues expose Egypt's gods as powerless. Each refusal hardens Pharaoh's heart and magnifies Yahweh's supremacy.",
        icon: 'warning',
        prayer: `Lord of Signs and Wonders, Your power shamed Egypt's idols. Expose the false gods in my own culture and heart. Let my trust rest in Your unmatched authority.`,
        reflectionPrompt: `What modern "plague" might God be using to reveal misplaced trust in your life?`,
      },
      {
        id: 'exo-3',
        title: 'Passover & Red Sea',
        reference: createRef('Exodus', generateChapters(11, 15)),
        description:
          "The death of the firstborn breaks Egypt's resistance, and the Passover lamb becomes Israel's rescue symbol. Walls of water then open a path of freedom and close upon pursuing armies.",
        icon: 'water',
        prayer: `Passover Lamb, thank You that Your blood marks my rescue and a path through impossible seas. Lead me into freedom that worships You with every breath.`,
        reflectionPrompt: `What area of life still feels pursued by "pharaoh"—and how can you plant your feet in God's finished salvation?`,
      },
      {
        id: 'exo-4',
        title: 'Wilderness Provision',
        reference: createRef('Exodus', generateChapters(16, 18)),
        description:
          "Bread from heaven and water from rock sustain a complaining people. Early battles and Jethro's counsel shape community leadership.",
        icon: 'nutrition',
        prayer: `Jehovah Jireh, bread from heaven and water from rock remind me that You supply daily grace. Quiet my complaining spirit and teach gratitude in scarcity and plenty.`,
        reflectionPrompt: `How can you practice thankfulness today for God's everyday provisions?`,
      },
      {
        id: 'exo-5',
        title: 'Sinai & Ten Words',
        reference: createRef('Exodus', generateChapters(19, 24)),
        description:
          "Thunder, fire, and trumpet blasts announce God's arrival on the mountain. Israel vows obedience as the Ten Commandments anchor a comprehensive covenant.",
        icon: 'document-text',
        prayer: `Holy Lawgiver, Your thunderous words set people free to love well. Write Your commandments on my heart by the Spirit so obedience becomes delight.`,
        reflectionPrompt: `Which of the Ten Words is the Spirit highlighting for renewal in your life right now?`,
      },
      {
        id: 'exo-6',
        title: 'Tabernacle Blueprint',
        reference: createRef('Exodus', generateChapters(25, 31)),
        description:
          'Detailed designs reveal that God intends to dwell among His people. Every measurement, fabric, and furnishing is a portable echo of Eden.',
        icon: 'home',
        prayer: `Immanuel, You desire to dwell among us. Prepare the tabernacle of my heart—every detail offered for Your glory.`,
        reflectionPrompt: `What "fabric or furnishing" of your daily rhythm needs rearranging to host God's presence?`,
      },
      {
        id: 'exo-7',
        title: 'Golden Calf & Renewal',
        reference: createRef('Exodus', generateChapters(32, 34)),
        description:
          'Impatience births idolatry when Israel molds a calf from gold. Moses pleads for mercy, and God renews the covenant while revealing His compassionate name.',
        icon: 'alert',
        prayer: `Compassionate and Gracious God, when I craft golden calves of impatience, please forgive and renew covenant with me. Show me Your glory that I might reflect it.`,
        reflectionPrompt: `Identify a golden calf of hurry or control in your life. What would repentance look like?`,
      },
      {
        id: 'exo-8',
        title: 'Tabernacle Completed',
        reference: createRef('Exodus', generateChapters(35, 40)),
        description:
          "Skilled artisans follow God's pattern precisely. The cloud and fiery glory move in, signaling that Israel's King has taken up residence.",
        icon: 'home',
        prayer: `Faithful Finisher, You filled the completed tabernacle with glory. Complete the good work begun in me so Your presence shines through everything I build.`,
        reflectionPrompt: `Where do you sense God inviting excellence and faithfulness to "finish the work" He assigned?`,
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
        prayer: `Holy God, every sacrifice whispers of Christ, the perfect offering. Thank You for making atonement that draws me near. Teach me to live as a living sacrifice today.`,
        reflectionPrompt: `What would it look like for you to present your body and schedule as worship?`,
      },
      {
        id: 'wild-2',
        title: 'Priesthood & Purity',
        reference: createRef('Leviticus', generateChapters(6, 10)),
        description:
          "Ordination of Aaron's sons shows the joy and danger of sacred duty. Tragedy strikes when strange fire ignores God's holiness.",
        icon: 'person',
        prayer: `Lord of Fire, Your holiness consumes strange fire. Purify my worship from performance, letting reverence and joy burn together.`,
        reflectionPrompt: `Is there any area where casual familiarity has dulled holy awe?`,
      },
      {
        id: 'wild-3',
        title: 'Atonement & Ethics',
        reference: createRef('Leviticus', generateChapters(16, 19)),
        description:
          'The Day of Atonement purges both sanctuary and people once a year. Immediately God links forgiveness to everyday justice and neighbor-love.',
        icon: 'heart',
        prayer: `Forgiving Judge, on the Day of Atonement You covered sin and cleansed the camp. Cover my conscience and empower me to love my neighbor as myself.`,
        reflectionPrompt: `Who is God calling you to reconcile with as evidence of forgiven life?`,
      },
      {
        id: 'wild-4',
        title: 'Festivals & Vows',
        reference: createRef('Leviticus', generateChapters(23, 27)),
        description:
          "Sabbaths, feasts, and jubilee weave worship into Israel's calendar. Vows and tithes underline that time, land, and life belong to the Lord.",
        icon: 'calendar',
        prayer: `Lord of Sabbaths, Your festivals weave worship into calendars. Teach me to pause regularly and remember that all I own belongs to You.`,
        reflectionPrompt: `How can you build intentional celebration and rest into the next week?`,
      },
      {
        id: 'wild-5',
        title: 'Census & Camp',
        reference: createRef('Numbers', generateChapters(1, 4)),
        description:
          'A precise head-count arranges tribes around the tabernacle like spokes around a hub. God dwells at the center, visually preaching His priority.',
        icon: 'people',
        prayer: `God of Order, even censuses reveal Your care for every name. Remind me that I am positioned around Your presence, not the other way around.`,
        reflectionPrompt: `What would it mean to re-center your life visually around God's "tabernacle" today?`,
      },
      {
        id: 'wild-6',
        title: 'Complaints & Spies',
        reference: createRef('Numbers', generateChapters(11, 14)),
        description:
          "Grumbling spreads like wildfire and culminates in unbelief at Canaan's borders. Forty years of wandering become the price of fear.",
        icon: 'chatbubble',
        prayer: `Patient Teacher, when I grumble You invite faith. Replace my complaints with trust, especially when giants loom large.`,
        reflectionPrompt: `Which fear feels like a giant in your promised land, and what truth counters it?`,
      },
      {
        id: 'wild-7',
        title: "Balaam's Oracles",
        reference: createRef('Numbers', generateChapters(22, 24)),
        description:
          'A hired seer cannot curse those whom God has blessed. Instead, he foretells a star and scepter that will rise from Israel.',
        icon: 'star',
        prayer: `Sovereign Protector, You turn curses into blessings. Guard my heart from compromise and open my eyes to Your prophetic assurances.`,
        reflectionPrompt: `Where might subtle compromise threaten your devotion, and how can you guard against it?`,
      },
      {
        id: 'wild-8',
        title: 'Plains of Moab',
        reference: createRef('Numbers', generateChapters(25, 31)),
        description:
          'Sexual seduction and idolatry provoke deadly judgment, yet a second census prepares a new generation. Cities of refuge and Midianite war close the book.',
        icon: 'location',
        prayer: `Faithful Shepherd, in wilderness discipline You still prepare inheritance. Help me root out idolatry and cling to Your promise of rest.`,
        reflectionPrompt: `What idol is God exposing that must be surrendered before entering new territory?`,
      },
      {
        id: 'wild-9',
        title: "Moses' First Farewell",
        reference: createRef('Deuteronomy', generateChapters(1, 6)),
        description:
          "Standing on the border, Moses retells Israel's story to kindle trust. The Shema calls every heart and home to covenant love.",
        icon: 'megaphone',
        prayer: `God of the Shema, engrave love for You on my heart, home, and habits. May obedience flow from affectionate remembrance of Your story.`,
        reflectionPrompt: `How will you talk about God's faithfulness in your house this week?`,
      },
      {
        id: 'wild-10',
        title: 'Covenant Renewal',
        reference: createRef('Deuteronomy', generateChapters(27, 30)),
        description:
          'Mountains of blessing and curse dramatize the stakes of obedience. Moses pleads, "Choose life," pointing to circumcised hearts as the true hope.',
        icon: 'refresh',
        prayer: `Lord of Legacy, as Moses viewed the land from afar, teach me to finish well—passing leadership and songs of blessing to those after me.`,
        reflectionPrompt: `Who are you intentionally mentoring to carry the mission beyond your years?`,
      },
      {
        id: 'wild-11',
        title: "Moses' Farewell",
        reference: createRef('Deuteronomy', generateChapters(31, 34)),
        description:
          "Joshua is commissioned as successor, and Moses views the land from Nebo's peak. The greatest prophet is buried by God Himself, awaiting a greater one to come.",
        icon: 'person',
        prayer: `Sovereign Redeemer, You turn curses into blessings. Guard my heart from compromise and open my eyes to Your prophetic assurances.`,
        reflectionPrompt: `Where might subtle compromise threaten your devotion, and how can you guard against it?`,
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
        prayer: `Captain of Hosts, like Joshua I want courage that flows from Your promises. Lead me to step onto flooded Jordans trusting they will part.`,
        reflectionPrompt: `What risky obedience is God asking that requires courageous faith?`,
      },
      {
        id: 'kp-2',
        title: "Judges' Cycles",
        reference: createRef('Judges', generateChapters(1, 7)),
        description:
          'Israel drifts into a downward spiral of idolatry, oppression, and deliverance. Each judge offers temporary relief but points to the need for a faithful king.',
        icon: 'reload',
        prayer: `Faithful Judge, cycles of compromise reveal my need for a Savior-King. Deliver me from apathy and raise zeal for wholehearted devotion.`,
        reflectionPrompt: `Which recurring sin cycle do you need to surrender to the true Judge today?`,
      },
      {
        id: 'kp-3',
        title: 'Rise of Saul',
        reference: createRef('1 Samuel', generateChapters(8, 14)),
        description:
          'People demand a king and God grants Saul, whose tall stature masks insecure heart. Early victories soon give way to rash vows and disobedience.',
        icon: 'trending-up',
        prayer: `King of Kings, guard my heart from Saul-like insecurity. Teach me to value obedience over outward success.`,
        reflectionPrompt: `Where are you tempted to sacrifice appearance for obedience?`,
      },
      {
        id: 'kp-4',
        title: 'David on the Run',
        reference: createRef('1 Samuel', generateChapters(15, 21)),
        description:
          'Anointing shifts to David, sparking royal jealousy. Wilderness caves become training grounds for the future shepherd-king.',
        icon: 'footsteps',
        prayer: `Refuge in Wilderness, shape me like David in caves—forming character before crown. Help me honor even flawed authority while trusting Your timing.`,
        reflectionPrompt: `How can patience in hidden seasons prepare you for future influence?`,
      },
      {
        id: 'kp-5',
        title: "David's Reign",
        reference: createRef('2 Samuel', generateChapters(1, 7)),
        description:
          'Jerusalem becomes capital and God promises an eternal dynasty. Yet private sin with Bathsheba will sow public turmoil.',
        icon: 'ribbon',
        prayer: `Covenant Keeper, Your promise to David finds "Yes" in Jesus. Forgive my private sins that endanger public witness, and restore steadfast spirit within me.`,
        reflectionPrompt: `Bring one hidden area into God's light today—what step will you take?`,
      },
      {
        id: 'kp-6',
        title: 'Solomon & Temple',
        reference: createRef('1 Kings', generateChapters(1, 7)),
        description:
          "Wisdom, wealth, and worship reach their zenith as the temple is dedicated. Sadly Solomon's many marriages plant seeds of idolatry.",
        icon: 'business',
        prayer: `God of Wisdom, grant me a discerning heart like Solomon's, yet keep me from divided loyalties. Let my worship remain undistracted.`,
        reflectionPrompt: `What competing affection might be quietly turning your heart from undivided devotion?`,
      },
      {
        id: 'kp-7',
        title: 'Kingdom Divides',
        reference: createRef('1 Kings', generateChapters(12, 16)),
        description:
          'Harsh policies split the kingdom into Israel and Judah. Golden calves at Dan and Bethel institutionalize covenant breach.',
        icon: 'git-branch',
        prayer: `Unifying Lord, human harshness splits kingdoms, but Your Spirit unites. Heal divisions in Your church and my relationships.`,
        reflectionPrompt: `Which conversation could you initiate to sow reconciliation where there's division?`,
      },
      {
        id: 'kp-8',
        title: 'Elijah & Elisha',
        reference: createRef('1 Kings', generateChapters(17, 22)),
        description:
          "Fire from heaven and chariots of whirlwind highlight prophetic power. Successor Elisha doubles the miracles to prove God's ongoing presence.",
        icon: 'flame',
        prayer: `God Who Answers by Fire, make my life an altar drenched yet ignitable. May courage to confront idolatry burn bright in me.`,
        reflectionPrompt: `Where is God calling you to publicly stand for His honor?`,
      },
      {
        id: 'kp-9',
        title: 'Assyrian Exile',
        reference: createRef('2 Kings', generateChapters(17, 19)),
        description:
          "Relentless idolatry ends in Samaria's fall and deportation. Hezekiah's faith, however, momentarily stays Assyria's hand against Judah.",
        icon: 'airplane',
        prayer: `Lord of History, Assyria's exile warns me that sin has consequences. Keep my heart steadfast and my hope in Your preserving power.`,
        reflectionPrompt: `What warning from Scripture do you need to heed before drift becomes downfall?`,
      },
      {
        id: 'kp-10',
        title: 'Babylonian Exile',
        reference: createRef('2 Kings', generateChapters(23, 25)),
        description:
          "Despite Josiah's reforms, Judah collapses under Babylonian siege. The book closes with a captive king eating at an enemy's table—yet hinting at future hope.",
        icon: 'planet',
        prayer: `God of Hope, even in Babylon You preserve royal seed. When circumstances feel like exile, lift my eyes to future restoration in Christ.`,
        reflectionPrompt: `How can you practice faithful presence in a place that feels like exile?`,
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
        prayer: `Lord of Two Paths, plant me by streams of Your Word. Keep me from walking, standing, or sitting in sin's counsel.`,
        reflectionPrompt: `What practical step can deepen your daily delight in Scripture?`,
      },
      {
        id: 'psw-2',
        title: 'Shelter & Trust',
        reference: createRef('Psalms', generateChapters(11, 16)),
        description: 'When dangers loom, these prayers model confident refuge in the Lord.',
        icon: 'shield',
        prayer: `My Refuge and Fortress, when foundations shake, hide me in Your presence until the storm passes.`,
        reflectionPrompt: `Recall a present fear. How can you verbalize trust like the psalmist?`,
      },
      {
        id: 'psw-3',
        title: 'Creation & Torah',
        reference: createRef('Psalms', generateChapters(19, 24)),
        description: `The skies proclaim glory while God's perfect law revives the soul.`,
        icon: 'sunny',
        prayer: `Creator and Lawgiver, let the heavens' song and Torah's perfection revive my soul, leading me to hidden-fault repentance.`,
        reflectionPrompt: `How does creation currently invite you to praise the Creator?`,
      },
      {
        id: 'psw-4',
        title: 'Fret Not Evil',
        reference: createRef('Psalms', generateChapters(37, 41)),
        description: 'Patience and generosity outlast the temporary triumph of evildoers.',
        icon: 'time',
        prayer: `God of Justice, teach me to fret not over evildoers but to dwell in the land cultivating faithfulness.`,
        reflectionPrompt: `Where is envy towards the wicked stealing your peace?`,
      },
      {
        id: 'psw-5',
        title: 'True Wealth',
        reference: createRef('Psalms', generateChapters(49, 53)),
        description: 'Riches cannot ransom a soul; eternal perspective is real security.',
        icon: 'cash',
        prayer: `Lord, remind me that wealth cannot redeem a soul. Anchor my security in eternity, not possessions.`,
        reflectionPrompt: `How might generosity loosen the grip of materialism in your life?`,
      },
      {
        id: 'psw-6',
        title: 'Wisdom in Adversity',
        reference: createRef('Psalms', generateChapters(90, 94)),
        description: 'Moses teaches us to number our days; laments become declarations of faith.',
        icon: 'calendar',
        prayer: `Everlasting God, teach me to number my days that I may gain a heart of wisdom even amid adversity.`,
        reflectionPrompt: `What would "numbering your days" change about today's priorities?`,
      },
      {
        id: 'psw-7',
        title: 'Delighting in the Word',
        reference: createRef('Psalms', generateChapters(119, 122)),
        description: 'An alphabet of devotion exalts Scripture as light, life, and liberty.',
        icon: 'book',
        prayer: `Spirit of Truth, open my eyes to wondrous things in Your law; let Your Word be sweeter than honey to me.`,
        reflectionPrompt: `Which verse recently lit up for you, and how will you live it out?`,
      },
      {
        id: 'psw-8',
        title: 'Final Hallelujahs',
        reference: createRef('Psalms', generateChapters(145, 150)),
        description: 'Wise living crescendos in universal praise—let everything that has breath!',
        icon: 'musical-notes',
        prayer: `Great King, let everything that has breath in me praise You—may my final word today be hallelujah.`,
        reflectionPrompt: `List three reasons to praise God right now; how will you vocalize them?`,
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
        prayer: `Holy, Holy, Holy Lord, like Isaiah I confess unclean lips. Purge me with coal from Your altar and send me wherever You will.`,
        reflectionPrompt: `Where do you sense God asking "Whom shall I send?"—and what is your response?`,
      },
      {
        id: 'maj-2',
        title: 'Isaiah: The Servant',
        reference: createRef('Isaiah', generateChapters(40, 46)),
        description:
          "The exile horizon turns silky with promises of a highway home. Four servant songs climax in a wounded healer who bears others' sins.",
        icon: 'bandage',
        prayer: `Servant-King Jesus, wounded for our transgressions, teach me to mirror servant humility and hope to weary exiles.`,
        reflectionPrompt: `Which aspect of the Servant's character do you need to embody today?`,
      },
      {
        id: 'maj-3',
        title: 'Jeremiah: Early Oracles',
        reference: createRef('Jeremiah', generateChapters(1, 6)),
        description:
          'A reluctant youth receives a mission to uproot and to plant. Almond branch and boiling pot visions frame looming Babylonian invasion.',
        icon: 'megaphone',
        prayer: `Potter of Nations, shape my words and life to uproot lies and plant truth, even when unpopular.`,
        reflectionPrompt: `What truth are you hesitating to speak out of fear?`,
      },
      {
        id: 'maj-4',
        title: 'Jeremiah: Laments',
        reference: createRef('Jeremiah', generateChapters(18, 23)),
        description:
          'Confessions pour out as the prophet wrestles with loneliness and danger. Yet amid tears he announces a new covenant written on hearts, not stone.',
        icon: 'sad',
        prayer: `Man of Sorrows, in lament You are near. Help me wrestle honestly yet anchor in the hope of a heart-written covenant.`,
        reflectionPrompt: `Bring one unresolved pain before God—what lament and hope will you voice?`,
      },
      {
        id: 'maj-5',
        title: 'Ezekiel: Wheels & Glory',
        reference: createRef('Ezekiel', generateChapters(1, 7)),
        description:
          "Exiles by the Kebar River behold a storm-throne vision beyond imagination. Judgment oracles explain why God's glory departs the temple.",
        icon: 'aperture',
        prayer: `Glorious One, wheels within wheels proclaim Your sovereignty. Expand my vision of Your holiness until idols crumble.`,
        reflectionPrompt: `How does a bigger view of God transform a current worry?`,
      },
      {
        id: 'maj-6',
        title: 'Ezek: New Hope',
        reference: createRef('Ezekiel', generateChapters(36, 39)),
        description:
          'Dry bones rattle back to life, picturing national resurrection. A future Davidic shepherd and a decisive victory over Gog seal the promise.',
        icon: 'expand',
        prayer: `Breath of Life, speak to valley bones. Revive dead hopes and set me under the care of the Good Shepherd-Prince.`,
        reflectionPrompt: `Where do you need to invite God's breath to resurrect dry bones in your life?`,
      },
      {
        id: 'maj-7',
        title: 'Daniel: Faithful in Exile',
        reference: createRef('Daniel', generateChapters(1, 6)),
        description:
          'Diet tests, fiery furnaces, and lion dens showcase uncompromising loyalty. Each deliverance foreshadows an everlasting kingdom not cut by human hands.',
        icon: 'paw',
        prayer: `Ancient of Days, grant me steadfast faith like Daniel amidst cultural pressure. May my loyalty to You outshine any threat.`,
        reflectionPrompt: `What small act of faithfulness today paves the way for future courage?`,
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
        prayer: `Relentless Lover, thank You for pursuing unfaithful hearts. Bind me to You in covenant love that transforms my waywardness.`,
        reflectionPrompt: `Where have you sensed God's faithful pursuit despite your wandering?`,
      },
      {
        id: 'min-2',
        title: 'Joel: Day of the LORD',
        reference: createRef('Joel', generateChapters(1, 3)),
        description:
          'Locust devastation becomes a sermon on cosmic reckoning. Yet God also pledges an outpoured Spirit for all flesh.',
        icon: 'sunny',
        prayer: `God of the Day of the LORD, turn my alarm into repentance and my repentance into renewal by Your Spirit.`,
        reflectionPrompt: `What locust-eaten place of loss needs God's promised restoration?`,
      },
      {
        id: 'min-3',
        title: 'Amos: Justice Rolls',
        reference: createRef('Amos', generateChapters(1, 4)),
        description:
          'A shepherd-prophet targets affluent complacency with roaring indictments. True worship, he insists, must overflow in righteousness.',
        icon: 'scale',
        prayer: `God of Justice, let righteousness roll like a river through my life. Break complacency and align my worship with compassion.`,
        reflectionPrompt: `How can you practice justice for the marginalized this week?`,
      },
      {
        id: 'min-4',
        title: 'Micah: Justice & Hope',
        reference: createRef('Micah', generateChapters(1, 5)),
        description:
          "Rural Micah challenges urban corruption and foretells Bethlehem's ruler. The famous call to do justice, love mercy, and walk humbly rings out.",
        icon: 'shield',
        prayer: `Humble King, teach me to act justly, love mercy, and walk humbly with You in every arena of life.`,
        reflectionPrompt: `Which of those three actions feels most challenging right now?`,
      },
      {
        id: 'min-5',
        title: 'Habakkuk: Faith in Crisis',
        reference: createRef('Habakkuk', generateChapters(1, 3)),
        description:
          'A prophet argues with God about unanswered violence. By the end he sings: "The righteous will live by faith."',
        icon: 'help',
        prayer: `Mighty Savior, refine me with holy fire and quiet me with singing love.`,
        reflectionPrompt: `What impurity is God revealing that His refining fire can remove?`,
      },
      {
        id: 'min-6',
        title: 'Zephaniah: Purifying Fire',
        reference: createRef('Zephaniah', generateChapters(1, 3)),
        description:
          'Sweeping day-of-the-LORD announcements purge earth and sky. Yet a humble remnant will sing as God rejoices over them.',
        icon: 'flame',
        prayer: `Zephaniah: Purifying Fire, sweep away the dross and impurities from my life.`,
        reflectionPrompt: `What area of my life needs to be purified and renewed by God's Spirit?`,
      },
      {
        id: 'min-7',
        title: 'Haggai & Zech',
        reference: [createRef('Haggai', generateChapters(1, 2)), createRef('Zechariah', [1])],
        description:
          "Returned exiles stall on rebuilding the temple until prophetic urgency stirs them. Initial night visions in Zechariah confirm that God's angel armies stand behind the project.",
        icon: 'home',
        prayer: `Builder of the House, stir my spirit to prioritize Your temple over personal paneled houses.`,
        reflectionPrompt: `How can you invest time or resources in God's kingdom project this week?`,
      },
      {
        id: 'min-8',
        title: 'Zech: Glory Visions',
        reference: createRef('Zechariah', generateChapters(2, 4)),
        description:
          "Flying scrolls, lampstands, and a crowned high priest forecast messianic triumph. Jerusalem's future extends far beyond walls of stone.",
        icon: 'eye',
        prayer: `Lord of Hosts, through night visions assure me that You stand behind Your people. Strengthen my hands for the work.`,
        reflectionPrompt: `What encouraging sign has God given you recently to keep building?`,
      },
      {
        id: 'min-9',
        title: 'Malachi: Final Word',
        reference: createRef('Malachi', generateChapters(1, 4)),
        description:
          'A skeptical post-exilic community is confronted about tithes, divorce, and apathy. The closing promise of Elijah hints at the coming of John the Baptist.',
        icon: 'mail',
        prayer: `Faithful Witness, turn my cynical questions into reverent expectation of the Sun of Righteousness rising.`,
        reflectionPrompt: `Where do you need to replace spiritual apathy with anticipation of Christ's coming?`,
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
        prayer: `Incarnate Word, as angels proclaimed good news, let my life echo "Glory to God" through humble obedience.`,
        reflectionPrompt: `How does Jesus' humility in birth challenge your view of greatness?`,
      },
      {
        id: 'gos-2',
        title: 'Baptism & Early Call',
        reference: createRef('Matthew', generateChapters(3, 5)),
        description:
          "Heaven opens over the Jordan as the Spirit descends like a dove. Wilderness temptations test the Son's obedience before public ministry begins.",
        icon: 'water',
        prayer: `Beloved Son, in baptism and wilderness You modeled surrendered sonship. Empower me to resist temptation with written truth.`,
        reflectionPrompt: `Which Scripture will you wield against a recurring temptation?`,
      },
      {
        id: 'gos-3',
        title: 'Sermon on the Mount',
        reference: createRef('Matthew', generateChapters(5, 7)),
        description:
          'Jesus redefines righteousness, confronting both legalism and hypocrisy. Beatitudes bless outsiders while heart-level commands raise the moral bar.',
        icon: 'triangle',
        prayer: `Rabbi Jesus, reshape my values through Beatitudes. Teach me to build on rock by doing Your words.`,
        reflectionPrompt: `Which teaching from the Sermon on the Mount do you sense God asking you to practice today?`,
      },
      {
        id: 'gos-4',
        title: 'Parables of Grace',
        reference: createRef('Luke', generateChapters(15, 17)),
        description:
          "Sheep, coins, and prodigal sons illustrate heaven's joy over one repentant sinner. Kingdom grace scandalizes the self-righteous but embraces the lost.",
        icon: 'chatbubble',
        prayer: `Shepherd of the Lost, thank You for chasing prodigals. Make my heart celebrate repentance and seek the forgotten.`,
        reflectionPrompt: `Who in your life feels far from God and needs welcoming love?`,
      },
      {
        id: 'gos-5',
        title: 'Signs & Power',
        reference: createRef('Mark', generateChapters(1, 5)),
        description:
          'Demons are silenced, storms are stilled, and paralytics walk. Each miracle is a billboard for the authority of the King.',
        icon: 'flash',
        prayer: `Lord of Power, display Your authority over chaos in my circumstances so others marvel at who You are.`,
        reflectionPrompt: `What storm do you need to invite Jesus to speak "Peace, be still" over?`,
      },
      {
        id: 'gos-6',
        title: 'Upper Room & Prayer',
        reference: createRef('John', generateChapters(12, 17)),
        description:
          "Foot-washing models servant leadership on the eve of betrayal. Jesus' high-priestly prayer secures unity and joy for future disciples.",
        icon: 'home',
        prayer: `Servant Leader, wash my feet and teach me to serve others with the same grace You've shown me.`,
        reflectionPrompt: `Whose feet (figuratively) can you wash this week?`,
      },
      {
        id: 'gos-7',
        title: 'Passion & Cross',
        reference: createRef('John', generateChapters(18, 19)),
        description:
          'Roman trials, a crown of thorns, and crucifixion fulfill ancient prophecies. "It is finished" signals that the debt of sin is paid in full.',
        icon: 'add',
        prayer: `Crucified Savior, thank You for bearing my sin. May the cross crucify my pride and free me to love sacrificially.`,
        reflectionPrompt: `What part of self needs to die so Christ's love can live through you?`,
      },
      {
        id: 'gos-8',
        title: 'Resurrection & Commission',
        reference: createRef('John', generateChapters(20, 21)),
        description:
          'An empty tomb turns mourning into mission. The risen Lord restores Peter and sends believers to the ends of the earth.',
        icon: 'sunny',
        prayer: `Risen Lord, breathe peace into my doubts and commission me to make disciples. Empower me by Your Spirit.`,
        reflectionPrompt: `How will resurrection hope shape one conversation today?`,
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
        prayer: `Spirit of Pentecost, fill me afresh that my words boldly proclaim Jesus across cultural lines.`,
        reflectionPrompt: `Where is God prompting you to witness today?`,
      },
      {
        id: 'act-2',
        title: 'Growth & Opposition',
        reference: createRef('Acts', generateChapters(5, 7)),
        description:
          "Miracles multiply even as arrests escalate. Stephen's martyrdom seeds a wider gospel dispersion.",
        icon: 'trending-up',
        prayer: `Lord of Growth, strengthen me to rejoice when opposition arises, knowing Your word cannot be chained.`,
        reflectionPrompt: `How can you respond to opposition with worship instead of worry?`,
      },
      {
        id: 'act-3',
        title: 'Saul to Paul',
        reference: createRef('Acts', generateChapters(8, 9)),
        description:
          'A persecutor is blinded by resurrected glory and reborn as apostle. Baptism and early preaching astonish former allies and foes alike.',
        icon: 'flash',
        prayer: `God of Transformation, You turned Saul to Paul. Convert my blind spots into blazing testimony of grace.`,
        reflectionPrompt: `What former weakness could become a testimony if surrendered to Christ?`,
      },
      {
        id: 'act-4',
        title: 'Peter & Gentiles',
        reference: createRef('Acts', generateChapters(10, 12)),
        description:
          "Cornelius' household receives the Spirit, proving the gospel is borderless. Meanwhile divine jailbreaks and angelic interventions keep leaders mobile.",
        icon: 'globe',
        prayer: `Breaker of Barriers, help me welcome those I once called "unclean," celebrating Your impartial salvation.`,
        reflectionPrompt: `Who is outside your comfort zone that God may be calling you to love?`,
      },
      {
        id: 'act-5',
        title: "Paul's 1st Journey",
        reference: createRef('Acts', generateChapters(13, 15)),
        description:
          'Synagogue sermons stir both revival and riots across Cyprus and Asia Minor. The Jerusalem council clarifies that salvation is by grace, not circumcision.',
        icon: 'walk',
        prayer: `Missionary God, guide my steps like Paul and Barnabas. Let grace, not legalism, define my message.`,
        reflectionPrompt: `Where can you share grace today instead of adding burdens?`,
      },
      {
        id: 'act-6',
        title: "Paul's 2nd Journey",
        reference: createRef('Acts', generateChapters(16, 18)),
        description:
          'A Macedonian vision ferries the gospel into Europe. Prison hymns in Philippi and philosophers in Athens hear the same risen Christ.',
        icon: 'boat',
        prayer: `Lord of Open Doors, give Macedonian vision for new fields and songs in midnight prisons.`,
        reflectionPrompt: `What closed door might be redirecting you to a new mission field?`,
      },
      {
        id: 'act-7',
        title: "Paul's 3rd Journey",
        reference: createRef('Acts', generateChapters(19, 21)),
        description:
          'Ephesus sees city-wide impact and bonfires of magic scrolls. Farewell tears at Miletus reveal the depth of gospel friendships.',
        icon: 'footsteps',
        prayer: `Spirit of Encouragement, may my friendships deepen like Paul's farewell tears, strengthening others for the race.`,
        reflectionPrompt: `Who encourages your faith, and how can you thank them today?`,
      },
      {
        id: 'act-8',
        title: 'Trials & Rome',
        reference: createRef('Acts', generateChapters(22, 28)),
        description:
          "Courtrooms, conspiracies, and shipwreck cannot mute the witness. Acts ends with Paul proclaiming the kingdom unhindered in Caesar's capital.",
        icon: 'business',
        prayer: `Unhindered King, even chains advance the gospel. Grant me resilience to proclaim hope in every trial.`,
        reflectionPrompt: `How can you use your current circumstance—good or hard—for gospel witness?`,
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
        prayer: `God of the Gospel, root me in justification by faith so grace drives holy living.`,
        reflectionPrompt: `How does knowing you are "declared righteous" change today's struggle?`,
      },
      {
        id: 'paul-2',
        title: 'Corinthians: Church Issues',
        reference: createRef('1 Corinthians', generateChapters(1, 7)),
        description:
          'Divisions, immorality, and worship chaos plague a gifted yet immature church. Paul prescribes cross-shaped love as the only cure.',
        icon: 'people',
        prayer: `Lord of the Church, heal divisions and teach me to love with cross-shaped patience.`,
        reflectionPrompt: `What practical act of love can build unity where you worship?`,
      },
      {
        id: 'paul-3',
        title: 'Galatians: Grace vs Law',
        reference: createRef('Galatians', generateChapters(1, 6)),
        description:
          'Judaizers add circumcision to the gospel, provoking a fiery rebuttal. Freedom in the Spirit replaces slavery to external rules.',
        icon: 'scale',
        prayer: `Spirit of Freedom, keep me from adding law to grace. Let Christ be formed in me through faith working by love.`,
        reflectionPrompt: `Where are you tempted to measure worth by performance instead of grace?`,
      },
      {
        id: 'paul-4',
        title: 'Ephesians: Unity in Christ',
        reference: createRef('Ephesians', generateChapters(1, 6)),
        description:
          'Cosmic praise for electing grace flows into practical unity among Jews and Gentiles. Marriage, parenting, and spiritual warfare all hinge on identity in Christ.',
        icon: 'link',
        prayer: `God of Unity, reveal the height and depth of Christ's love, empowering me to walk in worthy humility.`,
        reflectionPrompt: `How will you guard the unity of the Spirit in your relationships today?`,
      },
      {
        id: 'paul-5',
        title: 'Philippians: Joy in Trial',
        reference: createRef('Philippians', generateChapters(1, 4)),
        description:
          'A prisoner writes the happiest letter in the New Testament. The secret of contentment is knowing that to live is Christ and to die is gain.',
        icon: 'happy',
        prayer: `Joyful Lord, teach me contentment in all circumstances because to live is Christ and to die is gain.`,
        reflectionPrompt: `What current hardship can become an opportunity for joy?`,
      },
      {
        id: 'paul-6',
        title: 'Colossians: Christ Supreme',
        reference: createRef('Colossians', generateChapters(1, 4)),
        description:
          'False philosophies shrink Jesus; Paul paints Him as creator, sustainer, and reconciler. Complete sufficiency in Christ dethrones every competing "ism."',
        icon: 'star',
        prayer: `Supreme Christ, let Your pre-eminence dethrone every rival in my mind and habits.`,
        reflectionPrompt: `Which "ism" or distraction competes for Christ's supremacy in you?`,
      },
      {
        id: 'paul-7',
        title: '1 Thess: Hope While Waiting',
        reference: createRef('1 Thessalonians', generateChapters(1, 5)),
        description:
          "New believers endure persecution with steadfast faith. Paul clarifies that the Lord's return will reunite the living and the dead.",
        icon: 'time',
        prayer: `God of Hope, comfort me with the promise of Your return so I grieve with hope and live with expectancy.`,
        reflectionPrompt: `How does Christ's return shape your use of time today?`,
      },
      {
        id: 'paul-8',
        title: '2 Thess: Steadfast',
        reference: createRef('2 Thessalonians', generateChapters(1, 3)),
        description:
          'Confusion about end-times timetables is corrected with calm assurance. Idleness is rebuked because future hope fuels present diligence.',
        icon: 'alarm',
        prayer: `Steadfast Lord, strengthen my heart against deception and idleness, fixing my eyes on Your faithfulness.`,
        reflectionPrompt: `Where might discouragement be breeding laziness instead of diligence?`,
      },
      {
        id: 'paul-9',
        title: '1 Timothy: Guarding Gospel',
        reference: createRef('1 Timothy', generateChapters(1, 6)),
        description:
          'A young pastor is charged to silence false teachers and model integrity. Instructions shape healthy doctrine, prayer, and leadership.',
        icon: 'shield',
        prayer: `Guardian of Truth, help me fight the good fight of faith, guarding the gospel with a pure heart and good conscience.`,
        reflectionPrompt: `What false teaching or distraction do you need to confront in love?`,
      },
      {
        id: 'paul-10',
        title: 'Titus: Healthy Churches',
        reference: createRef('Titus', generateChapters(1, 3)),
        description:
          'On Crete, grace trains believers to say "No" to ungodliness and "Yes" to good works. Elders must embody this transformation for the sake of witness.',
        icon: 'medkit',
        prayer: `Grace Instructor, train me to say "No" to ungodliness and "Yes" to good works that adorn the gospel.`,
        reflectionPrompt: `Identify one "good work" the Spirit is prompting you to pursue this week.`,
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
        prayer: `Great High Priest, anchor my drifting heart with the sure hope behind the veil.`,
        reflectionPrompt: `How does Jesus' superior priesthood encourage you to persevere?`,
      },
      {
        id: 'genep-2',
        title: 'James: Faith in Action',
        reference: createRef('James', generateChapters(1, 5)),
        description:
          'True religion bridles the tongue and cares for the vulnerable. Works are not a rival to faith but its inevitable fruit.',
        icon: 'hammer',
        prayer: `Lord of Wisdom, make my faith visible through compassionate action and bridled speech.`,
        reflectionPrompt: `What deed of mercy can embody your faith today?`,
      },
      {
        id: 'genep-3',
        title: 'Suffering & Holiness',
        reference: createRef('1 Peter', generateChapters(1, 5)),
        description:
          "Exiles on earth receive living hope through Christ's resurrection. Holiness and humble submission weaponize believers against slander.",
        icon: 'sparkles',
        prayer: `God of Hope, empower joyful holiness amid trials, that my life declares Your excellencies.`,
        reflectionPrompt: `How can holiness become a witness in your current hardship?`,
      },
      {
        id: 'genep-4',
        title: '1 John: True Love',
        reference: createRef('1 John', generateChapters(1, 5)),
        description:
          "John refutes proto-Gnostic denial of Christ's incarnation. Walking in light naturally overflows in brother-love.",
        icon: 'heart',
        prayer: `God is Love, help me walk in light and love, discerning truth and overcoming the evil one.`,
        reflectionPrompt: `In which relationship do you need to choose sacrificial love?`,
      },
      {
        id: 'genep-5',
        title: 'Jude & Johns',
        reference: [createRef('Jude', [1]), createRef('2 John', [1]), createRef('3 John', [1])],
        description:
          'Tiny letters pack a punch against false teachers and for faithful hospitality. They remind us that truth and love must travel together.',
        icon: 'mail',
        prayer: `Lord of Truth, keep me contending for the faith while extending hospitality without fear.`,
        reflectionPrompt: `Where can you combine truth and love for someone today?`,
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
        prayer: `Christ among the Lampstands, refine my witness so Your light burns bright in my church and life.`,
        reflectionPrompt: `What commendation and correction from the seven letters speaks most to you?`,
      },
      {
        id: 'rev-2',
        title: 'Throne & Seals',
        reference: createRef('Revelation', generateChapters(4, 8)),
        description:
          'A rainbow-encircled throne anchors worship above. As the Lamb breaks seals, judgment and redemption advance hand in hand.',
        icon: 'ribbon',
        prayer: `Throned Lamb, lift my eyes above earthly turmoil to the rainbow-encircled throne where worship never stops.`,
        reflectionPrompt: `How can you join the heavenly chorus in the middle of daily tasks?`,
      },
      {
        id: 'rev-3',
        title: 'Rev: Trumpets',
        reference: createRef('Revelation', generateChapters(9, 13)),
        description:
          "Cosmic plagues and demonic forces unleash warnings yet leave many unrepentant. Two faithful witnesses and a war in heaven assure that evil's rage is limited.",
        icon: 'megaphone',
        prayer: `Sovereign Judge, teach me to trumpet warning and witness, trusting Your measured mercy.`,
        reflectionPrompt: `What aspect of spiritual warfare do these chapters highlight for your prayer life?`,
      },
      {
        id: 'rev-4',
        title: 'Bowls & Babylon',
        reference: createRef('Revelation', generateChapters(14, 18)),
        description:
          "Final bowls finish God's wrath and topple the seductive city called Babylon. Heaven erupts in hallelujahs over just judgments.",
        icon: 'wine',
        prayer: `Righteous King, help me leave Babylon's seduction and worship the pure beauty of holiness.`,
        reflectionPrompt: `Where might worldly allurements be dulling your longing for Christ?`,
      },
      {
        id: 'rev-5',
        title: 'New Creation',
        reference: createRef('Revelation', generateChapters(19, 22)),
        description:
          'A white-horse rider defeats the beast and resurrects His people. New heavens and new earth emerge as God dwells with humanity forever.',
        icon: 'earth',
        prayer: `Alpha and Omega, hasten the day of new creation. Until then, keep me conquering by the blood of the Lamb and word of testimony.`,
        reflectionPrompt: `What part of Revelation's finale fuels your endurance today?`,
      },
    ],
  },
];

/* ------------------------------------------------------------------
   ▸ Devotional content
   ------------------------------------------------------------------ */

// A curated prayer and reflection prompt for each learning unit.
// These are spiritually-rich yet concise so they surface well in UI cards.
const UNIT_DEVOTIONS: Record<string, { prayer: string; reflectionPrompt: string }> = {
  /* ------------------------------  GENESIS  ------------------------------ */
  'gen-2': {
    prayer: `Merciful Father, You see my hidden motives as clearly as the first altar where Abel's blood cried out. Cleanse envy and anger from my heart. Teach me to offer You my best in humble faith, trusting Your justice and grace. In Jesus' name, amen.`,
    reflectionPrompt: `Where might jealousy or comparison be souring your worship, and how can you instead present God a wholehearted offering?`,
  },
  'gen-3': {
    prayer: `Covenant-Keeping God, You placed a rainbow in the clouds to promise mercy after judgment. Thank You for rescuing Noah and offering me the same deliverance in Christ. Help me walk blamelessly in a corrupt world today.`,
    reflectionPrompt: `What "ark" of obedience is God inviting you to build now—before the storm arrives?`,
  },
  'gen-4': {
    prayer: `Lord of the Nations, human pride scatters but Your purpose still gathers a people for Your name. Guard my ambition from building towers to myself. Make me a channel of blessing like Abram, blessing every tribe and tongue.`,
    reflectionPrompt: `In what area of life are you stacking bricks of self-promotion rather than trusting God's timing?`,
  },
  'gen-5': {
    prayer: `Faithful God of Abraham, You call ordinary pilgrims into extraordinary promises. Strengthen my faith to obey without knowing all the details. May my life point others to Your unfailing covenant love.`,
    reflectionPrompt: `What first step of obedience is God highlighting for you—however small—that would demonstrate trust in His promise?`,
  },
  'gen-6': {
    prayer: `God of Generations, You laughed with Sarah and Abraham over impossible births. Thank You for bringing life out of barrenness. Teach me to steward the gifts You've entrusted, passing faith to the next generation.`,
    reflectionPrompt: `How can you intentionally nurture faith in someone younger this week?`,
  },
  'gen-7': {
    prayer: `God of Jacob and Esau, You work through messy families and surprising choices. Heal my broken relationships and rename my identity in Your grace. Make reconciliation greater than rivalry.`,
    reflectionPrompt: `Where do you sense God inviting you to seek forgiveness or extend mercy within your family story?`,
  },
  'gen-8': {
    prayer: `God Who Wrestles, thank You that You meet me in the dark nights of fear. As Jacob limped toward daylight with a new name, mark me with humble dependence that clings to Your blessing.`,
    reflectionPrompt: `What personal struggle could become a place of deeper encounter with God if you hold on to Him?`,
  },
  'gen-9': {
    prayer: `Sovereign Redeemer, You guided Joseph from pit to palace. Turn my setbacks into setups for Your purposes. Help me forgive those who wrong me and trust Your unseen hand.`,
    reflectionPrompt: `How might God be using an unfair circumstance in your life to shape future fruit?`,
  },
  'gen-10': {
    prayer: `God of Providence, You wove famine into forgiveness and saved many lives through Joseph. Teach me to see trials through the lens of Your larger story and respond with compassionate generosity.`,
    reflectionPrompt: `Who needs to hear words of grace from you that could turn past hurt into present healing?`,
  },
  'gen-11': {
    prayer: `Eternal God, as Jacob blessed his sons and Joseph trusted in future deliverance, orient my hope beyond the grave. May my final words and daily choices alike testify that You will surely come.`,
    reflectionPrompt: `If today were your last, what legacy of faith would you want to leave—and what step can you take toward that today?`,
  },

  /* ------------------------------  EXODUS  ------------------------------ */
  'exo-1': {
    prayer: `Deliverer God, You heard Israel's groans in bondage. Hear oppressed hearts today and raise deliverers. Form courage in me like Moses to confront injustice with humility.`,
    reflectionPrompt: `Where is God nudging you to step out of comfort and speak up for someone in chains?`,
  },
  'exo-2': {
    prayer: `Lord of Signs and Wonders, Your power shamed Egypt's idols. Expose the false gods in my own culture and heart. Let my trust rest in Your unmatched authority.`,
    reflectionPrompt: `What modern "plague" might God be using to reveal misplaced trust in your life?`,
  },
  'exo-3': {
    prayer: `Passover Lamb, thank You that Your blood marks my rescue and a path through impossible seas. Lead me into freedom that worships You with every breath.`,
    reflectionPrompt: `What area of life still feels pursued by "pharaoh"—and how can you plant your feet in God's finished salvation?`,
  },
  'exo-4': {
    prayer: `Jehovah Jireh, bread from heaven and water from rock remind me that You supply daily grace. Quiet my complaining spirit and teach gratitude in scarcity and plenty.`,
    reflectionPrompt: `How can you practice thankfulness today for God's everyday provisions?`,
  },
  'exo-5': {
    prayer: `Holy Lawgiver, Your thunderous words set people free to love well. Write Your commandments on my heart by the Spirit so obedience becomes delight.`,
    reflectionPrompt: `Which of the Ten Words is the Spirit highlighting for renewal in your life right now?`,
  },
  'exo-6': {
    prayer: `Immanuel, You desire to dwell among us. Prepare the tabernacle of my heart—every detail offered for Your glory.`,
    reflectionPrompt: `What "fabric or furnishing" of your daily rhythm needs rearranging to host God's presence?`,
  },
  'exo-7': {
    prayer: `Compassionate and Gracious God, when I craft golden calves of impatience, please forgive and renew covenant with me. Show me Your glory that I might reflect it.`,
    reflectionPrompt: `Identify a golden calf of hurry or control in your life. What would repentance look like?`,
  },
  'exo-8': {
    prayer: `Faithful Finisher, You filled the completed tabernacle with glory. Complete the good work begun in me so Your presence shines through everything I build.`,
    reflectionPrompt: `Where do you sense God inviting excellence and faithfulness to "finish the work" He assigned?`,
  },

  /* ---------------------------  WILDERNESS  --------------------------- */
  'wild-1': {
    prayer: `Holy God, every sacrifice whispers of Christ, the perfect offering. Thank You for making atonement that draws me near. Teach me to live as a living sacrifice today.`,
    reflectionPrompt: `What would it look like for you to present your body and schedule as worship?`,
  },
  'wild-2': {
    prayer: `Lord of Fire, Your holiness consumes strange fire. Purify my worship from performance, letting reverence and joy burn together.`,
    reflectionPrompt: `Is there any area where casual familiarity has dulled holy awe?`,
  },
  'wild-3': {
    prayer: `Forgiving Judge, on the Day of Atonement You covered sin and cleansed the camp. Cover my conscience and empower me to love my neighbor as myself.`,
    reflectionPrompt: `Who is God calling you to reconcile with as evidence of forgiven life?`,
  },
  'wild-4': {
    prayer: `Lord of Sabbaths, Your festivals weave worship into calendars. Teach me to pause regularly and remember that all I own belongs to You.`,
    reflectionPrompt: `How can you build intentional celebration and rest into the next week?`,
  },
  'wild-5': {
    prayer: `God of Order, even censuses reveal Your care for every name. Remind me that I am positioned around Your presence, not the other way around.`,
    reflectionPrompt: `What would it mean to re-center your life visually around God's "tabernacle" today?`,
  },
  'wild-6': {
    prayer: `Patient Teacher, when I grumble You invite faith. Replace my complaints with trust, especially when giants loom large.`,
    reflectionPrompt: `Which fear feels like a giant in your promised land, and what truth counters it?`,
  },
  'wild-7': {
    prayer: `Sovereign Protector, You turn curses into blessings. Guard my heart from compromise and open my eyes to Your prophetic assurances.`,
    reflectionPrompt: `Where might subtle compromise threaten your devotion, and how can you guard against it?`,
  },
  'wild-8': {
    prayer: `Faithful Shepherd, in wilderness discipline You still prepare inheritance. Help me root out idolatry and cling to Your promise of rest.`,
    reflectionPrompt: `What idol is God exposing that must be surrendered before entering new territory?`,
  },
  'wild-9': {
    prayer: `God of the Shema, engrave love for You on my heart, home, and habits. May obedience flow from affectionate remembrance of Your story.`,
    reflectionPrompt: `How will you talk about God's faithfulness in your house this week?`,
  },
  'wild-10': {
    prayer: `God of Choice, You set life and death before me. Empower me to choose life through Spirit-led obedience and heart circumcision.`,
    reflectionPrompt: `What life-giving decision is God placing before you right now?`,
  },
  'wild-11': {
    prayer: `Lord of Legacy, as Moses viewed the land from afar, teach me to finish well—passing leadership and songs of blessing to those after me.`,
    reflectionPrompt: `Who are you intentionally mentoring to carry the mission beyond your years?`,
  },

  /* ---------------------  KINGDOMS & PROPHETS  --------------------- */
  'kp-1': {
    prayer: `Captain of Hosts, like Joshua I want courage that flows from Your promises. Lead me to step onto flooded Jordans trusting they will part.`,
    reflectionPrompt: `What risky obedience is God asking that requires courageous faith?`,
  },
  'kp-2': {
    prayer: `Faithful Judge, cycles of compromise reveal my need for a Savior-King. Deliver me from apathy and raise zeal for wholehearted devotion.`,
    reflectionPrompt: `Which recurring sin cycle do you need to surrender to the true Judge today?`,
  },
  'kp-3': {
    prayer: `King of Kings, guard my heart from Saul-like insecurity. Teach me to value obedience over outward success.`,
    reflectionPrompt: `Where are you tempted to sacrifice appearance for obedience?`,
  },
  'kp-4': {
    prayer: `Refuge in Wilderness, shape me like David in caves—forming character before crown. Help me honor even flawed authority while trusting Your timing.`,
    reflectionPrompt: `How can patience in hidden seasons prepare you for future influence?`,
  },
  'kp-5': {
    prayer: `Covenant Keeper, Your promise to David finds "Yes" in Jesus. Forgive my private sins that endanger public witness, and restore steadfast spirit within me.`,
    reflectionPrompt: `Bring one hidden area into God's light today—what step will you take?`,
  },
  'kp-6': {
    prayer: `God of Wisdom, grant me a discerning heart like Solomon's, yet keep me from divided loyalties. Let my worship remain undistracted.`,
    reflectionPrompt: `What competing affection might be quietly turning your heart from undivided devotion?`,
  },
  'kp-7': {
    prayer: `Unifying Lord, human harshness splits kingdoms, but Your Spirit unites. Heal divisions in Your church and my relationships.`,
    reflectionPrompt: `Which conversation could you initiate to sow reconciliation where there's division?`,
  },
  'kp-8': {
    prayer: `God Who Answers by Fire, make my life an altar drenched yet ignitable. May courage to confront idolatry burn bright in me.`,
    reflectionPrompt: `Where is God calling you to publicly stand for His honor?`,
  },
  'kp-9': {
    prayer: `Lord of History, Assyria's exile warns me that sin has consequences. Keep my heart steadfast and my hope in Your preserving power.`,
    reflectionPrompt: `What warning from Scripture do you need to heed before drift becomes downfall?`,
  },
  'kp-10': {
    prayer: `God of Hope, even in Babylon You preserve royal seed. When circumstances feel like exile, lift my eyes to future restoration in Christ.`,
    reflectionPrompt: `How can you practice faithful presence in a place that feels like exile?`,
  },

  /* ----------------------  PSALMS WISDOM PATH  ---------------------- */
  'psw-1': {
    prayer: `Lord of Two Paths, plant me by streams of Your Word. Keep me from walking, standing, or sitting in sin's counsel.`,
    reflectionPrompt: `What practical step can deepen your daily delight in Scripture?`,
  },
  'psw-2': {
    prayer: `My Refuge and Fortress, when foundations shake, hide me in Your presence until the storm passes.`,
    reflectionPrompt: `Recall a present fear. How can you verbalize trust like the psalmist?`,
  },
  'psw-3': {
    prayer: `Creator and Lawgiver, let the heavens' song and Torah's perfection revive my soul, leading me to hidden-fault repentance.`,
    reflectionPrompt: `How does creation currently invite you to praise the Creator?`,
  },
  'psw-4': {
    prayer: `God of Justice, teach me to fret not over evildoers but to dwell in the land cultivating faithfulness.`,
    reflectionPrompt: `Where is envy towards the wicked stealing your peace?`,
  },
  'psw-5': {
    prayer: `Lord, remind me that wealth cannot redeem a soul. Anchor my security in eternity, not possessions.`,
    reflectionPrompt: `How might generosity loosen the grip of materialism in your life?`,
  },
  'psw-6': {
    prayer: `Everlasting God, teach me to number my days that I may gain a heart of wisdom even amid adversity.`,
    reflectionPrompt: `What would "numbering your days" change about today's priorities?`,
  },
  'psw-7': {
    prayer: `Spirit of Truth, open my eyes to wondrous things in Your law; let Your Word be sweeter than honey to me.`,
    reflectionPrompt: `Which verse recently lit up for you, and how will you live it out?`,
  },
  'psw-8': {
    prayer: `Great King, let everything that has breath in me praise You—may my final word today be hallelujah.`,
    reflectionPrompt: `List three reasons to praise God right now; how will you vocalize them?`,
  },

  /* ----------------------  MAJOR PROPHETS  ---------------------- */
  'maj-1': {
    prayer: `Holy, Holy, Holy Lord, like Isaiah I confess unclean lips. Purge me with coal from Your altar and send me wherever You will.`,
    reflectionPrompt: `Where do you sense God asking "Whom shall I send?"—and what is your response?`,
  },
  'maj-2': {
    prayer: `Servant-King Jesus, wounded for our transgressions, teach me to mirror servant humility and hope to weary exiles.`,
    reflectionPrompt: `Which aspect of the Servant's character do you need to embody today?`,
  },
  'maj-3': {
    prayer: `Potter of Nations, shape my words and life to uproot lies and plant truth, even when unpopular.`,
    reflectionPrompt: `What truth are you hesitating to speak out of fear?`,
  },
  'maj-4': {
    prayer: `Man of Sorrows, in lament You are near. Help me wrestle honestly yet anchor in the hope of a heart-written covenant.`,
    reflectionPrompt: `Bring one unresolved pain before God—what lament and hope will you voice?`,
  },
  'maj-5': {
    prayer: `Glorious One, wheels within wheels proclaim Your sovereignty. Expand my vision of Your holiness until idols crumble.`,
    reflectionPrompt: `How does a bigger view of God transform a current worry?`,
  },
  'maj-6': {
    prayer: `Breath of Life, speak to valley bones. Revive dead hopes and set me under the care of the Good Shepherd-Prince.`,
    reflectionPrompt: `Where do you need to invite God's breath to resurrect dry bones in your life?`,
  },
  'maj-7': {
    prayer: `Ancient of Days, grant me steadfast faith like Daniel amidst cultural pressure. May my loyalty to You outshine any threat.`,
    reflectionPrompt: `What small act of faithfulness today paves the way for future courage?`,
  },

  /* ----------------------  MINOR PROPHETS  ---------------------- */
  'min-1': {
    prayer: `Relentless Lover, thank You for pursuing unfaithful hearts. Bind me to You in covenant love that transforms my waywardness.`,
    reflectionPrompt: `Where have you sensed God's faithful pursuit despite your wandering?`,
  },
  'min-2': {
    prayer: `God of the Day of the LORD, turn my alarm into repentance and my repentance into renewal by Your Spirit.`,
    reflectionPrompt: `What locust-eaten place of loss needs God's promised restoration?`,
  },
  'min-3': {
    prayer: `God of Justice, let righteousness roll like a river through my life. Break complacency and align my worship with compassion.`,
    reflectionPrompt: `How can you practice justice for the marginalized this week?`,
  },
  'min-4': {
    prayer: `Humble King, teach me to act justly, love mercy, and walk humbly with You in every arena of life.`,
    reflectionPrompt: `Which of those three actions feels most challenging right now?`,
  },
  'min-5': {
    prayer: `Sovereign Lord, amid unanswered questions let me rejoice in You, the God of my salvation.`,
    reflectionPrompt: `How can you choose rejoicing even before circumstances change?`,
  },
  'min-6': {
    prayer: `Mighty Savior, refine me with holy fire and quiet me with singing love.`,
    reflectionPrompt: `What impurity is God revealing that His refining fire can remove?`,
  },
  'min-7': {
    prayer: `Builder of the House, stir my spirit to prioritize Your temple over personal paneled houses.`,
    reflectionPrompt: `How can you invest time or resources in God's kingdom project this week?`,
  },
  'min-8': {
    prayer: `Lord of Hosts, through night visions assure me that You stand behind Your people. Strengthen my hands for the work.`,
    reflectionPrompt: `What encouraging sign has God given you recently to keep building?`,
  },
  'min-9': {
    prayer: `Faithful Witness, turn my cynical questions into reverent expectation of the Sun of Righteousness rising.`,
    reflectionPrompt: `Where do you need to replace spiritual apathy with anticipation of Christ's coming?`,
  },

  /* ----------------------  GOSPELS PATH  ---------------------- */
  'gos-1': {
    prayer: `Incarnate Word, as angels proclaimed good news, let my life echo "Glory to God" through humble obedience.`,
    reflectionPrompt: `How does Jesus' humility in birth challenge your view of greatness?`,
  },
  'gos-2': {
    prayer: `Beloved Son, in baptism and wilderness You modeled surrendered sonship. Empower me to resist temptation with written truth.`,
    reflectionPrompt: `Which Scripture will you wield against a recurring temptation?`,
  },
  'gos-3': {
    prayer: `Rabbi Jesus, reshape my values through Beatitudes. Teach me to build on rock by doing Your words.`,
    reflectionPrompt: `Which teaching from the Sermon on the Mount do you sense God asking you to practice today?`,
  },
  'gos-4': {
    prayer: `Shepherd of the Lost, thank You for chasing prodigals. Make my heart celebrate repentance and seek the forgotten.`,
    reflectionPrompt: `Who in your life feels far from God and needs welcoming love?`,
  },
  'gos-5': {
    prayer: `Lord of Power, display Your authority over chaos in my circumstances so others marvel at who You are.`,
    reflectionPrompt: `What storm do you need to invite Jesus to speak "Peace, be still" over?`,
  },
  'gos-6': {
    prayer: `Servant Leader, wash my feet and teach me to serve others with the same grace You've shown me.`,
    reflectionPrompt: `Whose feet (figuratively) can you wash this week?`,
  },
  'gos-7': {
    prayer: `Crucified Savior, thank You for bearing my sin. May the cross crucify my pride and free me to love sacrificially.`,
    reflectionPrompt: `What part of self needs to die so Christ's love can live through you?`,
  },
  'gos-8': {
    prayer: `Risen Lord, breathe peace into my doubts and commission me to make disciples. Empower me by Your Spirit.`,
    reflectionPrompt: `How will resurrection hope shape one conversation today?`,
  },

  /* ----------------------  ACTS PATH  ---------------------- */
  'act-1': {
    prayer: `Spirit of Pentecost, fill me afresh that my words boldly proclaim Jesus across cultural lines.`,
    reflectionPrompt: `Where is God prompting you to witness today?`,
  },
  'act-2': {
    prayer: `Lord of Growth, strengthen me to rejoice when opposition arises, knowing Your word cannot be chained.`,
    reflectionPrompt: `How can you respond to opposition with worship instead of worry?`,
  },
  'act-3': {
    prayer: `God of Transformation, You turned Saul to Paul. Convert my blind spots into blazing testimony of grace.`,
    reflectionPrompt: `What former weakness could become a testimony if surrendered to Christ?`,
  },
  'act-4': {
    prayer: `Breaker of Barriers, help me welcome those I once called "unclean," celebrating Your impartial salvation.`,
    reflectionPrompt: `Who is outside your comfort zone that God may be calling you to love?`,
  },
  'act-5': {
    prayer: `Missionary God, guide my steps like Paul and Barnabas. Let grace, not legalism, define my message.`,
    reflectionPrompt: `Where can you share grace today instead of adding burdens?`,
  },
  'act-6': {
    prayer: `Lord of Open Doors, give Macedonian vision for new fields and songs in midnight prisons.`,
    reflectionPrompt: `What closed door might be redirecting you to a new mission field?`,
  },
  'act-7': {
    prayer: `Spirit of Encouragement, may my friendships deepen like Paul's farewell tears, strengthening others for the race.`,
    reflectionPrompt: `Who encourages your faith, and how can you thank them today?`,
  },
  'act-8': {
    prayer: `Unhindered King, even chains advance the gospel. Grant me resilience to proclaim hope in every trial.`,
    reflectionPrompt: `How can you use your current circumstance—good or hard—for gospel witness?`,
  },

  /* ----------------------  PAULINE EPISTLES  ---------------------- */
  'paul-1': {
    prayer: `God of the Gospel, root me in justification by faith so grace drives holy living.`,
    reflectionPrompt: `How does knowing you are "declared righteous" change today's struggle?`,
  },
  'paul-2': {
    prayer: `Lord of the Church, heal divisions and teach me to love with cross-shaped patience.`,
    reflectionPrompt: `What practical act of love can build unity where you worship?`,
  },
  'paul-3': {
    prayer: `Spirit of Freedom, keep me from adding law to grace. Let Christ be formed in me through faith working by love.`,
    reflectionPrompt: `Where are you tempted to measure worth by performance instead of grace?`,
  },
  'paul-4': {
    prayer: `God of Unity, reveal the height and depth of Christ's love, empowering me to walk in worthy humility.`,
    reflectionPrompt: `How will you guard the unity of the Spirit in your relationships today?`,
  },
  'paul-5': {
    prayer: `Joyful Lord, teach me contentment in all circumstances because to live is Christ and to die is gain.`,
    reflectionPrompt: `What current hardship can become an opportunity for joy?`,
  },
  'paul-6': {
    prayer: `Supreme Christ, let Your pre-eminence dethrone every rival in my mind and habits.`,
    reflectionPrompt: `Which "ism" or distraction competes for Christ's supremacy in you?`,
  },
  'paul-7': {
    prayer: `God of Hope, comfort me with the promise of Your return so I grieve with hope and live with expectancy.`,
    reflectionPrompt: `How does Christ's return shape your use of time today?`,
  },
  'paul-8': {
    prayer: `Steadfast Lord, strengthen my heart against deception and idleness, fixing my eyes on Your faithfulness.`,
    reflectionPrompt: `Where might discouragement be breeding laziness instead of diligence?`,
  },
  'paul-9': {
    prayer: `Guardian of Truth, help me fight the good fight of faith, guarding the gospel with a pure heart and good conscience.`,
    reflectionPrompt: `What false teaching or distraction do you need to confront in love?`,
  },
  'paul-10': {
    prayer: `Grace Instructor, train me to say "No" to ungodliness and "Yes" to good works that adorn the gospel.`,
    reflectionPrompt: `Identify one "good work" the Spirit is prompting you to pursue this week.`,
  },

  /* ----------------------  GENERAL EPISTLES  ---------------------- */
  'genep-1': {
    prayer: `Great High Priest, anchor my drifting heart with the sure hope behind the veil.`,
    reflectionPrompt: `How does Jesus' superior priesthood encourage you to persevere?`,
  },
  'genep-2': {
    prayer: `Lord of Wisdom, make my faith visible through compassionate action and bridled speech.`,
    reflectionPrompt: `What deed of mercy can embody your faith today?`,
  },
  'genep-3': {
    prayer: `God of Hope, empower joyful holiness amid trials, that my life declares Your excellencies.`,
    reflectionPrompt: `How can holiness become a witness in your current hardship?`,
  },
  'genep-4': {
    prayer: `God is Love, help me walk in light and love, discerning truth and overcoming the evil one.`,
    reflectionPrompt: `In which relationship do you need to choose sacrificial love?`,
  },
  'genep-5': {
    prayer: `Lord of Truth, keep me contending for the faith while extending hospitality without fear.`,
    reflectionPrompt: `Where can you combine truth and love for someone today?`,
  },

  /* ----------------------  REVELATION PATH  ---------------------- */
  'rev-1': {
    prayer: `Christ among the Lampstands, refine my witness so Your light burns bright in my church and life.`,
    reflectionPrompt: `What commendation and correction from the seven letters speaks most to you?`,
  },
  'rev-2': {
    prayer: `Throned Lamb, lift my eyes above earthly turmoil to the rainbow-encircled throne where worship never stops.`,
    reflectionPrompt: `How can you join the heavenly chorus in the middle of daily tasks?`,
  },
  'rev-3': {
    prayer: `Sovereign Judge, teach me to trumpet warning and witness, trusting Your measured mercy.`,
    reflectionPrompt: `What aspect of spiritual warfare do these chapters highlight for your prayer life?`,
  },
  'rev-4': {
    prayer: `Righteous King, help me leave Babylon's seduction and worship the pure beauty of holiness.`,
    reflectionPrompt: `Where might worldly allurements be dulling your longing for Christ?`,
  },
  'rev-5': {
    prayer: `Alpha and Omega, hasten the day of new creation. Until then, keep me conquering by the blood of the Lamb and word of testimony.`,
    reflectionPrompt: `What part of Revelation's finale fuels your endurance today?`,
  },
};

// Attach prayers & reflection prompts to any units that are missing them
BIBLE_PATHS.forEach((path) => {
  path.units.forEach((unit) => {
    const devo = UNIT_DEVOTIONS[unit.id];
    if (devo) {
      if (!unit.prayer) unit.prayer = devo.prayer;
      if (!unit.reflectionPrompt) unit.reflectionPrompt = devo.reflectionPrompt;
    }
  });
});

// Exporting the devotions map can help with future tooling/tests if needed
export { UNIT_DEVOTIONS };
