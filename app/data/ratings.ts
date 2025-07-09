export interface Rating {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  rating: number;
  comment: string;
  duration?: string;
}

export const testimonials: Rating[] = [
  {
    id: '1',
    name: 'Michael Stevens',
    handle: '@michaels',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
    rating: 5,
    comment: "The daily devotionals and prayer tracking have transformed my spiritual journey. I feel more connected to God than ever before.",
    duration: '1 month'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    handle: '@sarahj',
    avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg',
    rating: 4.5,
    comment: "This app has helped me establish a consistent Bible reading habit. The progress tracking is incredibly motivating!",
    duration: '1 month'
  },
  {
    id: '3',
    name: 'David Williams',
    handle: '@davidw',
    avatar: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg',
    rating: 4.5,
    comment: "The prayer journaling feature has been transformative. I love seeing my spiritual growth over time.",
    duration: '30 days'
  }
]; 