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
  verse: ""
};


// free users can get generated devotional from the api + context? => but cant chat + we need



export default exDevotional;