import React, { useState } from 'react';
import ItemShop from './ItemShop';
import AvatarCustomizer from './AvatarCustomizer';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * 아바타 시스템 통합 모달
 * 상점과 꾸미기를 탭으로 전환할 수 있는 통합 인터페이스
 */
const AvatarSystemModal = ({ student, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('shop'); // 'shop' | 'customize'

  // 아이템 구매 처리
  const handlePurchase = async (itemId, price) => {
    try {
      const studentRef = doc(db, 'students', student.id);

      // 경험치 차감 및 아이템 추가
      await updateDoc(studentRef, {
        exp: (student.exp || 0) - price,
        ownedItems: arrayUnion(itemId)
      });

      console.log('아이템 구매 완료:', itemId);

      // 부모 컴포넌트에 업데이트 알림
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('구매 처리 실패:', error);
      throw error;
    }
  };

  // 아바타 저장 처리
  const handleSaveAvatar = async (avatarData) => {
    try {
      const studentRef = doc(db, 'students', student.id);

      await updateDoc(studentRef, {
        avatar: avatarData
      });

      console.log('아바타 저장 완료:', avatarData);

      // 부모 컴포넌트에 업데이트 알림
      if (onUpdate) {
        onUpdate();
      }

      alert('아바타가 저장되었습니다!');
      onClose();
    } catch (error) {
      console.error('아바타 저장 실패:', error);
      throw error;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: 0,
          maxWidth: 900,
          width: '90%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 탭 헤더 */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #e0e0e0',
          background: '#f5f5f5'
        }}>
          <button
            onClick={() => setActiveTab('shop')}
            style={{
              flex: 1,
              padding: '16px 24px',
              background: activeTab === 'shop' ? '#fff' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'shop' ? '3px solid #1976d2' : 'none',
              color: activeTab === 'shop' ? '#1976d2' : '#666',
              fontSize: '1.1rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              borderTopLeftRadius: 20
            }}
          >
            🏪 아이템 상점
          </button>
          <button
            onClick={() => setActiveTab('customize')}
            style={{
              flex: 1,
              padding: '16px 24px',
              background: activeTab === 'customize' ? '#fff' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'customize' ? '3px solid #1976d2' : 'none',
              color: activeTab === 'customize' ? '#1976d2' : '#666',
              fontSize: '1.1rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              borderTopRightRadius: 20
            }}
          >
            ✨ 아바타 꾸미기
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'shop' ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <ItemShop
                student={student}
                onPurchase={handlePurchase}
                onClose={onClose}
              />
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <AvatarCustomizer
                student={student}
                onSave={handleSaveAvatar}
                onClose={onClose}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarSystemModal;
