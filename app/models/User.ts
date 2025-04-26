import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export interface UserDoc {
    //onboarding questions
    spiritualGoal: 'Walk' | 'Overcome' | 'Understand' | 'Explore';
    experienceLevel: 'new' | 'growing' | 'mature';
    frequencyGoal: 'daily' | 'weekly';
    denomination?: string;
    displayName: string;
    selectedPathId: string;
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
    completedReflections: [Reflection];
    completedPrayers: [Prayer];
    completedReadings: [Reading];
}

export interface Reading {
    date: FirebaseFirestoreTypes.Timestamp;
    completed: string; // book:chapter
}

export interface Reflection {
    date: FirebaseFirestoreTypes.Timestamp;
    content: string;
}

export interface Prayer {
    date: FirebaseFirestoreTypes.Timestamp;
    type: string;
}


export interface Lamb {
    level: number;
    xp: number;
    mood: string;
    hearts: number;
    name: string;
    skin: string;
}