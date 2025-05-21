import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface LevelUpState {
  isLevelUp: boolean;
  showCardModal: boolean;
  currentLevel: number;
  previousLevel: number;
}

export const useLevelUp = () => {
  const { user } = useAuth();
  const [levelUpState, setLevelUpState] = useState<LevelUpState>({
    isLevelUp: false,
    showCardModal: false,
    currentLevel: 0,
    previousLevel: 0,
  });

  useEffect(() => {
    if (!user) return;

    const studentRef = doc(db, 'students', user.uid);
    const unsubscribe = onSnapshot(studentRef, (doc) => {
      if (!doc.exists()) return;

      const data = doc.data();
      const currentLevel = Math.floor(data.experience / 100) + 1;
      const previousLevel = levelUpState.currentLevel;

      if (currentLevel > previousLevel && previousLevel !== 0) {
        setLevelUpState({
          isLevelUp: true,
          showCardModal: true,
          currentLevel,
          previousLevel,
        });
      } else {
        setLevelUpState(prev => ({
          ...prev,
          currentLevel,
          previousLevel,
        }));
      }
    });

    return () => unsubscribe();
  }, [user]);

  const closeCardModal = () => {
    setLevelUpState(prev => ({
      ...prev,
      showCardModal: false,
      isLevelUp: false,
    }));
  };

  return {
    ...levelUpState,
    closeCardModal,
  };
}; 