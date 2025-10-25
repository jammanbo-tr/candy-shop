import React, { useState, useEffect } from 'react';
import AvatarDisplay from './AvatarDisplay';
import { categories, getItemsByCategory } from '../data/avatarItems';

/**
 * 아바타 꾸미기 컴포넌트
 * @param {Object} student - 학생 데이터
 * @param {Function} onSave - 저장 콜백
 * @param {Function} onClose - 닫기 콜백
 */
const AvatarCustomizer = ({ student, onSave, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState('head');
  const [currentAvatar, setCurrentAvatar] = useState({
    head: '',
    face: '',
    body: '',
    accessory: '',
    background: ''
  });

  // 학생의 현재 아바타 정보 로드
  useEffect(() => {
    if (student.avatar) {
      setCurrentAvatar({
        head: student.avatar.head || '',
        face: student.avatar.face || '',
        body: student.avatar.body || '',
        accessory: student.avatar.accessory || '',
        background: student.avatar.background || ''
      });
    }
  }, [student]);

  const ownedItems = student.ownedItems || [];

  // 카테고리별 보유 아이템 필터링
  const categoryItems = getItemsByCategory(selectedCategory).filter(item =>
    ownedItems.includes(item.id)
  );

  // 아이템 장착/해제
  const handleItemClick = (itemId) => {
    setCurrentAvatar(prev => {
      // 이미 착용 중이면 해제
      if (prev[selectedCategory] === itemId) {
        return { ...prev, [selectedCategory]: '' };
      }
      // 새로운 아이템 착용
      return { ...prev, [selectedCategory]: itemId };
    });
  };

  // 저장
  const handleSave = async () => {
    try {
      await onSave(currentAvatar);
    } catch (error) {
      console.error('아바타 저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  // 초기화
  const handleReset = () => {
    setCurrentAvatar({
      head: '',
      face: '',
      body: '',
      accessory: '',
      background: ''
    });
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
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <h2 style={{ margin: 0, color: '#1976d2', fontSize: '1.5rem', fontWeight: 700 }}>
            ✨ 아바타 꾸미기
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

        {/* 메인 컨텐츠 */}
        <div style={{
          display: 'flex',
          gap: 24,
          flex: 1,
          overflow: 'hidden',
          flexDirection: window.innerWidth < 768 ? 'column' : 'row'
        }}>
          {/* 왼쪽: 아바타 미리보기 */}
          <div style={{
            flex: '0 0 300px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            borderRadius: 16,
            padding: 24
          }}>
            <AvatarDisplay avatar={currentAvatar} size={220} />

            {/* 액션 버튼 */}
            <div style={{
              marginTop: 20,
              display: 'flex',
              gap: 8,
              width: '100%'
            }}>
              <button
                onClick={handleReset}
                style={{
                  flex: 1,
                  background: '#ff9800',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                초기화
              </button>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                저장
              </button>
            </div>
          </div>

          {/* 오른쪽: 아이템 선택 */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
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
                    padding: '10px 16px',
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 12,
              padding: 4
            }}>
              {categoryItems.length === 0 ? (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  color: '#999',
                  padding: 40,
                  fontSize: '0.95rem'
                }}>
                  보유한 {categories.find(c => c.id === selectedCategory)?.name} 아이템이 없습니다.
                  <br />
                  <span style={{ fontSize: '0.85rem' }}>상점에서 아이템을 구매해보세요!</span>
                </div>
              ) : (
                categoryItems.map(item => {
                  const isEquipped = currentAvatar[selectedCategory] === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      style={{
                        background: isEquipped ? '#e3f2fd' : '#fff',
                        border: `2px solid ${isEquipped ? '#1976d2' : '#e0e0e0'}`,
                        borderRadius: 12,
                        padding: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                    >
                      {/* 착용 표시 */}
                      {isEquipped && (
                        <div style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          background: '#1976d2',
                          color: '#fff',
                          borderRadius: 4,
                          padding: '2px 6px',
                          fontSize: '0.65rem',
                          fontWeight: 600
                        }}>
                          ✓ 착용
                        </div>
                      )}

                      {/* 아이템 이미지 */}
                      <div style={{
                        width: 70,
                        height: 70,
                        borderRadius: 8,
                        background: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                        fontSize: '2rem'
                      }}>
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.textContent = '🎁';
                          }}
                        />
                      </div>

                      {/* 아이템 이름 */}
                      <div style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#333',
                        textAlign: 'center'
                      }}>
                        {item.name}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarCustomizer;
