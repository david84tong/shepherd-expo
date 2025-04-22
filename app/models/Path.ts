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
        { id: 'gen-1', title: 'Creation & Choice', reference: createRef('Genesis', generateChapters(1, 2)) },
        { id: 'gen-2', title: 'The Fall', reference: createRef('Genesis', [3]) },
        { id: 'gen-3', title: 'Cain & Abel', reference: createRef('Genesis', [4]) },
        { id: 'gen-4', title: 'Noah & the Flood', reference: createRef('Genesis', generateChapters(6, 9)) },
        { id: 'gen-5', title: 'Tower of Babel', reference: createRef('Genesis', [11]) },
        { id: 'gen-6', title: "Abraham's Call", reference: createRef('Genesis', [12]) },
        { id: 'gen-7', title: 'Isaac & Jacob', reference: createRef('Genesis', generateChapters(21, 33)) }, // Note: Large range
        { id: 'gen-8', title: "Joseph's Story", reference: createRef('Genesis', generateChapters(37, 50)) }, // Note: Large range
      ],
    },
    // 2. Exodus: Deliverance & Law
    {
      id: 'exodus-deliverance',
      title: 'Exodus: Deliverance & Law',
      units: [
        { id: 'exo-1', title: 'Slavery in Egypt', reference: createRef('Exodus', [1]) },
        { id: 'exo-2', title: "Moses' Call", reference: createRef('Exodus', generateChapters(3, 4)) },
        { id: 'exo-3', title: 'The Ten Plagues', reference: createRef('Exodus', generateChapters(7, 12)) },
        { id: 'exo-4', title: 'Red Sea Crossing', reference: createRef('Exodus', [14]) },
        { id: 'exo-5', title: 'Ten Commandments', reference: createRef('Exodus', [20]) },
        { id: 'exo-6', title: 'Golden Calf & Idolatry', reference: createRef('Exodus', [32]) },
        { id: 'exo-7', title: 'Tabernacle Instructions', reference: createRef('Exodus', [...generateChapters(25, 31), ...generateChapters(35, 40)]) },
      ],
    },
    // 3. Wilderness: Testing & Provision
    {
      id: 'wilderness-testing',
      title: 'Wilderness: Testing & Provision',
      units: [
        { id: 'wild-1', title: 'Manna & Provision', reference: createRef('Exodus', [16]) },
        { id: 'wild-2', title: 'Grumbling & Water', reference: createRef('Exodus', [17]) },
        { id: 'wild-3', title: 'Mount Sinai & Law (Overview)', reference: createRef('Leviticus', [1]) }, // Using Ch 1 as overview
        { id: 'wild-4', title: 'Nadab & Abihu', reference: createRef('Leviticus', [10]) },
        { id: 'wild-5', title: 'Day of Atonement', reference: createRef('Leviticus', [16]) },
        { id: 'wild-6', title: 'Census & Rebellion', reference: createRef('Numbers', generateChapters(13, 14)) },
        { id: 'wild-7', title: 'Balaam', reference: createRef('Numbers', generateChapters(22, 24)) },
        { id: 'wild-8', title: "Moses' Final Words (Overview)", reference: createRef('Deuteronomy', [1]) }, // Using Ch 1 as overview
      ],
    },
    // 4. Kingdoms & Prophets
     {
      id: 'kingdoms-prophets',
      title: 'Kingdoms & Prophets',
      units: [
        { id: 'king-1', title: 'Joshua & Conquest (Overview)', reference: createRef('Joshua', [1]) }, // Ch 1 Overview
        { id: 'king-2', title: 'Judges & Cycles (Overview)', reference: createRef('Judges', [1]) }, // Ch 1 Overview
        { id: 'king-3', title: 'Rise of Kings', reference: createRef('1 Samuel', generateChapters(1, 31)) }, // Whole book? Large. Consider splitting. Using 1-8 for now.
        { id: 'king-4', title: "David's Reign", reference: createRef('2 Samuel', generateChapters(1, 24)) }, // Whole book? Large. Consider splitting. Using 5-12 for now.
        { id: 'king-5', title: 'Solomon & the Temple', reference: createRef('1 Kings', generateChapters(1, 11)) },
        { id: 'king-6', title: 'Division of the Kingdom', reference: createRef('1 Kings', [12]) }, // Starting point
        { id: 'king-7', title: 'Elijah & Elisha', reference: createRef('1 Kings', [...generateChapters(17, 22), ...createRef('2 Kings', generateChapters(1, 13)).chapters]) }, // Multi-book range
        { id: 'king-8', title: 'Assyrian Exile', reference: createRef('2 Kings', [17]) },
        { id: 'king-9', title: 'Babylonian Exile', reference: createRef('2 Kings', [25]) },
      ],
    },
    // 5. Wisdom & Poetry
    {
      id: 'wisdom-poetry',
      title: 'Wisdom & Poetry',
      units: [
        // Note: Specific Psalms/Proverbs selection needed. Using placeholders.
        { id: 'wis-1', title: 'Psalms of Lament & Praise', reference: createRef('Psalms', [1, 23, 51, 100, 150]) }, // Example selection
        { id: 'wis-2', title: 'Proverbs of Wisdom & Folly', reference: createRef('Proverbs', [1, 10, 31]) }, // Example selection
        { id: 'wis-3', title: 'Ecclesiastes: Meaning of Life', reference: createRef('Ecclesiastes', [1, 3, 12]) }, // Example selection
        { id: 'wis-4', title: 'Song of Songs: Love & Devotion', reference: createRef('Song of Songs', [1, 2, 8]) }, // Example selection
        { id: 'wis-5', title: 'Job: Suffering & Sovereignty', reference: createRef('Job', [1, 2, 38, 42]) }, // Example selection
      ],
    },
     // 6. Major Prophets
     {
      id: 'major-prophets',
      title: 'Major Prophets',
      units: [
        // Using key chapters as examples for these large books
        { id: 'maj-1', title: 'Isaiah: Messiah & Judgment', reference: createRef('Isaiah', [1, 6, 9, 53, 61]) },
        { id: 'maj-2', title: 'Jeremiah: Weeping Prophet', reference: createRef('Jeremiah', [1, 7, 29, 31]) },
        { id: 'maj-3', title: 'Ezekiel: Visions & Restoration', reference: createRef('Ezekiel', [1, 37, 47]) },
        { id: 'maj-4', title: 'Daniel: Exile & Faithfulness', reference: createRef('Daniel', [1, 3, 6, 7, 9]) },
      ],
    },
    // 7. Minor Prophets
    {
      id: 'minor-prophets',
      title: 'Minor Prophets',
      units: [
        // Overview - Selecting first chapter of each book
        { id: 'min-1', title: 'Hosea', reference: createRef('Hosea', [1]) },
        { id: 'min-2', title: 'Joel', reference: createRef('Joel', [1]) },
        { id: 'min-3', title: 'Amos', reference: createRef('Amos', [1]) },
        { id: 'min-4', title: 'Obadiah', reference: createRef('Obadiah', [1]) },
        { id: 'min-5', title: 'Jonah', reference: createRef('Jonah', [1]) },
        { id: 'min-6', title: 'Micah', reference: createRef('Micah', [1]) },
        { id: 'min-7', title: 'Nahum', reference: createRef('Nahum', [1]) },
        { id: 'min-8', title: 'Habakkuk', reference: createRef('Habakkuk', [1]) },
        { id: 'min-9', title: 'Zephaniah', reference: createRef('Zephaniah', [1]) },
        { id: 'min-10', title: 'Haggai', reference: createRef('Haggai', [1]) },
        { id: 'min-11', title: 'Zechariah', reference: createRef('Zechariah', [1]) },
        { id: 'min-12', title: 'Malachi', reference: createRef('Malachi', [1]) },
      ],
    },
      // 8. Gospels: The Life of Christ
    {
      id: 'gospels-life-of-christ',
      title: 'Gospels: The Life of Christ',
      units: [
        { id: 'gos-1', title: 'Birth of Jesus', reference: createRef('Luke', generateChapters(1, 2)) },
        { id: 'gos-2', title: 'Baptism & Temptation', reference: createRef('Matthew', generateChapters(3, 4)) },
        { id: 'gos-3', title: 'Teachings & Parables', reference: createRef('Matthew', [...generateChapters(5, 7), ...createRef('Luke', [15]).chapters]) }, // Combine refs
        { id: 'gos-4', title: 'Miracles & Ministry (Overview)', reference: createRef('Mark', [1, 2, 4, 5]) }, // Key chapters Mark
        { id: 'gos-5', title: 'Crucifixion', reference: createRef('John', [19]) },
        { id: 'gos-6', title: 'Resurrection', reference: createRef('Luke', [...[24], ...createRef('John', [20]).chapters]) }, // Combine refs
      ],
    },
    // 9. Acts & Early Church
    {
      id: 'acts-early-church',
      title: 'Acts & Early Church',
      units: [
        { id: 'acts-1', title: 'Pentecost', reference: createRef('Acts', [2]) },
        { id: 'acts-2', title: 'Peter & Early Church', reference: createRef('Acts', generateChapters(3, 12)) },
        { id: 'acts-3', title: "Paul's Conversion", reference: createRef('Acts', [9]) },
        { id: 'acts-4', title: "Paul's Journeys", reference: createRef('Acts', generateChapters(13, 21)) },
        { id: 'acts-5', title: "Paul's Trials & Rome", reference: createRef('Acts', generateChapters(22, 28)) },
      ],
    },
     // 10. Paul's Letters
     {
      id: 'pauls-letters',
      title: "Paul's Letters",
      units: [
        // Using first chapter or key chapters as representative
        { id: 'paul-1', title: 'Romans: Gospel Explained', reference: createRef('Romans', [1, 3, 8]) },
        { id: 'paul-2', title: 'Corinthians: Church Issues', reference: createRef('1 Corinthians', [1, 13, 15]) },
        { id: 'paul-3', title: 'Galatians: Grace vs Law', reference: createRef('Galatians', [1, 5]) },
        { id: 'paul-4', title: 'Ephesians: Unity in Christ', reference: createRef('Ephesians', [1, 2, 6]) },
        { id: 'paul-5', title: 'Philippians: Joy in Trial', reference: createRef('Philippians', [1, 2, 4]) },
        { id: 'paul-6', title: 'Colossians: Supremacy of Christ', reference: createRef('Colossians', [1, 3]) },
        { id: 'paul-7', title: 'Thessalonians: Hope & End Times', reference: createRef('1 Thessalonians', [1, 4, 5]) },
        { id: 'paul-8', title: 'Timothy & Titus: Church Leadership', reference: createRef('1 Timothy', [...[1, 3], ...createRef('Titus', [1]).chapters]) },
      ],
    },
    // 11. General Epistles
    {
      id: 'general-epistles',
      title: 'General Epistles',
      units: [
        { id: 'genepi-1', title: 'Hebrews: Christ the Fulfillment', reference: createRef('Hebrews', [1, 4, 11]) },
        { id: 'genepi-2', title: 'James: Faith in Action', reference: createRef('James', [1, 2, 5]) },
        { id: 'genepi-3', title: '1–2 Peter: Suffering & Holiness', reference: createRef('1 Peter', [...[1, 2, 5], ...createRef('2 Peter', [1]).chapters]) },
        { id: 'genepi-4', title: '1–3 John: Love & Truth', reference: createRef('1 John', [...[1, 4], ...createRef('2 John', [1]).chapters, ...createRef('3 John', [1]).chapters]) },
        { id: 'genepi-5', title: 'Jude: Contending for the Faith', reference: createRef('Jude', [1]) },
      ],
    },
      // 12. Revelation: The End & New Beginning
    {
      id: 'revelation-end',
      title: 'Revelation: The End & New Beginning',
      units: [
        { id: 'rev-1', title: 'Letters to the Churches', reference: createRef('Revelation', generateChapters(2, 3)) },
        { id: 'rev-2', title: 'Heavenly Visions', reference: createRef('Revelation', generateChapters(4, 5)) },
        { id: 'rev-3', title: 'Judgment & Triumph', reference: createRef('Revelation', generateChapters(6, 20)) }, // Very large range
        { id: 'rev-4', title: 'New Heavens & New Earth', reference: createRef('Revelation', generateChapters(21, 22)) },
      ],
    },
  ];
  
  // You can now import BIBLE_PATHS elsewhere in your store or application