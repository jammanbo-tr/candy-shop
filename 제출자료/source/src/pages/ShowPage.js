import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import QuizIcon from '@mui/icons-material/Quiz';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import BarChartIcon from '@mui/icons-material/BarChart';

const ShowPage = () => {
  const [sessions, setSessions] = useState([]);
  const [connectedUsers, setConnectedUsers] = useState({});
  const [loading, setLoading] = useState(false);
  
  // 물음 관련 상태
  const [selectedSession, setSelectedSession] = useState(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [currentQuestions, setCurrentQuestions] = useState({});
  const [responses, setResponses] = useState({});
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedQuestionForResults, setSelectedQuestionForResults] = useState(null);
  
  // 질문 히스토리 관련 상태
  const [questionHistories, setQuestionHistories] = useState({});
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedSessionForHistory, setSelectedSessionForHistory] = useState(null);
  const [questionResponses, setQuestionResponses] = useState({});
  const [showQuestionResponseModal, setShowQuestionResponseModal] = useState(false);
  const [selectedQuestionForResponse, setSelectedQuestionForResponse] = useState(null);

  // 실시간으로 세션들 가져오기
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'show-sessions'), (snapshot) => {
      const sessionList = [];
      snapshot.forEach((doc) => {
        sessionList.push({ id: doc.id, ...doc.data() });
      });
      setSessions(sessionList.sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => unsubscribe();
  }, []);

  // 각 세션별 연결된 사용자 실시간 감지
  useEffect(() => {
    const unsubscribes = sessions.map(session => {
      return onSnapshot(collection(db, `show-sessions/${session.id}/users`), (snapshot) => {
        const users = [];
        snapshot.forEach((doc) => {
          users.push({ id: doc.id, ...doc.data() });
        });
        setConnectedUsers(prev => ({
          ...prev,
          [session.id]: users
        }));
      });
    });

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [sessions]);

  // 각 세션별 현재 활성 물음 실시간 감지
  useEffect(() => {
    const unsubscribes = sessions.map(session => {
      return onSnapshot(doc(db, 'show-sessions', session.id), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setCurrentQuestions(prev => ({
            ...prev,
            [session.id]: data.currentQuestion || null
          }));
        }
      });
    });

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [sessions]);

  // 각 세션별 답변 실시간 감지 (현재 활성 질문)
  useEffect(() => {
    const unsubscribes = sessions.map(session => {
      if (!currentQuestions[session.id] || !currentQuestions[session.id].questionNumber) return () => {};
      
      const currentQuestion = currentQuestions[session.id];
      const collectionPath = `show-sessions/${session.id}/questionResponses`;
      
      return onSnapshot(collection(db, collectionPath), (snapshot) => {
        const sessionResponses = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // 현재 활성 질문 번호와 일치하는 응답만 필터링
          if (data.questionNumber === currentQuestion.questionNumber) {
            sessionResponses.push({ id: doc.id, ...data });
          }
        });
        setResponses(prev => ({
          ...prev,
          [session.id]: sessionResponses
        }));
      });
    });

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [sessions, currentQuestions]);

  // 각 세션별 질문 히스토리 실시간 감지
  useEffect(() => {
    const unsubscribes = sessions.map(session => {
      return onSnapshot(collection(db, `show-sessions/${session.id}/questions`), (snapshot) => {
        const questions = [];
        snapshot.forEach((doc) => {
          questions.push({ id: doc.id, ...doc.data() });
        });
        // 질문 번호 순으로 정렬
        questions.sort((a, b) => a.questionNumber - b.questionNumber);
        setQuestionHistories(prev => ({
          ...prev,
          [session.id]: questions
        }));
      });
    });

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [sessions]);

  // 랜덤 3자리 코드 생성
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 3; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // 새 세션 생성
  const createSession = async () => {
    setLoading(true);
    try {
      const code = generateCode();
      const sessionRef = doc(db, 'show-sessions', code);
      await setDoc(sessionRef, {
        code: code,
        createdAt: Date.now(),
        createdBy: 'teacher',
        isActive: true,
        currentQuestion: null,
        questionCount: 0
      });
    } catch (error) {
      console.error('세션 생성 실패:', error);
      alert('세션 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 세션 삭제
  const deleteSession = async (sessionId) => {
    if (!window.confirm('정말로 이 세션을 삭제하시겠습니까?')) return;
    
    try {
      await deleteDoc(doc(db, 'show-sessions', sessionId));
    } catch (error) {
      console.error('세션 삭제 실패:', error);
      alert('세션 삭제에 실패했습니다.');
    }
  };

  // 물음 생성 및 활성화
  const createAndSendQuestion = async () => {
    if (!questionText.trim()) {
      alert('질문을 입력해주세요.');
      return;
    }

    try {
      // 현재 질문 수 가져오기
      const sessionDoc = await getDoc(doc(db, 'show-sessions', selectedSession.id));
      const sessionData = sessionDoc.data();
      const nextQuestionNumber = (sessionData.questionCount || 0) + 1;

      const questionData = {
        questionNumber: nextQuestionNumber,
        id: Date.now().toString(),
        text: questionText.trim(),
        type: 'open',
        createdAt: Date.now(),
        status: 'active',
        completedAt: null
      };

      // 질문 히스토리에 저장
      await setDoc(doc(db, `show-sessions/${selectedSession.id}/questions`, nextQuestionNumber.toString()), questionData);

      // 세션에 현재 질문과 질문 수 업데이트
      await updateDoc(doc(db, 'show-sessions', selectedSession.id), {
        currentQuestion: questionData,
        questionCount: nextQuestionNumber
      });

      setQuestionText('');
      setShowQuestionModal(false);
      setSelectedSession(null);
      alert(`${nextQuestionNumber}번 질문이 전송되었습니다!`);
    } catch (error) {
      console.error('질문 전송 실패:', error);
      alert('질문 전송에 실패했습니다.');
    }
  };

  // 물음 중지
  const stopQuestion = async (sessionId) => {
    try {
      // 현재 활성 질문 가져오기
      const sessionDoc = await getDoc(doc(db, 'show-sessions', sessionId));
      const sessionData = sessionDoc.data();
      const currentQuestion = sessionData.currentQuestion;

      if (currentQuestion) {
        // 질문을 완료 상태로 변경
        await updateDoc(doc(db, `show-sessions/${sessionId}/questions`, currentQuestion.questionNumber.toString()), {
          status: 'completed',
          completedAt: Date.now()
        });
      }

      // 현재 질문 null로 설정
      await updateDoc(doc(db, 'show-sessions', sessionId), {
        currentQuestion: null
      });
      
      alert(`${currentQuestion ? currentQuestion.questionNumber + '번 ' : ''}질문이 종료되었습니다.`);
    } catch (error) {
      console.error('질문 중지 실패:', error);
      alert('질문 중지에 실패했습니다.');
    }
  };

  // 결과 보기
  const viewResults = (sessionId, question) => {
    setSelectedQuestionForResults({ sessionId, question });
    setShowResultsModal(true);
  };

  // 질문 히스토리 보기
  const viewQuestionHistory = (session) => {
    setSelectedSessionForHistory(session);
    setShowHistoryModal(true);
  };

  // 특정 질문의 응답 보기
  const viewQuestionResponses = async (sessionId, question) => {
    setSelectedQuestionForResponse({ sessionId, question });
    setShowQuestionResponseModal(true);
    
    try {
      // 해당 질문의 응답들 로드
      const collectionPath = `show-sessions/${sessionId}/questionResponses`;
      const unsubscribe = onSnapshot(collection(db, collectionPath), (snapshot) => {
        const responses = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // 해당 질문 번호와 일치하는 응답만 필터링
          if (data.questionNumber === question.questionNumber) {
            responses.push({ id: doc.id, ...data });
          }
        });
        setQuestionResponses(prev => ({
          ...prev,
          [`${sessionId}_${question.questionNumber}`]: responses.sort((a, b) => a.submittedAt - b.submittedAt)
        }));
      });
      
      // 모달이 닫힐 때 리스너 해제하기 위해 저장
      setSelectedQuestionForResponse(prev => ({ ...prev, unsubscribe }));
    } catch (error) {
      console.error('질문 응답 로드 실패:', error);
    }
  };

  // 시간 포맷 함수
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // 결과 계산
  const getTextResponses = (sessionId) => {
    const sessionResponses = responses[sessionId] || [];
    return sessionResponses.map(response => ({
      userId: response.userId,
      answer: response.textAnswer || '',
      submittedAt: response.submittedAt
    })).sort((a, b) => a.submittedAt - b.submittedAt);
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
          교수자 Show 페이지
        </h1>
        <p style={{ 
          fontSize: '1.1rem', 
          color: '#666', 
          fontWeight: 500 
        }}>
          + 버튼을 눌러 새로운 세션을 생성하고 물음을 통해 학생들과 소통하세요
        </p>
      </div>

      {/* 새 세션 생성 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
        <button
          onClick={createSession}
          disabled={loading}
          style={{
            background: '#e0f7fa',
            border: '2px solid #1976d2',
            color: '#1976d2',
            fontWeight: 'bold',
            borderRadius: 12,
            boxShadow: '0 2px 8px #b2ebf240',
            padding: '16px 32px',
            fontSize: 18,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            opacity: loading ? 0.7 : 1
          }}
          onMouseOver={e => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 16px #b2ebf260';
            }
          }}
          onMouseOut={e => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px #b2ebf240';
            }
          }}
        >
          <AddIcon style={{ fontSize: 24 }} />
          {loading ? '생성 중...' : '새 세션 생성'}
        </button>
      </div>

      {/* 세션 목록 */}
      <div style={{ 
        maxWidth: 1200, 
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
        gap: 24
      }}>
        {sessions.map((session) => (
          <div
            key={session.id}
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: 24,
              boxShadow: '0 8px 32px rgba(25, 118, 210, 0.1)',
              border: '1px solid #e0f7fa',
              transition: 'all 0.3s ease',
              position: 'relative'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(25, 118, 210, 0.15)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(25, 118, 210, 0.1)';
            }}
          >
            {/* 삭제 버튼 */}
            <button
              onClick={() => deleteSession(session.id)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: '#ffebee',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = '#ffcdd2';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = '#ffebee';
              }}
            >
              <DeleteIcon style={{ fontSize: 20, color: '#d32f2f' }} />
            </button>

            {/* 세션 코드 */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ 
                fontSize: '3rem', 
                fontWeight: 900, 
                color: '#1976d2',
                fontFamily: 'monospace',
                letterSpacing: '0.2em',
                textShadow: '0 2px 4px rgba(25, 118, 210, 0.2)'
              }}>
                {session.code}
              </div>
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#666',
                fontWeight: 500
              }}>
                세션 코드
              </div>
            </div>

            {/* 세션 정보 */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 16,
              padding: '12px 16px',
              background: '#f8f9fa',
              borderRadius: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AccessTimeIcon style={{ fontSize: 18, color: '#666' }} />
                <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 500 }}>
                  {formatTime(session.createdAt)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PeopleIcon style={{ fontSize: 18, color: '#1976d2' }} />
                <span style={{ 
                  fontSize: '1rem', 
                  color: '#1976d2', 
                  fontWeight: 700 
                }}>
                  {connectedUsers[session.id]?.length || 0}명 연결
                </span>
              </div>
            </div>

            {/* 현재 활성 질문 */}
            {currentQuestions[session.id] && (
              <div style={{
                background: '#fff3e0',
                border: '1px solid #ffcc02',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16
              }}>
                <div style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 600, 
                  color: '#ef6c00', 
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <QuizIcon style={{ fontSize: 16 }} />
                  {currentQuestions[session.id].questionNumber}번 질문 (진행 중):
                </div>
                <div style={{ 
                  fontSize: '1rem', 
                  color: '#333', 
                  marginBottom: 12 
                }}>
                  {currentQuestions[session.id].text}
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: '#666',
                  marginBottom: 12 
                }}>
                  답변: {responses[session.id]?.length || 0}개 수집됨
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => viewResults(session.id, currentQuestions[session.id])}
                    style={{
                      background: '#e3f2fd',
                      border: '1px solid #2196f3',
                      color: '#1976d2',
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <BarChartIcon style={{ fontSize: 14 }} />
                    결과 보기
                  </button>
                  <button
                    onClick={() => stopQuestion(session.id)}
                    style={{
                      background: '#ffebee',
                      border: '1px solid #f44336',
                      color: '#d32f2f',
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <StopIcon style={{ fontSize: 14 }} />
                    질문 종료
                  </button>
                </div>
              </div>
            )}

            {/* 질문 히스토리 요약 */}
            {questionHistories[session.id] && questionHistories[session.id].length > 0 && (
              <div style={{ 
                background: '#f3e5f5', 
                borderRadius: 12, 
                padding: 16,
                border: '1px solid #ce93d8',
                marginBottom: 16
              }}>
                <div style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 600, 
                  color: '#7b1fa2', 
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>📝 질문 히스토리 ({questionHistories[session.id].length}개)</span>
                  <button
                    onClick={() => viewQuestionHistory(session)}
                    style={{
                      background: '#e1bee7',
                      border: '1px solid #9c27b0',
                      color: '#6a1b9a',
                      borderRadius: 8,
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      cursor: 'pointer'
                    }}
                  >
                    전체 보기
                  </button>
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: '#4a148c',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 4
                }}>
                  {questionHistories[session.id].slice(-3).map(q => (
                    <span key={q.questionNumber} style={{
                      background: q.status === 'completed' ? '#c8e6c9' : '#fff3e0',
                      padding: '2px 6px',
                      borderRadius: 4,
                      border: q.status === 'completed' ? '1px solid #4caf50' : '1px solid #ff9800'
                    }}>
                      {q.questionNumber}번 {q.status === 'completed' ? '완료' : '진행중'}
                    </span>
                  ))}
                  {questionHistories[session.id].length > 3 && (
                    <span style={{ color: '#666', fontSize: '0.7rem' }}>...외 {questionHistories[session.id].length - 3}개</span>
                  )}
                </div>
              </div>
            )}

            {/* 연결된 사용자 목록 */}
            {connectedUsers[session.id] && connectedUsers[session.id].length > 0 && (
              <div style={{ 
                background: '#f0f8ff', 
                borderRadius: 12, 
                padding: 16,
                border: '1px solid #e3f2fd',
                marginBottom: 16
              }}>
                <div style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 600, 
                  color: '#1976d2', 
                  marginBottom: 8 
                }}>
                  연결된 사용자:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {connectedUsers[session.id].map((user, index) => (
                    <span
                      key={user.id}
                      style={{
                        background: '#1976d2',
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: 16,
                        fontSize: '0.8rem',
                        fontWeight: 500
                      }}
                    >
                      {user.nickname || `사용자 ${index + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 질문 보내기 버튼 */}
            {connectedUsers[session.id] && connectedUsers[session.id].length > 0 && (
              <button
                onClick={() => {
                  setSelectedSession(session);
                  setShowQuestionModal(true);
                }}
                disabled={currentQuestions[session.id] !== null}
                style={{
                  width: '100%',
                  background: currentQuestions[session.id] ? '#f5f5f5' : '#e8f5e8',
                  border: `2px solid ${currentQuestions[session.id] ? '#ccc' : '#4caf50'}`,
                  color: currentQuestions[session.id] ? '#999' : '#2e7d32',
                  fontWeight: 'bold',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: '1rem',
                  cursor: currentQuestions[session.id] ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: currentQuestions[session.id] ? 0.5 : 1
                }}
              >
                <QuizIcon style={{ fontSize: 20 }} />
                {currentQuestions[session.id] ? '질문 진행 중' : '질문 보내기'}
              </button>
            )}

            {/* 연결된 사용자가 없을 때 */}
            {(!connectedUsers[session.id] || connectedUsers[session.id].length === 0) && (
              <div style={{ 
                background: '#f5f5f5', 
                borderRadius: 12, 
                padding: 16,
                textAlign: 'center',
                color: '#666',
                fontSize: '0.9rem'
              }}>
                아직 연결된 사용자가 없습니다
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 세션이 없을 때 */}
      {sessions.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: 80,
          color: '#666',
          fontSize: '1.1rem'
        }}>
          <div style={{ 
            fontSize: '3rem', 
            marginBottom: 16,
            opacity: 0.5 
          }}>
            📱
          </div>
          <div>아직 생성된 세션이 없습니다.</div>
          <div>+ 버튼을 눌러 첫 번째 세션을 만들어보세요!</div>
        </div>
      )}

      {/* 질문 생성 모달 */}
      {showQuestionModal && (
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
          zIndex: 1000 
        }}>
          <div style={{ 
            background: '#fff', 
            padding: '32px', 
            borderRadius: 20, 
            minWidth: 500, 
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)' 
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600, 
              color: '#1976d2', 
              marginBottom: 24, 
              textAlign: 'center' 
            }}>
              질문 생성하기
            </h2>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', 
                fontSize: '1rem', 
                fontWeight: 500, 
                color: '#333', 
                marginBottom: 8 
              }}>
                질문 내용:
              </label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="학생들에게 묻고 싶은 질문을 입력하세요..."
                style={{
                  width: '100%',
                  height: 80,
                  padding: '12px',
                  border: '2px solid #e0f7fa',
                  borderRadius: 12,
                  fontSize: '1rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.border = '2px solid #1976d2'}
                onBlur={e => e.target.style.border = '2px solid #e0f7fa'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ 
                background: '#f0f8ff', 
                padding: '16px', 
                borderRadius: 12, 
                border: '1px solid #e3f2fd',
                textAlign: 'center',
                color: '#1976d2',
                fontSize: '0.9rem',
                fontWeight: 500
              }}>
                📝 학생들이 자유롭게 텍스트로 답변할 수 있는 주관식 질문입니다
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setShowQuestionModal(false);
                  setSelectedSession(null);
                  setQuestionText('');
                }}
                style={{
                  background: '#f5f5f5',
                  border: '2px solid #ccc',
                  color: '#666',
                  fontWeight: 'bold',
                  borderRadius: 12,
                  padding: '12px 24px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                취소
              </button>
              <button
                onClick={createAndSendQuestion}
                style={{
                  background: '#e8f5e8',
                  border: '2px solid #4caf50',
                  color: '#2e7d32',
                  fontWeight: 'bold',
                  borderRadius: 12,
                  padding: '12px 24px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <SendIcon style={{ fontSize: 18 }} />
                질문 전송
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 결과 보기 모달 */}
      {showResultsModal && selectedQuestionForResults && (
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
          zIndex: 1000 
        }}>
          <div style={{ 
            background: '#fff', 
            padding: '32px', 
            borderRadius: 20, 
            minWidth: 600, 
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)' 
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600, 
              color: '#1976d2', 
              marginBottom: 16, 
              textAlign: 'center' 
            }}>
              질문 결과
            </h2>
            
            <div style={{ 
              background: '#f8f9fa', 
              padding: '16px', 
              borderRadius: 12, 
              marginBottom: 24 
            }}>
              <div style={{ 
                fontSize: '1.1rem', 
                fontWeight: 500, 
                color: '#333', 
                marginBottom: 8 
              }}>
                {selectedQuestionForResults.question.text}
              </div>
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#666' 
              }}>
                총 {responses[selectedQuestionForResults.sessionId]?.length || 0}개 답변 수집
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              {getTextResponses(selectedQuestionForResults.sessionId).map((response, index) => (
                <div key={index} style={{ 
                  marginBottom: 16,
                  background: '#f8f9fa',
                  padding: '16px',
                  borderRadius: 12,
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: 8 
                  }}>
                    <span style={{ 
                      fontSize: '0.9rem', 
                      fontWeight: 600, 
                      color: '#1976d2' 
                    }}>
                      답변 {index + 1}
                    </span>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      color: '#666' 
                    }}>
                      {new Date(response.submittedAt).toLocaleTimeString('ko-KR', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    color: '#333',
                    lineHeight: 1.5,
                    background: '#fff',
                    padding: '12px',
                    borderRadius: 8,
                    border: '1px solid #e0e0e0',
                    minHeight: '20px'
                  }}>
                    {response.answer || '(답변 없음)'}
                  </div>
                </div>
              ))}
              
              {getTextResponses(selectedQuestionForResults.sessionId).length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '32px',
                  color: '#666',
                  fontSize: '1rem'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📝</div>
                  아직 답변이 없습니다
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => {
                  setShowResultsModal(false);
                  setSelectedQuestionForResults(null);
                }}
                style={{
                  background: '#e0f7fa',
                  border: '2px solid #1976d2',
                  color: '#1976d2',
                  fontWeight: 'bold',
                  borderRadius: 12,
                  padding: '12px 24px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 질문 히스토리 모달 */}
      {showHistoryModal && selectedSessionForHistory && (
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
          zIndex: 1000 
        }}>
          <div style={{ 
            background: '#fff', 
            padding: '32px', 
            borderRadius: 20, 
            minWidth: 800, 
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)' 
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600, 
              color: '#1976d2', 
              marginBottom: 16, 
              textAlign: 'center' 
            }}>
              📝 질문 히스토리 - {selectedSessionForHistory.code}
            </h2>
            
            <div style={{ 
              background: '#f0f8ff', 
              padding: '16px', 
              borderRadius: 12, 
              marginBottom: 24,
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '1rem', 
                color: '#1976d2',
                fontWeight: 500
              }}>
                총 {questionHistories[selectedSessionForHistory.id]?.length || 0}개의 질문이 있습니다
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              {questionHistories[selectedSessionForHistory.id]?.map((question) => (
                <div key={question.questionNumber} style={{ 
                  marginBottom: 20,
                  background: question.status === 'completed' ? '#f1f8e9' : '#fff3e0',
                  padding: '20px',
                  borderRadius: 12,
                  border: question.status === 'completed' ? '2px solid #4caf50' : '2px solid #ff9800'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: 12 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ 
                        fontSize: '1.2rem', 
                        fontWeight: 700, 
                        color: question.status === 'completed' ? '#2e7d32' : '#ef6c00',
                        background: '#fff',
                        padding: '4px 12px',
                        borderRadius: 8,
                        border: question.status === 'completed' ? '1px solid #4caf50' : '1px solid #ff9800'
                      }}>
                        {question.questionNumber}번
                      </span>
                      <span style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: 600, 
                        color: question.status === 'completed' ? '#2e7d32' : '#ef6c00',
                        background: '#fff',
                        padding: '2px 8px',
                        borderRadius: 6
                      }}>
                        {question.status === 'completed' ? '완료' : '진행중'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        color: '#666' 
                      }}>
                        {new Date(question.createdAt).toLocaleString('ko-KR')}
                      </span>
                                             {question.status === 'completed' && (
                         <button
                           onClick={() => viewQuestionResponses(selectedSessionForHistory.id, question)}
                           style={{
                             background: '#e3f2fd',
                             border: '1px solid #2196f3',
                             color: '#1976d2',
                             borderRadius: 6,
                             padding: '4px 8px',
                             fontSize: '0.7rem',
                             cursor: 'pointer'
                           }}
                         >
                           응답 보기
                         </button>
                       )}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    color: '#333',
                    lineHeight: 1.5,
                    background: '#fff',
                    padding: '12px',
                    borderRadius: 8,
                    border: '1px solid #e0e0e0'
                  }}>
                    {question.text}
                  </div>
                  {question.completedAt && (
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: '#666',
                      marginTop: 8,
                      textAlign: 'right'
                    }}>
                      종료 시간: {new Date(question.completedAt).toLocaleString('ko-KR')}
                    </div>
                  )}
                </div>
              ))}
              
              {(!questionHistories[selectedSessionForHistory.id] || questionHistories[selectedSessionForHistory.id].length === 0) && (
                <div style={{
                  textAlign: 'center',
                  padding: '32px',
                  color: '#666',
                  fontSize: '1rem'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📝</div>
                  아직 질문이 없습니다
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedSessionForHistory(null);
                }}
                style={{
                  background: '#e0f7fa',
                  border: '2px solid #1976d2',
                  color: '#1976d2',
                  fontWeight: 'bold',
                  borderRadius: 12,
                  padding: '12px 24px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                닫기
              </button>
            </div>
                     </div>
         </div>
       )}

      {/* 특정 질문 응답 보기 모달 */}
      {showQuestionResponseModal && selectedQuestionForResponse && (
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
          zIndex: 1001 
        }}>
          <div style={{ 
            background: '#fff', 
            padding: '32px', 
            borderRadius: 20, 
            minWidth: 700, 
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)' 
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600, 
              color: '#1976d2', 
              marginBottom: 16, 
              textAlign: 'center' 
            }}>
              📊 {selectedQuestionForResponse.question.questionNumber}번 질문 응답 결과
            </h2>
            
            <div style={{ 
              background: '#f0f8ff', 
              padding: '16px', 
              borderRadius: 12, 
              marginBottom: 24,
              border: '1px solid #e3f2fd'
            }}>
              <div style={{ 
                fontSize: '1.1rem', 
                fontWeight: 500, 
                color: '#333', 
                marginBottom: 12,
                textAlign: 'center'
              }}>
                "{selectedQuestionForResponse.question.text}"
              </div>
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#666',
                textAlign: 'center'
              }}>
                총 {questionResponses[`${selectedQuestionForResponse.sessionId}_${selectedQuestionForResponse.question.questionNumber}`]?.length || 0}개 응답 수집
              </div>
              <div style={{ 
                fontSize: '0.8rem', 
                color: '#999',
                textAlign: 'center',
                marginTop: 4
              }}>
                작성: {new Date(selectedQuestionForResponse.question.createdAt).toLocaleString('ko-KR')} | 
                종료: {new Date(selectedQuestionForResponse.question.completedAt).toLocaleString('ko-KR')}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              {questionResponses[`${selectedQuestionForResponse.sessionId}_${selectedQuestionForResponse.question.questionNumber}`]?.map((response, index) => (
                <div key={response.id} style={{ 
                  marginBottom: 16,
                  background: '#f8f9fa',
                  padding: '20px',
                  borderRadius: 12,
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: 12 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ 
                        fontSize: '1rem', 
                        fontWeight: 600, 
                        color: '#1976d2',
                        background: '#e3f2fd',
                        padding: '4px 12px',
                        borderRadius: 6,
                        border: '1px solid #2196f3'
                      }}>
                        {index + 1}번
                      </span>
                      <span style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: 600, 
                        color: '#333',
                        background: '#fff',
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: '1px solid #ddd'
                      }}>
                        {response.nickname || '익명'}
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      color: '#666' 
                    }}>
                      {new Date(response.submittedAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    color: '#333',
                    lineHeight: 1.5,
                    background: '#fff',
                    padding: '16px',
                    borderRadius: 8,
                    border: '1px solid #e0e0e0',
                    minHeight: '40px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {response.textAnswer || '(답변 없음)'}
                  </div>
                </div>
              ))}
              
              {(!questionResponses[`${selectedQuestionForResponse.sessionId}_${selectedQuestionForResponse.question.questionNumber}`] || 
                questionResponses[`${selectedQuestionForResponse.sessionId}_${selectedQuestionForResponse.question.questionNumber}`].length === 0) && (
                <div style={{
                  textAlign: 'center',
                  padding: '32px',
                  color: '#666',
                  fontSize: '1rem'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📝</div>
                  이 질문에 대한 응답이 없습니다
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => {
                  // 리스너 해제
                  if (selectedQuestionForResponse.unsubscribe) {
                    selectedQuestionForResponse.unsubscribe();
                  }
                  setShowQuestionResponseModal(false);
                  setSelectedQuestionForResponse(null);
                }}
                style={{
                  background: '#e0f7fa',
                  border: '2px solid #1976d2',
                  color: '#1976d2',
                  fontWeight: 'bold',
                  borderRadius: 12,
                  padding: '12px 24px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowPage; 