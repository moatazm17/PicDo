import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { getOnboardingCompleted } from '../src/utils/storage';

export default function IndexScreen() {
  const [isOnboarded, setIsOnboarded] = useState(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await getOnboardingCompleted();
      setIsOnboarded(completed);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboarded(false);
    }
  };

  if (isOnboarded === null) {
    return null; // Loading
  }

  if (!isOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
