export interface Devotional {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  context: string; // 4-5 sentences about the bible verse
  bibleReference: string;
  prayer: string | { en: string };
  reflectionPrompt: string | { en: string };
  likes: number;
  shares: number;
  completed: number;
  date: string;
  imageURL: string;
  verse: string;
  likedBy?: string[];
}

const exDevotional: Devotional = {
  id: '1',
  title: 'Devotional 1',
  content: 'Content 1',
  context: 'Context 1',
  createdAt: '2021-01-01',
  bibleReference: 'John 3:16',
  prayer: 'Prayer 1',
  reflectionPrompt: 'Reflection Prompt 1',
  likes: 0,
  shares: 0,
  completed: 0,
  date: '2021-01-01',
  imageURL: 'https://firebasestorage.googleapis.com/v0/b/shepherd-c74ad.firebasestorage.app/o/quote1.png?alt=media&token=9b400a60-d2fc-45bd-a4ca-0ac116b542bb',
  verse: "",
  likedBy: [],
};

export const devotionalBackgrounds = {
  italyOcean: 'https://firebasestorage.googleapis.com/v0/b/shepherd-c74ad.firebasestorage.app/o/%20shepBG-italyOcean.png?alt=media&token=84e3cc32-a1e4-475c-95e0-90fd8bcaf2c1',
  boardWalk: 'https://firebasestorage.googleapis.com/v0/b/shepherd-c74ad.firebasestorage.app/o/shepBG-boardWalk.png?alt=media&token=df815814-155a-4d06-874f-461e99bf6d21',
  foggyLake: 'https://firebasestorage.googleapis.com/v0/b/shepherd-c74ad.firebasestorage.app/o/shepBG-foggylake.png?alt=media&token=128cf246-b63b-4f6f-9acc-89a9c9cb5eb5',
  lakeSuperior: 'https://firebasestorage.googleapis.com/v0/b/shepherd-c74ad.firebasestorage.app/o/shepBG-lakeSuperior.png?alt=media&token=04add9d1-d600-46e7-836a-e501d1f9fb1f',
  oceanTown: 'https://firebasestorage.googleapis.com/v0/b/shepherd-c74ad.firebasestorage.app/o/shepBG-oasis.png?alt=media&token=9369a3b1-42e7-40be-9908-5f6f1da191eb',
  orangeSunset: 'https://firebasestorage.googleapis.com/v0/b/shepherd-c74ad.firebasestorage.app/o/shepBG-orangeSunset.png?alt=media&token=979d2916-49c0-48d7-8553-1f7fdea53007',
  darkRedSunset: 'https://firebasestorage.googleapis.com/v0/b/shepherd-c74ad.firebasestorage.app/o/shepBG-redSunset.png?alt=media&token=1450f378-63c5-4b0f-9b3a-f1f3848a052d',
  riverForest: 'https://firebasestorage.googleapis.com/v0/b/shepherd-c74ad.firebasestorage.app/o/shepBG-riverForest.png?alt=media&token=b440cb4c-a238-4350-a4a1-03b004b9f3c8',
  oceanCloudsBg: 'https://firebasestorage.googleapis.com/v0/b/shepherd-c74ad.firebasestorage.app/o/waterBackground.png?alt=media&token=b0266692-ada8-4ec9-98ce-a1e0a242186d'
};

// free users can get generated devotional from the api + context? => but cant chat + we need



export default exDevotional;