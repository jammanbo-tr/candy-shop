import React, { useState } from 'react';
import { avatarItems, categories, canPurchaseItem } from '../data/avatarItems';

/**
 * 아바타 아이템 상점 컴포넌트
 * @param {Object} student - 학생 데이터 (level, ownedItems, exp)
 * @param {Function} onPurchase - 아이템 구매 콜백 (itemId, price)
 * @param {Function} onClose - 모달 닫기 콜백
 */
const ItemShop = ({ student, onPurchase, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState('head');
  const [purchaseMessage, setPurchaseMessage] = useState('');

  // 카테고리별 아이템 필터링
  const filteredItems = avatarItems.filter(item => item.category === selectedCategory);

  // 포인트는 경험치(exp)를 사용
  const userPoints = student.exp || 0;
  const userLevel = student.level || 0;
  const ownedItems = student.ownedItems || [];

  const handlePurchase = async (item) => {
    // 이미 보유한 아이템인지 확인
    if (ownedItems.includes(item.id)) {
      setPurchaseMessage('이미 보유한 아이템입니다!');
      setTimeout(() => setPurchaseMessage(''), 2000);
      return;
    }

    // 레벨 제한 확인
    if (!canPurchaseItem(item, userLevel)) {
      setPurchaseMessage(`레벨 ${item.level} 이상 필요합니다!`);
      setTimeout(() => setPurchaseMessage(''), 2000);
      return;
    }

    // 포인트 부족 확인
    if (userPoints < item.price) {
      setPurchaseMessage('경험치가 부족합니다!');
      setTimeout(() => setPurchaseMessage(''), 2000);
      return;
    }

    // 구매 처리
    try {
      await onPurchase(item.id, item.price);
      setPurchaseMessage(`${item.name} 구매 완료!`);
      setTimeout(() => setPurchaseMessage(''), 2000);
    } catch (error) {
      console.error('구매 실패:', error);
      setPurchaseMessage('구매 중 오류가 발생했습니다.');
      setTimeout(() => setPurchaseMessage(''), 2000);
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
        zIndex: 2000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: 24,
          maxWidth: 800,
          width: '90%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0, color: '#1976d2', fontSize: '1.5rem', fontWeight: 700 }}>
              🏪 아바타 상점
            </h2>
            <button
              onClick={onClose}
              style={{
                background: '#f5f5f5',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#666',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              닫기
            </button>
          </div>

          {/* 포인트 표시 */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 12,
            padding: '12px 16px',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>보유 경험치</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>✨ {userPoints} XP</span>
          </div>
        </div>

        {/* 구매 메시지 */}
        {purchaseMessage && (
          <div style={{
            background: '#e3f2fd',
            color: '#1976d2',
            padding: '8px 12px',
            borderRadius: 8,
            marginBottom: 12,
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}>
            {purchaseMessage}
          </div>
        )}

        {/* 카테고리 탭 */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          overflowX: 'auto',
          paddingBottom: 8
        }}>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                background: selectedCategory === category.id ? '#1976d2' : '#f5f5f5',
                color: selectedCategory === category.id ? '#fff' : '#666',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>

        {/* 아이템 그리드 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 12,
          padding: 4
        }}>
          {filteredItems.map(item => {
            const isOwned = ownedItems.includes(item.id);
            const canPurchase = canPurchaseItem(item, userLevel) && userPoints >= item.price;
            const isLocked = !canPurchaseItem(item, userLevel);

            return (
              <div
                key={item.id}
                style={{
                  background: isOwned ? '#e8f5e9' : '#fff',
                  border: `2px solid ${isOwned ? '#4caf50' : isLocked ? '#ccc' : '#e3f2fd'}`,
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  opacity: isLocked ? 0.6 : 1
                }}
              >
                {/* 잠금 표시 */}
                {isLocked && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: '#ff9800',
                    color: '#fff',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }}>
                    🔒 Lv.{item.level}
                  </div>
                )}

                {/* 보유 표시 */}
                {isOwned && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: '#4caf50',
                    color: '#fff',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }}>
                    ✓ 보유
                  </div>
                )}

                {/* 아이템 이미지 */}
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                  fontSize: '2.5rem'
                }}>
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                    onError={(e) => {
                      // 이미지 로드 실패 시 placeholder
                      e.target.style.display = 'none';
                      e.target.parentElement.textContent = '🎁';
                    }}
                  />
                </div>

                {/* 아이템 정보 */}
                <div style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#333',
                  marginBottom: 4,
                  textAlign: 'center'
                }}>
                  {item.name}
                </div>

                <div style={{
                  fontSize: '0.75rem',
                  color: '#999',
                  marginBottom: 8,
                  textAlign: 'center',
                  lineHeight: 1.3
                }}>
                  {item.description}
                </div>

                {/* 구매 버튼 */}
                {!isOwned && (
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={!canPurchase}
                    style={{
                      width: '100%',
                      background: canPurchase ? '#1976d2' : '#e0e0e0',
                      color: canPurchase ? '#fff' : '#999',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: canPurchase ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isLocked ? `Lv.${item.level} 필요` : `${item.price} XP`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ItemShop;
