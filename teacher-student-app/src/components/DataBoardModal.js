import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const DataBoardModal = ({ isOpen, onClose, defaultPeriod = '1교시' }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);
  const [journalData, setJournalData] = useState([]);
  const [studentsData, setStudentsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [cardPositions, setCardPositions] = useState({});
  const [draggedCard, setDraggedCard] = useState(null);
  const [recommendations, setRecommendations] = useState({});

  const PERIODS = ['1교시', '2교시', '3교시', '4교시', '5교시', '6교시'];

  // 학생별 레벨 아이콘 매핑
  const getStudentIcon = (studentName) => {
    const iconMap = {
      '김규민': '🧪',
      '김범준': '🍭',  
      '김성준': '🎯',
      '김수겸': '🎮',
      '김주원': '👑',
      '김주하': '🌟',
      '이해원': '🎨',
      '문기훈': '🚀',
      '박동하': '🎵',
      '백주원': '🏆',
    };
    return iconMap[studentName] || '🎭';
  };

  // 오늘 날짜 구하기 (한국 시간 기준)
  const getKoreaDate = () => {
    const now = new Date();
    const koreaNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    return koreaNow.toISOString().split('T')[0];
  };

  // 카드 초기 위치 설정 (이전 크기로 복원)
  const getInitialPosition = (index) => {
    const cardsPerRow = 3;
    const cardWidth = 360; // 414에서 360으로 복원
    const cardHeight = 360; // 414에서 360으로 복원
    const gap = 20;
    const startX = 40;
    const startY = 40;
    
    const row = Math.floor(index / cardsPerRow);
    const col = index % cardsPerRow;
    
    return {
      x: startX + col * (cardWidth + gap),
      y: startY + row * (cardHeight + gap)
    };
  };

  // 학생 데이터 로딩
  const loadStudentData = async (studentName) => {
    if (studentsData[studentName]) return studentsData[studentName];
    
    try {
      const studentRef = doc(db, 'students', studentName);
      const studentDoc = await getDoc(studentRef);
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        setStudentsData(prev => ({ ...prev, [studentName]: data }));
        return data;
      }
    } catch (error) {
      console.error('Error loading student data:', error);
    }
    return null;
  };

  // 추천 데이터 로딩
  const loadRecommendations = async () => {
    if (!isOpen) return;
    
    try {
      const today = getKoreaDate();
      const recommendationsRef = doc(db, `recommendations/${today}`);
      const unsubscribe = onSnapshot(recommendationsRef, (docSnap) => {
        if (docSnap.exists()) {
          setRecommendations(docSnap.data() || {});
        } else {
          setRecommendations({});
        }
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error loading recommendations:', error);
      return () => {};
    }
  };

  // 추천하기 함수
  const handleRecommend = async (journalId, studentName) => {
    const currentUser = '선생님'; // 실제로는 현재 로그인된 사용자 정보를 사용
    
    try {
      const today = getKoreaDate();
      const recommendationsRef = doc(db, `recommendations/${today}`);
      
      const currentRecs = recommendations[journalId] || [];
      const hasRecommended = currentRecs.includes(currentUser);
      
      if (hasRecommended) {
        // 추천 취소
        await updateDoc(recommendationsRef, {
          [journalId]: arrayRemove(currentUser)
        });
      } else {
        // 추천 추가
        await setDoc(recommendationsRef, {
          [journalId]: arrayUnion(currentUser)
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error updating recommendation:', error);
    }
  };

  // 학습일지 데이터 실시간 로딩
  useEffect(() => {
    if (!isOpen) return;

    const today = getKoreaDate();
    const journalsRef = collection(db, `journals/${today}/entries`);
    const q = query(journalsRef, where('period', '==', selectedPeriod));

    const unsubscribeJournals = onSnapshot(q, async (querySnapshot) => {
      const data = [];
      const promises = [];
      
      querySnapshot.forEach((doc) => {
        const journalData = { id: doc.id, ...doc.data() };
        data.push(journalData);
        // 각 학생의 데이터도 미리 로드
        promises.push(loadStudentData(journalData.studentName));
      });
      
      await Promise.all(promises);
      setJournalData(data);
      
      // 카드 위치 초기화
      const newPositions = {};
      data.forEach((journal, index) => {
        if (!cardPositions[journal.id]) {
          newPositions[journal.id] = getInitialPosition(index);
        }
      });
      if (Object.keys(newPositions).length > 0) {
        setCardPositions(prev => ({ ...prev, ...newPositions }));
      }
      
      setLoading(false);
    });
    
    // 추천 데이터도 로딩
    const unsubscribeRecommendations = loadRecommendations();

    return () => {
      unsubscribeJournals();
      if (typeof unsubscribeRecommendations === 'function') {
        unsubscribeRecommendations();
      }
    };
  }, [selectedPeriod, isOpen]);

  // 모달이 열릴 때 defaultPeriod로 설정
  useEffect(() => {
    if (isOpen) {
      setSelectedPeriod(defaultPeriod);
    }
  }, [isOpen, defaultPeriod]);

  // 학습일지 카드 컴포넌트
  const JournalCard = ({ journal, index }) => {
    const studentIcon = getStudentIcon(journal.studentName);
    const studentData = studentsData[journal.studentName];
    const studentLevel = studentData?.level || 1;
    const position = cardPositions[journal.id] || getInitialPosition(index);
    
    console.log(`Student: ${journal.studentName}, Level: ${studentLevel}, Data:`, studentData);
    
    const handleMouseDown = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      
      setDraggedCard({ id: journal.id, offsetX, offsetY });
      
      const handleMouseMove = (e) => {
        const containerRect = document.querySelector('.data-board-container').getBoundingClientRect();
        const cardWidth = 360;
        const cardHeight = 360;
        const newX = e.clientX - containerRect.left - offsetX;
        const newY = e.clientY - containerRect.top - offsetY;
        
        // 컨테이너 경계 내에서만 이동 가능하도록 제한
        const maxX = containerRect.width - cardWidth;
        const maxY = containerRect.height - cardHeight;
        
        setCardPositions(prev => ({
          ...prev,
          [journal.id]: { 
            x: Math.max(0, Math.min(newX, maxX)), 
            y: Math.max(0, Math.min(newY, maxY)) 
          }
        }));
      };
      
      const handleMouseUp = () => {
        setDraggedCard(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };
    
    return (
      <div 
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          width: '360px', // 414에서 360으로 복원
          height: '360px', // 414에서 360으로 복원
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
          border: (() => {
            const recCount = recommendations[journal.id]?.length || 0;
            if (recCount >= 3) return '3px solid #ff6b35'; // 주황색 - 많은 추천
            if (recCount >= 2) return '3px solid #4ecdc4'; // 청록색 - 보통 추천  
            if (recCount >= 1) return '3px solid #95e1d3'; // 연한 청록색 - 적은 추천
            return '2px solid #e8eaed'; // 기본색
          })(),
          transition: draggedCard?.id === journal.id ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'move',
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          overflow: 'hidden',
          fontSize: '16px',
          display: 'flex',
          flexDirection: 'column',
          userSelect: 'none',
          zIndex: draggedCard?.id === journal.id ? 1000 : 1
        }}
        onMouseDown={handleMouseDown}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px) scale(1.05)';
        e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.2)';
        e.currentTarget.style.borderColor = '#4285f4';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
        e.currentTarget.style.borderColor = '#e8eaed';
      }}
      >
        {/* 배경 장식 */}
        <div style={{
          position: 'absolute',
          top: '-25px',
          right: '-25px',
          width: '80px',
          height: '80px',
          background: `linear-gradient(135deg, ${studentLevel <= 3 ? '#4caf50' : studentLevel <= 6 ? '#ff9800' : studentLevel <= 9 ? '#e91e63' : '#9c27b0'}, ${studentLevel <= 3 ? '#8bc34a' : studentLevel <= 6 ? '#ffc107' : studentLevel <= 9 ? '#f06292' : '#ba68c8'})`,
          borderRadius: '50%',
          opacity: 0.1
        }} />
        
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '14px',
          position: 'relative',
          zIndex: 1
        }}>
          {/* 레벨 이미지 */}
          <div style={{
            width: '50px',
            height: '50px',
            marginRight: '16px',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            border: '2px solid #fff'
          }}>
            <img 
              src={`/lv${studentLevel}.png`} 
              alt={`Level ${studentLevel}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                // 이미지 로드 실패시 기본 아이콘 표시
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f0f0f0;font-size:20px;">${studentIcon}</div>`;
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              margin: 0,
              fontSize: '19px',
              fontWeight: 'bold',
              color: '#2c3e50',
              marginBottom: '2px'
            }}>
              {journal.studentName}
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                fontSize: '13px',
                color: '#666',
                fontWeight: '500',
                background: '#f5f5f5',
                padding: '3px 10px',
                borderRadius: '6px'
              }}>
                Lv.{studentLevel}
              </span>
              <span style={{
                fontSize: '13px',
                color: '#666',
                fontWeight: '500'
              }}>
                {journal.period} • {new Date(journal.createdAt?.seconds * 1000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* 추천 버튼 */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{
            fontSize: '12px',
            color: '#666',
            fontWeight: 'bold'
          }}>
            {recommendations[journal.id]?.length || 0}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRecommend(journal.id, journal.studentName);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px',
              borderRadius: '50%',
              transition: 'transform 0.2s',
              filter: recommendations[journal.id]?.includes('선생님') ? 'none' : 'grayscale(100%)',
              transform: 'scale(1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            👍
          </button>
        </div>

        {/* 학습일지 내용 */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* 핵심 키워드 */}
          {journal.keyword && (
            <div style={{
              marginBottom: '12px',
              padding: '10px 12px',
              backgroundColor: 'rgba(255, 152, 0, 0.08)',
              borderRadius: '8px',
              borderLeft: '3px solid #ff9800',
              boxShadow: '0 2px 6px rgba(255, 152, 0, 0.1)'
            }}>
              <h4 style={{
                margin: '0 0 6px 0',
                fontSize: '13px',
                color: '#f57c00',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                🔑 핵심 키워드
              </h4>
              <p style={{
                margin: 0,
                fontSize: '17px',
                fontWeight: 'bold',
                color: '#e65100',
                lineHeight: '1.2'
              }}>
                {journal.keyword}
              </p>
            </div>
          )}

          {/* 학습 내용 */}
          {journal.content && (
            <div style={{
              marginBottom: '12px',
              padding: '10px 12px',
              backgroundColor: 'rgba(33, 150, 243, 0.08)',
              borderRadius: '8px',
              borderLeft: '3px solid #2196f3',
              boxShadow: '0 2px 6px rgba(33, 150, 243, 0.1)',
              flex: 1,
              overflow: 'hidden'
            }}>
              <h4 style={{
                margin: '0 0 6px 0',
                fontSize: '13px',
                color: '#1976d2',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                📚 학습 내용
              </h4>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#37474f',
                lineHeight: '1.3',
                wordBreak: 'keep-all',
                overflow: 'auto',
                maxHeight: '120px'
              }}>
                {journal.content}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  console.log('DataBoardModal isOpen:', isOpen, 'defaultPeriod:', defaultPeriod);
  console.log('Current studentsData:', studentsData);
  console.log('Current journalData:', journalData);
  
  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes dataBoardBorder {
          0% { border-color: #00bcd4; }
          25% { border-color: #4caf50; }
          50% { border-color: #ff9800; }
          75% { border-color: #e91e63; }
          100% { border-color: #00bcd4; }
        }
        .data-board-modal {
          animation: dataBoardBorder 3s infinite;
          border: 3px solid #00bcd4;
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999
      }}>
        <div className="data-board-modal" style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '98vw',
          maxHeight: '95vh',
          width: '1680px',
          height: '102vh',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
        }}>
          {/* 헤더 */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e8eaed',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative'
          }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <h1 style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '8px'
              }}>
                데이터 전광판
              </h1>
              <p style={{
                margin: 0,
                fontSize: '16px',
                color: '#666'
              }}>
                우리 반 학습일지를 실시간으로 확인해보세요!
              </p>
            </div>

            {/* 교시 선택 드롭다운과 닫기 버튼 */}
            <div style={{ 
              position: 'absolute', 
              right: '24px', 
              top: '24px',
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px' 
            }}>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#333',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: '120px'
                }}
              >
                {PERIODS.map(period => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>

              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* 컨텐츠 영역 */}
          <div style={{
            padding: '24px',
            height: 'calc(102vh - 120px)',
            overflow: 'auto'
          }}>
            {loading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                fontSize: '18px',
                color: '#666'
              }}>
                📚 학습일지를 불러오는 중...
              </div>
            ) : journalData.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                color: '#666'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                <div style={{ fontSize: '18px', fontWeight: '500' }}>
                  {selectedPeriod}에 작성된 학습일지가 없습니다
                </div>
                <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.7 }}>
                  학생들이 학습일지를 작성하면 실시간으로 여기에 표시됩니다
                </div>
              </div>
            ) : (
              <div 
                className="data-board-container"
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 'calc(102vh - 200px)',
                  overflow: 'hidden'
                }}
              >
                {journalData.map((journal, index) => (
                  <JournalCard key={journal.id} journal={journal} index={index} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DataBoardModal;