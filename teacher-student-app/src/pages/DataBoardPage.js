import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

const DataBoardPage = () => {
  const [searchParams] = useSearchParams();
  const [selectedPeriod, setSelectedPeriod] = useState(searchParams.get('period') || '1교시');
  const [journalData, setJournalData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 새로고침 함수
  const refreshData = () => {
    setLoading(true);
    setJournalData([]);
    
    // 데이터를 강제로 다시 로드하기 위해 selectedPeriod를 재설정
    const currentPeriod = selectedPeriod;
    setSelectedPeriod('');
    setTimeout(() => {
      setSelectedPeriod(currentPeriod);
    }, 100);
  };

  const PERIODS = ['1교시', '2교시', '3교시', '4교시', '5교시', '6교시'];

  // 학생별 레벨 아이콘 매핑 (실제 학생 데이터에서 가져와야 하지만 임시로 설정)
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

  // 학습일지 데이터 실시간 로딩
  useEffect(() => {
    const today = getKoreaDate();
    const journalsRef = collection(db, `journals/${today}/entries`);
    const q = query(journalsRef, where('period', '==', selectedPeriod));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setJournalData(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedPeriod]);

  // 학습일지 카드 컴포넌트
  const JournalCard = ({ journal }) => {
    const studentIcon = getStudentIcon(journal.studentName);
    
    return (
      <div style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)',
        borderRadius: '20px',
        padding: '24px',
        margin: '16px',
        minWidth: '320px',
        maxWidth: '400px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
        border: '2px solid #e8eeff',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.15)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
      }}
      >
        {/* 배경 장식 */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '80px',
          height: '80px',
          background: 'linear-gradient(45deg, #ff6b35, #f39c12)',
          borderRadius: '50%',
          opacity: 0.1
        }} />
        
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            fontSize: '36px',
            marginRight: '12px',
            filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))'
          }}>
            {studentIcon}
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#2c3e50',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              {journal.studentName}
            </h3>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#7f8c8d',
              fontWeight: '500'
            }}>
              {journal.period} • {new Date(journal.createdAt?.seconds * 1000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* 학습일지 내용 */}
        <div style={{
          position: 'relative',
          zIndex: 1
        }}>
          {/* 핵심 키워드 */}
          {journal.keyword && (
            <div style={{
              marginBottom: '16px',
              padding: '12px 16px',
              backgroundColor: 'rgba(255, 107, 53, 0.1)',
              borderRadius: '12px',
              borderLeft: '4px solid #ff6b35'
            }}>
              <h4 style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                color: '#e67e22',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                🔑 핵심 키워드
              </h4>
              <p style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#d35400',
                lineHeight: '1.4'
              }}>
                {journal.keyword}
              </p>
            </div>
          )}

          {/* 학습 내용 */}
          {journal.content && (
            <div style={{
              marginBottom: '16px',
              padding: '12px 16px',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              borderRadius: '12px',
              borderLeft: '4px solid #3498db'
            }}>
              <h4 style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                color: '#2980b9',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                📚 학습 내용
              </h4>
              <p style={{
                margin: 0,
                fontSize: '15px',
                color: '#34495e',
                lineHeight: '1.5'
              }}>
                {journal.content}
              </p>
            </div>
          )}

          {/* 이해도 & 난이도 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '16px'
          }}>
            {journal.understanding && (
              <div style={{
                flex: 1,
                padding: '10px 12px',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                borderRadius: '10px',
                textAlign: 'center',
                border: '1px solid rgba(46, 204, 113, 0.2)'
              }}>
                <div style={{ fontSize: '12px', color: '#27ae60', fontWeight: 'bold', marginBottom: '4px' }}>
                  이해도
                </div>
                <div style={{ fontSize: '16px' }}>
                  {'😊'.repeat(parseInt(journal.understanding) || 0)}
                </div>
              </div>
            )}
            {journal.difficulty && (
              <div style={{
                flex: 1,
                padding: '10px 12px',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                borderRadius: '10px',
                textAlign: 'center',
                border: '1px solid rgba(231, 76, 60, 0.2)'
              }}>
                <div style={{ fontSize: '12px', color: '#e74c3c', fontWeight: 'bold', marginBottom: '4px' }}>
                  난이도
                </div>
                <div style={{ fontSize: '16px' }}>
                  {'❤️'.repeat(parseInt(journal.difficulty) || 0)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* 헤더 */}
      <div style={{
        textAlign: 'center',
        marginBottom: '30px'
      }}>
        <h1 style={{
          fontSize: '42px',
          fontWeight: 'bold',
          color: 'white',
          margin: 0,
          textShadow: '0 4px 8px rgba(0,0,0,0.3)',
          marginBottom: '10px'
        }}>
          📊 데이터 전광판
        </h1>
        <p style={{
          fontSize: '18px',
          color: 'rgba(255, 255, 255, 0.9)',
          margin: 0,
          fontWeight: '300'
        }}>
          우리 반 학습일지를 실시간으로 확인해보세요!
        </p>
      </div>

      {/* 교시 선택 드롭다운과 새로고침 버튼 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '30px'
      }}>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          style={{
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '25px',
            backgroundColor: 'white',
            color: '#2c3e50',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
            cursor: 'pointer',
            outline: 'none',
            minWidth: '150px'
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
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px #b2ebf280';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 8px #b2ebf240';
          }}
          title="데이터 새로고침"
        >
          <svg xmlns="http://www.w3.org/2000/svg" style={{ color: '#2e7d32', fontSize: 20, width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>새로고침</span>
        </button>
      </div>

      {/* 학습일지 카드들 */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {loading ? (
          <div style={{
            color: 'white',
            fontSize: '18px',
            textAlign: 'center',
            padding: '50px'
          }}>
            📚 학습일지를 불러오는 중...
          </div>
        ) : journalData.length === 0 ? (
          <div style={{
            color: 'white',
            fontSize: '18px',
            textAlign: 'center',
            padding: '50px'
          }}>
            {selectedPeriod}에 작성된 학습일지가 없습니다. 📝
          </div>
        ) : (
          journalData.map(journal => (
            <JournalCard key={journal.id} journal={journal} />
          ))
        )}
      </div>

      {/* 푸터 */}
      <div style={{
        textAlign: 'center',
        marginTop: '40px',
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '14px'
      }}>
        <p>💡 실시간으로 업데이트되는 우리 반의 학습 현황입니다</p>
      </div>
    </div>
  );
};

export default DataBoardPage;