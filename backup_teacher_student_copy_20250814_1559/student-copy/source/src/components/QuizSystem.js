import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

// AppleInput 컴포넌트를 외부로 이동
const AppleInput = ({ placeholder, value, onChange, multiline = false, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const Component = multiline ? 'textarea' : 'input';
  
  return (
    <Component
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 16,
        padding: '12px 16px',
        borderRadius: 12,
        border: `1px solid ${isFocused ? '#007AFF' : '#d2d2d7'}`,
        background: 'white',
        width: '100%',
        resize: multiline ? 'vertical' : 'none',
        minHeight: multiline ? 80 : 'auto',
        outline: 'none',
        transition: 'border-color 0.2s ease',
        boxSizing: 'border-box'
      }}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      {...props}
    />
  );
};

// AppleButton 컴포넌트도 외부로 이동
const AppleButton = ({ children, onClick, variant = 'primary', disabled = false, ...props }) => {
  const baseStyle = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: 600,
    fontSize: 16,
    padding: '12px 24px',
    borderRadius: 12,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    opacity: disabled ? 0.6 : 1
  };

  const variants = {
    primary: {
      background: '#000',
      color: 'white',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
    },
    secondary: {
      background: '#f5f5f7',
      color: '#1d1d1f',
      border: '1px solid #d2d2d7'
    },
    danger: {
      background: '#ff3b30',
      color: 'white',
      boxShadow: '0 2px 8px rgba(255, 59, 48, 0.25)'
    }
  };

  return (
    <button
      style={{ ...baseStyle, ...variants[variant] }}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// AppleCard 컴포넌트도 외부로 이동
const AppleCard = ({ children, ...props }) => (
  <div
    style={{
      background: 'white',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
      border: '1px solid #f5f5f7',
      marginBottom: 16
    }}
    {...props}
  >
    {children}
  </div>
);

const QuizSystem = ({ isTeacher = false, currentUser = null, studentsSnapshot = null, collectionPrefix = '' }) => {
  
  const [quizzes, setQuizzes] = useState([]);
  const [responses, setResponses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResponsesModal, setShowResponsesModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showSendSuccessModal, setShowSendSuccessModal] = useState(false);
  
  // 재전송 확인 모달 상태
  const [showResendModal, setShowResendModal] = useState(false);
  const [resendData, setResendData] = useState({ quiz: null, students: [], type: '' });
  
  // 문제 생성 상태
  const [quizTitle, setQuizTitle] = useState('');
  const [quizType, setQuizType] = useState('multiple');
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [textAnswer, setTextAnswer] = useState('');
  const [expReward, setExpReward] = useState(15);
  const [moneyReward, setMoneyReward] = useState(0);
  
  // 학생 응답 상태
  const [studentAnswer, setStudentAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState(-1);

  useEffect(() => {
    const quizzesQuery = query(collection(db, `${collectionPrefix}quizzes`), orderBy('createdAt', 'desc'));
    const unsubscribeQuizzes = onSnapshot(quizzesQuery, (snapshot) => {
      const quizList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setQuizzes(quizList);
    }, (error) => {
      console.error('퀴즈 데이터 로드 오류:', error);
    });

    const responsesQuery = query(collection(db, `${collectionPrefix}quizResponses`), orderBy('createdAt', 'desc'));
    const unsubscribeResponses = onSnapshot(responsesQuery, (snapshot) => {
      const responseList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setResponses(responseList);
    }, (error) => {
      console.error('응답 데이터 로드 오류:', error);
    });

    return () => {
      unsubscribeQuizzes();
      unsubscribeResponses();
    };
  }, []);

  const handleCreateQuiz = async () => {
    if (!quizTitle.trim() || !quizQuestion.trim()) return;
    if (quizType === 'text' && !textAnswer.trim()) return;
    
    try {
      const quizData = {
        title: quizTitle,
        type: quizType,
        question: quizQuestion,
        options: quizType === 'multiple' ? quizOptions.filter(opt => opt.trim()) : [],
        correctAnswer: quizType === 'multiple' ? correctAnswer : null,
        textAnswer: quizType === 'text' ? textAnswer : null,
        expReward: expReward,
        moneyReward: moneyReward,
        isActive: true,
        createdBy: currentUser?.name || 'Teacher',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, `${collectionPrefix}quizzes`), quizData);
      
      setQuizTitle('');
      setQuizQuestion('');
      setQuizOptions(['', '', '', '']);
      setCorrectAnswer(0);
      setTextAnswer('');
      setExpReward(15);
      setMoneyReward(0);
      setShowCreateModal(false);
    } catch (error) {
      console.error('퀴즈 생성 오류:', error);
    }
  };

  // 주관식 정답 체크 함수
  const checkTextAnswer = (studentAnswer, correctAnswers) => {
    if (!correctAnswers) return false;
    
    // #으로 구분된 정답들을 배열로 변환
    const answers = correctAnswers.split('#').filter(ans => ans.trim());
    const studentAnswerTrimmed = studentAnswer.trim().toLowerCase();
    
    // 각 정답과 비교 (대소문자 무시, 공백 제거)
    return answers.some(answer => 
      answer.trim().toLowerCase() === studentAnswerTrimmed
    );
  };

  const handleSubmitResponse = async (quiz) => {
    if (!currentUser) return;
    
    let answer = '';
    let isCorrect = false;
    
    if (quiz.type === 'multiple') {
      if (selectedOption === -1) return;
      answer = quiz.options[selectedOption];
      isCorrect = selectedOption === quiz.correctAnswer;
    } else if (quiz.type === 'text') {
      if (!studentAnswer.trim()) return;
      answer = studentAnswer;
      isCorrect = checkTextAnswer(studentAnswer, quiz.textAnswer);
    }

    try {
      await addDoc(collection(db, `${collectionPrefix}quizResponses`), {
        quizId: quiz.id,
        quizTitle: quiz.title,
        studentName: currentUser.name,
        studentId: currentUser.id,
        answer,
        isCorrect,
        createdAt: new Date().toISOString()
      });

      setStudentAnswer('');
      setSelectedOption(-1);
    } catch (error) {
      console.error('응답 제출 오류:', error);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    try {
      await deleteDoc(doc(db, `${collectionPrefix}quizzes`, quizId));
    } catch (error) {
      console.error('퀴즈 삭제 오류:', error);
    }
  };

  const handleSendQuizToStudents = async (quiz) => {
    try {
      console.log('🚀 퀴즈 즉시 전송 시작:', quiz.title);
      
      // 퀴즈를 활성화하고 학생들에게 알림 전송
      const notificationDoc = await addDoc(collection(db, `${collectionPrefix}notifications`), {
        type: 'quiz',
        title: '🍭 새로운 캔디 퀴즈가 도착했어요!',
        message: `"${quiz.title}" 퀴즈를 풀어보세요!`,
        quizId: quiz.id,
        quizData: quiz,
        createdAt: new Date().toISOString(),
        isActive: true,
        priority: 'high' // 높은 우선순위로 설정
      });
      
      console.log('✅ 퀴즈 전송 완료:', notificationDoc.id);
      setShowSendSuccessModal(true);
    } catch (error) {
      console.error('❌ 퀴즈 전송 오류:', error);
      alert('퀴즈 전송 중 오류가 발생했습니다.');
    }
  };

  const getQuizResponses = (quizId) => {
    return responses.filter(response => response.quizId === quizId);
  };

  const hasUserResponded = (quizId) => {
    return responses.some(response => 
      response.quizId === quizId && response.studentId === currentUser?.id
    );
  };

  // 응답하지 않은 학생들 찾기
  const getUnrespondedStudents = (quizId) => {
    if (!studentsSnapshot) return [];
    
    const allStudents = studentsSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name
    }));
    
    const respondedStudentIds = getQuizResponses(quizId).map(response => response.studentId);
    
    return allStudents.filter(student => !respondedStudentIds.includes(student.id));
  };

  // 재전송 확인 모달 열기
  const openResendModal = (quiz, students, type) => {
    setResendData({ quiz, students, type });
    setShowResendModal(true);
  };

  // 특정 학생들에게 퀴즈 재전송
  const handleResendQuizToStudents = async (quiz, targetStudentIds = []) => {
    try {
      console.log('🔄 퀴즈 재전송 시작:', quiz.title, '대상:', targetStudentIds.length, '명');
      
      // 특정 학생들에게만 알림 전송
      const notificationDoc = await addDoc(collection(db, `${collectionPrefix}notifications`), {
        type: 'quiz',
        title: '🍭 캔디 퀴즈 재전송!',
        message: `"${quiz.title}" 퀴즈를 다시 보내드려요! 놓치지 마세요!`,
        quizId: quiz.id,
        quizData: quiz,
        targetStudents: targetStudentIds, // 특정 학생들만 대상
        createdAt: new Date().toISOString(),
        isActive: true,
        isResend: true,
        priority: 'high' // 높은 우선순위로 설정
      });
      
      console.log('✅ 퀴즈 재전송 완료:', notificationDoc.id);
      setShowResendModal(false);
      alert(`${targetStudentIds.length}명의 학생에게 퀴즈가 즉시 재전송되었습니다! 🚀`);
    } catch (error) {
      console.error('❌ 퀴즈 재전송 오류:', error);
      alert('퀴즈 재전송 중 오류가 발생했습니다.');
    }
  };



  // 교사용 UI
  if (isTeacher) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f5f5f7',
        padding: 20
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            marginBottom: 32
          }}>
            <img 
              src="/chupa.png" 
              alt="캔디 아이콘" 
              style={{ width: 48, height: 48 }}
            />
            <h1 style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: 32,
              fontWeight: 700,
              color: '#1d1d1f',
              margin: 0
            }}>
              캔디 퀴즈타임 - 교사용
            </h1>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <AppleButton onClick={() => setShowCreateModal(true)}>
              <img 
                src="/chupa.png" 
                alt="캔디" 
                style={{ width: 20, height: 20 }}
              />
              새 퀴즈 만들기
            </AppleButton>
          </div>

          {/* 퀴즈 목록 */}
          <div style={{ display: 'grid', gap: 16, maxHeight: '70vh', overflowY: 'auto', overflowX: 'hidden', paddingRight: 8 }}>
            {quizzes.map(quiz => {
              const quizResponses = getQuizResponses(quiz.id);
              const unrespondedStudents = getUnrespondedStudents(quiz.id);
              const totalStudents = studentsSnapshot ? studentsSnapshot.docs.length : 0;
              
              return (
                <AppleCard key={quiz.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontSize: 20,
                        fontWeight: 600,
                        margin: '0 0 8px 0',
                        color: '#1d1d1f'
                      }}>
                        {quiz.title}
                      </h3>
                      <p style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontSize: 16,
                        color: '#86868b',
                        margin: '0 0 12px 0'
                      }}>
                        {quiz.question}
                      </p>
                      <div style={{
                        fontSize: 14,
                        color: '#86868b',
                        display: 'flex',
                        gap: 16,
                        marginBottom: 8,
                        flexWrap: 'wrap'
                      }}>
                        <span>유형: {quiz.type === 'multiple' ? '객관식' : '주관식'}</span>
                        <span>응답: {quizResponses.length}/{totalStudents}명</span>
                        <span>생성: {new Date(quiz.createdAt).toLocaleString()}</span>
                        {unrespondedStudents.length > 0 && (
                          <span style={{ color: '#ff9800', fontWeight: 600 }}>
                            미응답: {unrespondedStudents.length}명
                          </span>
                        )}
                      </div>
                      
                      {/* 보상 정보 */}
                      {(quiz.expReward > 0 || quiz.moneyReward > 0) && (
                        <div style={{
                          display: 'flex',
                          gap: 12,
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: '#f0f8ff',
                          borderRadius: 8,
                          border: '1px solid #e3f2fd'
                        }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#1976d2' }}>
                            정답 보상:
                          </span>
                          {quiz.expReward > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 16 }}>⭐</span>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#4CAF50' }}>
                                {quiz.expReward} 경험치
                              </span>
                            </div>
                          )}
                          {quiz.moneyReward > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 16 }}>💰</span>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#FF9800' }}>
                                {quiz.moneyReward}원
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <AppleButton
                        onClick={() => handleSendQuizToStudents(quiz)}
                      >
                        <img 
                          src="/chupa.png" 
                          alt="캔디" 
                          style={{ width: 16, height: 16 }}
                        />
                        전체 전송
                      </AppleButton>
                      {unrespondedStudents.length > 0 && (
                        <AppleButton
                          onClick={() => openResendModal(quiz, unrespondedStudents, 'multiple')}
                          variant="secondary"
                        >
                          <img 
                            src="/chupa.png" 
                            alt="캔디" 
                            style={{ width: 16, height: 16 }}
                          />
                          재전송 ({unrespondedStudents.length}명)
                        </AppleButton>
                      )}
                      <AppleButton
                        variant="secondary"
                        onClick={() => {
                          setSelectedQuiz(quiz);
                          setShowResponsesModal(true);
                        }}
                      >
                        응답 보기
                      </AppleButton>
                      <AppleButton
                        variant="danger"
                        onClick={() => handleDeleteQuiz(quiz.id)}
                      >
                        <DeleteIcon />
                      </AppleButton>
                    </div>
                  </div>

                  {quiz.type === 'multiple' && quiz.options && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 14, color: '#86868b', marginBottom: 8 }}>선택지:</div>
                      {quiz.options.map((option, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '8px 12px',
                            background: index === quiz.correctAnswer ? '#e8f5e8' : '#f5f5f7',
                            borderRadius: 8,
                            marginBottom: 4,
                            fontSize: 14,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}
                        >
                          {index === quiz.correctAnswer ? (
                            <CheckCircleIcon style={{ fontSize: 16, color: '#34c759' }} />
                          ) : (
                            <RadioButtonUncheckedIcon style={{ fontSize: 16, color: '#86868b' }} />
                          )}
                          {option}
                        </div>
                      ))}
                    </div>
                  )}
                </AppleCard>
              );
            })}
          </div>

          {quizzes.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: 64,
              color: '#86868b',
              fontSize: 18
            }}>
              아직 생성된 퀴즈가 없습니다.
            </div>
          )}
        </div>

        {/* 퀴즈 생성 모달 */}
        {showCreateModal && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10002
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCreateModal(false);
                setQuizTitle('');
                setQuizQuestion('');
                setQuizOptions(['', '', '', '']);
                setCorrectAnswer(0);
                setTextAnswer('');
                setExpReward(15);
                setMoneyReward(0);
              }
            }}
          >
            <div 
              style={{
                background: 'white',
                borderRadius: 20,
                padding: 32,
                width: '90%',
                maxWidth: 600,
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 24
              }}>
                <img 
                  src="/chupa.png" 
                  alt="캔디" 
                  style={{ width: 32, height: 32 }}
                />
                <h2 style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontSize: 24,
                  fontWeight: 600,
                  margin: 0,
                  color: '#1d1d1f'
                }}>
                  새 퀴즈 만들기
                </h2>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block',
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: '#1d1d1f'
                }}>
                  퀴즈 제목
                </label>
                <AppleInput
                  placeholder="퀴즈 제목을 입력하세요"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block',
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: '#1d1d1f'
                }}>
                  퀴즈 유형
                </label>
                <select
                  value={quizType}
                  onChange={(e) => setQuizType(e.target.value)}
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: 16,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid #d2d2d7',
                    background: 'white',
                    width: '100%',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="multiple">객관식</option>
                  <option value="text">주관식</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block',
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: '#1d1d1f'
                }}>
                  문제
                </label>
                <AppleInput
                  multiline
                  placeholder="문제를 입력하세요"
                  value={quizQuestion}
                  onChange={(e) => setQuizQuestion(e.target.value)}
                />
              </div>

              {quizType === 'multiple' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 16,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: '#1d1d1f'
                  }}>
                    선택지
                  </label>
                  {quizOptions.map((option, index) => (
                    <div key={index} style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={correctAnswer === index}
                        onChange={() => setCorrectAnswer(index)}
                        style={{ width: 20, height: 20 }}
                      />
                      <AppleInput
                        placeholder={`선택지 ${index + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...quizOptions];
                          newOptions[index] = e.target.value;
                          setQuizOptions(newOptions);
                        }}
                      />
                    </div>
                  ))}
                  <div style={{ fontSize: 14, color: '#86868b', marginTop: 8 }}>
                    정답에 해당하는 선택지의 라디오 버튼을 선택하세요.
                  </div>
                </div>
              )}

              {quizType === 'text' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 16,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: '#1d1d1f'
                  }}>
                    정답
                  </label>
                  <AppleInput
                    placeholder="정답을 입력하세요 (여러 정답은 #으로 구분: #광개토왕#광개토대왕#광개토)"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                  />
                  <div style={{ fontSize: 14, color: '#86868b', marginTop: 8 }}>
                    💡 여러 정답을 허용하려면 #으로 구분하여 입력하세요.<br/>
                    예: #광개토왕#광개토대왕#광개토 → 세 가지 답 모두 정답 처리
                  </div>
                </div>
              )}

              {/* 보상 설정 */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block',
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 12,
                  color: '#1d1d1f'
                }}>
                  정답 보상 설정
                </label>
                
                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{
                      display: 'block',
                      fontSize: 14,
                      fontWeight: 500,
                      marginBottom: 6,
                      color: '#86868b'
                    }}>
                      경험치
                    </label>
                    <AppleInput
                      type="number"
                      placeholder="15"
                      value={expReward}
                      onChange={(e) => setExpReward(Number(e.target.value) || 0)}
                      min="0"
                      max="100"
                    />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <label style={{
                      display: 'block',
                      fontSize: 14,
                      fontWeight: 500,
                      marginBottom: 6,
                      color: '#86868b'
                    }}>
                      재산 (원)
                    </label>
                    <AppleInput
                      type="number"
                      placeholder="0"
                      value={moneyReward}
                      onChange={(e) => setMoneyReward(Number(e.target.value) || 0)}
                      min="0"
                      max="1000"
                    />
                  </div>
                </div>
                
                <div style={{ fontSize: 12, color: '#86868b' }}>
                  학생이 정답을 맞췄을 때 지급할 보상을 설정하세요.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <AppleButton
                  variant="secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    setQuizTitle('');
                    setQuizQuestion('');
                    setQuizOptions(['', '', '', '']);
                    setCorrectAnswer(0);
                    setExpReward(15);
                    setMoneyReward(0);
                  }}
                >
                  취소
                </AppleButton>
                <AppleButton onClick={handleCreateQuiz}>
                  <SendIcon />
                  퀴즈 생성
                </AppleButton>
              </div>
            </div>
          </div>
              )}

      {/* 전송 성공 모달 */}
      {showSendSuccessModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(0,0,0,0.7)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 10001 
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSendSuccessModal(false);
            }
          }}
        >
          <div 
            style={{ 
              background: '#f5f5f7', 
              borderRadius: 20, 
              width: '90%', 
              maxWidth: 400, 
              padding: 32, 
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 성공 아이콘 */}
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #4CAF50, #45a049)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 24px',
              boxShadow: '0 8px 24px rgba(76, 175, 80, 0.3)'
            }}>
              <div style={{ fontSize: 36, color: 'white' }}>✓</div>
            </div>

            <h2 style={{ 
              fontSize: 24, 
              fontWeight: 800, 
              color: '#1d1d1f', 
              margin: '0 0 16px 0' 
            }}>
              전송 완료!
            </h2>
            
            <p style={{ 
              fontSize: 16, 
              color: '#86868b', 
              margin: '0 0 32px 0',
              lineHeight: 1.5
            }}>
              퀴즈가 모든 학생에게<br/>성공적으로 전송되었습니다! 🎉
            </p>

            <button
              onClick={() => setShowSendSuccessModal(false)}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: 12,
                border: 'none',
                background: '#1d1d1f',
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#424245';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#1d1d1f';
              }}
            >
              <img 
                src="/chupa.png" 
                alt="캔디" 
                style={{ width: 16, height: 16 }}
              />
              확인
            </button>
          </div>
        </div>
      )}

      {/* 응답 보기 모달 */}
      {showResponsesModal && selectedQuiz && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10002
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowResponsesModal(false);
                setSelectedQuiz(null);
              }
            }}
          >
            <div 
              style={{
                background: 'white',
                borderRadius: 20,
                padding: 32,
                width: '90%',
                maxWidth: 800,
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 24
              }}>
                <img 
                  src="/chupa.png" 
                  alt="캔디" 
                  style={{ width: 32, height: 32 }}
                />
                <h2 style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontSize: 24,
                  fontWeight: 600,
                  margin: 0,
                  color: '#1d1d1f'
                }}>
                  {selectedQuiz.title} - 응답 현황
                </h2>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{
                  background: '#f5f5f7',
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 16
                }}>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>문제</div>
                  <div style={{ fontSize: 14, color: '#86868b' }}>{selectedQuiz.question}</div>
                </div>

                {selectedQuiz.type === 'multiple' && selectedQuiz.options && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>선택지</div>
                    {selectedQuiz.options.map((option, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '8px 12px',
                          background: index === selectedQuiz.correctAnswer ? '#e8f5e8' : '#f5f5f7',
                          borderRadius: 8,
                          marginBottom: 4,
                          fontSize: 14,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}
                      >
                        {index === selectedQuiz.correctAnswer ? (
                          <CheckCircleIcon style={{ fontSize: 16, color: '#34c759' }} />
                        ) : (
                          <RadioButtonUncheckedIcon style={{ fontSize: 16, color: '#86868b' }} />
                        )}
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{
                    fontSize: 18,
                    fontWeight: 600,
                    margin: 0,
                    color: '#1d1d1f'
                  }}>
                    학생 응답 ({getQuizResponses(selectedQuiz.id).length}/{studentsSnapshot ? studentsSnapshot.docs.length : 0}명)
                  </h3>
                  {getUnrespondedStudents(selectedQuiz.id).length > 0 && (
                    <AppleButton
                      onClick={() => {
                        const unresponded = getUnrespondedStudents(selectedQuiz.id);
                        openResendModal(selectedQuiz, unresponded, 'multiple');
                      }}
                      variant="secondary"
                      style={{
                        fontSize: 14,
                        padding: '8px 16px'
                      }}
                    >
                      <img 
                        src="/chupa.png" 
                        alt="캔디" 
                        style={{ width: 16, height: 16 }}
                      />
                      미응답자 재전송 ({getUnrespondedStudents(selectedQuiz.id).length}명)
                    </AppleButton>
                  )}
                </div>

                <div style={{ display: 'grid', gap: 16 }}>
                  {/* 응답한 학생들 */}
                  {getQuizResponses(selectedQuiz.id).length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#34c759' }}>
                        ✅ 응답 완료 ({getQuizResponses(selectedQuiz.id).length}명)
                      </h4>
                      <div style={{ display: 'grid', gap: 12 }}>
                        {getQuizResponses(selectedQuiz.id).map(response => (
                          <div
                            key={response.id}
                            style={{
                              padding: 16,
                              background: response.isCorrect === true ? '#e8f5e8' : 
                                         response.isCorrect === false ? '#ffebee' : 
                                         '#f5f5f7',
                              borderRadius: 12,
                              border: response.isCorrect === true ? '1px solid #34c759' : 
                                      response.isCorrect === false ? '1px solid #ff3b30' : 
                                      '1px solid #d2d2d7'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <div style={{ fontWeight: 600, fontSize: 16 }}>
                                {response.studentName}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {response.isCorrect === true && (
                                  <span style={{ color: '#34c759', fontSize: 14, fontWeight: 600 }}>정답</span>
                                )}
                                {response.isCorrect === false && (
                                  <span style={{ color: '#ff3b30', fontSize: 14, fontWeight: 600 }}>오답</span>
                                )}
                                <span style={{ fontSize: 12, color: '#86868b' }}>
                                  {new Date(response.createdAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div style={{ fontSize: 14, color: '#1d1d1f' }}>
                              답: {response.answer}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 미응답 학생들 */}
                  {getUnrespondedStudents(selectedQuiz.id).length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#ff9800' }}>
                        ⏳ 미응답 ({getUnrespondedStudents(selectedQuiz.id).length}명)
                      </h4>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {getUnrespondedStudents(selectedQuiz.id).map(student => (
                          <div
                            key={student.id}
                            style={{
                              padding: 12,
                              background: '#fff3e0',
                              borderRadius: 8,
                              border: '1px solid #ffcc02',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <span style={{ fontWeight: 600, fontSize: 14 }}>
                              {student.name}
                            </span>
                            <AppleButton
                              onClick={() => openResendModal(selectedQuiz, [student], 'single')}
                              variant="secondary"
                              style={{
                                fontSize: 12,
                                padding: '6px 12px',
                                minWidth: 'auto'
                              }}
                            >
                              <img 
                                src="/chupa.png" 
                                alt="캔디" 
                                style={{ width: 12, height: 12 }}
                              />
                              재전송
                            </AppleButton>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {getQuizResponses(selectedQuiz.id).length === 0 && getUnrespondedStudents(selectedQuiz.id).length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: 32,
                      color: '#86868b',
                      fontSize: 16
                    }}>
                      학생 데이터를 불러오는 중입니다...
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                <AppleButton
                  variant="secondary"
                  onClick={() => {
                    setShowResponsesModal(false);
                    setSelectedQuiz(null);
                  }}
                >
                  닫기
                </AppleButton>
              </div>
            </div>
          </div>
        )}

        {/* 재전송 확인 모달 */}
        {showResendModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}>
            <div style={{
              background: 'white',
              borderRadius: 20,
              padding: 32,
              maxWidth: 500,
              width: '90%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              <div style={{
                textAlign: 'center',
                marginBottom: 24
              }}>
                <div style={{
                  fontSize: 48,
                  marginBottom: 16
                }}>🍭</div>
                <h3 style={{
                  fontSize: 20,
                  fontWeight: 600,
                  margin: '0 0 8px 0',
                  color: '#1d1d1f'
                }}>
                  퀴즈 재전송
                </h3>
                <p style={{
                  fontSize: 16,
                  color: '#86868b',
                  margin: 0,
                  lineHeight: 1.4
                }}>
                  {resendData.type === 'single' 
                    ? `${resendData.students[0]?.name} 학생에게` 
                    : `${resendData.students.length}명의 미응답 학생에게`
                  } 퀴즈를 재전송하시겠습니까?
                </p>
              </div>

                             {resendData.type === 'multiple' && resendData.students.length > 0 && (
                 <div style={{
                   background: '#f5f5f7',
                   borderRadius: 12,
                   padding: 16,
                   marginBottom: 24
                 }}>
                   <div style={{
                     fontSize: 14,
                     fontWeight: 600,
                     color: '#86868b',
                     marginBottom: 12
                   }}>
                     미응답 학생 ({resendData.students.length}명):
                   </div>
                   <div style={{
                     display: 'grid',
                     gap: 8,
                     maxHeight: 200,
                     overflowY: 'auto'
                   }}>
                     {resendData.students.map((student, index) => (
                       <div
                         key={student.id}
                         style={{
                           display: 'flex',
                           justifyContent: 'space-between',
                           alignItems: 'center',
                           padding: '8px 12px',
                           background: 'white',
                           borderRadius: 8,
                           border: '1px solid #e5e5e7'
                         }}
                       >
                         <span style={{ fontSize: 14, fontWeight: 500 }}>
                           {student.name}
                         </span>
                         <AppleButton
                           onClick={() => {
                             handleResendQuizToStudents(resendData.quiz, [student.id]);
                           }}
                           variant="secondary"
                         >
                           <img 
                             src="/chupa.png" 
                             alt="캔디" 
                             style={{ width: 16, height: 16 }}
                           />
                           재전송
                         </AppleButton>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               <div style={{
                 display: 'flex',
                 gap: 12,
                 justifyContent: 'center'
               }}>
                 <AppleButton
                   variant="secondary"
                   onClick={() => setShowResendModal(false)}
                 >
                   취소
                 </AppleButton>
                 {resendData.type === 'multiple' && (
                   <AppleButton
                     onClick={() => {
                       handleResendQuizToStudents(
                         resendData.quiz, 
                         resendData.students.map(s => s.id)
                       );
                     }}
                   >
                     <img 
                       src="/chupa.png" 
                       alt="캔디" 
                       style={{ width: 16, height: 16 }}
                     />
                     전체 재전송
                   </AppleButton>
                 )}
                 {resendData.type === 'single' && (
                   <AppleButton
                     onClick={() => {
                       handleResendQuizToStudents(
                         resendData.quiz, 
                         resendData.students.map(s => s.id)
                       );
                     }}
                   >
                     <img 
                       src="/chupa.png" 
                       alt="캔디" 
                       style={{ width: 16, height: 16 }}
                     />
                     재전송
                   </AppleButton>
                 )}
               </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 학생용 UI
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f7',
      padding: 20
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          marginBottom: 32
        }}>
          <img 
            src="/chupa.png" 
            alt="캔디 아이콘" 
            style={{ width: 48, height: 48 }}
          />
          <h1 style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: 32,
            fontWeight: 700,
            color: '#1d1d1f',
            margin: 0
          }}>
            캔디 퀴즈타임
          </h1>
        </div>

        {/* 활성 퀴즈 목록 */}
        <div style={{ display: 'grid', gap: 16, maxHeight: '70vh', overflowY: 'auto', overflowX: 'hidden', paddingRight: 8 }}>
          {quizzes.filter(quiz => quiz.isActive).map(quiz => {
            const hasResponded = hasUserResponded(quiz.id);
            return (
              <AppleCard key={quiz.id}>
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: 20,
                    fontWeight: 600,
                    margin: '0 0 8px 0',
                    color: '#1d1d1f'
                  }}>
                    {quiz.title}
                  </h3>
                  <p style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: 16,
                    color: '#86868b',
                    margin: '0 0 16px 0'
                  }}>
                    {quiz.question}
                  </p>
                </div>

                {hasResponded ? (
                  <div style={{
                    padding: 16,
                    background: '#e8f5e8',
                    borderRadius: 12,
                    textAlign: 'center',
                    color: '#34c759',
                    fontWeight: 600
                  }}>
                    이미 응답하셨습니다!
                  </div>
                ) : (
                  <div>
                    {quiz.type === 'multiple' && quiz.options ? (
                      <div>
                        <div style={{ marginBottom: 16 }}>
                          {quiz.options.map((option, index) => (
                            <div
                              key={index}
                              onClick={() => setSelectedOption(index)}
                              style={{
                                padding: '12px 16px',
                                background: selectedOption === index ? '#e8f5e8' : '#f5f5f7',
                                borderRadius: 12,
                                marginBottom: 8,
                                cursor: 'pointer',
                                border: selectedOption === index ? '2px solid #34c759' : '2px solid transparent',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12
                              }}
                            >
                              {selectedOption === index ? (
                                <CheckCircleIcon style={{ fontSize: 20, color: '#34c759' }} />
                              ) : (
                                <RadioButtonUncheckedIcon style={{ fontSize: 20, color: '#86868b' }} />
                              )}
                              <span style={{ fontSize: 16 }}>{option}</span>
                            </div>
                          ))}
                        </div>
                        <AppleButton
                          onClick={() => handleSubmitResponse(quiz)}
                          disabled={selectedOption === -1}
                        >
                          <SendIcon />
                          답안 제출
                        </AppleButton>
                      </div>
                    ) : (
                      <div>
                        <AppleInput
                          multiline
                          placeholder="답안을 입력하세요"
                          value={studentAnswer}
                          onChange={(e) => setStudentAnswer(e.target.value)}
                        />
                        <div style={{ marginTop: 16 }}>
                          <AppleButton
                            onClick={() => handleSubmitResponse(quiz)}
                            disabled={!studentAnswer.trim()}
                          >
                            <SendIcon />
                            답안 제출
                          </AppleButton>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </AppleCard>
            );
          })}
        </div>

        {quizzes.filter(quiz => quiz.isActive).length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: 64,
            color: '#86868b',
            fontSize: 18
          }}>
            현재 진행 중인 퀴즈가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizSystem;
