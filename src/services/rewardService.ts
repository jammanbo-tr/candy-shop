import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { Reward, REWARDS } from '../types/rewards';

export const getRandomReward = (): Reward => {
  const random = Math.random();
  let cumulativeProbability = 0;

  for (const reward of REWARDS) {
    cumulativeProbability += reward.probability;
    if (random <= cumulativeProbability) {
      return reward;
    }
  }

  // Fallback to first reward (should never happen if probabilities sum to 1)
  return REWARDS[0];
};

export const giveReward = async (userId: string, reward: Reward): Promise<void> => {
  const studentRef = doc(db, 'students', userId);

  if (reward.type === 'money') {
    await updateDoc(studentRef, {
      balance: increment(reward.value),
      transactions: arrayUnion({
        type: 'reward',
        amount: reward.value,
        description: `레벨업 보상: ${reward.name}`,
        timestamp: new Date(),
      }),
      hasDrawnCard: true,
    });
  } else {
    await updateDoc(studentRef, {
      coupons: arrayUnion({
        id: reward.id,
        name: reward.name,
        image: reward.image,
        receivedAt: new Date(),
        used: false,
      }),
      hasDrawnCard: true,
    });
  }
}; 