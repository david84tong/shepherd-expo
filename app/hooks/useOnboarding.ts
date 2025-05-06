import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

import { useStore } from '../stores/store';
import {
  ONBOARDING_PAGES,
  OnboardingResponse,
  OnboardingPageId,
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_COMPLETED_KEY,
} from '../types/onboarding';

export const useOnboarding = () => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const { onboardingResponse, setOnboardingResponse } = useStore();

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      setIsCompleted(completed === 'true');

      const savedResponse = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (savedResponse) {
        setOnboardingResponse(JSON.parse(savedResponse));
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const getCurrentPage = useCallback(() => {
    return ONBOARDING_PAGES[currentPageIndex];
  }, [currentPageIndex]);

  const goToNextPage = useCallback(() => {
    if (currentPageIndex < ONBOARDING_PAGES.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  }, [currentPageIndex]);

  const goToPreviousPage = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  }, [currentPageIndex]);

  const handleResponse = useCallback(
    async (pageId: OnboardingPageId, value: OnboardingResponse[OnboardingPageId]) => {
      try {
        const updatedResponse = {
          ...onboardingResponse,
          [pageId]: value,
        };
        setOnboardingResponse(updatedResponse);
        await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(updatedResponse));
      } catch (error) {
        console.error('Error saving onboarding response:', error);
      }
    },
    [onboardingResponse, setOnboardingResponse]
  );

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      setIsCompleted(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }, []);

  const resetOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([ONBOARDING_COMPLETED_KEY, ONBOARDING_STORAGE_KEY]);
      setIsCompleted(false);
      setCurrentPageIndex(0);
      setOnboardingResponse({} as OnboardingResponse);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  }, [setOnboardingResponse]);

  return {
    currentPage: getCurrentPage(),
    isCompleted,
    goToNextPage,
    goToPreviousPage,
    handleResponse,
    completeOnboarding,
    resetOnboarding,
    response: onboardingResponse,
  };
};
