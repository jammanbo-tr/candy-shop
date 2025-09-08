import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';

const CardDrawModal = ({ isOpen, onClose }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnCard, setDrawnCard] = useState(null);
  const [hasDrawnCard, setHasDrawnCard] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    // localStorage 우선 체크
    if (localStorage.getItem('hasDrawnCard_' + user.uid) === 'true') {
      setHasDrawnCard(true);
      onClose();
      return;
    }
    // Firestore 체크
    const studentRef = doc(db, 'students', user.uid);
    getDoc(studentRef).then((docSnap) => {
      if (docSnap.exists() && docSnap.data().hasDrawnCard) {
        setHasDrawnCard(true);
        localStorage.setItem('hasDrawnCard_' + user.uid, 'true');
        onClose();
      }
    });
  }, [isOpen, user, onClose]);

  const handleDraw = async () => {
    setIsDrawing(true);
    setTimeout(async () => {
      const card = {
        id: Date.now(),
        type: 'reward',
        text: '축하합니다! 보상 카드를 획득했습니다!',
        exp: 50,
        receivedAt: Date.now()
      };
      setDrawnCard(card);
      const studentRef = doc(db, 'students', user.uid);
      await updateDoc(studentRef, {
        hasDrawnCard: true,
        cards: [...(user.cards || []), card]
      });
      localStorage.setItem('hasDrawnCard_' + user.uid, 'true');
      setHasDrawnCard(true);
    }, 2000);
  };

  if (!isOpen || hasDrawnCard) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000
    }}>
      <div style={{
        background: '#fff',
        padding: '32px',
        borderRadius: '16px',
        minWidth: '320px',
        textAlign: 'center'
      }}>
        <h2>카드 뽑기</h2>
        {!drawnCard ? (
          <>
            <p>오늘의 카드를 뽑아보세요!</p>
            <button
              onClick={handleDraw}
              disabled={isDrawing}
              style={{
                background: '#4CAF50',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                cursor: isDrawing ? 'not-allowed' : 'pointer',
                opacity: isDrawing ? 0.7 : 1
              }}
            >
              {isDrawing ? '뽑는 중...' : '카드 뽑기'}
            </button>
          </>
        ) : (
          <>
            <div style={{
              background: '#f5f5f5',
              padding: '24px',
              borderRadius: '12px',
              margin: '16px 0'
            }}>
              <h3>🎉 축하합니다!</h3>
              <p>{drawnCard.text}</p>
              <p>보상: {drawnCard.exp} XP</p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: '#2196F3',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              확인
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CardDrawModal; 