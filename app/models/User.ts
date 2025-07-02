import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export interface MapPathCompletion {
  date: FirebaseFirestoreTypes.Timestamp;
  pathId: string;
  pathTitle: string;
  unitId: string;
  unitTitle: string;
  bookId: number;
  startChapter: number;
  endChapter: number;
}

export interface UserDoc {
  //onboarding questions
  id: string;
  selectedPathId: string;
  email?: string; // User email from authentication
  spiritualGoal: string;
  experienceLevel: string;
  notificationTime: string;
  setNotificationTime: (time: string) => Promise<void>;
  frequencyGoal: string;
  denomination?: string;
  ageRange: string;
  displayName: string;
  username: string;
  lamb: Lamb;
  streakCount: number;
  lastActivityDate: FirebaseFirestoreTypes.Timestamp;
  versesReadTotal: number;
  chaptersReadTotal: number;
  bibleVersion: string;
  proStatus: 'free' | 'trial' | 'pro';
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
  gens: number;
  lastReadingDate: FirebaseFirestoreTypes.Timestamp;
  lastPrayerDate: FirebaseFirestoreTypes.Timestamp;
  lastReflectionDate: FirebaseFirestoreTypes.Timestamp;
  lastReadingPenaltyDate: FirebaseFirestoreTypes.Timestamp;
  lastPrayerPenaltyDate: FirebaseFirestoreTypes.Timestamp;
  lastReflectionPenaltyDate: FirebaseFirestoreTypes.Timestamp;
  completedReflections: Reflection[];
  completedPrayers: Prayer[];
  completedReadings: Reading[];
  isProFromOnboarding: boolean;
  hasSeenWidgetModal: boolean;
  hasSeenBibleReaderTutorial: boolean;
  skins: string[];
  // Check-in data - dictionary with date keys (YYYYMMDD format)
  checkIns?: {
    [dateKey: string]: {
      mood: string;
      focus: string;
      struggle: string;
      completedAt: FirebaseFirestoreTypes.Timestamp;
    };
  };
  // Progress data
  level: number;
  xp: number;
  streak: number;
  // Pro status
  isPro: boolean;
  isProWithReferral: boolean;
  proExpiryDate: FirebaseFirestoreTypes.Timestamp;
  completedMapPaths: MapPathCompletion[];
}

export interface UserStore extends UserDoc {
  // Get complete user object
  getUser: () => UserDoc;

  // Set complete user object
  setUser: (user: Partial<UserDoc>) => void;

  // Create new user
  createUser: (id: string, userData: Partial<UserDoc>) => Promise<boolean>;

  // Getters for UserDoc fields
  getSpiritualGoal: () => UserDoc['spiritualGoal'];
  getExperienceLevel: () => UserDoc['experienceLevel'];
  getFrequencyGoal: () => UserDoc['frequencyGoal'];
  getDenomination: () => UserDoc['denomination'];
  getDisplayName: () => string;
  getSelectedPathId: () => string;
  getLamb: () => Lamb;
  getStreakCount: () => number;
  getLastActivityDate: () => UserDoc['lastActivityDate'];
  getVersesReadTotal: () => number;
  getChaptersReadTotal: () => number;
  getBibleVersion: () => string;
  getProStatus: () => UserDoc['proStatus'];
  getCreatedAt: () => UserDoc['createdAt'];
  getUpdatedAt: () => UserDoc['updatedAt'];
  getGens: () => number;
  getLastReadingDate: () => UserDoc['lastReadingDate'];
  getLastPrayerDate: () => UserDoc['lastPrayerDate'];
  getLastReflectionDate: () => UserDoc['lastReflectionDate'];
  getLastReadingPenaltyDate: () => UserDoc['lastReadingPenaltyDate'];
  getLastPrayerPenaltyDate: () => UserDoc['lastPrayerPenaltyDate'];
  getLastReflectionPenaltyDate: () => UserDoc['lastReflectionPenaltyDate'];
  getCompletedReflections: () => Reflection[];
  getCompletedPrayers: () => Prayer[];
  getCompletedReadings: () => Reading[];
  getSkins: () => string[];

  // Getters for Lamb fields
  getLambLevel: () => number;
  getLambXp: () => number;
  getLambMood: () => string;
  getLambHearts: () => number;
  getLambName: () => string;
  getLambSkin: () => string;

  // Setters for UserDoc fields
  setSpiritualGoal: (goal: UserDoc['spiritualGoal']) => void;
  setExperienceLevel: (level: UserDoc['experienceLevel']) => void;
  setFrequencyGoal: (goal: UserDoc['frequencyGoal']) => void;
  setDenomination: (denomination?: string) => void;
  setDisplayName: (name: string) => void;
  setSelectedPathId: (pathId: string) => void;
  setLamb: (lamb: Lamb) => void;
  setStreakCount: (count: number) => void;
  setLastActivityDate: (date: UserDoc['lastActivityDate']) => void;
  setLastReadingDate: (date: UserDoc['lastReadingDate']) => void;
  setLastPrayerDate: (date: UserDoc['lastPrayerDate']) => void;
  setLastReflectionDate: (date: UserDoc['lastReflectionDate']) => void;
  setLastReadingPenaltyDate: (date: UserDoc['lastReadingPenaltyDate']) => void;
  setLastPrayerPenaltyDate: (date: UserDoc['lastPrayerPenaltyDate']) => void;
  setLastReflectionPenaltyDate: (date: UserDoc['lastReflectionPenaltyDate']) => void;
  setVersesReadTotal: (count: number) => void;
  setChaptersReadTotal: (count: number) => void;
  setBibleVersion: (version: string) => void;
  setProStatus: (status: UserDoc['proStatus']) => void;
  setCreatedAt: (timestamp: UserDoc['createdAt']) => void;
  setUpdatedAt: (timestamp: UserDoc['updatedAt']) => void;
  setGens: (gens: number) => void;
  setCompletedReflections: (reflections: [Reflection]) => void;
  setCompletedPrayers: (prayers: [Prayer]) => void;
  setCompletedReadings: (readings: [Reading]) => void;
  addCompletedReflection: (reflection: Reflection) => void;
  addCompletedPrayer: (prayer: Prayer) => void;
  addCompletedReading: (reading: Reading) => void;
  setSkins: (skins: string[]) => void;
  addSkin: (skin: string) => void;
  setIsProFromOnboarding: (isProFromOnboarding: boolean) => void;

  // Setters for Lamb fields
  setLambLevel: (level: number) => void;
  setLambXp: (xp: number) => void;
  setLambMood: (mood: string) => void;
  setLambHearts: (hearts: number) => void;
  setLambName: (name: string) => void;
  setLambSkin: (skin: string) => void;

  // Utility functions
  incrementStreak: () => void;
  addXp: (amount: number) => void;
  resetUserStore: () => void;

  syncFirestoreData: (firestoreData: UserDoc) => void;

  // Add new getter/setter for widget modal
  getHasSeenWidgetModal: () => boolean;
  setHasSeenWidgetModal: (hasSeen: boolean) => void;

  // Add new getter/setter for Bible Reader tutorial
  getHasSeenBibleReaderTutorial: () => boolean;
  setHasSeenBibleReaderTutorial: (hasSeen: boolean) => void;

  setCompletedMapPaths: (paths: MapPathCompletion[]) => void;
  addCompletedMapPath: (path: MapPathCompletion) => void;
  
  // Check-in getter/setter
  getCheckIns: () => UserDoc['checkIns'];
  setCheckIns: (checkIns: UserDoc['checkIns']) => Promise<void>;
  addCheckIn: (dateKey: string, checkInData: NonNullable<UserDoc['checkIns']>[string]) => Promise<void>;
}

export interface Reading {
  date: FirebaseFirestoreTypes.Timestamp;
  book: string;
  chapters: [string];
  isUnit: boolean;
}

export interface Reflection {
  date: FirebaseFirestoreTypes.Timestamp;
  content: string;
}

export interface Prayer {
  date: FirebaseFirestoreTypes.Timestamp;
  type: string;
  topic?: string; // Optional topic field for the prayer
}

export interface Lamb {
  level: number;
  xp: number;
  mood: string; // lamb-idle, lamb-eating, lamb-drinking, lamb-full, lamb-writing
  // inactive states:
  // <50 hearts lamb-sleepy,
  // <30 hearts lamb-angry,
  // <20 hearts lamb-chubby dying,
  // <10 hearts: lamb-skinny dying,
  // <1 hearts: smoking
  hearts: number;
  name: string;
  skin: string;
}

// Default export for Expo Router compatibility
export default {}
