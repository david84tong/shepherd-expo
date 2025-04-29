export const ONBOARDING_STORAGE_KEY = '@shepherd/onboarding';
export const ONBOARDING_COMPLETED_KEY = '@shepherd/onboarding_completed';

export interface OnboardingResponse {
  welcome: boolean;
  name: string;
  goals: string[];
  notifications: boolean;
}

export type OnboardingPageId = keyof OnboardingResponse;

export interface OnboardingPage {
  id: OnboardingPageId;
  title: string;
  description: string;
}

export const ONBOARDING_PAGES: OnboardingPage[] = [
  {
    id: 'welcome',
    title: 'Welcome to Shepherd',
    description: 'Your daily companion for spiritual growth',
  },
  {
    id: 'name',
    title: 'What should we call you?',
    description: 'Enter your name so we can personalize your experience',
  },
  {
    id: 'goals',
    title: 'Set Your Goals',
    description: 'What would you like to achieve in your spiritual journey?',
  },
  {
    id: 'notifications',
    title: 'Stay Connected',
    description: 'Enable notifications to receive daily reminders and encouragement',
  },
] 