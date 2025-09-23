import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, getDocs } from 'firebase/firestore';

const DataBoardModal = ({ isOpen, onClose, defaultPeriod = '1교시' }) => {
  // 한국 시간으로 오늘 날짜 계산
  const getTodayKorea = () => {
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    const year = koreaTime.getFullYear();
    const month = String(koreaTime.getMonth() + 1).padStart(2, '0');
    const day = String(koreaTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);
  const [selectedDate, setSelectedDate] = useState(getTodayKorea()); // 한국 시간 기준 오늘 날짜
  const [journalData, setJournalData] = useState([]);
  const [studentsData, setStudentsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [cardPositions, setCardPositions] = useState({});
  const [draggedCard, setDraggedCard] = useState(null);
  const [recommendations, setRecommendations] = useState({});
  const [cumulativeRecommendations, setCumulativeRecommendations] = useState({});
  const [isAnonymousMode, setIsAnonymousMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const PERIODS = ['1교시', '2교시', '3교시', '4교시', '5교시', '6교시'];

  // Student 페이지와 동일한 레벨 이미지 시스템
  const levelImages = [
    '/lv1.png', // 알사탕
    '/lv2.png', // 새콤한 사탕
    '/lv3.png', // 막대사탕
    '/lv4.png', // 롤리팝
    '/lv5.png', // 수제 사탕
    '/lv6.png', // 사탕 마스터
    '/lv7.png', // 콜라맛, 딸기맛 막대사탕 세트
    '/lv8.png', // 신 맛 막대사탕 세트
    '/lv9.png', // SUPER 신 맛 막대사탕 세트
    '/lv10.png', // 탱글탱글 지구젤리
    '/lv11.png', // 반짝반짝 레인보우 세트
    '/lv12.png', // 잠만보 캔디 세트
  ];

  // 학생별 이모지 아이콘 매핑
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

  // 학생 레벨에 따른 이미지 경로 반환
  const getStudentLevelImage = (studentName) => {
    const studentLevel = studentsData[studentName]?.level || 1;
    return `/lv${studentLevel}.png`;
  };

  // 오늘 날짜 구하기 (한국 시간 기준) - 수정된 버전
  const getKoreaDate = () => {
    const now = new Date();
    // 한국 시간으로 변환 (UTC+9)
    const koreaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    const year = koreaTime.getFullYear();
    const month = String(koreaTime.getMonth() + 1).padStart(2, '0');
    const day = String(koreaTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 새로고침 함수
  const refreshData = () => {
    setLoading(true);
    setJournalData([]);
    setCardPositions({});
    setRecommendations({});
    
    // 데이터를 강제로 다시 로드하기 위해 selectedPeriod를 재설정
    const currentPeriod = selectedPeriod;
    setSelectedPeriod('');
    setTimeout(() => {
      setSelectedPeriod(currentPeriod);
    }, 100);
  };

  // 학생 데이터 실시간 업데이트 (레벨 변경 감지)
  useEffect(() => {
    if (!isOpen) return;

    const studentsRef = collection(db, 'students');
    const unsubscribe = onSnapshot(studentsRef, (querySnapshot) => {
      const newStudentsData = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        newStudentsData[data.name] = {
          ...data,
          level: data.level || 1
        };
      });
      
      setStudentsData(newStudentsData);
      console.log('Students data updated:', newStudentsData);
    }, (error) => {
      console.error('Error listening to students data:', error);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // 자동 새로고침 (30초마다)
  useEffect(() => {
    if (!isOpen) return;
    
    const autoRefreshInterval = setInterval(() => {
      console.log('Auto refresh triggered');
      // 데이터 새로고침은 이미 실시간 리스너로 처리되므로 
      // 여기서는 연결 상태만 확인
    }, 30000); // 30초마다
    
    return () => clearInterval(autoRefreshInterval);
  }, [isOpen]);

  // 카드 초기 위치 설정 (간격 20% 추가 늘림)
  const getInitialPosition = (index) => {
    const cardsPerRow = 3;
    const cardWidth = 360;
    const cardHeight = 360;
    const gap = 60; // 50에서 60으로 증가 (20% 추가)
    const startX = 70; // 60에서 70으로 증가
    const startY = 70; // 60에서 70으로 증가
    
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

  // 추천 데이터 로딩 (실시간 업데이트 보장)
  const loadRecommendations = async () => {
    if (!isOpen) return;
    
    try {
      const recommendationsRef = doc(db, `recommendations/${selectedDate}`);
      const unsubscribe = onSnapshot(recommendationsRef, (docSnap) => {
        console.log('Recommendations updated:', docSnap.data());
        if (docSnap.exists()) {
          setRecommendations(docSnap.data() || {});
        } else {
          setRecommendations({});
        }
      }, (error) => {
        console.error('Error in recommendations listener:', error);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error loading recommendations:', error);
      return () => {};
    }
  };

  // Firebase 익명 모드 상태 구독
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = onSnapshot(doc(db, 'settings', 'anonymousMode'), (docSnap) => {
      if (docSnap.exists()) {
        setIsAnonymousMode(docSnap.data().enabled || false);
      } else {
        setIsAnonymousMode(false);
      }
    }, (error) => {
      console.error('익명 모드 상태 구독 실패:', error);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // 전체 누적 추천 데이터 로딩 (모든 날짜의 데이터를 통합)
  const loadAllRecommendations = async () => {
    if (!isOpen) return;
    
    try {
      console.log('Loading all cumulative recommendations...');
      const studentRecommendations = {};
      
      // 9월 10일부터의 데이터만 조회 (9월 9일 제외)
      const promises = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // 9월 9일(2025-09-09) 데이터는 제외
        if (dateStr === '2025-09-09') {
          console.log('Skipping September 9th data:', dateStr);
          continue;
        }
        
        console.log('Including date for cumulative recommendations:', dateStr);
        
        const recommendationPromise = getDoc(doc(db, `recommendations/${dateStr}`))
          .then(docSnap => {
            if (docSnap.exists()) {
              return { date: dateStr, data: docSnap.data() };
            }
            return null;
          })
          .catch(() => null); // 에러 시 null 반환
          
        promises.push(recommendationPromise);
      }
      
      const results = await Promise.all(promises);
      
      // 결과 통합
      for (const result of results) {
        if (result && result.data) {
          // 해당 날짜의 모든 학습일지 조회하여 학생명과 매핑
          const journalsRef = collection(db, `journals/${result.date}/entries`);
          try {
            const journalsSnap = await getDocs(journalsRef);
            const journalMap = {};
            journalsSnap.forEach(doc => {
              const data = doc.data();
              journalMap[doc.id] = data.studentName;
            });
            
            // 추천 데이터를 학생별로 집계
            Object.entries(result.data).forEach(([journalId, recs]) => {
              if (Array.isArray(recs) && journalMap[journalId]) {
                const studentName = journalMap[journalId];
                if (!studentRecommendations[studentName]) {
                  studentRecommendations[studentName] = 0;
                }
                studentRecommendations[studentName] += recs.length;
              }
            });
          } catch (journalError) {
            console.log(`No journals found for ${result.date}`);
          }
        }
      }
      
      setCumulativeRecommendations(studentRecommendations);
      console.log('All recommendations loaded:', studentRecommendations);
      
    } catch (error) {
      console.error('Error loading all recommendations:', error);
    }
  };

  // 세션별 추천 기록 저장
  const [userRecommendations, setUserRecommendations] = useState(new Set());

  // 추천하기 함수 (강화된 중복 방지 시스템)
  const handleRecommend = async (journalId, studentName) => {
    // 이미 추천했는지 세션 상태로 확인
    if (userRecommendations.has(journalId)) {
      alert('이미 이 학습일지에 추천하셨습니다!');
      return;
    }
    
    // 현재 추천 수 확인
    const currentRecs = recommendations[journalId] || [];
    
    // 추천 제한 (최대 20개)
    if (currentRecs.length >= 20) {
      alert('이 학습일지는 이미 충분한 추천을 받았습니다! (최대 20개)');
      return;
    }
    
    // 브라우저별 고유 사용자 ID (세션 기반)
    let currentUser = sessionStorage.getItem('userRecommendId');
    if (!currentUser) {
      currentUser = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('userRecommendId', currentUser);
    }
    
    try {
      const recommendationsRef = doc(db, `recommendations/${selectedDate}`);
      
      // 새로운 추천 추가
      await setDoc(recommendationsRef, {
        [journalId]: arrayUnion(currentUser)
      }, { merge: true });
      
      // 세션 상태에 추천 기록 추가
      setUserRecommendations(prev => new Set([...prev, journalId]));
      
      console.log('Recommendation added:', {
        journalId,
        currentUser,
        studentName,
        totalRecommendations: currentRecs.length + 1
      });
      
    } catch (error) {
      console.error('Error updating recommendation:', error);
      // Firebase 문서가 존재하지 않는 경우 새로 생성
      if (error.code === 'not-found') {
        try {
          const recommendationsRef = doc(db, `recommendations/${selectedDate}`);
          await setDoc(recommendationsRef, {
            [journalId]: [currentUser]
          });
          // 세션 상태에 추천 기록 추가
          setUserRecommendations(prev => new Set([...prev, journalId]));
          console.log('New recommendation document created');
        } catch (createError) {
          console.error('Error creating recommendation document:', createError);
        }
      }
    }
  };

  // 학습일지 데이터 실시간 로딩
  useEffect(() => {
    if (!isOpen) return;

    const journalsRef = collection(db, `journals/${selectedDate}/entries`);
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
    
    // 전체 누적 추천 데이터 로딩
    loadAllRecommendations();

    return () => {
      unsubscribeJournals();
      if (typeof unsubscribeRecommendations === 'function') {
        unsubscribeRecommendations();
      }
    };
  }, [selectedPeriod, selectedDate, isOpen]);

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
    
    // 드래그 기능
    
    const handleMouseDown = (e) => {
      // 추천 버튼 클릭이면 드래그 방지
      if (e.target.closest('button')) {
        return;
      }
      
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
        
        // 컨테이너 경계 내에서만 이동 가능하도록 제한 (고정 크기 사용)
        const maxX = 1400 - cardWidth;
        const maxY = 1000 - cardHeight;
        
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
    
    const recCount = recommendations[journal.id]?.length || 0;
    const isRainbow = recCount >= 5;
    
    const cardContent = (
      <div 
        style={{
          background: 'white',
          borderRadius: isRainbow ? '6px' : '12px',
          padding: '20px',
          width: '360px',
          height: '360px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
          border: !isRainbow ? (() => {
            const borderWidth = Math.min(2 + recCount * 1, 8);
            if (recCount >= 4) return `${borderWidth}px solid #ff6b35`;
            if (recCount >= 3) return `${borderWidth}px solid #ff9800`;
            if (recCount >= 2) return `${borderWidth}px solid #4ecdc4`;
            if (recCount >= 1) return `${borderWidth}px solid #95e1d3`;
            return '2px solid #e8eaed';
          })() : 'none',
          transition: draggedCard?.id === journal.id ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'move',
          overflow: 'hidden',
          fontSize: '16px',
          display: 'flex',
          flexDirection: 'column',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-8px) scale(1.05)';
          e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.2)';
          if (!isRainbow) e.currentTarget.style.borderColor = '#4285f4';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
          if (!isRainbow) e.currentTarget.style.borderColor = '#e8eaed';
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
            border: '2px solid #fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isAnonymousMode ? '#f0f0f0' : 'transparent'
          }}>
            {isAnonymousMode ? (
              <div style={{
                fontSize: '24px',
                color: '#999',
                fontWeight: 'bold'
              }}>
                ?
              </div>
            ) : (
              <img 
                src={levelImages[studentLevel] || levelImages[1]} 
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
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              margin: 0,
              fontSize: '19px',
              fontWeight: 'bold',
              color: '#2c3e50',
              marginBottom: '2px'
            }}>
              {isAnonymousMode ? '익명' : journal.studentName}
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
            onMouseDown={(e) => {
              e.stopPropagation(); // 드래그 이벤트 방지
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
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
              filter: userRecommendations.has(journal.id) ? 'none' : 'grayscale(50%)',
              transform: 'scale(1)',
              opacity: userRecommendations.has(journal.id) ? 1 : 0.6
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.2)';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.opacity = userRecommendations.has(journal.id) ? '1' : '0.6';
            }}
            title={userRecommendations.has(journal.id) ? '이미 추천하셨습니다' : '추천하기'}
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
    
    // 무지개 테두리가 필요한 경우 래퍼로 감싸기
    if (isRainbow) {
      return (
        <div 
          className="rainbow-border"
          style={{
            position: 'absolute',
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: draggedCard?.id === journal.id ? 1000 : 1
          }}
        >
          <div className="rainbow-content">
            {cardContent}
          </div>
        </div>
      );
    }
    
    // 일반 테두리인 경우
    return (
      <div style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: draggedCard?.id === journal.id ? 1000 : 1
      }}>
        {cardContent}
      </div>
    );
  };

  // 무지개 테두리 학생 카운팅 (추천 5개 이상)
  const rainbowStudents = journalData.filter(journal => {
    const recCount = recommendations[journal.id]?.length || 0;
    return recCount >= 5;
  });
  
  const rainbowCount = rainbowStudents.length;
  const nextEventAt = Math.ceil(rainbowCount / 10) * 10;
  const remainingForEvent = nextEventAt - rainbowCount;
  
  console.log('DataBoardModal isOpen:', isOpen, 'defaultPeriod:', defaultPeriod);
  console.log('Current studentsData:', studentsData);
  console.log('Current journalData:', journalData);
  console.log('Rainbow students:', rainbowStudents, 'Count:', rainbowCount);
  
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
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes rainbow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .data-board-modal {
          animation: dataBoardBorder 3s infinite;
          border: 3px solid #00bcd4;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        .rainbow-border {
          background: linear-gradient(-45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3, #ff0000);
          background-size: 400% 400%;
          animation: rainbow 3s ease infinite;
          padding: 6px;
          border-radius: 12px;
        }
        .rainbow-content {
          background: white;
          border-radius: 6px;
          height: 100%;
          width: 100%;
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
          width: '2000px', // 1680px에서 2000px로 증가
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
              gap: '12px' 
            }}>
              {/* 날짜 선택 */}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#333',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: '140px'
                }}
              />
              
              {/* 교시 선택 */}
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
              
              {/* 새로고침 버튼 */}
              <button
                onClick={refreshData}
                style={{
                  background: '#e8f5e8',
                  border: 'none',
                  borderRadius: 999,
                  padding: '8px 18px',
                  boxShadow: '0 2px 8px #b2ebf240',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 700,
                  color: '#2e7d32',
                  fontSize: 16,
                  transition: 'all 0.2s ease'
                }}
                title="데이터 새로고침"
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 12px #b2ebf280';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 8px #b2ebf240';
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" style={{ color: '#2e7d32', fontSize: 20, width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>새로고침</span>
              </button>

              {/* 익명 모드 상태 표시 (읽기 전용) */}
              {isAnonymousMode && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#fff3e0',
                  border: '2px solid #ff9800',
                  borderRadius: '8px',
                  cursor: 'default'
                }}>
                  <div style={{
                    width: '40px',
                    height: '20px',
                    backgroundColor: '#ff9800',
                    borderRadius: '10px',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '2px',
                      left: '22px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#e65100',
                    minWidth: '55px'
                  }}>
                    익명모드
                  </span>
                </div>
              )}

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
            display: 'flex',
            height: 'calc(102vh - 120px)',
          }}>
            {/* 좌측: 학습일지 카드들 */}
            <div style={{
              flex: '1',
              padding: '24px',
              paddingRight: '12px',
              overflow: 'auto',
              overflowX: 'auto',
              overflowY: 'auto'
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
                    width: '1500px', // 1200px에서 1500px로 증가
                    height: '1000px',
                    minWidth: '1500px',
                    minHeight: '1000px'
                  }}
                >
                  {journalData.map((journal, index) => (
                    <JournalCard key={journal.id} journal={journal} index={index} />
                  ))}
                </div>
              )}
            </div>

            {/* 우측: 추천 순위 리스트 (동적 사이드바) */}
            <div style={{
              width: isSidebarCollapsed ? '60px' : '320px',
              padding: isSidebarCollapsed ? '12px' : '24px',
              paddingLeft: '12px',
              borderLeft: '2px solid #f0f0f0',
              backgroundColor: '#fafafa',
              overflow: 'auto',
              transition: 'width 0.3s ease, padding 0.3s ease',
              position: 'relative'
            }}>
              {/* 사이드바 토글 버튼 - 더 눈에 잘 띄게 개선 */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '-25px',
                  width: '50px',
                  height: '100px',
                  borderRadius: '25px 0 0 25px',
                  border: '4px solid #4caf50',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  boxShadow: '0 6px 20px rgba(76, 175, 80, 0.5)',
                  transition: 'all 0.3s ease',
                  zIndex: 1000,
                  transform: 'translateY(-50%)',
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#45a049';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.6)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#4caf50';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(76, 175, 80, 0.4)';
                }}
                title={isSidebarCollapsed ? '순위 펼치기' : '순위 접기'}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '24px' }}>{isSidebarCollapsed ? '◀' : '▶'}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700' }}>순위</span>
                </div>
              </button>

              <div style={{
                marginBottom: '20px',
                textAlign: 'center',
                display: isSidebarCollapsed ? 'none' : 'block'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#2c3e50',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <img 
                    src="/chupa.png"
                    alt="Recommendation Trophy"
                    style={{
                      width: '24px',
                      height: '24px',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'inline';
                    }}
                  />
                  <span style={{ display: 'none', fontSize: '24px' }}>🏆</span>
                  추천 순위
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#666',
                  fontWeight: '500'
                }}>
                  {selectedDate} • {selectedPeriod}
                </p>
              </div>

              {/* 추천 순위 리스트 - 전체 학생을 보여주도록 높이 확장 */}
              <div 
                style={{
                  display: isSidebarCollapsed ? 'none' : 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  maxHeight: 'calc(100vh - 200px)',
                  overflowY: 'auto',
                  paddingRight: '8px',
                  minHeight: '500px'
                }}
                className="custom-scrollbar"
              >
                {(() => {
                  // 누적 추천 데이터를 기반으로 순위 계산
                  const allStudentNames = Object.keys(studentsData);
                  
                  console.log('=== LEADERBOARD DEBUG ===');
                  console.log('Students data keys:', allStudentNames);
                  console.log('Cumulative recommendations keys:', Object.keys(cumulativeRecommendations));
                  console.log('Cumulative recommendations:', cumulativeRecommendations);
                  
                  // 전체 학생 리스트 생성 (추천 수가 0인 학생도 포함)
                  const allStudentList = Object.keys(studentsData).map(studentName => ({
                    studentName,
                    recommendations: cumulativeRecommendations[studentName] || 0,
                    icon: getStudentIcon(studentName),
                    level: studentsData[studentName]?.level || 1
                  }));
                  
                  console.log('All student list:', allStudentList);
                  
                  const leaderboard = allStudentList.sort((a, b) => b.recommendations - a.recommendations);
                  
                  console.log('Final leaderboard:', leaderboard);
                  console.log('Leaderboard length:', leaderboard.length);
                  console.log('=== END DEBUG ===');

                  if (leaderboard.length === 0) {
                    return (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: '#999'
                      }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
                        <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                          아직 추천이 없습니다
                        </div>
                        <div style={{ fontSize: '14px' }}>
                          학습일지에 👍를 눌러보세요!
                        </div>
                      </div>
                    );
                  }

                  return leaderboard.map((item, index) => {
                    const isRainbow = item.recommendations >= 5;
                    // 순위 이미지 (chupa.png 사용)
                    const getRankImage = () => (
                      <img 
                        src="/chupa.png"
                        alt="Rank"
                        style={{
                          width: '20px',
                          height: '20px',
                          objectFit: 'contain'
                        }}
                        onError={(e) => {
                          // 이미지 로드 실패 시 기본 이모지로 대체
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'inline';
                        }}
                      />
                    );
                    
                    return (
                      <div
                        key={item.studentName}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '16px',
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          border: isRainbow ? '2px solid transparent' : '2px solid #e0e0e0',
                          backgroundImage: isRainbow ? 'linear-gradient(white, white), linear-gradient(-45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)' : 'none',
                          backgroundOrigin: 'border-box',
                          backgroundClip: isRainbow ? 'padding-box, border-box' : 'initial',
                          position: 'relative',
                          animation: isRainbow ? 'rainbow-glow 3s ease infinite' : 'none'
                        }}
                      >
                        {/* 학생 레벨 이미지 */}
                        <div style={{
                          minWidth: '32px',
                          textAlign: 'center',
                          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isAnonymousMode ? (
                            <div style={{
                              width: '32px',
                              height: '32px',
                              backgroundColor: '#f0f0f0',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px',
                              color: '#999',
                              fontWeight: 'bold'
                            }}>
                              ?
                            </div>
                          ) : (
                            <>
                              <img 
                                src={levelImages[item.level] || levelImages[1]}
                                alt={`Level ${item.level}`}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  objectFit: 'contain'
                                }}
                                onError={(e) => {
                                  // 이미지 로드 실패 시 기본 이모지로 대체
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'block';
                                }}
                              />
                              <span style={{ display: 'none' }}>🎭</span>
                            </>
                          )}
                        </div>

                        {/* 학생 정보 */}
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#2c3e50',
                            marginBottom: '2px'
                          }}>
                            {isAnonymousMode ? '익명' : item.studentName}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#666',
                            background: '#f5f5f5',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            display: 'inline-block'
                          }}>
                            {isAnonymousMode ? 'Lv.?' : `Lv.${item.level}`}
                          </div>
                        </div>

                        {/* 추천 수 */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: isRainbow ? 'linear-gradient(45deg, #ff6b6b, #4ecdc4)' : '#f8f9fa',
                          padding: '8px 12px',
                          borderRadius: '20px',
                          color: isRainbow ? 'white' : '#333',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          boxShadow: isRainbow ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                        }}>
                          <span>👍</span>
                          <span>{item.recommendations}</span>
                          {isRainbow && <span style={{ fontSize: '12px' }}>🌈</span>}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* 접힌 상태일 때의 간소화된 뷰 */}
              {isSidebarCollapsed && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '20px'
                }}>
                  {/* 간소화된 헤더 */}
                  <div style={{
                    writing: 'vertical-rl',
                    textOrientation: 'mixed',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#666',
                    marginBottom: '12px'
                  }}>
                    순위
                  </div>
                  
                  {/* 상위 3명만 간략히 표시 */}
                  {(() => {
                    const allStudentList = Object.keys(studentsData).map(studentName => ({
                      studentName,
                      recommendations: cumulativeRecommendations[studentName] || 0,
                      icon: getStudentIcon(studentName)
                    }))
                    .sort((a, b) => b.recommendations - a.recommendations)
                    .slice(0, 3);

                    return allStudentList.map((item, index) => (
                      <div
                        key={item.studentName}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '8px 4px',
                          borderRadius: '8px',
                          backgroundColor: index === 0 ? '#fff3cd' : index === 1 ? '#f8f9fa' : '#e2e3e5',
                          border: index === 0 ? '2px solid #ffc107' : '1px solid #dee2e6',
                          minHeight: '60px',
                          width: '100%',
                          maxWidth: '40px'
                        }}
                        title={`${item.studentName}: ${item.recommendations}개 추천`}
                      >
                        <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#666' }}>
                          {index + 1}
                        </div>
                        <div style={{ fontSize: '16px' }}>
                          {item.icon}
                        </div>
                        <div style={{ 
                          fontSize: '10px', 
                          fontWeight: 'bold',
                          color: index === 0 ? '#856404' : '#495057'
                        }}>
                          {item.recommendations}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DataBoardModal;