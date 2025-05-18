export const VERSES_BY_CHAPTER: Record<string, number> = {
  // Format: camelCase bookTitleChapter: verses
  "genesis24": 67,     // Genesis 24
  "numbers7": 89,      // Numbers 7
  "deuteronomy28": 68, // Deuteronomy 28
  "kings18": 66,       // 1 Kings 8
  "chronicles16": 81,  // 1 Chronicles 6
  "ezra2": 70,         // Ezra 2
  "nehemiah7": 73,     // Nehemiah 7
  "psalms78": 72,      // Psalm 78
  "psalms119": 176,    // Psalm 119
  "jeremiah51": 64,    // Jeremiah 51
  "matthew26": 75,     // Matthew 26
  "mark14": 72,        // Mark 14
  "luke1": 80,         // Luke 1
  "luke22": 71,        // Luke 22
  "john6": 71,         // John 6
  "exodus12": 51,      // Exodus 12
  "leviticus13": 59,   // Leviticus 13
  "leviticus14": 57,   // Leviticus 14
  "leviticus25": 55,   // Leviticus 25
  "numbers1": 54,      // Numbers 1
  "numbers26": 65,     // Numbers 26
  "numbers31": 54,     // Numbers 31
  "numbers33": 56,     // Numbers 33
  "samuel114": 52,     // 1 Samuel 14
  "samuel117": 58,     // 1 Samuel 17
  "samuel222": 51,     // 2 Samuel 22
  "psalms18": 50,      // Psalm 18
  "psalms89": 52,      // Psalm 89
  "lamentations3": 66, // Lamentations 3
  "ezekiel16": 63,     // Ezekiel 16
  "matthew27": 66,     // Matthew 27
  "luke2": 52,         // Luke 2
  "acts7": 60,         // Acts 7
  "corinthians115": 58 // 1 Corinthians 15
};

export default VERSES_BY_CHAPTER;

export interface MiniUnit {
  id: string;
  start: number;
  end: number;
  title: string;
  description: string;
  prayer: string;
  reflectionPrompt: string;
}

// Hand-crafted mini-unit break-downs for long chapters (Batch 1)
export const CHAPTER_BREAKDOWNS: Record<string, MiniUnit[]> = {
  genesis24: [
    {
      id: 'gen-24a',
      start: 1,
      end: 28,
      title: `Servant's Oath & Well Prayer`,
      description:
        "Abraham binds his chief servant with an oath to find Isaac a wife among his kin. Arriving in Mesopotamia, the servant prays for a sign and immediately meets Rebekah, whose generous hospitality confirms God's guidance.",
      prayer:
        "Guide-ordering God, thank You that ordinary tasks become sacred missions when entrusted to You.  Give me a prayer-filled expectancy and eyes to recognise Your swift answers today.",
      reflectionPrompt:
        "Where do you need to pause and pray for specific guidance before taking the next step?",
    },
    {
      id: 'gen-24b',
      start: 29,
      end: 54,
      title: 'Family Consent & Covenant Gifts',
      description:
        "Rebekah's household hears the servant's testimony, recognises the Lord's hand, and grants permission for the marriage.  Lavish silver and gold seal the covenant and honour the bride's family.",
      prayer:
        "Covenant-keeping Lord, teach me to tell Your story so clearly that others can only acknowledge 'This matter is from the LORD.'  Make my gratitude as generous as Your grace.",
      reflectionPrompt:
        "Who needs to hear a recent story of God's faithfulness from you?",
    },
    {
      id: 'gen-24c',
      start: 55,
      end: 67,
      title: `Journey Home & Isaac's Joy`,
      description:
        "At dawn Rebekah departs, mirroring Abraham's faith as she leaves homeland for promise.  In the Negev she meets Isaac; the quest ends with comfort after Sarah's death and a new chapter begins.",
      prayer:
        "Faithful Father, like Rebekah stepping into the unknown, help me trust Your good plans and walk toward them with brave obedience.",
      reflectionPrompt:
        "What 'unknown land' is God inviting you to step into right now?",
    },
  ],

  numbers7: [
    {
      id: 'num-7a',
      start: 1,
      end: 29,
      title: 'Dedication Offerings — Days 1-4',
      description:
        "The freshly anointed altar is honoured as leaders from Judah, Issachar, Zebulun, and Reuben present identical but costly gifts—silver plates, bowls, and grain offerings—inaugurating a rhythm of equal devotion.",
      prayer:
        "Generous God, may my worship join the steady procession of devotion, offering You my best regardless of what others bring.",
      reflectionPrompt:
        "Which daily act of generosity can become your personal 'offering plate' today?",
    },
    {
      id: 'num-7b',
      start: 30,
      end: 59,
      title: 'Dedication Offerings — Days 5-8',
      description:
        "Tribes of Simeon through Gad follow, each leader mirroring the first gifts.  The repetition underlines unity: every tribe has equal stake in God's dwelling.",
      prayer:
        "Lord of All Tribes, protect my heart from comparison; let shared sacrifice build shared joy in Your presence.",
      reflectionPrompt:
        "How can you celebrate another believer's equal place in God's family this week?",
    },
    {
      id: 'num-7c',
      start: 60,
      end: 89,
      title: 'Dedication Offerings — Days 9-12 & Divine Voice',
      description:
        "The final tribes complete the twelve-day sequence.  When the last bowl is given, Moses hears the LORD speaking above the mercy-seat—proof that the gifts accomplished their purpose: fellowship with God.",
      prayer:
        "Merciful LORD, let my giving create space to hear Your voice.  Draw me from routine sacrifice into real communion.",
      reflectionPrompt:
        "After giving or serving, do you pause to listen for God's response?",
    },
  ],

  deuteronomy28: [
    {
      id: 'deu-28a',
      start: 1,
      end: 24,
      title: 'Blessings for Obedience',
      description:
        "A cascade of favour—city, field, womb, and storehouse—flows to Israel if they diligently listen to God's voice and walk in His ways.",
      prayer:
        "Giver of Good Gifts, tune my ears to obedience so blessing overflows through me to others.",
      reflectionPrompt:
        "Which area of obedience do you sense could unlock blessing for people around you?",
    },
    {
      id: 'deu-28b',
      start: 25,
      end: 46,
      title: 'Warnings of Defeat & Disease',
      description:
        "The tone shifts: ignoring God invites confusion, drought, and foreign defeat—early alarms meant to turn hearts back before devastation deepens.",
      prayer:
        "Just Judge, let holy warnings awaken me quickly rather than harden me slowly.",
      reflectionPrompt:
        "What small warning sign is God using to call you back today?",
    },
    {
      id: 'deu-28c',
      start: 47,
      end: 68,
      title: 'Exile & Exhaustion of Rebellion',
      description:
        "Relentless curses culminate in siege, exile, and a restless heart—graphic pictures of life severed from covenant grace.",
      prayer:
        "Redeemer, thank You that Christ became a curse for us.  Keep me living in the freedom He purchased.",
      reflectionPrompt:
        "How does remembering Christ's cross change the way you read these curses?",
    },
  ],

  kings18: [
    {
      id: 'king-8a',
      start: 1,
      end: 21,
      title: 'Ark Installed & Opening Blessing',
      description:
        "Priests carry the ark into the new temple; a cloud of glory fills the house, prompting Solomon to bless the gathered nation.",
      prayer:
        "Indwelling Glory, fill the temple of my heart so that praise naturally overflows to bless others.",
      reflectionPrompt:
        "What practical step could 'make room' for God's presence in your schedule today?",
    },
    {
      id: 'king-8b',
      start: 22,
      end: 42,
      title: `Solomon's Prayer of Dedication`,
      description:
        "Hands raised, the king prays for foreigners, famine victims, and future exiles—confident that God hears repentant hearts turned toward this house.",
      prayer:
        "Hearer of Prayer, teach me to intercede boldly for strangers and future generations, trusting Your merciful attention.",
      reflectionPrompt:
        "Who could benefit from you praying Solomon-style intercession over them today?",
    },
    {
      id: 'king-8c',
      start: 43,
      end: 66,
      title: 'Festival Joy & Dismissal',
      description:
        "After sacrifices beyond number and a fourteen-day feast, Solomon dismisses the jubilant crowd, and each goes home glad for all the good the LORD had done.",
      prayer:
        "Joy-Giving God, let celebration of Your goodness send me back to everyday life with a glad and generous heart.",
      reflectionPrompt:
        "How can you carry Sunday celebration into Monday routine?",
    },
  ],

  chronicles16: [
    {
      id: 'chron-6a',
      start: 1,
      end: 30,
      title: 'Lineage of Levi: From Aaron to Samuel',
      description:
        "The genealogy traces the priestly line, anchoring worship leadership in God-chosen heritage rather than human ambition.",
      prayer:
        "God of Generations, thank You for faithful servants before me.  Help me steward the spiritual legacy I've received.",
      reflectionPrompt:
        "Whose faith heritage are you carrying forward, and how will you honour it today?",
    },
    {
      id: 'chron-6b',
      start: 31,
      end: 60,
      title: 'Temple Musicians & Duties',
      description:
        "Specific families are assigned to cymbals, harps, and trumpets, showing that every skill has a sanctified place in God's house.",
      prayer:
        "Master Conductor, show me how my gifts—ordinary or artistic—can harmonise in worship to You.",
      reflectionPrompt:
        "Which personal talent could you dedicate afresh to God's service?",
    },
    {
      id: 'chron-6c',
      start: 61,
      end: 81,
      title: 'Priestly Cities & Inheritance',
      description:
        "Levitical towns are allotted across Israel, ensuring that teaching priests live among the people they serve.",
      prayer:
        "Lord of the Harvest, plant me where Your word is needed and make my home a place of blessing.",
      reflectionPrompt:
        "How can your current neighbourhood experience priest-like blessing through you?",
    },
  ],

  ezra2: [
    {
      id: 'ezr-2a',
      start: 1,
      end: 35,
      title: 'Returnees: Leaders & Family Heads',
      description:
        "A census lists pioneering families who leave Babylon to rebuild Jerusalem—names that testify to courageous obedience.",
      prayer:
        "God of New Beginnings, thank You for pioneers of faith.  Grant me courage to step out when You call.",
      reflectionPrompt:
        "What 'first step' is God asking of you that might inspire others?",
    },
    {
      id: 'ezr-2b',
      start: 36,
      end: 70,
      title: 'Priests, Levites & Servants Counted',
      description:
        "Priestly lines, temple servants, and singers are numbered; combined resources fuel the rebuilding of worship.",
      prayer:
        "Provider God, marshal both people and resources through my life to rebuild broken places of worship.",
      reflectionPrompt:
        "How can you contribute your 'talent, time, or treasure' toward rebuilding spiritual community?",
    },
  ],

  nehemiah7: [
    {
      id: 'neh-7a',
      start: 1,
      end: 38,
      title: 'Gatekeepers & Family Lists',
      description:
        "With walls rebuilt, Nehemiah appoints trustworthy gatekeepers and records the genealogies of exiles who first returned.",
      prayer:
        "Lord of Security, help me guard the gates of my life with faithfulness and keep record of Your past deliverances.",
      reflectionPrompt:
        "What 'gate'—mind, eyes, time—needs intentional guarding today?",
    },
    {
      id: 'neh-7b',
      start: 39,
      end: 73,
      title: 'Resource Totals & Community Settled',
      description:
        "Totals of people, livestock, and generous offerings reveal a community ready to inhabit a restored city and sustain worship.",
      prayer:
        "Faithful Provider, teach me to account for every blessing and to invest my resources in sustaining Your house.",
      reflectionPrompt:
        "Which resource—time, skill, or finance—can you offer this week to strengthen your faith community?",
    },
  ],

  psalms78: [
    {
      id: 'psa-78a',
      start: 1,
      end: 20,
      title: 'Opening Call & Early Wonders',
      description:
        "The psalmist summons Israel to remember God's mighty deeds—splitting the sea and guiding with cloud and fire—so the next generation will not forget.",
      prayer:
        "Storytelling God, fill my mouth with testimonies that ignite faith in children yet unborn.",
      reflectionPrompt:
        "Which God-story will you retell to someone younger today?",
    },
    {
      id: 'psa-78b',
      start: 21,
      end: 42,
      title: 'Rebellion & Relentless Mercy',
      description:
        "Despite manna and water from rock, the wilderness generation tests God; yet mercy tempers anger and keeps the covenant trek moving.",
      prayer:
        "Patient Redeemer, forgive my recurring doubts and surprise me again with sustaining grace.",
      reflectionPrompt:
        "Where have you recently questioned God's care, and how can this passage restore trust?",
    },
    {
      id: 'psa-78c',
      start: 43,
      end: 72,
      title: 'From Egypt to Shepherd David',
      description:
        "The narrative races from plagues in Egypt through conquest to the choice of David, the shepherd-king who leads with integrity of heart.",
      prayer:
        "Sovereign Shepherd, lead me like David—skillfully and tenderly—so those I influence feel Your care.",
      reflectionPrompt:
        "How can you shepherd someone in your circle with skill and compassion today?",
    },
  ],
  psalms119: [
    {
      id: 'psa-119a',
      start: 1,
      end: 32,
      title: 'Aleph to Lamed – Walking in the Way',
      description: 'The opening stanzas celebrate those whose paths are blameless and pray for an enlarged heart to run in God\'s commands.',
      prayer: 'Author of Scripture, enlarge my heart so obedience feels like running in wide spaces, not trudging narrow alleys.',
      reflectionPrompt: 'Which command currently feels restrictive—how might it become a wide space of freedom when obeyed?',
    },
    {
      id: 'psa-119b',
      start: 33,
      end: 64,
      title: 'He to Samekh – Delight in Instruction',
      description: 'Petitions for understanding mix with vows of delight; the psalmist finds richer treasure in Torah than in gold.',
      prayer: 'Teacher Spirit, turn my study into song and my discipline into delight.',
      reflectionPrompt: 'Name one verse you can memorise this week as treasure.',
    },
    {
      id: 'psa-119c',
      start: 65,
      end: 96,
      title: 'Teth to Mem – Affliction & Faithfulness',
      description: 'Affliction becomes a classroom where God\'s faithfulness shines; His word proves boundless perfection.',
      prayer: 'Faithful One, use hardship to drive Your word deeper until I say, "It was good for me to be afflicted."',
      reflectionPrompt: 'How has a recent hardship pushed you toward Scripture rather than away?',
    },
    {
      id: 'psa-119d',
      start: 97,
      end: 128,
      title: 'Nun to Pe – Sweeter Than Honey',
      description: 'Meditation births wisdom greater than elders; God\'s precepts taste sweeter than honey and light the path ahead.',
      prayer: 'Lamp to my feet, let Your word sweeten my thoughts and illuminate my next step.',
      reflectionPrompt: 'Where do you need lamp-light clarity today?',
    },
    {
      id: 'psa-119e',
      start: 129,
      end: 152,
      title: 'Tsadhe to Resh – Streams of Tears',
      description: 'Zeal for the law meets grief over those who ignore it; yet ancient promises anchor hope.',
      prayer: 'God of Ancient Promises, keep me zealous yet tender—grieving over sin while trusting Your enduring word.',
      reflectionPrompt: 'What injustice moves you to tears and intercession?',
    },
    {
      id: 'psa-119f',
      start: 153,
      end: 176,
      title: 'Shin & Tav – Seeking the Straying Sheep',
      description: 'The long psalm closes with pleas for rescue and confession of straying—assurance that the Shepherd seeks His wandering sheep.',
      prayer: 'Seeking Shepherd, when I wander like a lost sheep, pursue me with Your word and bring me home.',
      reflectionPrompt: 'Is there a "wandering sheep" you can gently invite back to the fold this week?',
    },
  ],
  
  jeremiah51: [
    {
      id: 'jer-51a',
      start: 1,
      end: 32,
      title: 'Fallen Babylon Pronounced',
      description: 'Jeremiah foresees a winnowing wind that will scatter proud Babylon, repaying her for all she has done to Zion.',
      prayer: 'Righteous Judge, guard my heart from Babylonian pride and align me with Your coming justice.',
      reflectionPrompt: 'Where is subtle pride inviting God\'s opposition in your life?',
    },
    {
      id: 'jer-51b',
      start: 33,
      end: 64,
      title: 'Earth Shakes at Babylon\'s End',
      description: 'Heaven and earth rejoice as Babylon\'s walls fall; a stone-bound scroll sunk in the Euphrates acts out her ultimate doom.',
      prayer: `God of Hope, let the certainty of evil's downfall fuel my perseverance in goodness today.`,
      reflectionPrompt: `How does knowing injustice has an expiration date change your response to it?`,
    },
  ],
  
  matthew26: [
    {
      id: 'mat-26a',
      start: 1,
      end: 35,
      title: 'Anointing to Last Supper',
      description: 'A woman\'s costly perfume, Judas\' bargain, and the first Lord\'s Supper set the stage for impending betrayal.',
      prayer: 'Anointed Messiah, receive my costly worship and keep me from cheap betrayal.',
      reflectionPrompt: 'What costly act of devotion can you pour out this week?',
    },
    {
      id: 'mat-26b',
      start: 36,
      end: 56,
      title: 'Gethsemane Agony & Arrest',
      description: 'In a garden Jesus wrestles with the cup while sleepy friends falter; swords and a kiss usher Him toward the cross.',
      prayer: 'Suffering Savior, strengthen me to say "Your will be done" in my smaller Gethsemanes.',
      reflectionPrompt: 'Where is God asking for surrendered "yes" from you?',
    },
    {
      id: 'mat-26c',
      start: 57,
      end: 75,
      title: 'Trials & Peter\'s Tears',
      description: 'False witnesses, silent dignity, and Peter\'s triple denial end the night with bitter weeping and resolute purpose.',
      prayer: 'Faithful High Priest, forgive my denials and turn my tears into deeper loyalty.',
      reflectionPrompt: 'Recall a recent failure—how can it become a step toward restored courage?',
    },
  ],
  
  mark14: [
    {
      id: 'mrk-14a',
      start: 1,
      end: 31,
      title: 'Perfume, Plot & Passover',
      description: 'Extravagant fragrance fills the house while leaders plot death; Jesus shares Passover and predicts scattering.',
      prayer: 'Worthy Lord, let my devotion smell stronger than any plotting darkness around me.',
      reflectionPrompt: 'How can you show extravagant love for Jesus today?',
    },
    {
      id: 'mrk-14b',
      start: 32,
      end: 52,
      title: 'Garden Struggle & Flight',
      description: 'Sweat like blood, sleeping disciples, and a young man fleeing unclothed paint the cost of lonely obedience.',
      prayer: 'Man of Sorrows, keep me awake with You instead of fleeing when following is costly.',
      reflectionPrompt: 'What comfort are you tempted to run toward instead of staying with Jesus?',
    },
    {
      id: 'mrk-14c',
      start: 53,
      end: 72,
      title: 'Council & Cockcrow',
      description: 'Illegal trials condemn the Son of Man; a rooster\'s crow exposes Peter\'s fear, fulfilling the Master\'s words.',
      prayer: 'Truthful King, give me courage to confess You before men no matter the cost.',
      reflectionPrompt: 'Where might fear of opinion silence your witness today?',
    },
  ],
  
  luke1: [
    {
      id: 'luk-1a',
      start: 1,
      end: 25,
      title: 'Promise to Zechariah',
      description: 'Gabriel announces John\'s birth; disbelief meets divine muteness while Elizabeth conceives in hope.',
      prayer: 'God Who Remembers, replace my skepticism with silent trust that blossoms into testimony.',
      reflectionPrompt: 'What prayer long delayed needs renewed belief today?',
    },
    {
      id: 'luk-1b',
      start: 26,
      end: 56,
      title: 'Announcement to Mary & Magnificat',
      description: 'A virgin conceives by the Spirit; Mary\'s song magnifies a God who lifts the lowly and scatters the proud.',
      prayer: 'God My Savior, let praise rise before proof as I trust Your impossible promises.',
      reflectionPrompt: 'Which line of the Magnificat resonates most with your story?',
    },
    {
      id: 'luk-1c',
      start: 57,
      end: 80,
      title: 'Birth of John & Zechariah\'s Song',
      description: 'Tongue loosed, a once-mute priest blesses God for dawn from on high that guides our feet into peace.',
      prayer: 'Sunrise from Heaven, guide my words so they birth peace in others.',
      reflectionPrompt: 'How can your speech today prepare a way for Jesus?',
    },
  ],
  
  luke22: [
    {
      id: 'luk-22a',
      start: 1,
      end: 23,
      title: 'Plot, Passover & New Covenant',
      description: 'Conspiracy brews while Jesus establishes the meal of remembrance—His body and blood for a new covenant.',
      prayer: 'Paschal Lamb, keep my heart in awe of the price of redemption every time I break bread.',
      reflectionPrompt: 'What does the Lord\'s Supper mean to you personally?',
    },
    {
      id: 'luk-22b',
      start: 24,
      end: 46,
      title: 'Servant Greatness & Gethsemane',
      description: 'Leadership redefined as service; then olive-press agony ends with angelic strengthening and resolved obedience.',
      prayer: 'Serving King, teach me to lead by serving and to pray through agony into surrender.',
      reflectionPrompt: 'Where can you choose towel over throne in leadership?',
    },
    {
      id: 'luk-22c',
      start: 47,
      end: 71,
      title: 'Betrayal, Denial & Trials',
      description: 'A kiss betrays, a rooster convicts, and councils accuse, yet Jesus stands firm for truth.',
      prayer: 'Faithful Witness, strengthen me to stand truthful when betrayal or misunderstanding pierce.',
      reflectionPrompt: 'How will you respond when loyalty to Jesus costs social comfort?',
    },
  ],
  
  john6: [
    {
      id: 'jhn-6a',
      start: 1,
      end: 40,
      title: 'Loaves, Lake & Living Bread',
      description: 'Multiplication feeds thousands, waves obey "I AM," and Jesus offers bread that satisfies forever.',
      prayer: 'Bread of Life, feed my soul beyond physical needs and calm my storms with Your presence.',
      reflectionPrompt: 'What "empty hunger" needs the true bread today?',
    },
    {
      id: 'jhn-6b',
      start: 41,
      end: 71,
      title: 'Hard Sayings & Heart Choices',
      description: 'Eating His flesh offends many; the twelve stay, confessing that only Jesus has words of eternal life.',
      prayer: 'Word of Life, when Your teaching shocks my comfort, anchor me in humble trust not offended exit.',
      reflectionPrompt: 'Is there a hard teaching you need to embrace rather than avoid?',
    },
  ],
  
  exodus12: [
    {
      id: 'exo-12a',
      start: 1,
      end: 28,
      title: 'Passover Instructions',
      description: 'A spotless lamb, painted doorframes, and hurried bread institute a memorial of deliverance.',
      prayer: 'Passover Lamb, mark my life with Your blood so judgment passes over and freedom begins.',
      reflectionPrompt: 'How can you remember and rehearse redemption today?',
    },
    {
      id: 'exo-12b',
      start: 29,
      end: 51,
      title: 'Midnight Deliverance',
      description: 'Death visits Egypt, but Israel marches out, arms filled with favour and hearts with awe.',
      prayer: 'Delivering God, lead me out of old bondage and into worshipful freedom.',
      reflectionPrompt: 'What "Egypt" is God calling you to leave behind for His promised journey?',
    },
  ],
  leviticus13: [
    {
      id: 'lev-13a',
      start: 1,
      end: 28,
      title: 'Diagnosing Skin Conditions',
      description: 'Priests inspect suspicious eruptions, scabs, or burns—detailed wisdom that guards community health and holiness.',
      prayer: 'Holy Healer, search the hidden places of my heart the way priests examined skin, exposing and cleansing unseen infection.',
      reflectionPrompt: 'What inward "spot" might God be asking you to bring into the light for healing?',
    },
    {
      id: 'lev-13b',
      start: 29,
      end: 59,
      title: 'Garments & Long-Term Impurity',
      description: 'Guidelines expand from skin to fabric, showing how corruption can spread if not dealt with decisively.',
      prayer: 'Purifier of All, teach me to address small stains before they permeate the fabric of my life.',
      reflectionPrompt: 'Is there a "small stain" you need to cut out before it spreads?',
    },
  ],
  
  leviticus14: [
    {
      id: 'lev-14a',
      start: 1,
      end: 32,
      title: 'Cleansing the Healed',
      description: 'Two birds, cedar, and hyssop dramatise a beautiful reversal—from isolation to restored worship in eight days.',
      prayer: 'God Who Restores, thank You that healing leads to community restoration, not mere symptom relief.',
      reflectionPrompt: `How can you celebrate someone's spiritual or physical healing this week?`,
    },
    {
      id: 'lev-14b',
      start: 33,
      end: 57,
      title: 'House Contamination & Renewal',
      description: 'Even bricks can harbour rot; drastic removal—even demolition—protects future inhabitants.',
      prayer: 'Wise Builder, show me structural sins in my "house" that need radical renovation.',
      reflectionPrompt: 'What habit or environment in your home might God be calling you to renovate or remove?',
    },
  ],
  
  leviticus25: [
    {
      id: 'lev-25a',
      start: 1,
      end: 24,
      title: 'Sabbath Years & Trust',
      description: 'Every seventh year fields rest, teaching Israel that provision comes from God more than toil.',
      prayer: 'Lord of the Sabbath, free me from constant striving and teach me restorative rhythms of trust.',
      reflectionPrompt: 'What practical step could help you honour rest as worship?',
    },
    {
      id: 'lev-25b',
      start: 25,
      end: 46,
      title: 'Jubilee—Debts Released',
      description: 'In the fiftieth year, land returns, slaves go free, and economic reset proclaims divine ownership.',
      prayer: 'Liberating God, let jubilee shape my view of possessions and people, loosening my grip and lifting the poor.',
      reflectionPrompt: 'Where can you practise jubilee generosity today?',
    },
    {
      id: 'lev-25c',
      start: 47,
      end: 55,
      title: 'Kinsman-Redeemer Provision',
      description: 'Relatives may redeem impoverished kin, foreshadowing Christ who buys us back from bondage.',
      prayer: 'Redeemer, stir my heart to act when family or neighbour falls into hardship, reflecting Your costly rescue.',
      reflectionPrompt: 'Who near you might need a "kinsman-redeemer" gesture of help?',
    },
  ],
  
  numbers1: [
    {
      id: 'num-1a',
      start: 1,
      end: 27,
      title: 'Tribal Census Begins',
      description: 'Moses counts warriors tribe by tribe, showing God values every name in His army.',
      prayer: 'Commander of Hosts, remind me my name is counted and my role matters in Your mission.',
      reflectionPrompt: 'How does knowing you are "counted" by God affect your sense of purpose today?',
    },
    {
      id: 'num-1b',
      start: 28,
      end: 54,
      title: 'Leaders & Camp Arrangement',
      description: `Totals mount and positions assign—order that places God's tabernacle at the centre.`,
      prayer: 'God of Order, centre my life around Your presence rather than my preferences.',
      reflectionPrompt: 'What practical re-centering could you do to keep God at the hub of your routines?',
    },
  ],
  
  numbers26: [
    {
      id: 'num-26a',
      start: 1,
      end: 37,
      title: 'Second Census—First Half',
      description: 'After wilderness deaths, a new generation is numbered, ready to inherit the land.',
      prayer: `Generational God, thank You that failure isn't final—You raise new starters to fulfil Your promise.`,
      reflectionPrompt: `How can you invest hope in the next generation today?`,
    },
    {
      id: 'num-26b',
      start: 38,
      end: 65,
      title: 'Inheritance Totals & Zelophehad Reminder',
      description: `Totals determine land allotment; daughters of Zelophehad highlight God's justice for every household.`,
      prayer: `Impartial Judge, ensure my decisions honour the overlooked and uphold Your just character.`,
      reflectionPrompt: 'Who in your sphere might feel overlooked and needs advocacy?',
    },
  ],
  
  numbers31: [
    {
      id: 'num-31a',
      start: 1,
      end: 24,
      title: 'War Against Midian',
      description: 'Israel executes judgment on Midian; purity laws guard soldiers and spoils alike.',
      prayer: 'Holy Warrior, teach me to fight spiritual battles while guarding purity of heart.',
      reflectionPrompt: 'What battle requires both courage and consecration from you?',
    },
    {
      id: 'num-31b',
      start: 25,
      end: 54,
      title: 'Division of Spoils & Freewill Offering',
      description: 'Booty is shared between warriors and community; commanders bring extra gold in gratitude for zero casualties.',
      prayer: 'Generous King, cultivate thankful giving in me as acknowledgment of Your protection.',
      reflectionPrompt: `What thanksgiving gift could you bring in response to God's recent protection?`,
    },
  ],
  
  numbers33: [
    {
      id: 'num-33a',
      start: 1,
      end: 29,
      title: 'Journeys Recorded—Egypt to Sinai',
      description: 'Moses logs each campsite, turning geography into testimony of grace.',
      prayer: 'Way-Maker, help me journal my own journey so I remember grace at every stop.',
      reflectionPrompt: 'Which past "camp" of your life do you need to remember gratefully?',
    },
    {
      id: 'num-33b',
      start: 30,
      end: 56,
      title: 'Instructions for Canaan Entry',
      description: 'As the log ends, God commands driving out idols and allocating inheritance—unfinished business awaiting obedience.',
      prayer: 'Lord of the Land, give me courage to clear out lingering idols as I step into promises.',
      reflectionPrompt: 'What lingering "idol" or distraction must be removed to enter your next season?',
    },
  ],
  
  samuel114: [
    {
      id: 'sam1-14a',
      start: 1,
      end: 23,
      title: `Jonathan's Bold Attack`,
      description: 'Two men scale cliffs; faith sparks panic among Philistines, proving the Lord can save by many or few.',
      prayer: 'Lord of Armies, birth daring faith in me that moves despite numerical odds.',
      reflectionPrompt: 'Where is God prompting a "perhaps the LORD will act" moment of courage?',
    },
    {
      id: 'sam1-14b',
      start: 24,
      end: 52,
      title: 'Rash Vow & Continued Battles',
      description: `Saul's hasty oath starves troops; Jonathan's honey test exposes leadership folly yet God grants victory.`,
      prayer: 'Wise King, guard my tongue from rash vows that burden others; make my leadership life-giving.',
      reflectionPrompt: 'What spoken commitment might you need to revisit or release because it hinders others?',
    },
  ],
  samuel117: [
    {
      id: 'sam1-17a',
      start: 1,
      end: 31,
      title: "Goliath’s Taunt & David’s Courage",
      description:
        "Forty days of Philistine swagger meet a shepherd’s righteous anger.  David’s questions expose Israel’s fear and enlarge vision for God’s honour.",
      prayer:
        "Lord of Hosts, awaken holy discontent in me whenever Your name is mocked.  Make my vision of You bigger than looming giants.",
      reflectionPrompt:
        "What ‘giant’ has silenced you, and how might seeing God’s reputation at stake embolden you?",
    },
    {
      id: 'sam1-17b',
      start: 32,
      end: 58,
      title: "Sling, Stone & Sudden Victory",
      description:
        "Rejecting armour and embracing covenant confidence, David runs toward danger; one well‑aimed stone topples terror and ignites national faith.",
      prayer:
        "Champion Deliverer, teach me to fight with proven trust not borrowed methods.  Use little things wielded in faith for great victories.",
      reflectionPrompt:
        "Which ‘simple sling’—ordinary gift or habit—could God use powerfully if you run toward the battle?",
    },
  ],

  samuel222: [
    {
      id: 'sam2-22a',
      start: 1,
      end: 25,
      title: "Rescued From Deep Waters",
      description:
        "David sings of cords that entangled and God who thundered, drew him out, and set him in spacious places.",
      prayer:
        "Rock of my salvation, pull me from overwhelming currents today and place my feet on broad grace.",
      reflectionPrompt:
        "Recall a moment God ‘drew you out’—how can that memory fuel fresh praise?",
    },
    {
      id: 'sam2-22b',
      start: 26,
      end: 51,
      title: "Victorious Path & Eternal King",
      description:
        "The song turns outward: God trains hands for battle, subdues nations, and promises enduring kindness to His anointed.",
      prayer:
        "Strength‑Giver, equip me for every fight You assign, and keep my victories pointing back to Your steadfast love.",
      reflectionPrompt:
        "Where do you need God‑taught skill rather than self‑taught striving?",
    },
  ],

  psalms18: [
    {
      id: 'psa-18a',
      start: 1,
      end: 24,
      title: "Love‑Laced Deliverance",
      description:
        "Love opens the psalm; earthquakes, storm, and rescue follow as God answers a distressed servant.",
      prayer:
        "My Strength, let love—not fear—shape my first words to You, trusting rescue is already on the way.",
      reflectionPrompt:
        "When trouble hits, what words instinctively leave your lips?",
    },
    {
      id: 'psa-18b',
      start: 25,
      end: 50,
      title: "High Tower & Nations Underfoot",
      description:
        "Integrity meets reward; God’s gentle greatness makes feet sure and spreads David’s fame among nations.",
      prayer:
        "Exalted Shield, enlarge my stride and steady my steps so Your greatness, not mine, is what people remember.",
      reflectionPrompt:
        "How can gentleness become your unexpected strength this week?",
    },
  ],

  psalms89: [
    {
      id: 'psa-89a',
      start: 1,
      end: 29,
      title: "Covenant Faithfulness Celebrated",
      description:
        "From creation’s pillars to David’s throne, the psalmist lifts a chorus of unfailing love and sworn oath.",
      prayer:
        "Faithful God, remind me daily that Your promises stand firmer than the heavens You formed.",
      reflectionPrompt:
        "Which promise of God feels freshest to you right now?  Speak it aloud.",
    },
    {
      id: 'psa-89b',
      start: 30,
      end: 52,
      title: "Crown Cast Down & Hope Questioned",
      description:
        "The tone plummets—walls breached, sceptre shattered—yet the psalm ends holding covenant hope with a defiant ‘Amen.’",
      prayer:
        "God of the Yet, teach me to lament honestly without surrendering hope.",
      reflectionPrompt:
        "Where do you need to add a stubborn ‘yet I will trust’ to your lament?",
    },
  ],

  lamentations3: [
    {
      id: 'lam-3a',
      start: 1,
      end: 22,
      title: "Darkness Without & Within",
      description:
        "A lone voice catalogues affliction—broken bones, bitter gall, and arrow‑pierced heart.",
      prayer:
        "Man of Sorrows, meet me in honest darkness and assure me You understand every bruise of soul.",
      reflectionPrompt:
        "What hidden pain needs words before healing can begin?",
    },
    {
      id: 'lam-3b',
      start: 23,
      end: 44,
      title: "Morning Mercies Remembered",
      description:
        "Amid ruins, a sunrise: steadfast love never ceases; new mercies rise with each dawn inviting quiet hope.",
      prayer:
        "Merciful Father, turn my eyes from ashes to the horizon of Your unfailing love today.",
      reflectionPrompt:
        "How can you practise recalling mercies when memories hurt?",
    },
    {
      id: 'lam-3c',
      start: 45,
      end: 66,
      title: "Plea for Justice & Restoration",
      description:
        "The poet petitions God to see the insult, judge the enemy, and restore what was shattered.",
      prayer:
        "Righteous Avenger, channel my anguish into intercession, trusting You to set every wrong right.",
      reflectionPrompt:
        "Which injustice do you need to surrender to God’s timing rather than your retaliation?",
    },
  ],

  ezekiel16: [
    {
      id: 'ezk-16a',
      start: 1,
      end: 22,
      title: "Abandoned Child Adopted",
      description:
        "Jerusalem is pictured as a newborn discarded in blood until God passes by, cleanses, and claims her as His own.",
      prayer:
        "Adopting God, thank You for finding me in my filth and clothing me with dignity.",
      reflectionPrompt:
        "What early rescue story in your life reminds you of God’s grace?",
    },
    {
      id: 'ezk-16b',
      start: 23,
      end: 43,
      title: "Adorned Bride Turned Idolater",
      description:
        "Lavish gifts become idols; the once orphan bride now breaks covenant with brazen infidelity.",
      prayer:
        "Jealous Lover, guard my heart from turning Your blessings into rivals for Your affection.",
      reflectionPrompt:
        "Which gift from God are you tempted to treasure above the Giver?",
    },
    {
      id: 'ezk-16c',
      start: 44,
      end: 63,
      title: "Shame Exposed & Covenant Remembered",
      description:
        "Shocking sin meets shocking grace—God vows an everlasting covenant that humbles pride into silent reverence.",
      prayer:
        "Restoring Lord, let even my deepest shame become a doorway to deeper gratitude for Your covenant love.",
      reflectionPrompt:
        "How does remembering your worst moment amplify worship today?",
    },
  ],

  matthew27: [
    {
      id: 'mat-27a',
      start: 1,
      end: 26,
      title: "Trials, Torment & Barabbas Freed",
      description:
        "Judas’ remorse, Pilate’s dilemma, and a crowd’s choice reveal innocent blood exchanged for the guilty.",
      prayer:
        "Sin‑Bearer, amaze me anew that You took my place while I stood in Barabbas’ shoes.",
      reflectionPrompt:
        "Where do you still try to ‘wash hands’ instead of owning complicity?",
    },
    {
      id: 'mat-27b',
      start: 27,
      end: 50,
      title: "Mockery, Darkness & Loud Cry",
      description:
        "Thorns, taunts, and midday night climax in Jesus’ forsaken cry—curtain‑rending love in full display.",
      prayer:
        "Crucified King, let the torn veil remind me nothing now blocks access to the Father.",
      reflectionPrompt:
        "How will you step through that open curtain in prayer today?",
    },
    {
      id: 'mat-27c',
      start: 51,
      end: 66,
      title: "Graves Open & Tomb Sealed",
      description:
        "Earthquake splits rocks, saints wake, and a guarded tomb tries to contain unstoppable life.",
      prayer:
        "Living One, shake my dead places awake until watchful world sees resurrection power.",
      reflectionPrompt:
        "What ‘sealed tomb’ in your life needs resurrection hope?",
    },
  ],

  luke2: [
    {
      id: 'luk-2a',
      start: 1,
      end: 24,
      title: "Manger & Angelic Chorus",
      description:
        "From imperial decree to humble stable, heaven’s glory meets earth’s lowliness as shepherds hear ‘peace on earth.’",
      prayer:
        "Incarnate Word, make room in my crowded life for the humble arrival of Your peace.",
      reflectionPrompt:
        "Where can you bring ‘good news of great joy’ to someone overlooked today?",
    },
    {
      id: 'luk-2b',
      start: 25,
      end: 52,
      title: "Temple Testimonies & Growing Wisdom",
      description:
        "Simeon and Anna bless the child; twelve‑year‑old Jesus amazes teachers, growing in wisdom and favour.",
      prayer:
        "Guiding Spirit, help me treasure prophetic words and grow steadily in wisdom like Jesus.",
      reflectionPrompt:
        "What practice can help you ‘grow in favour with God and people’ this week?",
    },
  ],

  acts7: [
    {
      id: 'act-7a',
      start: 1,
      end: 38,
      title: "Story of Promise & Rejection (Part 1)",
      description:
        "Stephen traces Abraham to Moses, showing a pattern of God’s initiations and Israel’s resistance.",
      prayer:
        "God of History, open my eyes to Your faithful thread running through every generation—including mine.",
      reflectionPrompt:
        "How does rehearsing God’s past faithfulness build courage for current opposition?",
    },
    {
      id: 'act-7b',
      start: 39,
      end: 60,
      title: "Prophets Spurned & First Martyr",
      description:
        "Golden‑calf hearts, stiff‑necked listeners, and a heaven‑opened verdict end with stones and forgiving prayer.",
      prayer:
        "Spirit of Glory, grant me Stephen’s vision of Jesus standing for me—stronger than any hostility against me.",
      reflectionPrompt:
        "What would change if you saw Jesus standing by you in today’s hardest place?",
    },
  ],

  corinthians115: [
    {
      id: 'cor-15a',
      start: 1,
      end: 34,
      title: "Resurrection Gospel & Eyewitnesses",
      description:
        "Paul delivers first importance truth—Christ died, was buried, raised, and seen by many—undergirding hope and holiness.",
      prayer:
        "Risen Lord, anchor my faith and my ethics in the unshakeable fact of Your empty tomb.",
      reflectionPrompt:
        "Which friend needs the simple, factual hope of resurrection explained?",
    },
    {
      id: 'cor-15b',
      start: 35,
      end: 58,
      title: "New Bodies & Final Victory",
      description:
        "Seeds to splendor illustrate transformed bodies; death’s sting is swallowed in triumphant shout, ‘Thanks be to God!’",
      prayer:
        "Victorious King, let future glory energise present labour—knowing nothing done for You is wasted.",
      reflectionPrompt:
        "How does believing in a glorified future body affect how you use your current one?",
    },
  ],
};


