import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Reward } from '../types/rewards';
import { getRandomReward, giveReward } from '../services/rewardService';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface CardDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CardDrawModal: React.FC<CardDrawModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [reward, setReward] = useState<Reward | null>(null);
  const [hasDrawnCard, setHasDrawnCard] = useState(false);

  useEffect(() => {
    if (!user || !isOpen) return;
    // 1. 로컬스토리지 체크
    if (localStorage.getItem('hasDrawnCard_' + user.uid) === 'true') {
      setHasDrawnCard(true);
      onClose();
      return;
    }
    // 2. Firestore 실시간 체크
    const studentRef = doc(db, 'students', user.uid);
    const unsubscribe = onSnapshot(studentRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.hasDrawnCard) {
          setHasDrawnCard(true);
          localStorage.setItem('hasDrawnCard_' + user.uid, 'true');
          onClose();
        }
      }
    });
    return () => unsubscribe();
  }, [isOpen, user, onClose]);

  const handleCardClick = async (index: number) => {
    if (selectedCard !== null || !user || hasDrawnCard) return;
    setSelectedCard(index);
    setIsFlipping(true);
    const selectedReward = getRandomReward();
    setReward(selectedReward);
    try {
      await giveReward(user.uid, selectedReward);
      setHasDrawnCard(true);
      localStorage.setItem('hasDrawnCard_' + user.uid, 'true');
    } catch (error) {
      console.error('Failed to give reward:', error);
    }
  };

  const handleAnimationComplete = () => {
    if (isFlipping) {
      setTimeout(() => {
        onClose();
        // Reset state
        setSelectedCard(null);
        setIsFlipping(false);
        setReward(null);
      }, 3000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4"
          >
            <h2 className="text-2xl font-bold text-center mb-6">레벨업 축하합니다! 🎉</h2>
            <p className="text-center mb-8">카드 3장 중 1장을 선택하세요</p>
            
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  className="relative aspect-[3/4] cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleCardClick(index)}
                >
                  <motion.div
                    className="w-full h-full"
                    initial={false}
                    animate={{
                      rotateY: selectedCard === index && isFlipping ? 180 : 0,
                    }}
                    transition={{ duration: 0.6 }}
                    onAnimationComplete={handleAnimationComplete}
                  >
                    <div className="absolute inset-0 backface-hidden">
                      <img
                        src="/cardback.png"
                        alt="Card Back"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    {selectedCard === index && reward && (
                      <div className="absolute inset-0 backface-hidden rotate-180">
                        <div className="w-full h-full bg-white rounded-lg p-4 flex flex-col items-center justify-center">
                          <div className="flex flex-col items-center">
                            <img
                              src={reward.image}
                              alt={reward.name}
                              className="w-24 h-24 object-contain mb-4"
                            />
                            <p className="text-xl font-bold text-center">{reward.name}</p>
                            <p className="text-sm text-gray-600 text-center mt-2">
                              {reward.type === 'money' ? '입금되었습니다' : '쿠폰함에 저장되었습니다'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 