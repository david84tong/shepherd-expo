export const WORKOUT_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export const ONBOARDING_STORAGE_KEY = '@onboarding_responses';
export const ONBOARDING_COMPLETED_KEY = '@onboarding_completed';
export const ONBOARDING_PAGES = [
  'welcome',
  '1',
  '1a',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  'auth',
];

export type OnboardingResponses = {
  /** Track which onboarding screen the user is on */
  currentScreen?: string;

  /* ────────── PHASE 1 ────────── */

  /** Screen 2 – "What brings you here today?" */
  intent?: 'read-bible' | 'talk-to-god' | 'just-exploring';

  /** Screen 4 – "This journey is rooted in the way of Jesus." */
  jesusOrientation?: 'sounds-good' | 'learn-more-first' | 'not-sure-yet';

  /** Screen 5 – "In one word, how would you describe your spiritual season?" */
  spiritualSeasonWord?: string;

  /** Screen 6 - "Which of these do you prescribe to?" */
  religiousAffiliation?:
    | 'protestant'
    | 'catholic'
    | 'orthodox'
    | 'evangelical'
    | 'jewish'
    | 'agnostic'
    | 'spiritual'
    | 'other'
    | 'prefer-not-to-say';

  /** Screen 7 - "When would you like to receive notifications?" */
  notificationPreference?: 'morning' | 'afternoon' | 'evening' | 'night';

  /** Screen 9 - "What is your age range?" */
  ageRange?:
    | 'under-18'
    | '18-24'
    | '25-34'
    | '35-44'
    | '45-54'
    | '55-64'
    | '65-plus'
    | 'prefer-not-to-say';

  /** Screen 8 - "Choose Your Path" */
  selectedPath?: 'walk-in-light' | 'way-of-wisdom' | 'overcoming' | 'knowing-jesus';

  /* ────────── PHASE 2 – Sorting Quiz ────────── */

  /** Screen 6 – "What brings you here spiritually?"  */
  pathAffinity?:
    | 'understand-full-bible'
    | 'healing'
    | 'struggling-with-guilt'
    | 'exploring-christianity'
    | 'daily-encouragement';

  /** Screen 7 – "How much of the Bible have you read before?" */
  bibleFamiliarity?: 'never' | 'a-little' | 'a-lot';
  frequencyGoal?: '1-5' | '6-10' | '11-15' | '15-25';

  /** Screen 8 – "How comfortable are you with prayer?" */
  prayerConfidence?: 'pray-regularly' | 'sometimes' | 'never-prayed';

  /** Screen 9 – "What tends to get in the way of staying consistent?" */
  consistencyObstacle?:
    | 'forget'
    | 'feel-guilt'
    | 'dont-know-where-to-start'
    | 'lose-motivation'
    | 'feel-unworthy';

  /* ────────── PHASE 3 ────────── */

  /** Screen 16 – "What will you name your lamb?" */
  lambName?: string;
  username?: string;

  /* ────────── PHASE 5 ────────── */

  /** Screen 24 – "Would you like to commit to showing up daily?" */
  streakCommitment?: 'daily' | 'own-pace' | 'remind-occasionally';

  /* ────────── META ────────── */

  /** ISO-8601 timestamp when onboarding is finished */
  completedAt?: string;

  /** Flag indicating whether the user has rated the app */
  appRated?: boolean;
};

/* ---------- OPTIONAL: blank initial state helper ---------- */

export const shepherdOnboardingInitialState: OnboardingResponses = {
  currentScreen: 'welcome',
  intent: undefined,
  jesusOrientation: undefined,
  spiritualSeasonWord: undefined,
  religiousAffiliation: undefined,
  pathAffinity: undefined,
  bibleFamiliarity: undefined,
  prayerConfidence: undefined,
  consistencyObstacle: undefined,
  lambName: undefined,
  streakCommitment: undefined,
  completedAt: undefined,
  appRated: false,
};
