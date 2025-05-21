import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, orderBy, query, limit, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const REACTION_COLORS = [
  { name: '빨강', code: '#e53935' },
  { name: '주황', code: '#fb8c00' },
  { name: '노랑', code: '#fbc02d' },
  { name: '초록', code: '#43a047' },
  { name: '파랑', code: '#1e88e5' },
  { name: '남색', code: '#3949ab' },
  { name: '보라', code: '#8e24aa' },
];

// 테스트123

const TeacherPage = () => {
  const [gameStep, setGameStep] = useState('select'); // select | countdown | reaction
  const [countdown, setCountdown] = useState(3);
  const [targetColor, setTargetColor] = useState(null);
  const [currentColor, setCurrentColor] = useState(null);
  const [reactionTime, setReactionTime] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [gameError, setGameError] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [isClickable, setIsClickable] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [topRecords, setTopRecords] = useState([]);
  const [showGameModal, setShowGameModal] = useState(false);
  const [showClickNow, setShowClickNow] = useState(false);
  const clickNowTimer = React.useRef(null);
  const [countdownText, setCountdownText] = useState('3');
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [showMoleGame, setShowMoleGame] = useState(false);
  const [moleGrid, setMoleGrid] = useState(Array(9).fill(false));
  const [moleScore, setMoleScore] = useState(0);
  const [moleHighScore, setMoleHighScore] = useState(0);
  const [moleTime, setMoleTime] = useState(30);
  const [moleActiveIdx, setMoleActiveIdx] = useState(-1);
  const moleTimer = React.useRef(null);
  const moleInterval = React.useRef(null);
  
  // 공지사항 관련 상태
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [notices, setNotices] = useState([]);
  const [currentNotice, setCurrentNotice] = useState({ id: '', content: '', isActive: true });
  const [noticeError, setNoticeError] = useState('');

  // 카운트다운 effect
  useEffect(() => {
    if (gameStep === 'countdown') {
      setCountdown(3);
      setCountdownText('3');
      setCurrentColor(null); // 카운트다운 중엔 색상 박스 초기화
      let count = 3;
      const timer = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdown(count);
          setCountdownText(count.toString());
        } else if (count === 0) {
          setCountdown(0);
          setCountdownText('시작!');
        } else {
          clearInterval(timer);
          setTimeout(() => {
            setGameStep('reaction');
          }, 800); // '시작합니다!' 표시 후 reaction
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameStep]);

  // reaction 단계에서만 색상 박스가 랜덤하게 바뀌도록 useEffect 분리
  useEffect(() => {
    if (gameStep !== 'reaction') return;
    setCurrentColor(null);
    setIsClickable(false);
    setShowClickNow(false);
    let colorInterval = null;
    let colorChange = () => {
      const idx = Math.floor(Math.random()*REACTION_COLORS.length);
      setCurrentColor(REACTION_COLORS[idx]);
      if (REACTION_COLORS[idx].code === targetColor.code) {
        setIsClickable(true);
        setStartTime(Date.now());
        clearInterval(colorInterval);
      }
    };
    setTimeout(() => {
      colorInterval = setInterval(colorChange, 1000 + Math.random()*1000);
    }, 1500 + Math.random()*1500);
    return () => {
      clearInterval(colorInterval);
      clearTimeout(clickNowTimer.current);
      setShowClickNow(false);
    };
  // eslint-disable-next-line
  }, [gameStep, targetColor]);

  // 지정색이 된 순간부터 5초 후 '지금 클릭!' 표시, 지정색이 아니면 타이머/문구 모두 사라짐
  useEffect(() => {
    if (gameStep !== 'reaction' || !currentColor || !targetColor) {
      setShowClickNow(false);
      clearTimeout(clickNowTimer.current);
      return;
    }
    if (currentColor.code === targetColor.code && isClickable) {
      setShowClickNow(false);
      clickNowTimer.current = setTimeout(() => {
        setShowClickNow(true);
      }, 5000);
    } else {
      setShowClickNow(false);
      clearTimeout(clickNowTimer.current);
    }
    return () => clearTimeout(clickNowTimer.current);
  }, [gameStep, currentColor, targetColor, isClickable]);

  const fetchTopRecords = async () => {
    const recordsRef = collection(db, 'reactionGameRecords');
    const recordsSnapshot = await getDocs(recordsRef);
    const recordsData = recordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    recordsData.sort((a, b) => a.ms - b.ms);
    setTopRecords(recordsData.slice(0, 5));
  };

  // 두더지 잡기 게임 시작
  const startMoleGame = () => {
    setMoleScore(0);
    setMoleTime(30);
    setMoleGrid(Array(9).fill(false));
    setShowMoleGame(true);
    setMoleActiveIdx(-1);
    moleInterval.current = setInterval(() => {
      const idx = Math.floor(Math.random() * 9);
      setMoleActiveIdx(idx);
      setMoleGrid(g => g.map((_, i) => i === idx));
    }, 700);
    moleTimer.current = setInterval(() => {
      setMoleTime(t => {
        if (t <= 1) {
          clearInterval(moleTimer.current);
          clearInterval(moleInterval.current);
          setMoleGrid(Array(9).fill(false));
          setMoleActiveIdx(-1);
        }
        return t - 1;
      });
    }, 1000);
  };
  
  // 두더지 잡기 게임 종료 시 최고점수 저장
  React.useEffect(() => {
    if (moleTime === 0) {
      setMoleHighScore(s => (moleScore > s ? moleScore : s));
    }
  }, [moleTime, moleScore]);
  
  // 두더지 잡기 게임 종료 시 클린업
  React.useEffect(() => () => {
    clearInterval(moleTimer.current);
    clearInterval(moleInterval.current);
  }, []);

  // 공지사항 목록 불러오기
  const fetchNotices = async () => {
    try {
      const noticesRef = collection(db, 'notices');
      const noticesSnapshot = await getDocs(noticesRef);
      const noticesData = noticesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotices(noticesData);
    } catch (error) {
      console.error('공지사항을 불러오는 중 오류가 발생했습니다:', error);
      setNoticeError('공지사항을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 공지사항 저장
  const saveNotice = async () => {
    try {
      if (!currentNotice.content.trim()) {
        setNoticeError('공지사항 내용을 입력해주세요.');
        return;
      }
      
      if (currentNotice.id) {
        // 기존 공지사항 업데이트
        await updateDoc(doc(db, 'notices', currentNotice.id), {
          content: currentNotice.content,
          isActive: currentNotice.isActive,
          updatedAt: Date.now()
        });
      } else {
        // 새 공지사항 추가
        await addDoc(collection(db, 'notices'), {
          content: currentNotice.content,
          isActive: currentNotice.isActive,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      
      setCurrentNotice({ id: '', content: '', isActive: true });
      setNoticeError('');
      fetchNotices();
    } catch (error) {
      console.error('공지사항 저장 중 오류가 발생했습니다:', error);
      setNoticeError('공지사항 저장 중 오류가 발생했습니다.');
    }
  };

  // 공지사항 삭제
  const deleteNotice = async (noticeId) => {
    try {
      await deleteDoc(doc(db, 'notices', noticeId));
      fetchNotices();
    } catch (error) {
      console.error('공지사항 삭제 중 오류가 발생했습니다:', error);
      setNoticeError('공지사항 삭제 중 오류가 발생했습니다.');
    }
  };

  // 공지사항 수정을 위해 선택
  const editNotice = (notice) => {
    setCurrentNotice({
      id: notice.id,
      content: notice.content,
      isActive: notice.isActive
    });
  };

  // 공지사항 광고하기 (모든 학생에게 모달로 표시)
  const broadcastNotice = async (noticeId) => {
    try {
      // 공지사항 문서 찾기
      const noticeRef = doc(db, 'notices', noticeId);
      const noticeDoc = await getDoc(noticeRef);
      
      if (noticeDoc.exists()) {
        // broadcast 필드를 true로 설정
        await updateDoc(noticeRef, {
          broadcast: true,
          broadcastTime: Date.now()
        });
        
        // 5분 후에 broadcast 필드를 false로 설정하는 타이머 (실제로는 서버 측에서 처리해야 함)
        setTimeout(async () => {
          try {
            await updateDoc(noticeRef, { broadcast: false });
          } catch (error) {
            console.error('공지사항 브로드캐스트 해제 중 오류가 발생했습니다:', error);
          }
        }, 5 * 60 * 1000); // 5분
        
        fetchNotices();
      }
    } catch (error) {
      console.error('공지사항 광고 중 오류가 발생했습니다:', error);
      setNoticeError('공지사항 광고 중 오류가 발생했습니다.');
    }
  };

  // 컴포넌트 마운트 시 공지사항 불러오기
  useEffect(() => {
    fetchNotices();
  }, []);

  return (
    <div style={{ minHeight: '100vh', width: '100vw', padding: '32px',
      background: 'linear-gradient(135deg, rgba(224,247,250,0.6) 0%, rgba(227,242,253,0.6) 100%), url(/TR_bg.png) center/cover no-repeat',
      backgroundBlendMode: 'normal',
      boxSizing: 'border-box' }}>
      
      <button onClick={() => setShowNoticeModal(true)} style={{ position: 'fixed', top: 20, right: 20, padding: '10px 20px', background: '#1976d2', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <span style={{ marginRight: 8 }}>📢</span>
        캔디숍 공지
      </button>
      
      {showNoticeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
          <div style={{ background: '#fff', padding: 36, borderRadius: 24, minWidth: 600, maxWidth: 800, boxShadow: '0 8px 48px rgba(0,0,0,0.2)', position: 'relative', maxHeight: '90vh', overflow: 'auto' }}>
            <button onClick={() => {
              setShowNoticeModal(false);
              setCurrentNotice({ id: '', content: '', isActive: true });
              setNoticeError('');
            }} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#bbb', cursor: 'pointer', fontWeight: 700 }}>×</button>
            
            <div style={{ fontWeight: 700, fontSize: 24, color: '#1976d2', marginBottom: 24, display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 12 }}>📢</span>
              공지사항 관리
            </div>
            
            {noticeError && (
              <div style={{ padding: '12px 16px', background: '#ffebee', color: '#c62828', borderRadius: 8, marginBottom: 16 }}>
                {noticeError}
              </div>
            )}
            
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: '#555' }}>공지사항 내용</div>
              <textarea 
                value={currentNotice.content} 
                onChange={(e) => setCurrentNotice({...currentNotice, content: e.target.value})}
                style={{ 
                  width: '100%', 
                  minHeight: 120, 
                  padding: 12, 
                  borderRadius: 8, 
                  border: '1px solid #ddd',
                  fontSize: 16,
                  resize: 'vertical'
                }}
                placeholder="공지사항 내용을 입력하세요..."
              />
              
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                <input 
                  type="checkbox" 
                  id="noticeActive" 
                  checked={currentNotice.isActive} 
                  onChange={(e) => setCurrentNotice({...currentNotice, isActive: e.target.checked})}
                  style={{ marginRight: 8 }}
                />
                <label htmlFor="noticeActive" style={{ fontSize: 14, color: '#555' }}>활성화</label>
              </div>
              
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button 
                  onClick={saveNotice}
                  style={{ 
                    padding: '10px 24px', 
                    background: '#1976d2', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 8, 
                    cursor: 'pointer', 
                    fontWeight: 600 
                  }}
                >
                  {currentNotice.id ? '수정하기' : '추가하기'}
                </button>
                
                {currentNotice.id && (
                  <button 
                    onClick={() => setCurrentNotice({ id: '', content: '', isActive: true })}
                    style={{ 
                      padding: '10px 24px', 
                      background: '#f5f5f5', 
                      color: '#555', 
                      border: '1px solid #ddd', 
                      borderRadius: 8, 
                      cursor: 'pointer', 
                      fontWeight: 600 
                    }}
                  >
                    취소
                  </button>
                )}
              </div>
            </div>
            
            <div style={{ marginTop: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 16, color: '#333' }}>공지사항 목록</div>
              
              {notices.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#888' }}>
                  등록된 공지사항이 없습니다.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {notices.map(notice => (
                    <div key={notice.id} style={{ 
                      padding: 16, 
                      borderRadius: 8, 
                      border: '1px solid #e0e0e0',
                      background: notice.isActive ? '#fff' : '#f5f5f5',
                      position: 'relative'
                    }}>
                      <div style={{ marginBottom: 8, fontSize: 16, wordBreak: 'break-word' }}>
                        {notice.content}
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                        <div style={{ fontSize: 12, color: '#888' }}>
                          {notice.updatedAt ? `최종 수정: ${new Date(notice.updatedAt).toLocaleString()}` : 
                           notice.createdAt ? `작성: ${new Date(notice.createdAt).toLocaleString()}` : ''}
                        </div>
                        
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button 
                            onClick={() => editNotice(notice)}
                            style={{ 
                              padding: '6px 12px', 
                              background: '#e3f2fd', 
                              color: '#1976d2', 
                              border: 'none', 
                              borderRadius: 4, 
                              cursor: 'pointer', 
                              fontSize: 14 
                            }}
                          >
                            수정
                          </button>
                          
                          <button 
                            onClick={() => deleteNotice(notice.id)}
                            style={{ 
                              padding: '6px 12px', 
                              background: '#ffebee', 
                              color: '#c62828', 
                              border: 'none', 
                              borderRadius: 4, 
                              cursor: 'pointer', 
                              fontSize: 14 
                            }}
                          >
                            삭제
                          </button>
                          
                          <button 
                            onClick={() => broadcastNotice(notice.id)}
                            style={{ 
                              padding: '6px 12px', 
                              background: '#fff9c4', 
                              color: '#f57f17', 
                              border: 'none', 
                              borderRadius: 4, 
                              cursor: 'pointer', 
                              fontSize: 14,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <span>📣</span>
                            광고하기
                          </button>
                        </div>
                      </div>
                      
                      {notice.broadcast && (
                        <div style={{ 
                          position: 'absolute', 
                          top: -10, 
                          right: -10, 
                          background: '#f57f17', 
                          color: 'white', 
                          borderRadius: 999, 
                          padding: '4px 8px', 
                          fontSize: 12,
                          fontWeight: 'bold'
                        }}>
                          광고중
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showGameModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div style={{ 
            background: gameStep === 'reaction' && targetColor ? targetColor.code : '#fff', 
            padding: 36, 
            borderRadius: 32, 
            minWidth: 480, 
            maxWidth: 600, 
            boxShadow: '0 8px 48px #b2ebf240', 
            textAlign: 'center', 
            position: 'relative',
            transition: 'background 0.3s'
          }}>
            <button onClick={() => setShowGameModal(false)} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: gameStep === 'reaction' && targetColor ? '#fff' : '#bbb', cursor: 'pointer', fontWeight: 700 }}>×</button>
            {gameStep === 'select' && (
              <>
                <div style={{ fontWeight: 700, fontSize: 22, color: '#1976d2', marginBottom: 18 }}>게임 선택</div>
                <button onClick={() => {
                  setTargetColor(REACTION_COLORS[Math.floor(Math.random()*REACTION_COLORS.length)]);
                  setGameStep('countdown');
                  setReactionTime(null);
                  setGameError('');
                  setStudentName('');
                }} style={{ fontWeight: 700, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '14px 38px', fontSize: 18, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', marginBottom: 18 }}>순발력 게임</button>
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontWeight: 600, color: '#888', fontSize: 16, marginBottom: 8 }}>TOP 5 기록</div>
                  <ol style={{ textAlign: 'left', margin: '0 auto', maxWidth: 280 }}>
                    {topRecords.length === 0 && <li style={{ color: '#bbb' }}>기록 없음</li>}
                    {topRecords.map((r, i) => <li key={i} style={{ color: '#1976d2', fontWeight: 600 }}>{r.studentName||'익명'} - {r.ms}ms</li>)}
                  </ol>
                </div>
                <button onClick={() => { setShowRecordsModal(true); fetchTopRecords(); }} style={{ fontWeight: 700, borderRadius: 999, background: 'rgba(25,118,210,0.1)', color: '#1976d2', border: 'none', padding: '12px 36px', fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', marginTop: 16 }}>기록 자세히 보기</button>
              </>
            )}
            {gameStep === 'countdown' && (
              <>
                <div style={{ fontWeight: 700, fontSize: 32, color: '#1976d2', marginBottom: 24, textShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>3초 후 시작합니다!</div>
                <div style={{ fontWeight: 700, fontSize: 80, color: '#1976d2', marginBottom: 24, textShadow: '0 2px 8px #0002' }}>{countdownText}</div>
                <button onClick={() => { setShowRecordsModal(true); fetchTopRecords(); }} style={{ fontWeight: 700, borderRadius: 999, background: 'rgba(25,118,210,0.1)', color: '#1976d2', border: 'none', padding: '12px 36px', fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', marginTop: 8 }}>기록 확인</button>
              </>
            )}
            {gameStep === 'reaction' && (
              <>
                <div style={{ fontWeight: 700, fontSize: 24, color: '#fff', marginBottom: 16, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>지정 색상: {targetColor?.name}</div>
                <div style={{ marginBottom: 16, color: '#fff', fontSize: 18, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>아래 배경이 {targetColor?.name}이 되면 최대한 빨리 클릭하세요!</div>
                {reactionTime === null ? (
                  <div style={{ 
                    width: 320, 
                    height: 240, 
                    margin: '0 auto 24px auto', 
                    borderRadius: 24, 
                    background: gameStep === 'countdown' ? '#eee' : (gameStep === 'reaction' && currentColor ? currentColor.code : '#eee'), 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: isClickable ? 'pointer' : 'default', 
                    transition: 'background 0.2s',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    position: 'relative'
                  }}
                    onClick={async () => {
                      if (isClickable && currentColor?.code === targetColor?.code) {
                        const ms = Date.now() - startTime;
                        setReactionTime(ms);
                        setIsClickable(false);
                        setShowClickNow(false);
                        if (!studentName) {
                          setGameError('이름을 입력하세요!');
                          return;
                        }
                        await addDoc(collection(db, 'reactionGameRecords'), { studentName, ms, ts: Date.now() });
                        fetchTopRecords();
                      }
                    }}>
                    <span style={{ width: '100%', textAlign: 'center', fontSize: 80, color: '#1976d2', fontWeight: 700 }}>{gameStep} / {countdownText}</span>
                    {gameStep === 'reaction' && showClickNow && (
                      <span style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 32, color: '#fff', textShadow: '0 2px 8px #0008', pointerEvents: 'none' }}>지금 클릭!</span>
                    )}
                  </div>
                ) : (
                  <div style={{ fontWeight: 700, fontSize: 28, color: '#fff', margin: '24px 0', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>기록: {reactionTime}ms</div>
                )}
                <div style={{ margin: '16px 0' }}>
                  <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="이름(닉네임)" style={{ borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.3)', padding: '10px 16px', fontSize: 16, marginBottom: 8, width: 200, background: 'rgba(255,255,255,0.1)', color: '#fff' }} disabled={reactionTime !== null} />
                </div>
                {gameError && <div style={{ color: '#fff', fontWeight: 700, marginBottom: 8, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{gameError}</div>}
                {reactionTime === null ? (
                  <button onClick={() => {
                    setGameError('');
                    setReactionTime(null);
                    setIsClickable(false);
                    let colorInterval = null;
                    let colorChange = () => {
                      const idx = Math.floor(Math.random()*REACTION_COLORS.length);
                      setCurrentColor(REACTION_COLORS[idx]);
                      if (REACTION_COLORS[idx].code === targetColor.code) {
                        setIsClickable(true);
                        setStartTime(Date.now());
                        clearInterval(colorInterval);
                      }
                    };
                    setTimeout(() => {
                      colorInterval = setInterval(colorChange, 1000 + Math.random()*1000);
                    }, 1500 + Math.random()*1500);
                  }} disabled={gameStarted || isClickable} style={{ fontWeight: 700, borderRadius: 999, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '12px 36px', fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', marginTop: 8 }}>시작</button>
                ) : (
                  <button onClick={() => { setGameStep('select'); setReactionTime(null); setCurrentColor(null); setIsClickable(false); fetchTopRecords(); }} style={{ fontWeight: 700, borderRadius: 999, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '12px 36px', fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', marginTop: 8 }}>다시하기</button>
                )}
                <button onClick={() => { setShowRecordsModal(true); fetchTopRecords(); }} style={{ fontWeight: 700, borderRadius: 999, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '12px 36px', fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', marginTop: 8, marginLeft: 12 }}>기록 확인</button>
              </>
            )}
          </div>
        </div>
      )}
      {showRecordsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5002 }}>
          <div style={{ background: '#fff', padding: 36, borderRadius: 32, minWidth: 340, maxWidth: 400, boxShadow: '0 8px 48px #b2ebf240', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setShowRecordsModal(false)} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#bbb', cursor: 'pointer', fontWeight: 700 }}>×</button>
            <div style={{ fontWeight: 700, fontSize: 22, color: '#1976d2', marginBottom: 18 }}>순발력 게임 TOP 5 기록</div>
            <ol style={{ textAlign: 'left', margin: '0 auto', maxWidth: 280 }}>
              {topRecords.length === 0 && <li style={{ color: '#bbb' }}>기록 없음</li>}
              {topRecords.map((r, i) => <li key={i} style={{ color: '#1976d2', fontWeight: 600 }}>{r.studentName||'익명'} - {r.ms}ms</li>)}
            </ol>
          </div>
        </div>
      )}
      <div style={{ position: 'fixed', right: 32, bottom: 32, zIndex: 5001 }}>
        <button onClick={() => { setShowRecordsModal(true); fetchTopRecords(); }} style={{ background: '#e3f2fd', border: 'none', borderRadius: 999, padding: '12px 18px', boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, color: '#1976d2', fontSize: 17 }}>기록 보기</span>
        </button>
      </div>
      {showMoleGame && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
          <div style={{ background: '#fffde7', padding: 36, borderRadius: 32, minWidth: 400, maxWidth: 480, boxShadow: '0 8px 48px #b2ebf240', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => { setShowMoleGame(false); clearInterval(moleTimer.current); clearInterval(moleInterval.current); }} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#bbb', cursor: 'pointer', fontWeight: 700 }}>×</button>
            <div style={{ fontWeight: 700, fontSize: 22, color: '#e65100', marginBottom: 12 }}>두더지 잡기</div>
            <div style={{ fontWeight: 600, color: '#888', marginBottom: 8 }}>제한 시간: {moleTime}초</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 60px)', gap: 16, justifyContent: 'center', margin: '24px 0' }}>
              {moleGrid.map((active, i) => (
                <div key={i} onClick={() => {
                  if (active && moleTime > 0) setMoleScore(s => s + 1);
                }} style={{ width: 60, height: 60, borderRadius: '50%', background: active ? '#ffb300' : '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, cursor: active && moleTime > 0 ? 'pointer' : 'default', boxShadow: active ? '0 2px 8px #ffb30080' : 'none', userSelect: 'none', transition: 'background 0.2s' }}>{active ? '🐹' : ''}</div>
              ))}
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#e65100', marginBottom: 8 }}>점수: {moleScore}</div>
            <div style={{ fontWeight: 600, color: '#888', marginBottom: 8 }}>최고 점수: {moleHighScore}</div>
            {moleTime === 0 && (
              <button onClick={startMoleGame} style={{ fontWeight: 700, borderRadius: 999, background: '#ffe0b2', color: '#e65100', border: 'none', padding: '12px 36px', fontSize: 18, boxShadow: '0 2px 8px #ffcc8040', cursor: 'pointer', marginTop: 8 }}>다시하기</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherPage; 