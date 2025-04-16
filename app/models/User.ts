import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';



export interface UserDoc {
    displayName: string;
    denomination?: string;
    spiritualGoal: 'Walk' | 'Overcome' | 'Understand' | 'Explore';
    experienceLevel: 'new' | 'growing' | 'mature';
    frequencyGoal: 'daily' | 'weekly';
    selectedPathId: string;
    lamb: { level: number; xp: number; mood: string; hunger: number };
    streakCount: number;
    lastActivityDate: FirebaseFirestoreTypes.Timestamp;
    versesReadTotal: number;
    chaptersReadTotal: number;
    bibleVersion: string;
    proStatus: 'free' | 'trial' | 'pro';
    createdAt: FirebaseFirestoreTypes.Timestamp;
    updatedAt: FirebaseFirestoreTypes.Timestamp;
}