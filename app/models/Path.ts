// All potention

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
    description: string; // One sentence description of the unit content
    reference: BibleReference; // The Bible chapters covered
    // Add other properties like description, xp reward, etc. later
  }
  
  // Represents a complete study path
  export interface Path {
    id: string; // Unique identifier for the path (e.g., 'genesis-beginnings')
    title: string; // Title of the path (e.g., "Genesis: Beginnings")
    units: Unit[]; // Array of units within the path
    // Add other properties like description, icon, etc. later
  }
  
  // Mapping from Bible book names to their numeric IDs
  // Based on common Bible API conventions
  const BIBLE_BOOK_IDS: { [key: string]: number } = {
    'Genesis': 1, 'Exodus': 2, 'Leviticus': 3, 'Numbers': 4, 'Deuteronomy': 5,
    'Joshua': 6, 'Judges': 7, 'Ruth': 8, '1 Samuel': 9, '2 Samuel': 10,
    '1 Kings': 11, '2 Kings': 12, '1 Chronicles': 13, '2 Chronicles': 14, 'Ezra': 15,
    'Nehemiah': 16, 'Esther': 17, 'Job': 18, 'Psalms': 19, 'Proverbs': 20,
    'Ecclesiastes': 21, 'Song of Songs': 22, 'Isaiah': 23, 'Jeremiah': 24, 'Lamentations': 25,
    'Ezekiel': 26, 'Daniel': 27, 'Hosea': 28, 'Joel': 29, 'Amos': 30,
    'Obadiah': 31, 'Jonah': 32, 'Micah': 33, 'Nahum': 34, 'Habakkuk': 35,
    'Zephaniah': 36, 'Haggai': 37, 'Zechariah': 38, 'Malachi': 39, 'Matthew': 40,
    'Mark': 41, 'Luke': 42, 'John': 43, 'Acts': 44, 'Romans': 45,
    '1 Corinthians': 46, '2 Corinthians': 47, 'Galatians': 48, 'Ephesians': 49, 'Philippians': 50,
    'Colossians': 51, '1 Thessalonians': 52, '2 Thessalonians': 53, '1 Timothy': 54, '2 Timothy': 55,
    'Titus': 56, 'Philemon': 57, 'Hebrews': 58, 'James': 59, '1 Peter': 60,
    '2 Peter': 61, '1 John': 62, '2 John': 63, '3 John': 64, 'Jude': 65,
    'Revelation': 66
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
      return { bookId: 0, bookName: bookName, chapters: [] };
    }
    return { bookId, bookName, chapters };
  };
  
  // Define all the Bible study paths
  export const BIBLE_PATHS: Path[] = [
    // 1. Genesis: Beginnings
    {
      id: 'genesis-beginnings',
      title: 'Genesis: Beginnings',
      units: [
        { id: 'gen-1', title: 'Creation & Choice', description: 'God creates the world and places humans in the Garden of Eden with freedom to choose.', reference: createRef('Genesis', generateChapters(1, 2)) },
        { id: 'gen-2', title: 'The Fall', description: 'Adam and Eve disobey God, introducing sin and suffering into the world.', reference: createRef('Genesis', [3,4]) },
        { id: 'gen-3', title: 'Cain & Abel', description: 'The first murder occurs as Cain kills his brother Abel out of jealousy.', reference: createRef('Genesis', [4,5]) },
        { id: 'gen-4', title: 'Noah & the Flood', description: 'God sends a worldwide flood but preserves Noah and his family to restart humanity.', reference: createRef('Genesis', generateChapters(6, 9)) },
        { id: 'gen-5', title: 'Tower of Babel', description: 'Humans attempt to build a tower to heaven, leading God to confuse their languages.', reference: createRef('Genesis', [11]) },
        { id: 'gen-6', title: "Abraham's Call", description: 'God calls Abraham to leave his homeland and promises to make him a great nation.', reference: createRef('Genesis', [12]) },
        { id: 'gen-7', title: 'Isaac & Jacob', description: 'The covenant continues through Abraham\'s son Isaac and grandson Jacob, who becomes Israel.', reference: createRef('Genesis', generateChapters(21, 33)) }, // Note: Large range
        { id: 'gen-8', title: "Joseph's Story", description: 'Joseph rises from slavery to leadership in Egypt and saves his family during a famine.', reference: createRef('Genesis', generateChapters(37, 50)) }, // Note: Large range
      ],
    },
    // 2. Exodus: Deliverance & Law
    {
      id: 'exodus-deliverance',
      title: 'Exodus: Deliverance & Law',
      units: [
        { id: 'exo-1', title: 'Slavery in Egypt', description: 'The Israelites multiply but are enslaved and oppressed by a new Pharaoh.', reference: createRef('Exodus', [1]) },
        { id: 'exo-2', title: "Moses' Call", description: 'God calls Moses from a burning bush to lead His people out of Egyptian slavery.', reference: createRef('Exodus', generateChapters(3, 4)) },
        { id: 'exo-3', title: 'The Ten Plagues', description: 'God sends ten devastating plagues upon Egypt to persuade Pharaoh to release the Israelites.', reference: createRef('Exodus', generateChapters(7, 12)) },
        { id: 'exo-4', title: 'Red Sea Crossing', description: 'God miraculously parts the Red Sea for the Israelites to escape the pursuing Egyptian army.', reference: createRef('Exodus', [14]) },
        { id: 'exo-5', title: 'Ten Commandments', description: 'God gives Moses the Ten Commandments as the foundation of His covenant with Israel.', reference: createRef('Exodus', [20]) },
        { id: 'exo-6', title: 'Golden Calf & Idolatry', description: 'The Israelites build and worship a golden calf while Moses is on Mount Sinai.', reference: createRef('Exodus', [32]) },
        { id: 'exo-7', title: 'Tabernacle Instructions', description: 'God gives detailed instructions for building a portable sanctuary for worship.', reference: createRef('Exodus', [...generateChapters(25, 31), ...generateChapters(35, 40)]) },
      ],
    },
    // 3. Wilderness: Testing & Provision
    {
      id: 'wilderness-testing',
      title: 'Wilderness: Testing & Provision',
      units: [
        { id: 'wild-1', title: 'Manna & Provision', description: 'God provides miraculous bread from heaven to feed the Israelites in the wilderness.', reference: createRef('Exodus', [16]) },
        { id: 'wild-2', title: 'Grumbling & Water', description: 'Moses strikes a rock to provide water for the complaining Israelites.', reference: createRef('Exodus', [17]) },
        { id: 'wild-3', title: 'Mount Sinai & Law (Overview)', description: 'God establishes a system of sacrifices and offerings for atonement and worship.', reference: createRef('Leviticus', [1]) }, // Using Ch 1 as overview
        { id: 'wild-4', title: 'Nadab & Abihu', description: 'Aaron\'s sons are killed when they offer unauthorized fire before the Lord.', reference: createRef('Leviticus', [10]) },
        { id: 'wild-5', title: 'Day of Atonement', description: 'God establishes an annual ritual for cleansing the people from their sins.', reference: createRef('Leviticus', [16]) },
        { id: 'wild-6', title: 'Census & Rebellion', description: 'Spies report on Canaan, but the people refuse to enter the Promised Land.', reference: createRef('Numbers', generateChapters(13, 14)) },
        { id: 'wild-7', title: 'Balaam', description: 'A pagan prophet is hired to curse Israel but ends up blessing them instead.', reference: createRef('Numbers', generateChapters(22, 24)) },
        { id: 'wild-8', title: "Moses' Final Words (Overview)", description: 'Moses reviews Israel\'s journey and renews God\'s covenant before his death.', reference: createRef('Deuteronomy', [1]) }, // Using Ch 1 as overview
      ],
    },
    // 4. Kingdoms & Prophets
     {
      id: 'kingdoms-prophets',
      title: 'Kingdoms & Prophets',
      units: [
        { id: 'king-1', title: 'Joshua & Conquest (Overview)', description: 'Joshua leads Israel into the Promised Land, beginning the conquest of Canaan.', reference: createRef('Joshua', [1]) }, // Ch 1 Overview
        { id: 'king-2', title: 'Judges & Cycles (Overview)', description: 'Israel falls into repeated cycles of sin, oppression, repentance, and deliverance.', reference: createRef('Judges', [1]) }, // Ch 1 Overview
        { id: 'king-3', title: 'Rise of Kings', description: 'Samuel anoints Saul as Israel\'s first king, who later falls from favor with God.', reference: createRef('1 Samuel', generateChapters(1, 31)) }, // Whole book? Large. Consider splitting. Using 1-8 for now.
        { id: 'king-4', title: "David's Reign", description: 'David becomes king, establishes Jerusalem as capital, and receives God\'s covenant.', reference: createRef('2 Samuel', generateChapters(1, 24)) }, // Whole book? Large. Consider splitting. Using 5-12 for now.
        { id: 'king-5', title: 'Solomon & the Temple', description: 'Solomon builds the magnificent temple in Jerusalem and rules during Israel\'s golden age.', reference: createRef('1 Kings', generateChapters(1, 11)) },
        { id: 'king-6', title: 'Division of the Kingdom', description: 'The kingdom splits into Israel (north) and Judah (south) following Solomon\'s death.', reference: createRef('1 Kings', [12]) }, // Starting point
        { id: 'king-7', title: 'Elijah & Elisha', description: 'Prophets Elijah and Elisha confront idolatry and perform miracles during dark times in Israel.', reference: createRef('1 Kings', [...generateChapters(17, 22), ...createRef('2 Kings', generateChapters(1, 13)).chapters]) }, // Multi-book range
        { id: 'king-8', title: 'Assyrian Exile', description: 'The northern kingdom of Israel is conquered by Assyria and its people are exiled.', reference: createRef('2 Kings', [17]) },
        { id: 'king-9', title: 'Babylonian Exile', description: 'Jerusalem falls to Babylon, and the people of Judah are taken into captivity.', reference: createRef('2 Kings', [25]) },
      ],
    },
    // 5. Wisdom & Poetry
    {
      id: 'wisdom-poetry',
      title: 'Wisdom & Poetry',
      units: [
        // Note: Specific Psalms/Proverbs selection needed. Using placeholders.
        { id: 'wis-1', title: 'Psalms of Lament & Praise', description: 'Various psalms expressing human emotions from despair to joyful praise toward God.', reference: createRef('Psalms', [1, 23, 51, 100, 150]) }, // Example selection
        { id: 'wis-2', title: 'Proverbs of Wisdom & Folly', description: 'Practical wisdom for godly living contrasted with the path of foolishness.', reference: createRef('Proverbs', [1, 10, 31]) }, // Example selection
        { id: 'wis-3', title: 'Ecclesiastes: Meaning of Life', description: 'A philosophical exploration of life\'s meaning, concluding that true purpose is found in fearing God.', reference: createRef('Ecclesiastes', [1, 3, 12]) }, // Example selection
        { id: 'wis-4', title: 'Song of Songs: Love & Devotion', description: 'A poetic celebration of romantic love between a bride and groom.', reference: createRef('Song of Songs', [1, 2, 8]) }, // Example selection
        { id: 'wis-5', title: 'Job: Suffering & Sovereignty', description: 'A righteous man suffers intensely and questions God, who ultimately reveals His sovereign wisdom.', reference: createRef('Job', [1, 2, 38, 42]) }, // Example selection
      ],
    },
     // 6. Major Prophets
     {
      id: 'major-prophets',
      title: 'Major Prophets',
      units: [
        // Using key chapters as examples for these large books
        { id: 'maj-1', title: 'Isaiah: Messiah & Judgment', description: 'Isaiah prophesies judgment on Israel but also promises a coming Messiah and future restoration.', reference: createRef('Isaiah', [1, 6, 9, 53, 61]) },
        { id: 'maj-2', title: 'Jeremiah: Weeping Prophet', description: 'Jeremiah sorrowfully warns of Jerusalem\'s destruction while promising a future new covenant.', reference: createRef('Jeremiah', [1, 7, 29, 31]) },
        { id: 'maj-3', title: 'Ezekiel: Visions & Restoration', description: 'Ezekiel receives dramatic visions from God about judgment on Israel and future restoration.', reference: createRef('Ezekiel', [1, 37, 47]) },
        { id: 'maj-4', title: 'Daniel: Exile & Faithfulness', description: 'Daniel remains faithful to God in exile and receives apocalyptic visions about future kingdoms.', reference: createRef('Daniel', [1, 3, 6, 7, 9]) },
      ],
    },
    // 7. Minor Prophets
    {
      id: 'minor-prophets',
      title: 'Minor Prophets',
      units: [
        // Overview - Selecting first chapter of each book
        { id: 'min-1', title: 'Hosea', description: 'God commands Hosea to marry an unfaithful woman as a metaphor for Israel\'s unfaithfulness to Him.', reference: createRef('Hosea', [1]) },
        { id: 'min-2', title: 'Joel', description: 'Joel uses a devastating locust plague to warn of God\'s coming judgment and call for repentance.', reference: createRef('Joel', [1]) },
        { id: 'min-3', title: 'Amos', description: 'A shepherd called to prophecy against social injustice and religious hypocrisy in Israel.', reference: createRef('Amos', [1]) },
        { id: 'min-4', title: 'Obadiah', description: 'The shortest prophetic book pronounces judgment on Edom for its violence against Judah.', reference: createRef('Obadiah', [1]) },
        { id: 'min-5', title: 'Jonah', description: 'A reluctant prophet flees from God\'s call to warn the wicked city of Nineveh about judgment.', reference: createRef('Jonah', [1]) },
        { id: 'min-6', title: 'Micah', description: 'Micah condemns corruption and injustice while prophesying about the Messiah\'s birth in Bethlehem.', reference: createRef('Micah', [1]) },
        { id: 'min-7', title: 'Nahum', description: 'Nahum prophesies the destruction of Nineveh as God\'s judgment on Assyria\'s cruelty.', reference: createRef('Nahum', [1]) },
        { id: 'min-8', title: 'Habakkuk', description: 'A prophet questions God about evil and injustice but learns to trust God\'s sovereign timing.', reference: createRef('Habakkuk', [1]) },
        { id: 'min-9', title: 'Zephaniah', description: 'Zephaniah warns of the coming "Day of the Lord" but offers hope of restoration for a faithful remnant.', reference: createRef('Zephaniah', [1]) },
        { id: 'min-10', title: 'Haggai', description: 'Haggai challenges the returned exiles to rebuild God\'s temple and reorder their priorities.', reference: createRef('Haggai', [1]) },
        { id: 'min-11', title: 'Zechariah', description: 'Through apocalyptic visions, Zechariah encourages the rebuilding of the temple and prophesies the Messiah.', reference: createRef('Zechariah', [1]) },
        { id: 'min-12', title: 'Malachi', description: 'The final Old Testament prophet confronts Israel\'s spiritual apathy and foretells the coming of Elijah.', reference: createRef('Malachi', [1]) },
      ],
    },
      // 8. Gospels: The Life of Christ
    {
      id: 'gospels-life-of-christ',
      title: 'Gospels: The Life of Christ',
      units: [
        { id: 'gos-1', title: 'Birth of Jesus', description: 'Angels announce the miraculous birth of Jesus to Mary and Joseph in Bethlehem.', reference: createRef('Luke', generateChapters(1, 2)) },
        { id: 'gos-2', title: 'Baptism & Temptation', description: 'Jesus is baptized by John and resists Satan\'s temptations in the wilderness.', reference: createRef('Matthew', generateChapters(3, 4)) },
        { id: 'gos-3', title: 'Teachings & Parables', description: 'Jesus delivers the Sermon on the Mount and teaches through powerful parables.', reference: createRef('Matthew', [...generateChapters(5, 7), ...createRef('Luke', [15]).chapters]) }, // Combine refs
        { id: 'gos-4', title: 'Miracles & Ministry (Overview)', description: 'Jesus demonstrates divine power through healing the sick, casting out demons, and controlling nature.', reference: createRef('Mark', [1, 2, 4, 5]) }, // Key chapters Mark
        { id: 'gos-5', title: 'Crucifixion', description: 'Jesus is arrested, tried, sentenced, and crucified for the sins of humanity.', reference: createRef('John', [19]) },
        { id: 'gos-6', title: 'Resurrection', description: 'Jesus rises from the dead, appears to his disciples, and commissions them to spread the gospel.', reference: createRef('Luke', [...[24], ...createRef('John', [20]).chapters]) }, // Combine refs
      ],
    },
    // 9. Acts & Early Church
    {
      id: 'acts-early-church',
      title: 'Acts & Early Church',
      units: [
        { id: 'acts-1', title: 'Pentecost', description: 'The Holy Spirit empowers the disciples, and thousands believe in Jesus after Peter\'s sermon.', reference: createRef('Acts', [2]) },
        { id: 'acts-2', title: 'Peter & Early Church', description: 'The Jerusalem church grows rapidly through miracles, persecution, and the Spirit\'s guidance.', reference: createRef('Acts', generateChapters(3, 12)) },
        { id: 'acts-3', title: "Paul's Conversion", description: 'Saul the persecutor encounters Jesus on the Damascus road and becomes Paul the apostle.', reference: createRef('Acts', [9]) },
        { id: 'acts-4', title: "Paul's Journeys", description: 'Paul travels throughout the Mediterranean world planting churches and preaching Christ.', reference: createRef('Acts', generateChapters(13, 21)) },
        { id: 'acts-5', title: "Paul's Trials & Rome", description: 'Paul defends his faith before rulers and is eventually taken to Rome as a prisoner.', reference: createRef('Acts', generateChapters(22, 28)) },
      ],
    },
     // 10. Paul's Letters
     {
      id: 'pauls-letters',
      title: "Paul's Letters",
      units: [
        // Using first chapter or key chapters as representative
        { id: 'paul-1', title: 'Romans: Gospel Explained', description: 'Paul systematically explains salvation by faith, righteousness, and life in the Spirit.', reference: createRef('Romans', [1, 3, 8]) },
        { id: 'paul-2', title: 'Corinthians: Church Issues', description: 'Paul addresses divisions, immorality, and confusion while emphasizing love as the greatest gift.', reference: createRef('1 Corinthians', [1, 13, 15]) },
        { id: 'paul-3', title: 'Galatians: Grace vs Law', description: 'Paul defends justification by faith alone against those requiring adherence to the Mosaic Law.', reference: createRef('Galatians', [1, 5]) },
        { id: 'paul-4', title: 'Ephesians: Unity in Christ', description: 'Paul reveals God\'s cosmic plan to unite all things in Christ and its implications for the church.', reference: createRef('Ephesians', [1, 2, 6]) },
        { id: 'paul-5', title: 'Philippians: Joy in Trial', description: 'From prison, Paul encourages the Philippians to rejoice in Christ despite suffering.', reference: createRef('Philippians', [1, 2, 4]) },
        { id: 'paul-6', title: 'Colossians: Supremacy of Christ', description: 'Paul combats false teaching by emphasizing Christ\'s deity, sufficiency, and lordship.', reference: createRef('Colossians', [1, 3]) },
        { id: 'paul-7', title: 'Thessalonians: Hope & End Times', description: 'Paul instructs believers about Christ\'s return and how to live faithfully until then.', reference: createRef('1 Thessalonians', [1, 4, 5]) },
        { id: 'paul-8', title: 'Timothy & Titus: Church Leadership', description: 'Paul mentors young pastors on sound doctrine, church order, and godly leadership.', reference: createRef('1 Timothy', [...[1, 3], ...createRef('Titus', [1]).chapters]) },
      ],
    },
    // 11. General Epistles
    {
      id: 'general-epistles',
      title: 'General Epistles',
      units: [
        { id: 'genepi-1', title: 'Hebrews: Christ the Fulfillment', description: 'This letter shows how Jesus fulfills and surpasses the Old Testament priesthood and sacrifices.', reference: createRef('Hebrews', [1, 4, 11]) },
        { id: 'genepi-2', title: 'James: Faith in Action', description: 'James emphasizes that genuine faith produces good works and practical holiness.', reference: createRef('James', [1, 2, 5]) },
        { id: 'genepi-3', title: '1–2 Peter: Suffering & Holiness', description: 'Peter encourages believers to remain faithful through suffering and warns against false teachers.', reference: createRef('1 Peter', [...[1, 2, 5], ...createRef('2 Peter', [1]).chapters]) },
        { id: 'genepi-4', title: '1–3 John: Love & Truth', description: 'John emphasizes the inseparable connection between loving God, loving others, and holding to truth.', reference: createRef('1 John', [...[1, 4], ...createRef('2 John', [1]).chapters, ...createRef('3 John', [1]).chapters]) },
        { id: 'genepi-5', title: 'Jude: Contending for the Faith', description: 'Jude warns against false teachers and encourages believers to stand firm in apostolic teaching.', reference: createRef('Jude', [1]) },
      ],
    },
      // 12. Revelation: The End & New Beginning
    {
      id: 'revelation-end',
      title: 'Revelation: The End & New Beginning',
      units: [
        { id: 'rev-1', title: 'Letters to the Churches', description: 'Jesus addresses seven churches in Asia Minor with encouragement, warnings, and promises.', reference: createRef('Revelation', generateChapters(2, 3)) },
        { id: 'rev-2', title: 'Heavenly Visions', description: 'John sees a vision of God\'s throne room with worship from living creatures and elders.', reference: createRef('Revelation', generateChapters(4, 5)) },
        { id: 'rev-3', title: 'Judgment & Triumph', description: 'A series of seals, trumpets, and bowls reveal God\'s judgment on a rebellious world.', reference: createRef('Revelation', generateChapters(6, 20)) }, // Very large range
        { id: 'rev-4', title: 'New Heavens & New Earth', description: 'John describes the glorious new creation where God will dwell with His people forever.', reference: createRef('Revelation', generateChapters(21, 22)) },
      ],
    },
  ];
  
  // You can now import BIBLE_PATHS elsewhere in your store or application