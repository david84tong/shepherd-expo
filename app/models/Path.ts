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
  prayer: string; // Prayer for the unit (optional – injected later if omitted)
  reflectionPrompt: string; // Reflection prompt (optional – injected later if omitted)
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
  Psalm: 19,
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
          "God speaks the cosmos into being and crowns it with image‑bearing humans. In Eden they are invited to trust the Creator's wisdom or define good and evil for themselves.",
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
          "Waters of judgment cleanse a corrupt world, yet grace carries Noah's family to a new start. A rainbow covenant promises that God's long‑range plan is redemption, not destruction.",
        icon: 'water',
        prayer: `Lord, You saved Noah and his family. Thank You for rescuing me too. Help me walk with You even when others don't.`,
        reflectionPrompt: `What small "ark" of obedience can I build today to stay close to God?`,
      },
      {
        id: 'gen-4',
        title: 'Nations & Babel',
        reference: createRef('Genesis', generateChapters(10, 11)),
        description:
          'Humanity scatters into distinct peoples after a prideful tower‑project. Out of the confusion God calls one man, Abram, to become a blessing to all nations.',
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
      /* ----------  🔄  UPDATED SPLIT HERE  ---------- */
      {
        id: 'gen-6',
        title: "Isaac's Family",
        reference: createRef('Genesis', generateChapters(18, 24)),          // ⬅️  now a standalone long chapter
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
          "Years of exile, marriage, and family drama refine Jacob's character. A mysterious night‑wrestling match prepares him to face Esau and reclaim his new name—Israel.",
        icon: 'walk',
        prayer: `God Who Wrestles, thank You that You meet me in the dark nights of fear. As Jacob limped toward daylight with a new name, mark me with humble dependence that clings to Your blessing.`,
        reflectionPrompt: `What personal struggle could become a place of deeper encounter with God if you hold on to Him?`,
      },
      {
        id: 'gen-9',
        title: 'Joseph: Dreams to Dungeon',
        reference: createRef('Genesis', generateChapters(34, 41)),
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
    ]
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
      /* 1 ─ Bondage & Moses’ Birth ─ Ex 1‑4  (unchanged) */
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
    
      /* 2 ─ Nine Plagues & Final Warning ─ Ex 5‑11  (range widened to include ch 11) */
      {
        id: 'exo-2',
        title: 'Nine Plagues & Final Warning',
        reference: createRef('Exodus', generateChapters(5, 11)),
        description:
          "Nine escalating plagues expose Egypt's gods as powerless. Pharaoh's last refusal after the plague‑warning of chapter 11 hardens his heart for the climactic judgment to come.",
        icon: 'warning',
        prayer: `Lord of Signs and Wonders, Your power shamed Egypt's idols. Expose the false gods in my own culture and heart. Let my trust rest in Your unmatched authority.`,
        reflectionPrompt: `What modern "plague" might God be using to reveal misplaced trust in your life?`,
      },
    
      /* 3 ─ Passover Night ─ Ex 12  (stand‑alone long chapter) */
      {
        id: 'exo-3',
        title: 'Passover Night',
        reference: createRef('Exodus', [12]),
        description:
          "Blood on door‑frames turns judgment into deliverance. The Passover lamb establishes a perpetual memorial of redemption and foreshadows a greater rescue still to come.",
        icon: 'flame',
        prayer: `Passover Lamb, thank You that Your blood marks my rescue. Keep me mindful that freedom always starts at a door stained with grace.`,
        reflectionPrompt: `Which daily practice can help you remember and rehearse redemption?`,
      },
    
      /* 3b ─ Red Sea & Victory Song ─ Ex 13‑15 */
      {
        id: 'exo-3b',
        title: 'Red Sea & Victory Song',
        reference: createRef('Exodus', generateChapters(13, 15)),
        description:
          'A pillar of cloud leads the march; walls of water open and then close over pursuing armies. Miriam’s tambourine rings as the people sing, “The LORD is my strength and my song.”',
        icon: 'water',
        prayer: `Sea‑Path Maker, part the impossible before me and drown every lingering fear in Your sovereign grace.`,
        reflectionPrompt: `What area of life still feels pursued by “pharaoh,” and how can you plant your feet in God’s finished salvation?`,
      },
    
      /* 4 ─ Wilderness Provision ─ Ex 16‑18  (unchanged) */
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
    
      /* 5 ─ Sinai & Ten Words ─ Ex 19‑24  (unchanged) */
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
    
      /* 6 ─ Tabernacle Blueprint ─ Ex 25‑31  (unchanged) */
      {
        id: 'exo-6',
        title: 'Tabernacle Blueprint',
        reference: createRef('Exodus', generateChapters(25, 31)),
        description:
          'Detailed designs reveal that God intends to dwell among His people. Every measurement, fabric, and furnishing is a portable echo of Eden.',
        icon: 'home',
        prayer: `Immanuel, You desire to dwell among us. Prepare the tabernacle of my heart—every detail offered for Your glory.`,
        reflectionPrompt: `What “fabric or furnishing” of your daily rhythm needs rearranging to host God's presence?`,
      },
    
      /* 7 ─ Golden Calf & Renewal ─ Ex 32‑34  (unchanged) */
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
    
      /* 8 ─ Tabernacle Completed ─ Ex 35‑40  (unchanged) */
      {
        id: 'exo-8',
        title: 'Tabernacle Completed',
        reference: createRef('Exodus', generateChapters(35, 40)),
        description:
          "Skilled artisans follow God's pattern precisely. The cloud and fiery glory move in, signaling that Israel's King has taken up residence.",
        icon: 'home',
        prayer: `Faithful Finisher, You filled the completed tabernacle with glory. Complete the good work begun in me so Your presence shines through everything I build.`,
        reflectionPrompt: `Where do you sense God inviting excellence and faithfulness to “finish the work” He assigned?`,
      },
    ]
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
      /* 1 ─ Offerings & Consecration ─ Lev 1‑5 */
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
    
      /* 2 ─ Priesthood & Purity ─ Lev 6‑10 */
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
    
      /* 3 ─ Atonement & Ethics ─ Lev 16‑19 */
      {
        id: 'wild-3',
        title: 'Atonement & Ethics',
        reference: createRef('Leviticus', generateChapters(16, 19)),
        description:
          'The Day of Atonement purges both sanctuary and people once a year. Immediately God links forgiveness to everyday justice and neighbor‑love.',
        icon: 'heart',
        prayer: `Forgiving Judge, on the Day of Atonement You covered sin and cleansed the camp. Cover my conscience and empower me to love my neighbor as myself.`,
        reflectionPrompt: `Who is God calling you to reconcile with as evidence of forgiven life?`,
      },
    
      // 4a ─ Festivals of Rest ─ Lev 23‑24 
      {
        id: 'wild-4',
        title: 'Festivals of Rest',
        reference: createRef('Leviticus', generateChapters(23, 24)),
        description:
          'Sabbaths and yearly feasts weave worship into Israel’s calendar, reminding the nation that time itself belongs to Yahweh.',
        icon: 'calendar',
        prayer: `Lord of Sabbaths, teach me to pause regularly and remember that all my days are Yours.`,
        reflectionPrompt: `Which feast‑like rhythm could you add to celebrate God’s faithfulness this week?`,
      },
    
      /* 4b ─ Jubilee — Debts Released ─ Lev 25 (stand‑alone long chapter) */
      {
        id: 'wild-4b',
        title: 'Jubilee — Debts Released',
        reference: createRef('Leviticus', [25]),
        description:
          'Every fiftieth year land returns, slaves go free, and economic resets proclaim divine ownership and mercy for the poor.',
        icon: 'cash',
        prayer: `Liberating God, let jubilee shape my view of possessions and people, loosening my grip and lifting the poor.`,
        reflectionPrompt: `Where can you practise jubilee generosity today?`,
      },
    
      /* 4c ─ Blessings, Curses & Vows ─ Lev 26‑27 */
      {
        id: 'wild-4c',
        title: 'Blessings, Curses & Vows',
        reference: createRef('Leviticus', generateChapters(26, 27)),
        description:
          'Covenant blessings invite obedience; terrifying curses warn against rebellion. Final vows underline that everything can be consecrated to God.',
        icon: 'alert',
        prayer: `Faithful Judge, engrave on my heart both the sweetness of obedience and the seriousness of rebellion.`,
        reflectionPrompt: `Which small act of obedience could invite fresh blessing into your sphere?`,
      },
    
      /* 5a ─ Tribal Census Begins ─ Num 1 (stand‑alone long chapter) */
      {
        id: 'wild-5',
        title: 'Tribal Census Begins',
        reference: createRef('Numbers', [1]),
        description:
          'Moses counts every able‑bodied warrior, showing that God values each name in His army.',
        icon: 'people',
        prayer: `Commander of Hosts, remind me my name is counted and my role matters in Your mission.`,
        reflectionPrompt: `How does knowing you are “counted” by God affect your sense of purpose today?`,
      },
    
      /* 5b ─ Camp Arrangement & Levites ─ Num 2‑4 */
      {
        id: 'wild-5b',
        title: 'Camp Arrangement & Levites',
        reference: createRef('Numbers', generateChapters(2, 4)),
        description:
          'Tribes encamp around the tabernacle like spokes around a hub, and Levites are assigned to carry holy things.',
        icon: 'navigate',
        prayer: `God of Order, center my life around Your presence rather than my preferences.`,
        reflectionPrompt: `What practical re‑centering could you do to keep God at the hub of your routines?`,
      },
    
      /* 6 ─ Complaints & Spies ─ Num 11‑14  (unchanged) */
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
    
      /* 7 ─ Balaam’s Oracles ─ Num 22‑24  (unchanged) */
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
    
      /* 8a ─ Seduction at Peor ─ Num 25 */
      {
        id: 'wild-8',
        title: 'Seduction at Peor',
        reference: createRef('Numbers', [25]),
        description:
          'Moabite idolatry and immorality provoke deadly judgment, exposing how spiritual unfaithfulness endangers the whole community.',
        icon: 'flame',
        prayer: `Jealous God, guard my heart from attractions that lure me away from covenant loyalty.`,
        reflectionPrompt: `What “small flirtation” with sin needs decisive action today?`,
      },
    
      /* 8b ─ Second Census ─ Num 26 (stand‑alone long chapter) */
      {
        id: 'wild-8b',
        title: 'Second Census — New Generation',
        reference: createRef('Numbers', [26]),
        description:
          'After wilderness deaths, a fresh generation is numbered—evidence that failure is not final and promise still stands.',
        icon: 'list',
        prayer: `Generational God, thank You that You raise up new starters to fulfil Your promise.`,
        reflectionPrompt: `How can you invest hope in the next generation today?`,
      },
    
      /* 8c ─ Inheritance & Vows ─ Num 27‑30 */
      {
        id: 'wild-8c',
        title: 'Inheritance & Vows',
        reference: createRef('Numbers', generateChapters(27, 30)),
        description:
          'Zelophehad’s daughters secure land rights, Joshua is commissioned, daily offerings are detailed, and vows are regulated—justice and worship intertwine.',
        icon: 'document-text',
        prayer: `Impartial Judge, ensure my decisions honour the overlooked and uphold Your just character.`,
        reflectionPrompt: `Who in your sphere might feel overlooked and needs advocacy?`,
      },
    
      /* 8d ─ War against Midian ─ Num 31 (stand‑alone long chapter) */
      {
        id: 'wild-8d',
        title: 'War against Midian',
        reference: createRef('Numbers', [31]),
        description:
          'Israel executes judgment on Midian; purity laws guard soldiers and spoils alike, and commanders give a gratitude offering for zero casualties.',
        icon: 'shield',
        prayer: `Holy Warrior, teach me to fight spiritual battles while guarding purity of heart.`,
        reflectionPrompt: `What battle requires both courage and consecration from you?`,
      },
    
      /* 9 ─ Moses’ First Farewell ─ Deut 1‑6  (unchanged) */
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
    
      /* 10a ─ Covenant Ceremony ─ Deut 27 */
      {
        id: 'wild-10',
        title: 'Covenant Ceremony',
        reference: createRef('Deuteronomy', [27]),
        description:
          'Stones plastered with Torah and antiphonal shouts of “Amen” set the stage for blessing and curse on Israel’s entry into the land.',
        icon: 'hammer',
        prayer: `Covenant Lord, write Your words plainly before my eyes so my obedience is both public and personal.`,
        reflectionPrompt: `What visible reminder of God’s word could you place in your daily environment?`,
      },
    
      /* 10b ─ Blessings & Curses ─ Deut 28 (stand‑alone long chapter) */
      {
        id: 'wild-10b',
        title: 'Blessings & Curses',
        reference: createRef('Deuteronomy', [28]),
        description:
          'A breathtaking panorama of favour for obedience contrasts with escalating curses for rebellion—setting life and death before Israel.',
        icon: 'alert',
        prayer: `Just Judge, let holy warnings awaken me quickly rather than harden me slowly.`,
        reflectionPrompt: `What small warning sign is God using to call you back today?`,
      },
    
      /* 10c ─ Choose Life ─ Deut 29‑30 */
      {
        id: 'wild-10c',
        title: 'Choose Life',
        reference: createRef('Deuteronomy', generateChapters(29, 30)),
        description:
          'Moses calls heaven and earth as witnesses that real hope lies in a circumcised heart and a conscious choice of life over death.',
        icon: 'heart',
        prayer: `Life‑Giving God, incline my heart to choose life so descendants may live and love You wholeheartedly.`,
        reflectionPrompt: `Which daily choice today will steer your heart toward life?`,
      },
    
      /* 11 ─ Moses’ Farewell ─ Deut 31‑34  (unchanged) */
      {
        id: 'wild-11',
        title: "Moses' Farewell",
        reference: createRef('Deuteronomy', generateChapters(31, 34)),
        description:
          "Joshua is commissioned as successor, and Moses views the land from Nebo's peak. The greatest prophet is buried by God Himself, awaiting a greater one to come.",
        icon: 'person',
        prayer: `Sovereign Redeemer, teach me to finish well—passing leadership and songs of blessing to those after me.`,
        reflectionPrompt: `Who are you intentionally mentoring to carry the mission beyond your years?`,
      },
    ]
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
        prayer: `Faithful Judge, cycles of compromise reveal my need for a Savior‑King. Deliver me from apathy and raise zeal for wholehearted devotion.`,
        reflectionPrompt: `Which recurring sin cycle do you need to surrender to the true Judge today?`,
      },
    
      /*─── 1 Samuel ─────────────────────────────────────────────*/
      {
        id: 'kp-3',
        title: 'Rise of Saul (Part 1)',
        reference: createRef('1 Samuel', generateChapters(8, 13)),
        description:
          'Israel demands a king and Saul is anointed; early victories reveal potential, yet cracks of insecurity already show.',
        icon: 'trending-up',
        prayer: `King of Kings, guard my heart from Saul‑like insecurity. Teach me to value obedience over outward success.`,
        reflectionPrompt: `Where are you tempted to sacrifice appearance for obedience?`,
      },
      {
        id: 'kp-3b',
        title: 'Rash Vow & Continued Battles',
        reference: createRef('1 Samuel', [14]),
        description:
          "Saul's hasty oath starves troops; Jonathan's honey test exposes leadership folly yet God grants victory.",
        icon: 'warning',
        prayer: `Wise King, guard my tongue from rash vows that burden others; make my leadership life‑giving.`,
        reflectionPrompt: `What spoken commitment might you need to revisit or release because it hinders others?`,
      },
    
      {
        id: 'kp-4',
        title: 'Saul Rejected & David Anointed',
        reference: createRef('1 Samuel', generateChapters(15, 16)),
        description:
          'Saul loses the kingdom through disobedience while God selects a shepherd boy, proving He looks at the heart, not stature.',
        icon: 'person',
        prayer: `Searcher of Hearts, form in me a spirit that treasures obedience above image and applause.`,
        reflectionPrompt: `What hidden motive needs surrender so God can shape your heart?`,
      },
      {
        id: 'kp-4b',
        title: 'Sling, Stone & Sudden Victory',
        reference: createRef('1 Samuel', [17]),
        description:
          'Rejecting armour and embracing covenant confidence, David runs toward danger; one well‑aimed stone topples terror and ignites national faith.',
        icon: 'flash',
        prayer: `Champion Deliverer, teach me to fight with proven trust, not borrowed methods. Use little things wielded in faith for great victories.`,
        reflectionPrompt: `Which “simple sling”—ordinary gift or habit—could God use powerfully if you run toward the battle?`,
      },
      {
        id: 'kp-4c',
        title: 'Jealousy & Wilderness Escape',
        reference: createRef('1 Samuel', generateChapters(18, 21)),
        description:
          'Royal jealousy forces David into exile; covenant friendship and cave seasons become training grounds for a future king.',
        icon: 'footsteps',
        prayer: `Refuge in Wilderness, shape me like David in hidden places—forming character before crown.`,
        reflectionPrompt: `How can patience in obscurity prepare you for future influence?`,
      },
    
      /*─── 2 Samuel ─────────────────────────────────────────────*/
      {
        id: 'kp-5',
        title: "David's Reign",
        reference: createRef('2 Samuel', generateChapters(1, 7)),
        description:
          'Jerusalem becomes capital and God promises an eternal dynasty. Yet private sin will soon threaten public peace.',
        icon: 'ribbon',
        prayer: `Covenant Keeper, Your promise to David finds “Yes” in Jesus. Keep my private life pure so public witness stays bright.`,
        reflectionPrompt: `Bring one hidden area into God’s light today—what step will you take?`,
      },
    
      /*─── 1 Kings 1‑7 ──────────────────────────────────────────*/
      {
        id: 'kp-6',
        title: 'Solomon & Temple',
        reference: createRef('1 Kings', generateChapters(1, 7)),
        description:
          "Wisdom, wealth, and worship reach their zenith as the temple is dedicated. Sadly Solomon's many marriages plant seeds of idolatry.",
        icon: 'business',
        prayer: `God of Wisdom, grant me a discerning heart like Solomon's, yet keep me from divided loyalties.`,
        reflectionPrompt: `What competing affection might be quietly turning your heart from undivided devotion?`,
      },
      {
        id: 'kp-7',
        title: 'Kingdom Divides',
        reference: createRef('1 Kings', generateChapters(12, 16)),
        description:
          'Harsh policies split the kingdom into Israel and Judah. Golden calves at Dan and Bethel institutionalize covenant breach.',
        icon: 'git-branch',
        prayer: `Unifying Lord, heal divisions in Your church and my relationships.`,
        reflectionPrompt: `Which conversation could you initiate to sow reconciliation where there's division?`,
      },
    
      /*─── Elijah & Elisha ──────────────────────────────────────*/
      {
        id: 'kp-8',
        title: 'Elijah by the Brook',
        reference: createRef('1 Kings', [17]),
        description:
          "Drought grips the land while God sustains Elijah through ravens and a widow's last flour—proving His care amid crisis.",
        icon: 'water',
        prayer: `Provider God, teach me to trust daily bread in seasons of scarcity.`,
        reflectionPrompt: `Where is God asking you to rely on His provision one day at a time?`,
      },
      {
        id: 'kp-8b',
        title: 'Fire on Mount Carmel',
        reference: createRef('1 Kings', [18]),
        description:
          'A soaked altar and a 63‑word prayer call down fire, silencing Baal and turning Israel’s heart back to Yahweh.',
        icon: 'flame',
        prayer: `God Who Answers by Fire, set my life ablaze so others see Your reality.`,
        reflectionPrompt: `Where is God calling you to stand publicly for His honor?`,
      },
      {
        id: 'kp-8c',
        title: 'Whisper & Whirlwind',
        reference: createRef('1 Kings', generateChapters(19, 22)),
        description:
          'Exhausted Elijah meets God in a gentle whisper, commissions Elisha, and confronts Ahab—showing that grace follows even the boldest victories.',
        icon: 'wind',
        prayer: `Gentle Whisperer, speak hope into my burnout and recommission me for future battles.`,
        reflectionPrompt: `How can solitude help you hear God’s whisper after intense service?`,
      },
    
      /*─── Exile Narratives ─────────────────────────────────────*/
      {
        id: 'kp-9',
        title: 'Assyrian Exile',
        reference: createRef('2 Kings', generateChapters(17, 19)),
        description:
          "Relentless idolatry ends in Samaria's fall and deportation. Hezekiah's faith momentarily stays Assyria's hand against Judah.",
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
        reflectionPrompt: `How can you practise faithful presence in a place that feels like exile?`,
      },
    ]
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
        description:
          'When dangers loom, these prayers model confident refuge in the Lord.',
        icon: 'shield',
        prayer: `My Refuge and Fortress, when foundations shake, hide me in Your presence until the storm passes.`,
        reflectionPrompt: `Recall a present fear. How can you verbalize trust like the psalmist?`,
      },
      {
        id: 'psw-3',
        title: 'Creation & Torah',
        reference: createRef('Psalms', generateChapters(19, 24)),
        description:
          `The skies proclaim glory while God's perfect law revives the soul.`,
        icon: 'sunny',
        prayer: `Creator and Lawgiver, let the heavens' song and Torah's perfection revive my soul, leading me to hidden‑fault repentance.`,
        reflectionPrompt: `How does creation currently invite you to praise the Creator?`,
      },
      {
        id: 'psw-4',
        title: 'Fret Not Evil',
        reference: createRef('Psalms', generateChapters(37, 41)),
        description:
          'Patience and generosity outlast the temporary triumph of evildoers.',
        icon: 'time',
        prayer: `God of Justice, teach me to fret not over evildoers but to dwell in the land cultivating faithfulness.`,
        reflectionPrompt: `Where is envy towards the wicked stealing your peace?`,
      },
      {
        id: 'psw-5',
        title: 'True Wealth',
        reference: createRef('Psalms', generateChapters(49, 53)),
        description:
          'Riches cannot ransom a soul; eternal perspective is real security.',
        icon: 'cash',
        prayer: `Lord, remind me that wealth cannot redeem a soul. Anchor my security in eternity, not possessions.`,
        reflectionPrompt: `How might generosity loosen the grip of materialism in your life?`,
      },
      {
        id: 'psw-6',
        title: 'Wisdom in Adversity',
        reference: createRef('Psalms', generateChapters(90, 94)),
        description:
          'Moses teaches us to number our days; laments become declarations of faith.',
        icon: 'calendar',
        prayer: `Everlasting God, teach me to number my days that I may gain a heart of wisdom even amid adversity.`,
        reflectionPrompt: `What would "numbering your days" change about today's priorities?`,
      },
      {
        id: 'psw-7',
        title: 'Delighting in the Word',
        reference: createRef('Psalms', [119]),
        description:
          'An alphabet of devotion exalts Scripture as light, life, and liberty.',
        icon: 'book',
        prayer: `Spirit of Truth, open my eyes to wondrous things in Your law; let Your Word be sweeter than honey to me.`,
        reflectionPrompt: `Which verse recently lit up for you, and how will you live it out?`,
      },
      {
        id: 'psw-8',
        title: 'Final Hallelujahs',
        reference: createRef('Psalms', generateChapters(145, 150)),
        description:
          'Wise living crescendos in universal praise—let everything that has breath!',
        icon: 'musical-notes',
        prayer: `Great King, let everything that has breath in me praise You—may my final word today be hallelujah.`,
        reflectionPrompt: `List three reasons to praise God right now; how will you vocalize them?`,
      },
      {
        id: 'psw-9',
        title: 'Fear of the LORD',
        reference: createRef('Proverbs', generateChapters(1, 4)),
        description:
          'Solomon opens with parental appeals: the fear of the LORD is the starting line for all wisdom.',
        icon: 'alert',
        prayer: `Holy One, anchor every choice I make in reverent awe of who You are; let true wisdom begin with worship.`,
        reflectionPrompt: `Which decision before you right now most needs to start with “the fear of the LORD”?`,
      },
      {
        id: 'psw-10',
        title: 'Words That Heal',
        reference: createRef('Proverbs', generateChapters(10, 12)),
        description:
          'Contrasts of the righteous and wicked spotlight the tongue—gentle speech is a tree of life; careless talk crushes spirits.',
        icon: 'chatbubble',
        prayer: `Word‑Giver, guard my lips today so every sentence becomes medicine, not poison.`,
        reflectionPrompt: `Before your next conversation, ask: will these words heal or harm?`,
      },
      {
        id: 'psw-11',
        title: 'Diligence & Sloth',
        reference: createRef('Proverbs', generateChapters(24, 27)),
        description:
          'Ants, vineyards, and sharpened iron illustrate that steady diligence and wise friendships lead to lasting fruit.',
        icon: 'hammer',
        prayer: `Master Craftsman, deliver me from lazy excuses; sharpen me through faithful work and iron‑sharpening friends.`,
        reflectionPrompt: `Identify one task you’ve been delaying—what first faithful step can you take today?`,
      }
    ]
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
        reflectionPrompt: `Where do you sense God asking “Whom shall I send?”—and what is your response?`,
      },
      {
        id: 'maj-2',
        title: 'Isaiah: The Servant',
        reference: createRef('Isaiah', generateChapters(40, 46)),
        description:
          'Exile skies turn silky with promises of a highway home. Four servant songs climax in a wounded healer who bears others’ sins.',
        icon: 'bandage',
        prayer: `Servant‑King Jesus, wounded for our transgressions, teach me to mirror servant humility and hope to weary exiles.`,
        reflectionPrompt: `Which facet of the Servant’s character do you need to embody today?`,
      },
      {
        id: 'maj-3',
        title: 'Jeremiah: Early Oracles',
        reference: createRef('Jeremiah', generateChapters(1, 6)),
        description:
          'A reluctant youth receives a mission to uproot and to plant. Almond branch and boiling‑pot visions frame looming Babylonian invasion.',
        icon: 'megaphone',
        prayer: `Potter of Nations, shape my words and life to uproot lies and plant truth, even when unpopular.`,
        reflectionPrompt: `What truth are you hesitating to speak out of fear?`,
      },
      {
        id: 'maj-4',
        title: 'Jeremiah: Laments & New Covenant',
        reference: createRef('Jeremiah', generateChapters(18, 23)),
        description:
          'Confessions pour out as the prophet wrestles with loneliness and danger, yet amid tears he announces a covenant written on hearts, not stone.',
        icon: 'sad',
        prayer: `Man of Sorrows, in lament You are near. Anchor me in the hope of a heart‑written covenant.`,
        reflectionPrompt: `Bring one unresolved pain before God—what lament and hope will you voice?`,
      },
      {
        id: 'maj-5',
        title: 'Ezekiel: Wheels & Glory',
        reference: createRef('Ezekiel', generateChapters(1, 7)),
        description:
          'Exiles by the Kebar River behold a storm‑throne vision beyond imagination. Judgment oracles explain why God’s glory departs the temple.',
        icon: 'aperture',
        prayer: `Glorious One, wheels within wheels proclaim Your sovereignty. Expand my vision of Your holiness until idols crumble.`,
        reflectionPrompt: `How does a bigger view of God transform a current worry?`,
      },
      {
        id: 'maj-6',
        title: 'Ezekiel: New Hope',
        reference: createRef('Ezekiel', generateChapters(36, 39)),
        description:
          'Dry bones rattle back to life, picturing national resurrection. A future Davidic shepherd and a decisive victory over Gog seal the promise.',
        icon: 'expand',
        prayer: `Breath of Life, speak to valley bones. Revive dead hopes and set me under the care of the Good Shepherd‑Prince.`,
        reflectionPrompt: `Where do you need to invite God’s breath to resurrect dry bones in your life?`,
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
      {
        id: 'maj-8',
        title: 'Jeremiah: Fallen Babylon',
        reference: createRef('Jeremiah', [51]),
        description:
          'Jeremiah foresees a winnowing wind that will scatter proud Babylon, repaying her for all she has done to Zion.',
        icon: 'airplane',
        prayer: `Righteous Judge, guard my heart from Babylonian pride and align me with Your coming justice.`,
        reflectionPrompt: `Where is subtle pride inviting God’s opposition in your life?`,
      },
      {
        id: 'maj-9',
        title: 'Ezekiel: Abandoned Child Adopted',
        reference: createRef('Ezekiel', [16]),
        description:
          'Jerusalem is pictured as a newborn discarded in blood until God passes by, cleanses, and claims her as His own—only for her to squander His love.',
        icon: 'heart',
        prayer: `Adopting God, thank You for finding me in my filth and clothing me with dignity. Keep my heart from turning Your gifts into idols.`,
        reflectionPrompt: `Which blessing are you tempted to treasure above the Giver?`,
      },
      {
        id: 'maj-10',
        title: 'Lamentations: Morning Mercies',
        reference: createRef('Lamentations', [3]),
        description:
          'Amid ruins, a sunrise: steadfast love never ceases; mercies rise with each dawn inviting quiet hope.',
        icon: 'sunny',
        prayer: `Merciful Father, turn my eyes from ashes to the horizon of Your unfailing love today.`,
        reflectionPrompt: `How can you practise recalling mercies when memories hurt?`,
      },
    ]
    
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
        title: 'Announcements & Prophecies',
        reference: createRef('Luke', generateChapters(1, 1)),
        description:
          'Gabriel visits Zechariah and Mary; prophetic songs erupt with hope for Israel. The long-awaited sunrise is about to break.',
        icon: 'megaphone',
        prayer: `God of Promise, open my ears like Mary to say, "Let it be to me according to Your word."`,
        reflectionPrompt: `Which promise from Luke 1 fuels your faith today?`,
      },
      {
        id: 'gos-1b',
        title: 'Nativity & Childhood',
        reference: createRef('Luke', generateChapters(2, 2)),
        description:
          'Angels announce good news to shepherds; Simeon and Anna bless the infant Messiah; twelve-year-old Jesus amazes teachers in the temple.',
        icon: 'star',
        prayer: `Incarnate Word, let the wonder of Your birth ignite fresh praise and child-like trust in my heart.`,
        reflectionPrompt: `What aspect of the nativity story moves you to worship?`,
      },
      {
        id: 'gos-1c',
        title: 'Preparation & Baptism',
        reference: createRef('Luke', generateChapters(3, 3)),
        description:
          'John calls for repentance; crowds are baptized; heaven opens as the Father affirms His beloved Son and the Spirit descends.',
        icon: 'water',
        prayer: `Purifying Fire, prepare my heart for Your kingdom and plunge me into Your renewing Spirit.`,
        reflectionPrompt: `How can you bear "fruit in keeping with repentance" this week?`,
      },
      {
        id: 'gos-2',
        title: 'Baptism & Temptation',
        reference: createRef('Matthew', generateChapters(1, 3)),
        description:
          'From genealogy to Jordan: Matthew traces royal roots, John baptizes, and Jesus resists wilderness temptation—launching His public mission.',
        icon: 'water',
        prayer: `Beloved Son, as You rose from Jordan waters and faced desert trials, steady my identity in the Father and arm me with living Scripture.`,
        reflectionPrompt: `Where is the Spirit inviting you to stand on identity rather than performance?`,
      },
      {
        id: 'gos-2b',
        title: 'Early Ministry & Beatitudes',
        reference: createRef('Matthew', generateChapters(4, 5)),
        description:
          'Galilean light dawns as disciples are called. Crowds gather on a hillside to hear kingdom upside-down blessings known as the Beatitudes.',
        icon: 'people',
        prayer: `King of the Kingdom, form poverty of spirit and pure heart in me that I may inherit the blessed life You describe.`,
        reflectionPrompt: `Which Beatitude feels most counter-cultural to you today?`,
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
        title: 'Authority & Healing',
        reference: createRef('Mark', generateChapters(1, 3)),
        description:
          'Mark races through healings, exorcisms, and table fellowship—immediately showcasing a Messiah with unrivaled authority.',
        icon: 'flash',
        prayer: `Lord of Power, display Your authority over chaos in my circumstances so others marvel at who You are.`,
        reflectionPrompt: `What storm do you need to invite Jesus to speak "Peace, be still" over?`,
      },
      {
        id: 'gos-5b',
        title: 'Parables & Storms',
        reference: createRef('Mark', generateChapters(4, 5)),
        description:
          `Seed parables hint at hidden kingdom growth. Then wind and waves—and even legions of demons—bow to Jesus' command.`,
        icon: 'boat',
        prayer: `Seed-Sowing Savior, grow quiet fruit in me and calm every inner sea that still resists Your word.`,
        reflectionPrompt: `Which small seed of obedience could God multiply in your life?`,
      },
      {
        id: 'gos-6',
        title: 'Triumphal Entry & Foot-washing',
        reference: createRef('John', generateChapters(12, 13)),
        description:
          'Hosanna shouts usher Jesus into Jerusalem; in an upper-room shock, He washes dusty feet, redefining greatness as service.',
        icon: 'home',
        prayer: `Servant King, cleanse my pride and teach me to take the towel for those around me.`,
        reflectionPrompt: `Whose feet (figuratively) can you wash this week?`,
      },
      {
        id: 'gos-6b',
        title: 'Farewell & Vine',
        reference: createRef('John', generateChapters(14, 15)),
        description:
          'Comforting promises of Spirit and home intertwine with the call to abide in the true Vine and love one another deeply.',
        icon: 'leaf',
        prayer: `True Vine, graft me into Your life so that abiding love bears lasting fruit.`,
        reflectionPrompt: `What practice helps you remain in Christ's love today?`,
      },
      {
        id: 'gos-6c',
        title: 'Spirit & High-Priestly Prayer',
        reference: createRef('John', generateChapters(16, 17)),
        description:
          'Jesus promises the Spirit who guides into truth and prays that future believers would be one as the Trinity is one.',
        icon: 'cloud',
        prayer: `Interceding Savior, let Your prayer for unity and Spirit-led truth find an answered "Amen" in my life.`,
        reflectionPrompt: `How can you pursue unity with another believer this week?`,
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
        title: 'Joel: Day of the LORD',
        reference: createRef('Joel', generateChapters(1, 3)),
        description:
          'Locust devastation becomes a sermon on cosmic reckoning. Yet God also pledges an outpoured Spirit for all flesh.',
        icon: 'sunny',
        prayer: `God of the Day of the LORD, turn my alarm into repentance and my repentance into renewal by Your Spirit.`,
        reflectionPrompt: `What locust‑eaten place of loss needs God's promised restoration?`,
      },
      {
        id: 'min-3',
        title: 'Amos: Justice Rolls',
        reference: createRef('Amos', generateChapters(1, 4)),
        description:
          'A shepherd‑prophet targets affluent complacency with roaring indictments. True worship must overflow in righteousness.',
        icon: 'scale',
        prayer: `God of Justice, let righteousness roll like a river through my life. Break complacency and align my worship with compassion.`,
        reflectionPrompt: `How can you practise justice for the marginalized this week?`,
      },
      {
        id: 'min-4',
        title: 'Micah: Justice & Hope',
        reference: createRef('Micah', generateChapters(1, 5)),
        description:
          "Rural Micah challenges urban corruption and foretells Bethlehem's ruler. The call to do justice, love mercy, and walk humbly rings out.",
        icon: 'shield',
        prayer: `Humble King, teach me to act justly, love mercy, and walk humbly with You in every arena of life.`,
        reflectionPrompt: `Which of those three actions feels most challenging right now?`,
      },
      {
        id: 'min-5',
        title: 'Habakkuk: Faith in Crisis',
        reference: createRef('Habakkuk', generateChapters(1, 3)),
        description:
          'A prophet argues with God about unanswered violence. By the end he sings: “The righteous will live by faith.”',
        icon: 'help',
        prayer: `Mighty Savior, refine me with holy fire and quiet me with singing love.`,
        reflectionPrompt: `What impurity is God revealing that His refining fire can remove?`,
      },
      {
        id: 'min-6',
        title: 'Zephaniah: Purifying Fire',
        reference: createRef('Zephaniah', generateChapters(1, 3)),
        description:
          'Sweeping day‑of‑the‑LORD announcements purge earth and sky. Yet a humble remnant will sing as God rejoices over them.',
        icon: 'flame',
        prayer: `Purifying Fire, sweep away the dross and impurities from my life.`,
        reflectionPrompt: `What area of your life needs to be purified and renewed by God’s Spirit?`,
      },
      {
        id: 'min-7',
        title: 'Haggai & Zechariah: Build the House',
        reference: [
          createRef('Haggai', generateChapters(1, 2)),
          createRef('Zechariah', [1]),
        ],
        description:
          'Returned exiles stall on rebuilding the temple until prophetic urgency stirs them. Initial night visions confirm that angel armies stand behind the project.',
        icon: 'home',
        prayer: `Builder of the House, stir my spirit to prioritise Your temple over personal paneled houses.`,
        reflectionPrompt: `How can you invest time or resources in God’s kingdom project this week?`,
      },
      {
        id: 'min-8',
        title: 'Zechariah: Glory Visions',
        reference: createRef('Zechariah', generateChapters(2, 4)),
        description:
          'Flying scrolls, lampstands, and a crowned high priest forecast messianic triumph. Jerusalem’s future extends far beyond walls of stone.',
        icon: 'eye',
        prayer: `Lord of Hosts, through night visions assure me that You stand behind Your people. Strengthen my hands for the work.`,
        reflectionPrompt: `What encouraging sign has God given you recently to keep building?`,
      },
      {
        id: 'min-9',
        title: 'Malachi: Final Word',
        reference: createRef('Malachi', generateChapters(1, 4)),
        description:
          'A skeptical post‑exilic community is confronted about tithes, divorce, and apathy. The closing promise of Elijah hints at the coming of John the Baptist.',
        icon: 'mail',
        prayer: `Faithful Witness, turn my cynical questions into reverent expectation of the Sun of Righteousness rising.`,
        reflectionPrompt: `Where do you need to replace spiritual apathy with anticipation of Christ’s coming?`,
      },
    ]
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
        id: 'gos-1',
        title: 'Announcements & Prophecies',
        reference: createRef('Luke', [1]),
        description:
          'Gabriel visits Zechariah and Mary; prophetic songs erupt with hope for Israel. The long‑awaited sunrise is about to break.',
        icon: 'megaphone',
        prayer: `God of Promise, open my ears like Mary to say, “Let it be to me according to Your word.”`,
        reflectionPrompt: `Which promise from Luke 1 fuels your faith today?`,
      },
      {
        id: 'gos-1b',
        title: 'Nativity & Childhood',
        reference: createRef('Luke', [2]),
        description:
          'Angels announce good news to shepherds; Simeon and Anna bless the infant Messiah; twelve‑year‑old Jesus amazes teachers in the temple.',
        icon: 'star',
        prayer: `Incarnate Word, let the wonder of Your birth ignite fresh praise and child‑like trust in my heart.`,
        reflectionPrompt: `What aspect of the nativity story moves you to worship?`,
      },
      {
        id: 'gos-1c',
        title: 'Preparation & Baptism',
        reference: createRef('Luke', [3]),
        description:
          'John calls for repentance; crowds are baptised; heaven opens as the Father affirms His beloved Son and the Spirit descends.',
        icon: 'water',
        prayer: `Purifying Fire, prepare my heart for Your kingdom and plunge me into Your renewing Spirit.`,
        reflectionPrompt: `How can you bear “fruit in keeping with repentance” this week?`,
      },
      {
        id: 'gos-2',
        title: 'Genealogy, Baptism, Temptation',
        reference: createRef('Matthew', generateChapters(1, 3)),
        description:
          'From royal family tree to Jordan waters to desert confrontation, Jesus stands where Israel fell and launches His public mission.',
        icon: 'tree',
        prayer: `Beloved Son, steady my identity in the Father and arm me with living Scripture for every wilderness test.`,
        reflectionPrompt: `Where is the Spirit inviting you to stand on identity rather than performance?`,
      },
      {
        id: 'gos-2b',
        title: 'Early Ministry & Beatitudes',
        reference: createRef('Matthew', generateChapters(4, 5)),
        description:
          'Galilean light dawns as disciples are called. Kingdom upside‑down blessings welcome the poor in spirit and the pure in heart.',
        icon: 'people',
        prayer: `King of the Kingdom, form Beatitude character in me that I may inherit the blessed life You describe.`,
        reflectionPrompt: `Which Beatitude feels most counter‑cultural to you today?`,
      },
      {
        id: 'gos-3',
        title: 'Sermon on the Mount',
        reference: createRef('Matthew', generateChapters(5, 7)),
        description:
          'Jesus redefines righteousness, confronting both legalism and hypocrisy. Heart‑level commands raise the moral bar.',
        icon: 'triangle',
        prayer: `Rabbi Jesus, reshape my values through Your words; teach me to build on rock by doing them.`,
        reflectionPrompt: `Which teaching from the Sermon on the Mount do you sense God asking you to practise today?`,
      },
      {
        id: 'gos-4',
        title: 'Parables of Grace',
        reference: createRef('Luke', generateChapters(15, 17)),
        description:
          'Sheep, coins, and prodigal sons illustrate heaven’s joy over one repentant sinner. Grace scandalises the self‑righteous and embraces the lost.',
        icon: 'chatbubble',
        prayer: `Shepherd of the Lost, thank You for chasing prodigals. Make my heart celebrate repentance and seek the forgotten.`,
        reflectionPrompt: `Who in your life feels far from God and needs welcoming love?`,
      },
      {
        id: 'gos-5',
        title: 'Authority & Healing',
        reference: createRef('Mark', generateChapters(1, 3)),
        description:
          'Mark races through healings, exorcisms, and table fellowship—immediately showcasing a Messiah with unrivalled authority.',
        icon: 'flash',
        prayer: `Lord of Power, display Your authority over chaos in my circumstances so others marvel at who You are.`,
        reflectionPrompt: `What storm do you need to invite Jesus to speak “Peace, be still” over?`,
      },
      {
        id: 'gos-5b',
        title: 'Parables & Storms',
        reference: createRef('Mark', generateChapters(4, 5)),
        description:
          'Seed parables hint at hidden kingdom growth. Wind, waves, and legions of demons bow to Jesus’ command.',
        icon: 'boat',
        prayer: `Seed‑Sowing Savior, grow quiet fruit in me and calm every inner sea that resists Your word.`,
        reflectionPrompt: `Which small seed of obedience could God multiply in your life?`,
      },
      {
        id: 'gos-6',
        title: 'Triumphal Entry & Foot‑washing',
        reference: createRef('John', generateChapters(12, 13)),
        description:
          'Hosanna shouts usher Jesus into Jerusalem; in an upper‑room shock He washes dusty feet, redefining greatness as service.',
        icon: 'home',
        prayer: `Servant King, cleanse my pride and teach me to take the towel for those around me.`,
        reflectionPrompt: `Whose feet (figuratively) can you wash this week?`,
      },
      {
        id: 'gos-6b',
        title: 'Farewell & Vine',
        reference: createRef('John', generateChapters(14, 15)),
        description:
          'Comforting promises of Spirit and home intertwine with the call to abide in the true Vine and love one another deeply.',
        icon: 'leaf',
        prayer: `True Vine, graft me into Your life so that abiding love bears lasting fruit.`,
        reflectionPrompt: `What practice helps you remain in Christ’s love today?`,
      },
      {
        id: 'gos-6c',
        title: 'Spirit & High‑Priestly Prayer',
        reference: createRef('John', generateChapters(16, 17)),
        description:
          'Jesus promises the Spirit who guides into truth and prays that future believers would be one as the Trinity is one.',
        icon: 'cloud',
        prayer: `Interceding Savior, let Your prayer for unity and Spirit‑led truth find an answered “Amen” in my life.`,
        reflectionPrompt: `How can you pursue unity with another believer this week?`,
      },
      {
        id: 'gos-7',
        title: 'Passion & Cross',
        reference: createRef('John', generateChapters(18, 19)),
        description:
          'Roman trials, a crown of thorns, and crucifixion fulfil ancient prophecies. “It is finished” signals that the debt of sin is paid in full.',
        icon: 'add',
        prayer: `Crucified Savior, thank You for bearing my sin. May the cross crucify my pride and free me to love sacrificially.`,
        reflectionPrompt: `What part of self needs to die so Christ’s love can live through you?`,
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
      {
        id: 'gos-9',
        title: 'Living Bread & Hard Sayings',
        reference: createRef('John', [6]),
        description:
          'Multiplication feeds thousands, waves obey “I AM,” and Jesus offers bread that satisfies forever—then tests hearts with hard teaching.',
        icon: 'nutrition',
        prayer: `Bread of Life, feed my soul beyond physical needs and anchor me when Your words challenge my comfort.`,
        reflectionPrompt: `Is there a hard saying of Jesus you need to embrace rather than avoid?`,
      },
      {
        id: 'gos-10',
        title: 'Gethsemane & Betrayal',
        reference: createRef('Matthew', [26]),
        description:
          'Costly perfume, the first Lord’s Supper, anguished prayer, and a kiss of betrayal move the story toward the cross.',
        icon: 'wine',
        prayer: `Suffering Savior, strengthen me to say “Your will be done” in my smaller Gethsemanes.`,
        reflectionPrompt: `Where is God asking for surrendered yes from you?`,
      },
      {
        id: 'gos-11',
        title: 'Garden Arrest & Trials',
        reference: createRef('Mark', [14]),
        description:
          'Sweat like blood, fleeing disciples, illegal councils, and a rooster’s crow expose both Jesus’ resolve and human frailty.',
        icon: 'alert',
        prayer: `Truthful King, give me courage to confess You before people no matter the cost.`,
        reflectionPrompt: `Where might fear of opinion silence your witness today?`,
      },
      {
        id: 'gos-12',
        title: 'Passover & New Covenant',
        reference: createRef('Luke', [22]),
        description:
          'Conspiracy brews while Jesus establishes the meal of remembrance—His body and blood for a new covenant; betrayal and denial quickly follow.',
        icon: 'restaurant',
        prayer: `Paschal Lamb, keep my heart in awe of redemption every time I break bread.`,
        reflectionPrompt: `What does the Lord’s Supper mean to you personally?`,
      },
    ]
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
        id: 'act-1',
        title: 'Pentecost & Peter',
        reference: createRef('Acts', generateChapters(1, 4)),
        description:
          'Wind, fire, and multilingual praise launch a new era. Peter’s bold preaching turns thousands of skeptics into a Spirit‑filled community.',
        icon: 'flame',
        prayer: `Spirit of Pentecost, fill me afresh that my words boldly proclaim Jesus across cultural lines.`,
        reflectionPrompt: `Where is God prompting you to witness today?`,
      },
      {
        id: 'act-2a',
        title: 'Signs, Sharing & Sanhedrin',
        reference: createRef('Acts', generateChapters(5, 6)),
        description:
          'Miracles multiply, radical generosity meets practical needs, and the apostles stand before the council—undeterred by threats or jail doors that swing open.',
        icon: 'people',
        prayer: `Lord of Boldness, knit courage and compassion in me so that love overflows even when opposition rises.`,
        reflectionPrompt: `How can you combine generous action with fearless testimony this week?`,
      },
      {
        id: 'act-2b',
        title: 'Stephen’s Speech & Martyrdom',
        reference: createRef('Acts', [7]),
        description:
          'From Abraham to Solomon, Stephen retells Israel’s story, indicting hard hearts. Stones silence his voice but scatter the gospel far beyond Jerusalem.',
        icon: 'alert',
        prayer: `Spirit of Glory, give me Stephen’s vision of Jesus standing for me—stronger than any hostility against me.`,
        reflectionPrompt: `What would change if you pictured Jesus standing by you in today’s hardest place?`,
      },
      {
        id: 'act-3',
        title: 'Saul to Paul',
        reference: createRef('Acts', generateChapters(8, 9)),
        description:
          'A persecutor is blinded by resurrected glory and reborn as apostle. Baptism and early preaching astonish former allies and foes alike.',
        icon: 'flash',
        prayer: `God of Transformation, turn my blind spots into blazing testimony of grace.`,
        reflectionPrompt: `Which former weakness could become a testimony if surrendered to Christ?`,
      },
      {
        id: 'act-4',
        title: 'Peter & Gentiles',
        reference: createRef('Acts', generateChapters(10, 12)),
        description:
          'Cornelius’ household receives the Spirit, proving the gospel is borderless. Divine jailbreaks and angelic interventions keep leaders mobile.',
        icon: 'globe',
        prayer: `Breaker of Barriers, help me welcome those I once called “unclean,” celebrating Your impartial salvation.`,
        reflectionPrompt: `Who is outside your comfort zone that God may be calling you to love?`,
      },
      {
        id: 'act-5',
        title: "Paul's 1st Journey",
        reference: createRef('Acts', generateChapters(13, 15)),
        description:
          'Synagogue sermons stir both revival and riots across Cyprus and Asia Minor. The Jerusalem council clarifies that salvation is by grace, not circumcision.',
        icon: 'walk',
        prayer: `Missionary God, guide my steps like Paul and Barnabas. Let grace—not legalism—define my message.`,
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
          'Ephesus sees city‑wide impact and bonfires of magic scrolls. Farewell tears at Miletus reveal the depth of gospel friendships.',
        icon: 'footsteps',
        prayer: `Spirit of Encouragement, may my friendships deepen like Paul’s farewell tears, strengthening others for the race.`,
        reflectionPrompt: `Who encourages your faith, and how can you thank them today?`,
      },
      {
        id: 'act-8',
        title: 'Trials & Rome',
        reference: createRef('Acts', generateChapters(22, 28)),
        description:
          "Courtrooms, conspiracies, and shipwreck cannot mute the witness. Acts ends with Paul proclaiming the kingdom unhindered in Caesar’s capital.",
        icon: 'business',
        prayer: `Unhindered King, even chains advance the gospel. Grant me resilience to proclaim hope in every trial.`,
        reflectionPrompt: `How can you use your current circumstance—good or hard—for gospel witness?`,
      },
    ]
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
        id: 'paul-1',
        title: 'Romans: Gospel Explained',
        reference: createRef('Romans', generateChapters(1, 7)),
        description:
          "Paul unfolds humanity’s universal need and God’s surprising solution of justification by faith. The letter’s logical argument has sparked revivals for centuries.",
        icon: 'document-text',
        prayer: `God of the Gospel, root me in justification by faith so grace drives holy living.`,
        reflectionPrompt: `How does knowing you are “declared righteous” change today’s struggle?`,
      },
      {
        id: 'paul-2',
        title: 'Corinthians: Church Issues',
        reference: createRef('1 Corinthians', generateChapters(1, 7)),
        description:
          'Divisions, immorality, and worship chaos plague a gifted yet immature church. Paul prescribes cross‑shaped love as the only cure.',
        icon: 'people',
        prayer: `Lord of the Church, heal divisions and teach me to love with cross‑shaped patience.`,
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
        prayer: `God of Unity, reveal the height and depth of Christ’s love, empowering me to walk in worthy humility.`,
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
          'False philosophies shrink Jesus; Paul paints Him as creator, sustainer, and reconciler. Complete sufficiency in Christ dethrones every competing “ism.”',
        icon: 'star',
        prayer: `Supreme Christ, let Your pre‑eminence dethrone every rival in my mind and habits.`,
        reflectionPrompt: `Which “ism” or distraction competes for Christ’s supremacy in you?`,
      },
      {
        id: 'paul-7',
        title: '1 Thessalonians: Hope While Waiting',
        reference: createRef('1 Thessalonians', generateChapters(1, 5)),
        description:
          "New believers endure persecution with steadfast faith. Paul clarifies that the Lord’s return will reunite the living and the dead.",
        icon: 'time',
        prayer: `God of Hope, comfort me with the promise of Your return so I grieve with hope and live with expectancy.`,
        reflectionPrompt: `How does Christ’s return shape your use of time today?`,
      },
      {
        id: 'paul-8',
        title: '2 Thessalonians: Steadfast',
        reference: createRef('2 Thessalonians', generateChapters(1, 3)),
        description:
          'Confusion about end‑times timetables is corrected with calm assurance. Idleness is rebuked because future hope fuels present diligence.',
        icon: 'alarm',
        prayer: `Steadfast Lord, strengthen my heart against deception and idleness, fixing my eyes on Your faithfulness.`,
        reflectionPrompt: `Where might discouragement be breeding laziness instead of diligence?`,
      },
      {
        id: 'paul-9',
        title: '1 Timothy: Guarding the Gospel',
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
          'On Crete, grace trains believers to say “No” to ungodliness and “Yes” to good works. Elders must embody this transformation for the sake of witness.',
        icon: 'medkit',
        prayer: `Grace Instructor, train me to say “No” to ungodliness and “Yes” to good works that adorn the gospel.`,
        reflectionPrompt: `Identify one “good work” the Spirit is prompting you to pursue this week.`,
      },
    ]
  },
];

// Automatically generate shorter version of the full reading plan – each unit
// now covers 1-2 chapters max. This reduces daily reading length while keeping
// path metadata intact. If you need to tweak chapter count just pass a second
// arg (e.g., generateShorterBiblePaths(BIBLE_PATHS, 1) for single-chapter days).


// Path options for onboarding
export type PathOption = {
  id: string;
  title: string;
  subtitle: string;
  image: any;
  order: string[];
};

// Path options for onboarding selection screen
export const PATH_OPTIONS: PathOption[] = [
  {
    id: 'knowing-jesus',
    title: 'Knowing Jesus',
    subtitle: 'Deepen your relationship with Christ',
    image: require('../../assets/onboarding/walkingWithJesus.png'),
    order: [
      'gospels-life-of-christ', // Meet Jesus first
      'acts-early-church', // See faith in action
      'pauline-epistles', // Romans & grace foundations
      'genesis-beginnings', // Creation, fall, promise
      'exodus-deliverance-law', // God's rescue & covenant
      'psalms-wisdom', // God's love & honest prayer
      'general-epistles', // Identity & assurance
      'revelation-end-new', // Hope & new creation
      'kingdoms-prophets', // Story-arc context
      'major-prophets', // Messianic promises
      'minor-prophets', // Justice & mercy echo-chamber
      'wilderness-testing-provision',
    ],
  },
  {
    id: 'way-of-wisdom',
    title: 'The Way of Wisdom',
    subtitle: 'Start with Psalms as your daily guide',
    image: require('../../assets/onboarding/dailyWisdom.png'),
    order: [
      'psalms-wisdom', // 💡 daily heart-training starts here
      'gospels-life-of-christ', // Parables & Sermon on the Mount
      'general-epistles', // James: faith in action
      'pauline-epistles', // Short practical letters
      'acts-early-church', // Everyday courage & generosity
      'genesis-beginnings', // Foundational life lessons
      'exodus-deliverance-law', // Ten Words ≥ daily ethics
      'kingdoms-prophets', // Narrative case-studies
      'major-prophets', // Long-form meditation
      'minor-prophets', // Short, punchy convictions
      'wilderness-testing-provision', // Sabbaths, vows, spiritual rhythms
      'revelation-end-new',
    ],
  },
  {
    id: 'overcoming',
    title: 'Overcoming the Flesh',
    subtitle: 'Learn to resist temptation',
    image: require('../../assets/onboarding/overcomingFlesh.png'),
    order: [
      'genesis-beginnings', // Fall, Cain, Noah
      'exodus-deliverance-law', // Golden Calf & the Law
      'gospels-life-of-christ', // Jesus' temptation & teaching
      'pauline-epistles', // Romans 7, Gal 5, Eph 6
      'general-epistles', // James & 1 Peter on trials
      'psalms-wisdom', // Honest prayers & heart-level wisdom
      'wilderness-testing-provision', // Discipline in the desert
      'minor-prophets', // Sin-judgment-hope cycle
      'kingdoms-prophets', // Kings who rise/fall
      'major-prophets', // Big-picture holiness & hope
      'acts-early-church', // Spiritual warfare in mission
      'revelation-end-new',
    ],
  },
  {
    id: 'walk-in-light',
    title: 'Journey Through',
    subtitle: 'Read the Bible chronologically',
    image: require('../../assets/onboarding/chronological.png'),
    order: [
      'genesis-beginnings',
      'exodus-deliverance-law',
      'wilderness-testing-provision',
      'kingdoms-prophets',
      'major-prophets',
      'minor-prophets',
      'gospels-life-of-christ',
      'acts-early-church',
      'pauline-epistles',
      'general-epistles',
      'revelation-end-new',
    ],
  },
];

/* ---------- Utility to build "shorter" paths (1–2 chapters per unit) ---------- */

// Helper to chunk an array into smaller arrays (size <= n)
const chunk = <T,>(arr: T[], size: number): T[][] => {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
};

/**
 * Split a Unit into multiple sub-units so that each resulting reference covers at
 * most `chaptersPerUnit` chapters (default 2). Metadata is copied, with "Part X"
 * suffix added to the title & id.
 */
const splitUnit = (unit: Unit, chaptersPerUnit = 2): Unit[] => {
  // Only handle simple single-book references for now; if an array or multi-book
  // reference comes in we leave it unchanged.
  console.log("splitting unit", unit);
  if (Array.isArray(unit.reference)) return [unit];

  const { chapters } = unit.reference;
  if (chapters.length <= chaptersPerUnit) {
    return [unit];
  }

  const chapterChunks = chunk(chapters, chaptersPerUnit);
  const totalParts = chapterChunks.length;
  return chapterChunks.map((chapArr, idx) => {
    const part = idx + 1;
    return {
      ...unit,
      id: `${unit.id}-p${part}`,
      title: `${unit.title} (Part ${part})`,
      description: `Part ${part}${totalParts > 1 ? ` of ${totalParts}` : ''}: ${unit.description}`,
      reference: { ...unit.reference, chapters: chapArr },
      // Keep same prayer & reflectionPrompt
    } as Unit;
  });
};

/**
 * Generate shorter paths where each day = ≤ chaptersPerUnit chapters.
 */
export const generateShorterBiblePaths = (
  paths: Path[],
  chaptersPerUnit = 2
): Path[] => {
  console.log('generating shorter bible paths', paths);
  return paths.map((p) => {
    const newUnits: Unit[] = p.units.flatMap((u) => splitUnit(u, chaptersPerUnit));
    return { ...p, units: newUnits };
  });
};



// Finally, export the shorter reading plan constant (1-2 chapters per unit)
export const SHORTER_BIBLE_PATHS_2: Path[] = generateShorterBiblePaths(BIBLE_PATHS, 2);


