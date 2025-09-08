import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, setDoc, onSnapshot, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import LoginIcon from '@mui/icons-material/Login';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import QuizIcon from '@mui/icons-material/Quiz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';

const FormPage = () => {
  const [code, setCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 닉네임 관련 상태
  const [nickname, setNickname] = useState('');
  const [showNicknameDialog, setShowNicknameDialog] = useState(false);
  
  // 질문 관련 상태
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 컴포넌트 마운트시 고유 사용자 ID 생성
  useEffect(() => {
    const generateUserId = () => {
      return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    };
    setUserId(generateUserId());
  }, []);

  // 세션에 연결된 사용자들 실시간 감지
  useEffect(() => {
    if (!session) return;

    const unsubscribe = onSnapshot(collection(db, `show-sessions/${session.id}/users`), (snapshot) => {
      const users = [];
      snapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      setConnectedUsers(users);
    });

    return () => unsubscribe();
  }, [session]);

  // 현재 활성 질문 실시간 감지
  useEffect(() => {
    if (!session) return;

    const unsubscribe = onSnapshot(doc(db, 'show-sessions', session.id), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const newQuestion = data.currentQuestion;
        
        // 새로운 질문이 들어오면 답변 상태 초기화
        if (newQuestion && (!currentQuestion || newQuestion.id !== currentQuestion.id)) {
          setCurrentQuestion(newQuestion);
          setTextAnswer('');
          setHasAnswered(false);
        } else if (!newQuestion) {
          // 질문이 중지되면 상태 초기화
          setCurrentQuestion(null);
          setTextAnswer('');
          setHasAnswered(false);
        }
      }
    });

    return () => unsubscribe();
  }, [session, currentQuestion]);

  // 세션 연결
  const connectToSession = async () => {
    if (!code.trim()) {
      setError('코드를 입력해주세요.');
      return;
    }

    if (!nickname.trim()) {
      setError('닉네임을 먼저 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 세션 존재 확인
      const sessionRef = doc(db, 'show-sessions', code.toUpperCase());
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        setError('존재하지 않는 코드입니다.');
        setLoading(false);
        return;
      }

      const sessionData = sessionDoc.data();
      
      if (!sessionData.isActive) {
        setError('비활성화된 세션입니다.');
        setLoading(false);
        return;
      }

      // 사용자를 세션에 추가 (닉네임 포함)
      const userRef = doc(db, `show-sessions/${code.toUpperCase()}/users`, userId);
      await setDoc(userRef, {
        id: userId,
        nickname: nickname || '익명',
        connectedAt: Date.now(),
        lastSeen: Date.now(),
        isActive: true
      });

      setSession({ id: code.toUpperCase(), ...sessionData });
      setIsConnected(true);
      setCode('');
    } catch (error) {
      console.error('세션 연결 실패:', error);
      setError('세션 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 닉네임 변경
  const changeNickname = () => {
    setShowNicknameDialog(true);
  };

  // 닉네임 확인
  const confirmNickname = async () => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }

    if (isConnected && session) {
      try {
        // Firebase에서 사용자 정보 업데이트
        const userRef = doc(db, `show-sessions/${session.id}/users`, userId);
        await setDoc(userRef, {
          id: userId,
          nickname: nickname.trim(),
          connectedAt: Date.now(),
          lastSeen: Date.now(),
          isActive: true
        });
      } catch (error) {
        console.error('닉네임 업데이트 실패:', error);
      }
    }

    setShowNicknameDialog(false);
  };

  // 답변 제출
  const submitAnswer = async () => {
    if (!textAnswer.trim() || !currentQuestion) return;

    setSubmitting(true);
    try {
      // 질문 번호별로 응답 저장 - 올바른 Firebase 경로 사용
      const documentId = `${currentQuestion.questionNumber}_${userId}`;
      const responseRef = doc(db, `show-sessions/${session.id}/questionResponses`, documentId);
      await setDoc(responseRef, {
        userId: userId,
        nickname: nickname || '익명',
        questionId: currentQuestion.id,
        questionNumber: currentQuestion.questionNumber,
        textAnswer: textAnswer.trim(),
        submittedAt: Date.now()
      });

      setHasAnswered(true);
    } catch (error) {
      console.error('답변 제출 실패:', error);
      alert('답변 제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 세션 연결 해제
  const disconnectFromSession = async () => {
    if (!session || !userId) return;

          try {
        // 사용자를 세션에서 제거
        const userRef = doc(db, `show-sessions/${session.id}/users`, userId);
        await deleteDoc(userRef);

        // 현재 질문의 답변도 제거 (있다면)
        if (currentQuestion) {
          try {
            const responseRef = doc(db, `show-sessions/${session.id}/questionResponses/${currentQuestion.questionNumber}`, userId);
            await deleteDoc(responseRef);
          } catch (e) {
            // 답변이 없을 수 있으므로 에러 무시
          }
        }

      setSession(null);
      setIsConnected(false);
      setConnectedUsers([]);
      setCurrentQuestion(null);
      setTextAnswer('');
      setHasAnswered(false);
    } catch (error) {
      console.error('세션 연결 해제 실패:', error);
    }
  };

  // 사용자 연결 해제 함수
  const cleanupUserConnection = async () => {
    if (isConnected && session && userId) {
      try {
        const userRef = doc(db, `show-sessions/${session.id}/users`, userId);
        await deleteDoc(userRef);
        
        // 현재 활성 질문의 답변 삭제 (있다면)
        if (session.currentQuestion) {
          try {
            const responseRef = doc(db, `show-sessions/${session.id}/questionResponses/${session.currentQuestion.questionNumber}`, userId);
            await deleteDoc(responseRef);
          } catch (e) {
            // 답변이 없을 수 있으므로 에러 무시
          }
        }
      } catch (error) {
        console.error('사용자 연결 해제 실패:', error);
      }
    }
  };

  // 하트비트 업데이트 함수
  const updateHeartbeat = async () => {
    if (isConnected && session && userId) {
      try {
        const userRef = doc(db, `show-sessions/${session.id}/users`, userId);
        await setDoc(userRef, {
          id: userId,
          nickname: nickname || '익명',
          connectedAt: Date.now(),
          lastSeen: Date.now(),
          isActive: true
        });
      } catch (error) {
        console.error('하트비트 업데이트 실패:', error);
      }
    }
  };

  // 하트비트 시스템 (연결 상태 유지)
  useEffect(() => {
    if (!isConnected || !session || !userId) return;

    // 처음 연결 시 하트비트 설정
    updateHeartbeat();

    // 5초마다 하트비트 업데이트
    const heartbeatInterval = setInterval(() => {
      updateHeartbeat();
    }, 5000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [isConnected, session, userId, nickname]);

  // 비활성 사용자 정리
  useEffect(() => {
    if (!isConnected || !session) return;

    const cleanupInactiveUsers = async () => {
      try {
        const usersRef = collection(db, `show-sessions/${session.id}/users`);
        const snapshot = await getDocs(usersRef);
        const now = Date.now();
        
        snapshot.forEach(async (userDoc) => {
          const userData = userDoc.data();
          // 30초 이상 하트비트가 없으면 비활성 사용자로 간주
          if (userData.lastSeen && now - userData.lastSeen > 30000) {
            try {
              await deleteDoc(doc(db, `show-sessions/${session.id}/users`, userDoc.id));
              // 해당 사용자의 답변도 삭제
              try {
                await deleteDoc(doc(db, `show-sessions/${session.id}/responses`, userDoc.id));
              } catch (e) {
                // 답변이 없을 수 있으므로 에러 무시
              }
            } catch (error) {
              console.error('비활성 사용자 정리 실패:', error);
            }
          }
        });
      } catch (error) {
        console.error('비활성 사용자 정리 중 오류:', error);
      }
    };

    // 10초마다 비활성 사용자 정리 체크
    const cleanupInterval = setInterval(cleanupInactiveUsers, 10000);

    return () => {
      clearInterval(cleanupInterval);
    };
  }, [isConnected, session]);

  // 페이지 종료/새로고침 시 연결 해제
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isConnected && session && userId) {
        // 즉시 비활성 상태로 변경
        const userRef = doc(db, `show-sessions/${session.id}/users`, userId);
        setDoc(userRef, {
          id: userId,
          nickname: nickname || '익명',
          connectedAt: Date.now(),
          lastSeen: 0, // 0으로 설정하여 즉시 정리되도록
          isActive: false
        }).catch(console.error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isConnected && session && userId) {
        // 페이지가 숨겨질 때도 비활성 상태로 변경
        const userRef = doc(db, `show-sessions/${session.id}/users`, userId);
        setDoc(userRef, {
          id: userId,
          nickname: nickname || '익명',
          connectedAt: Date.now(),
          lastSeen: 0,
          isActive: false
        }).catch(console.error);
      } else if (!document.hidden && isConnected && session && userId) {
        // 페이지가 다시 보일 때 활성 상태로 변경
        updateHeartbeat();
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 컴포넌트 언마운트시 연결 해제
    return () => {
      // 이벤트 리스너 제거
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // 연결 해제
      cleanupUserConnection();
    };
  }, [isConnected, session, userId, nickname]);

  // 시간 포맷 함수
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      width: '100vw', 
      padding: '32px',
      background: 'linear-gradient(135deg, rgba(224,247,250,0.6) 0%, rgba(227,242,253,0.6) 100%), url(/TR_bg.png) center/cover no-repeat',
      overflowX: 'hidden', 
      position: 'relative' 
    }}>
      {/* 배너 이미지 */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 32, marginTop: 8 }}>
        <img 
          src="/candyshop_banner.png" 
          alt="JAMMANBO CANDY SHOP 배너" 
          style={{ 
            maxWidth: 480, 
            width: '90vw', 
            height: 'auto', 
            borderRadius: 18, 
            boxShadow: '0 4px 24px #b2ebf240', 
            display: 'block' 
          }} 
        />
      </div>

      {/* 헤더 */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 700, 
          color: '#1976d2', 
          marginBottom: 16,
          textShadow: '0 2px 4px rgba(25, 118, 210, 0.2)'
        }}>
          {isConnected 
            ? (currentQuestion ? `${currentQuestion.questionNumber}번 질문 답변하기` : '세션 연결됨') 
            : '학생 Form 페이지'
          }
        </h1>
        <p style={{ 
          fontSize: '1.1rem', 
          color: '#666', 
          fontWeight: 500 
        }}>
          {isConnected 
            ? (currentQuestion 
                ? '교수자의 질문에 답변해주세요' 
                : `세션 ${session.code}에 연결되었습니다`)
            : '교수자가 제공한 3자리 코드를 입력하세요'
          }
        </p>
      </div>

      {/* 연결되지 않았을 때 - 코드 입력 폼 */}
      {!isConnected && (
        <div style={{ 
          maxWidth: 500, 
          margin: '0 auto',
          background: '#fff',
          borderRadius: 20,
          padding: 40,
          boxShadow: '0 8px 32px rgba(25, 118, 210, 0.1)',
          border: '1px solid #e0f7fa'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ 
              fontSize: '4rem', 
              marginBottom: 16,
              opacity: 0.7 
            }}>
              🔐
            </div>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600, 
              color: '#1976d2', 
              marginBottom: 8 
            }}>
              세션 연결하기
            </h2>
            <p style={{ color: '#666', fontSize: '1rem' }}>
              닉네임과 교수자가 제공한 코드를 입력하세요
            </p>
          </div>

          {/* 닉네임 입력 */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: 8, 
              color: '#1976d2', 
              fontWeight: 600,
              fontSize: '1rem'
            }}>
              닉네임
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예: 만보초 홍길동"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '1.1rem',
                border: '2px solid #e0f7fa',
                borderRadius: 12,
                outline: 'none',
                background: '#f8f9fa',
                color: '#333',
                boxSizing: 'border-box'
              }}
              onFocus={e => {
                e.target.style.border = '2px solid #1976d2';
                e.target.style.boxShadow = '0 0 0 3px rgba(25, 118, 210, 0.1)';
              }}
              onBlur={e => {
                e.target.style.border = '2px solid #e0f7fa';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* 세션 코드 입력 */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: 8, 
              color: '#1976d2', 
              fontWeight: 600,
              fontSize: '1rem'
            }}>
              세션 코드
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                if (value.length <= 3) {
                  setCode(value);
                  setError('');
                }
              }}
              placeholder="예: A1B"
              style={{
                width: '100%',
                padding: '20px',
                fontSize: '2rem',
                fontWeight: 700,
                textAlign: 'center',
                border: '2px solid #e0f7fa',
                borderRadius: 16,
                outline: 'none',
                fontFamily: 'monospace',
                letterSpacing: '0.3em',
                background: '#f8f9fa',
                color: '#1976d2',
                boxSizing: 'border-box'
              }}
              onFocus={e => {
                e.target.style.border = '2px solid #1976d2';
                e.target.style.boxShadow = '0 0 0 3px rgba(25, 118, 210, 0.1)';
              }}
              onBlur={e => {
                e.target.style.border = '2px solid #e0f7fa';
                e.target.style.boxShadow = 'none';
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  connectToSession();
                }
              }}
            />
            <div style={{ 
              textAlign: 'center', 
              marginTop: 8, 
              fontSize: '0.9rem', 
              color: '#666' 
            }}>
              {code.length}/3 글자
            </div>
          </div>

          {error && (
            <div style={{
              background: '#ffebee',
              color: '#c62828',
              padding: '12px 16px',
              borderRadius: 12,
              marginBottom: 24,
              textAlign: 'center',
              fontSize: '0.9rem',
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          <button
            onClick={connectToSession}
            disabled={loading || code.length !== 3 || !nickname.trim()}
            style={{
              width: '100%',
              background: (code.length === 3 && nickname.trim()) ? '#e0f7fa' : '#f5f5f5',
              border: `2px solid ${(code.length === 3 && nickname.trim()) ? '#1976d2' : '#e0e0e0'}`,
              color: (code.length === 3 && nickname.trim()) ? '#1976d2' : '#999',
              fontWeight: 'bold',
              borderRadius: 16,
              boxShadow: (code.length === 3 && nickname.trim()) ? '0 2px 8px #b2ebf240' : 'none',
              padding: '16px 32px',
              fontSize: 18,
              cursor: (loading || code.length !== 3 || !nickname.trim()) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              opacity: (loading || code.length !== 3 || !nickname.trim()) ? 0.7 : 1
            }}
            onMouseOver={e => {
              if (!loading && code.length === 3 && nickname.trim()) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 16px #b2ebf260';
              }
            }}
            onMouseOut={e => {
              if (!loading && code.length === 3 && nickname.trim()) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px #b2ebf240';
              }
            }}
          >
            <LoginIcon style={{ fontSize: 20 }} />
            {loading ? '연결 중...' : '세션 연결'}
          </button>
        </div>
      )}

      {/* 연결되었을 때 */}
      {isConnected && session && (
        <div style={{ 
          maxWidth: 800, 
          margin: '0 auto'
        }}>
          {/* 현재 질문이 있을 때 */}
          {currentQuestion && (
            <div style={{
              background: '#fff',
              borderRadius: 20,
              padding: 32,
              boxShadow: '0 8px 32px rgba(25, 118, 210, 0.1)',
              border: '1px solid #e0f7fa',
              marginBottom: 32
            }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ 
                  fontSize: '3rem', 
                  marginBottom: 16,
                  opacity: 0.8 
                }}>
                  {hasAnswered ? '✅' : '❓'}
                </div>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 600, 
                  color: '#1976d2', 
                  marginBottom: 8 
                }}>
                  {hasAnswered ? '답변 완료!' : '질문에 답해주세요'}
                </h2>
              </div>

              {/* 질문 내용 */}
              <div style={{
                background: '#f8f9fa',
                borderRadius: 16,
                padding: 24,
                marginBottom: 24,
                border: '1px solid #e9ecef'
              }}>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#1976d2',
                  textAlign: 'center',
                  marginBottom: 12,
                  background: '#e3f2fd',
                  padding: '8px 16px',
                  borderRadius: 8,
                  display: 'inline-block',
                  margin: '0 auto 12px auto'
                }}>
                  📝 {currentQuestion.questionNumber}번 질문
                </div>
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: 500,
                  color: '#333',
                  lineHeight: 1.6,
                  textAlign: 'center'
                }}>
                  {currentQuestion.text}
                </div>
              </div>

              {/* 답변 입력 */}
              {!hasAnswered && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: 500, 
                    color: '#333', 
                    marginBottom: 16,
                    textAlign: 'center'
                  }}>
                    답변을 입력해주세요:
                  </div>
                  <textarea
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="여기에 답변을 자유롭게 입력하세요..."
                    style={{
                      width: '100%',
                      height: 120,
                      padding: '16px',
                      border: '2px solid #e9ecef',
                      borderRadius: 12,
                      fontSize: '1rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      lineHeight: 1.5,
                      background: '#fff',
                      boxSizing: 'border-box'
                    }}
                    onFocus={e => {
                      e.target.style.border = '2px solid #1976d2';
                      e.target.style.boxShadow = '0 0 0 3px rgba(25, 118, 210, 0.1)';
                    }}
                    onBlur={e => {
                      e.target.style.border = '2px solid #e9ecef';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <div style={{ 
                    textAlign: 'right', 
                    marginTop: 8, 
                    fontSize: '0.8rem', 
                    color: '#666' 
                  }}>
                    {textAnswer.length} 글자
                  </div>
                </div>
              )}

              {/* 답변 완료 메시지 */}
              {hasAnswered && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{
                    background: '#e8f5e8',
                    color: '#2e7d32',
                    padding: '16px 20px',
                    borderRadius: 16,
                    textAlign: 'center',
                    fontSize: '1rem',
                    fontWeight: 500,
                    border: '1px solid #a5d6a7',
                    marginBottom: 16
                  }}>
                    <CheckCircleIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />
                    답변이 성공적으로 제출되었습니다!
                  </div>
                  
                  {/* 제출된 답변 표시 */}
                  <div style={{
                    background: '#f8f9fa',
                    padding: '16px',
                    borderRadius: 12,
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#1976d2',
                      marginBottom: 8
                    }}>
                      📝 제출한 답변:
                    </div>
                    <div style={{
                      fontSize: '1rem',
                      color: '#333',
                      lineHeight: 1.5,
                      background: '#fff',
                      padding: '12px',
                      borderRadius: 8,
                      border: '1px solid #e0e0e0',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {textAnswer}
                    </div>
                  </div>
                </div>
              )}

              {/* 답변 제출 버튼 */}
              {!hasAnswered && (
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={submitAnswer}
                    disabled={!textAnswer.trim() || submitting}
                    style={{
                      background: textAnswer.trim() ? '#e8f5e8' : '#f5f5f5',
                      border: `2px solid ${textAnswer.trim() ? '#4caf50' : '#ccc'}`,
                      color: textAnswer.trim() ? '#2e7d32' : '#999',
                      fontWeight: 'bold',
                      borderRadius: 16,
                      padding: '16px 32px',
                      fontSize: '1.1rem',
                      cursor: (!textAnswer.trim() || submitting) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      margin: '0 auto',
                      opacity: (!textAnswer.trim() || submitting) ? 0.7 : 1
                    }}
                    onMouseOver={e => {
                      if (textAnswer.trim() && !submitting) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(76, 175, 80, 0.3)';
                      }
                    }}
                    onMouseOut={e => {
                      if (textAnswer.trim() && !submitting) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <SendIcon style={{ fontSize: 20 }} />
                    {submitting ? '제출 중...' : '답변 제출'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 질문이 없을 때 - 세션 정보 */}
          {!currentQuestion && (
            <div style={{
              background: '#fff',
              borderRadius: 20,
              padding: 32,
              boxShadow: '0 8px 32px rgba(25, 118, 210, 0.1)',
              border: '1px solid #e0f7fa',
              marginBottom: 32
            }}>
              {/* 버튼 그룹 */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: 12, 
                marginBottom: 16 
              }}>
                {/* 닉네임 변경 버튼 */}
                <button
                  onClick={changeNickname}
                  style={{
                    background: '#e8f5e8',
                    border: '2px solid #4caf50',
                    color: '#4caf50',
                    fontWeight: 'bold',
                    borderRadius: 12,
                    padding: '8px 16px',
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#c8e6c9';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = '#e8f5e8';
                  }}
                >
                  <EditIcon style={{ fontSize: 16 }} />
                  닉네임 변경
                </button>
                
                {/* 연결 해제 버튼 */}
                <button
                  onClick={disconnectFromSession}
                  style={{
                    background: '#ffebee',
                    border: '2px solid #d32f2f',
                    color: '#d32f2f',
                    fontWeight: 'bold',
                    borderRadius: 12,
                    padding: '8px 16px',
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#ffcdd2';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = '#ffebee';
                  }}
                >
                  <ExitToAppIcon style={{ fontSize: 16 }} />
                  연결 해제
                </button>
              </div>

              {/* 세션 코드 표시 */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ 
                  fontSize: '4rem', 
                  fontWeight: 900, 
                  color: '#1976d2',
                  fontFamily: 'monospace',
                  letterSpacing: '0.2em',
                  textShadow: '0 2px 4px rgba(25, 118, 210, 0.2)',
                  marginBottom: 8
                }}>
                  {session.code}
                </div>
                <div style={{ 
                  fontSize: '1.1rem', 
                  color: '#666',
                  fontWeight: 500
                }}>
                  연결된 세션 코드
                </div>
              </div>

              {/* 세션 정보 */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                gap: 32,
                marginBottom: 24,
                padding: '16px 24px',
                background: '#f8f9fa',
                borderRadius: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AccessTimeIcon style={{ fontSize: 20, color: '#666' }} />
                  <span style={{ fontSize: '1rem', color: '#666', fontWeight: 500 }}>
                    세션 시작: {formatTime(session.createdAt)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PeopleIcon style={{ fontSize: 20, color: '#1976d2' }} />
                  <span style={{ 
                    fontSize: '1.1rem', 
                    color: '#1976d2', 
                    fontWeight: 700 
                  }}>
                    {connectedUsers.length}명 연결
                  </span>
                </div>
              </div>

              {/* 대기 메시지 */}
              <div style={{
                background: '#fff3e0',
                color: '#ef6c00',
                padding: '16px 20px',
                borderRadius: 16,
                textAlign: 'center',
                fontSize: '1rem',
                fontWeight: 500,
                border: '1px solid #ffcc02',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12
              }}>
                <QuizIcon style={{ fontSize: 24 }} />
                교수자의 질문을 기다리고 있습니다...
              </div>
            </div>
          )}

          {/* 연결된 사용자 목록 */}
          {connectedUsers.length > 0 && (
            <div style={{
              background: '#fff',
              borderRadius: 20,
              padding: 24,
              boxShadow: '0 8px 32px rgba(25, 118, 210, 0.1)',
              border: '1px solid #e0f7fa'
            }}>
              <h3 style={{
                fontSize: '1.3rem',
                fontWeight: 600,
                color: '#1976d2',
                marginBottom: 20,
                textAlign: 'center'
              }}>
                연결된 사용자 목록
              </h3>
              
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 16
              }}>
                {connectedUsers.map((user, index) => (
                  <div
                    key={user.id}
                    style={{
                      background: user.id === userId ? '#e3f2fd' : '#f8f9fa',
                      border: user.id === userId ? '2px solid #1976d2' : '1px solid #e0e0e0',
                      borderRadius: 12,
                      padding: 16,
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      fontSize: '2rem',
                      marginBottom: 8
                    }}>
                      {user.id === userId ? '👤' : '👥'}
                    </div>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: user.id === userId ? '#1976d2' : '#666',
                      marginBottom: 4
                    }}>
                      {user.id === userId ? (user.nickname || '나') : (user.nickname || `사용자 ${index + 1}`)}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#999'
                    }}>
                      {formatTime(user.connectedAt)} 연결
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

             {/* 닉네임 변경 다이얼로그 */}
       <Dialog 
         open={showNicknameDialog} 
         onClose={() => setShowNicknameDialog(false)}
         PaperProps={{
           style: {
             borderRadius: '16px',
             padding: '32px',
             background: 'rgba(255, 255, 255, 0.95)',
             backdropFilter: 'blur(20px)',
             boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
             border: '1px solid rgba(255, 255, 255, 0.2)',
             minWidth: '400px'
           }
         }}
       >
         <DialogTitle style={{ 
           textAlign: 'center', 
           fontSize: '24px', 
           fontWeight: '700',
           color: '#2c3e50',
           paddingBottom: '24px',
           marginBottom: '0'
         }}>
           닉네임 변경
         </DialogTitle>
         <DialogContent style={{ paddingTop: '0px' }}>
           <div style={{ 
             marginBottom: '16px', 
             padding: '12px', 
             backgroundColor: '#e8f4fd', 
             borderRadius: '8px',
             border: '1px solid #bee5eb'
           }}>
             <p style={{ 
               margin: '0', 
               fontSize: '14px', 
               color: '#0c5460',
               fontWeight: '500'
             }}>
               📝 닉네임 작성 규칙
             </p>
             <p style={{ 
               margin: '4px 0 0 0', 
               fontSize: '13px', 
               color: '#0c5460'
             }}>
               예시: 만보초 홍길동
             </p>
           </div>
           <TextField
             autoFocus
             margin="dense"
             label="닉네임을 입력하세요"
             placeholder="만보초 홍길동"
             fullWidth
             variant="outlined"
             value={nickname}
             onChange={(e) => setNickname(e.target.value)}
             onKeyPress={(e) => e.key === 'Enter' && confirmNickname()}
             style={{ marginTop: '8px' }}
             InputProps={{
               style: {
                 borderRadius: '12px',
                 fontSize: '16px',
                 backgroundColor: '#f8f9fa'
               }
             }}
             InputLabelProps={{
               style: {
                 fontSize: '16px',
                 color: '#6c757d'
               }
             }}
           />
         </DialogContent>
         <DialogActions style={{ justifyContent: 'center', padding: '24px 0 0 0' }}>
           <Button 
             onClick={() => setShowNicknameDialog(false)}
             style={{
               background: '#f8f9fa',
               color: '#666',
               fontSize: '16px',
               padding: '12px 24px',
               borderRadius: '12px',
               textTransform: 'none',
               fontWeight: '600',
               marginRight: '12px'
             }}
           >
             취소
           </Button>
           <Button 
             onClick={confirmNickname} 
             variant="contained"
             disabled={!nickname.trim()}
             style={{
               background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
               color: 'white',
               fontSize: '16px',
               padding: '12px 32px',
               borderRadius: '12px',
               textTransform: 'none',
               fontWeight: '600',
               boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
               minWidth: '120px'
             }}
           >
             확인
           </Button>
         </DialogActions>
       </Dialog>
    </div>
  );
};

export default FormPage; 