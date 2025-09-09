import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const DataBoardModal = ({ isOpen, onClose, defaultPeriod = '1교시' }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);
  const [journalData, setJournalData] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // 학습일지 데이터 실시간 로딩
  useEffect(() => {
    if (!isOpen) return;

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
  }, [selectedPeriod, isOpen]);

  // 모달이 열릴 때 defaultPeriod로 설정
  useEffect(() => {
    if (isOpen) {
      setSelectedPeriod(defaultPeriod);
    }
  }, [isOpen, defaultPeriod]);

  // 학습일지 카드 컴포넌트
  const JournalCard = ({ journal }) => {
    const studentIcon = getStudentIcon(journal.studentName);
    
    return (
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        margin: '12px',
        minWidth: '280px',
        maxWidth: '320px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        border: '1px solid #e8eaed',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.16)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
      }}
      >
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <div style={{
            fontSize: '28px',
            marginRight: '10px',
          }}>
            {studentIcon}
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
            }}>
              {journal.studentName}
            </h3>
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: '#666',
              fontWeight: '500'
            }}>
              {journal.period} • {new Date(journal.createdAt?.seconds * 1000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* 학습일지 내용 */}
        <div>
          {/* 핵심 키워드 */}
          {journal.keyword && (
            <div style={{
              marginBottom: '12px',
              padding: '10px 12px',
              backgroundColor: '#fff3e0',
              borderRadius: '8px',
              borderLeft: '3px solid #ff9800'
            }}>
              <h4 style={{
                margin: '0 0 6px 0',
                fontSize: '12px',
                color: '#ff9800',
                fontWeight: 'bold',
                textTransform: 'uppercase',
              }}>
                🔑 핵심 키워드
              </h4>
              <p style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#e65100',
                lineHeight: '1.3'
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
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              borderLeft: '3px solid #2196f3'
            }}>
              <h4 style={{
                margin: '0 0 6px 0',
                fontSize: '12px',
                color: '#2196f3',
                fontWeight: 'bold',
                textTransform: 'uppercase',
              }}>
                📚 학습 내용
              </h4>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: '#333',
                lineHeight: '1.4'
              }}>
                {journal.content}
              </p>
            </div>
          )}

          {/* 이해도 & 난이도 */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '12px'
          }}>
            {journal.understanding && (
              <div style={{
                flex: 1,
                padding: '8px 10px',
                backgroundColor: '#e8f5e8',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #c8e6c9'
              }}>
                <div style={{ fontSize: '10px', color: '#4caf50', fontWeight: 'bold', marginBottom: '2px' }}>
                  이해도
                </div>
                <div style={{ fontSize: '14px' }}>
                  {'😊'.repeat(parseInt(journal.understanding) || 0)}
                </div>
              </div>
            )}
            {journal.difficulty && (
              <div style={{
                flex: 1,
                padding: '8px 10px',
                backgroundColor: '#ffebee',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #ffcdd2'
              }}>
                <div style={{ fontSize: '10px', color: '#f44336', fontWeight: 'bold', marginBottom: '2px' }}>
                  난이도
                </div>
                <div style={{ fontSize: '14px' }}>
                  {'❤️'.repeat(parseInt(journal.difficulty) || 0)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  console.log('DataBoardModal isOpen:', isOpen, 'defaultPeriod:', defaultPeriod);
  
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
          width: '1400px',
          height: '85vh',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
        }}>
          {/* 헤더 */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e8eaed',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '8px'
              }}>
                📊 데이터 전광판
              </h1>
              <p style={{
                margin: 0,
                fontSize: '16px',
                color: '#666'
              }}>
                우리 반 학습일지를 실시간으로 확인해보세요!
              </p>
            </div>

            {/* 교시 선택 드롭다운 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
            height: 'calc(85vh - 120px)',
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
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'flex-start',
                gap: '0px'
              }}>
                {journalData.map(journal => (
                  <JournalCard key={journal.id} journal={journal} />
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