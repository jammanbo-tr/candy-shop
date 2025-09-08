import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import QuizIcon from '@mui/icons-material/Quiz';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

// 스크롤바 스타일을 위한 CSS - 컴포넌트 마운트 시에만 추가
const addScrollbarStyles = () => {
  const existingStyle = document.getElementById('quiz-scroll-styles');
  if (existingStyle) return; // 이미 추가된 경우 중복 방지

  const scrollbarStyles = `
    .quiz-scroll-container {
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
    }
    
    .quiz-scroll-container::-webkit-scrollbar {
      width: 8px;
    }
    
    .quiz-scroll-container::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    
    .quiz-scroll-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      transition: background 0.2s ease;
    }
    
    .quiz-scroll-container::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.5);
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.id = 'quiz-scroll-styles';
  styleSheet.type = 'text/css';
  styleSheet.innerText = scrollbarStyles;
  document.head.appendChild(styleSheet);
};

const QuizSystem = ({ isTeacher = false, currentUser = null }) => {
  console.log('QuizSystem 컴포넌트 렌더링됨:', { isTeacher, currentUser });
  
  const [quizzes, setQuizzes] = useState([]);
  const [responses, setResponses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResponsesModal, setShowResponsesModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  
  // 문제 생성 상태
  const [quizTitle, setQuizTitle] = useState('');
  const [quizType, setQuizType] = useState('multiple');
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  
  // 학생 응답 상태
  const [studentAnswer, setStudentAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState(-1);

  useEffect(() => {
    console.log('Firebase 연결 시도 중...');
    
    // 스크롤바 스타일 추가
    if (typeof document !== 'undefined') {
      addScrollbarStyles();
    }
    
    const quizzesQuery = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
    const unsubscribeQuizzes = onSnapshot(quizzesQuery, (snapshot) => {
      console.log('퀴즈 데이터 수신:', snapshot.docs.length, '개');
      const quizList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setQuizzes(quizList);
    }, (error) => {
      console.error('퀴즈 데이터 로드 오류:', error);
    });

    const responsesQuery = query(collection(db, 'quizResponses'), orderBy('createdAt', 'desc'));
    const unsubscribeResponses = onSnapshot(responsesQuery, (snapshot) => {
      console.log('응답 데이터 수신:', snapshot.docs.length, '개');
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
    
    try {
      const quizData = {
        title: quizTitle,
        type: quizType,
        question: quizQuestion,
        options: quizType === 'multiple' ? quizOptions.filter(opt => opt.trim()) : [],
        correctAnswer: quizType === 'multiple' ? correctAnswer : null,
        isActive: true,
        createdBy: currentUser?.name || 'Teacher',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'quizzes'), quizData);
      
      setQuizTitle('');
      setQuizQuestion('');
      setQuizOptions(['', '', '', '']);
      setCorrectAnswer(0);
      setShowCreateModal(false);
    } catch (error) {
      console.error('퀴즈 생성 오류:', error);
    }
  };

  const handleSubmitResponse = async (quiz) => {
    if (!currentUser) return;
    
    let answer = '';
    if (quiz.type === 'multiple') {
      if (selectedOption === -1) return;
      answer = quiz.options[selectedOption];
    } else if (quiz.type === 'text') {
      if (!studentAnswer.trim()) return;
      answer = studentAnswer;
    }

    try {
      await addDoc(collection(db, 'quizResponses'), {
        quizId: quiz.id,
        quizTitle: quiz.title,
        studentName: currentUser.name,
        studentId: currentUser.id,
        answer,
        isCorrect: quiz.type === 'multiple' ? selectedOption === quiz.correctAnswer : null,
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
      await deleteDoc(doc(db, 'quizzes', quizId));
    } catch (error) {
      console.error('퀴즈 삭제 오류:', error);
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

  // 애플 스타일 컴포넌트들
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
        background: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
        color: 'white',
        boxShadow: '0 4px 16px rgba(0, 122, 255, 0.3)'
      },
      secondary: {
        background: 'rgba(0, 122, 255, 0.1)',
        color: '#007AFF',
        border: '1px solid rgba(0, 122, 255, 0.2)'
      },
      danger: {
        background: 'linear-gradient(135deg, #FF3B30 0%, #D70015 100%)',
        color: 'white',
        boxShadow: '0 4px 16px rgba(255, 59, 48, 0.3)'
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

  const AppleCard = ({ children, ...props }) => (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        marginBottom: 16
      }}
      {...props}
    >
      {children}
    </div>
  );

  const AppleInput = ({ placeholder, value, onChange, multiline = false, ...props }) => {
    const Component = multiline ? 'textarea' : 'input';
    return (
      <Component
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: 16,
          padding: '12px 16px',
          borderRadius: 12,
          border: '1px solid rgba(0, 0, 0, 0.1)',
          background: 'rgba(255, 255, 255, 0.8)',
          width: '100%',
          resize: multiline ? 'vertical' : 'none',
          minHeight: multiline ? 80 : 'auto'
        }}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...props}
      />
    );
  };

  // 교사용 UI
  if (isTeacher) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 20
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h1 style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: 32,
            fontWeight: 700,
            color: 'white',
            margin: '0 0 32px 0',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12
          }}>
            <QuizIcon style={{ fontSize: 40 }} />
            캔디 퀴즈타임 - 교사용 (스크롤 테스트 v1.0)
          </h1>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <AppleButton onClick={() => setShowCreateModal(true)}>
              새 퀴즈 만들기
            </AppleButton>
          </div>

          <div className="quiz-scroll-container" style={{ 
            display: 'grid', 
            gap: 20,
            maxHeight: '70vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: 8,
            border: '3px solid red', // 테스트용 빨간 경계선
            borderRadius: 8,
            backgroundColor: 'rgba(255, 0, 0, 0.1)' // 테스트용 빨간 배경
          }}>
            {quizzes.map(quiz => (
              <AppleCard key={quiz.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontSize: 20,
                      fontWeight: 600,
                      color: '#1d1d1f',
                      margin: '0 0 8px 0'
                    }}>
                      {quiz.title}
                    </h3>
                    <p style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontSize: 16,
                      color: '#6e6e73',
                      margin: '0 0 12px 0'
                    }}>
                      {quiz.question}
                    </p>
                    <span style={{
                      fontSize: 12,
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: quiz.type === 'multiple' ? '#e8f5e8' : '#fff3e0',
                      color: quiz.type === 'multiple' ? '#388e3c' : '#f57c00',
                      fontWeight: 600
                    }}>
                      {quiz.type === 'multiple' ? '객관식' : '주관식'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                    <AppleButton
                      variant="secondary"
                      onClick={() => {
                        setSelectedQuiz(quiz);
                        setShowResponsesModal(true);
                      }}
                    >
                      응답 보기 ({getQuizResponses(quiz.id).length})
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
                    <p style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#1d1d1f',
                      margin: '0 0 8px 0'
                    }}>
                      선택지:
                    </p>
                    {quiz.options.map((option, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 4
                      }}>
                        {index === quiz.correctAnswer ? (
                          <CheckCircleIcon style={{ color: '#34c759', fontSize: 16 }} />
                        ) : (
                          <RadioButtonUncheckedIcon style={{ color: '#8e8e93', fontSize: 16 }} />
                        )}
                        <span style={{
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          fontSize: 14,
                          color: index === quiz.correctAnswer ? '#34c759' : '#6e6e73',
                          fontWeight: index === quiz.correctAnswer ? 600 : 400
                        }}>
                          {option}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </AppleCard>
            ))}
          </div>

          {/* 퀴즈 생성 모달 */}
          {showCreateModal && (
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
              zIndex: 1000
            }}>
              <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 32,
                width: '90%',
                maxWidth: 600,
                maxHeight: '90vh',
                overflow: 'auto'
              }}>
                <h2 style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#1d1d1f',
                  margin: '0 0 24px 0'
                }}>
                  새 퀴즈 만들기
                </h2>

                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#1d1d1f',
                    display: 'block',
                    marginBottom: 8
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
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#1d1d1f',
                    display: 'block',
                    marginBottom: 8
                  }}>
                    문제 유형
                  </label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setQuizType('multiple')}
                      style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontSize: 16,
                        padding: '12px 24px',
                        borderRadius: 12,
                        border: quizType === 'multiple' ? '2px solid #007AFF' : '1px solid rgba(0, 0, 0, 0.1)',
                        background: quizType === 'multiple' ? 'rgba(0, 122, 255, 0.1)' : 'white',
                        color: quizType === 'multiple' ? '#007AFF' : '#1d1d1f',
                        cursor: 'pointer',
                        fontWeight: quizType === 'multiple' ? 600 : 400
                      }}
                    >
                      객관식
                    </button>
                    <button
                      onClick={() => setQuizType('text')}
                      style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontSize: 16,
                        padding: '12px 24px',
                        borderRadius: 12,
                        border: quizType === 'text' ? '2px solid #007AFF' : '1px solid rgba(0, 0, 0, 0.1)',
                        background: quizType === 'text' ? 'rgba(0, 122, 255, 0.1)' : 'white',
                        color: quizType === 'text' ? '#007AFF' : '#1d1d1f',
                        cursor: 'pointer',
                        fontWeight: quizType === 'text' ? 600 : 400
                      }}
                    >
                      주관식
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#1d1d1f',
                    display: 'block',
                    marginBottom: 8
                  }}>
                    문제
                  </label>
                  <AppleInput
                    placeholder="문제를 입력하세요"
                    value={quizQuestion}
                    onChange={(e) => setQuizQuestion(e.target.value)}
                    multiline
                  />
                </div>

                {quizType === 'multiple' && (
                  <>
                    <div style={{ marginBottom: 20 }}>
                      <label style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontSize: 16,
                        fontWeight: 600,
                        color: '#1d1d1f',
                        display: 'block',
                        marginBottom: 8
                      }}>
                        선택지
                      </label>
                      {quizOptions.map((option, index) => (
                        <div key={index} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={correctAnswer === index}
                            onChange={() => setCorrectAnswer(index)}
                            style={{ marginRight: 8 }}
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
                      <p style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontSize: 14,
                        color: '#6e6e73',
                        margin: '8px 0 0 0'
                      }}>
                        정답에 해당하는 선택지의 라디오 버튼을 선택하세요.
                      </p>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <AppleButton
                    variant="secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    취소
                  </AppleButton>
                  <AppleButton onClick={handleCreateQuiz}>
                    퀴즈 생성
                  </AppleButton>
                </div>
              </div>
            </div>
          )}

          {/* 응답 보기 모달 */}
          {showResponsesModal && selectedQuiz && (
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
              zIndex: 1000
            }}>
              <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 32,
                width: '90%',
                maxWidth: 800,
                maxHeight: '90vh',
                overflow: 'auto'
              }}>
                <h2 style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#1d1d1f',
                  margin: '0 0 24px 0'
                }}>
                  {selectedQuiz.title} - 응답 현황
                </h2>

                <div style={{ display: 'grid', gap: 16 }}>
                  {getQuizResponses(selectedQuiz.id).map(response => (
                    <div
                      key={response.id}
                      style={{
                        background: 'rgba(0, 122, 255, 0.05)',
                        borderRadius: 12,
                        padding: 16,
                        border: '1px solid rgba(0, 122, 255, 0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          fontSize: 16,
                          fontWeight: 600,
                          color: '#1d1d1f'
                        }}>
                          {response.studentName}
                        </span>
                        {response.isCorrect !== null && (
                          <span style={{
                            fontSize: 12,
                            padding: '4px 8px',
                            borderRadius: 6,
                            background: response.isCorrect ? '#e8f5e8' : '#ffebee',
                            color: response.isCorrect ? '#388e3c' : '#d32f2f',
                            fontWeight: 600
                          }}>
                            {response.isCorrect ? '정답' : '오답'}
                          </span>
                        )}
                      </div>
                      <p style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontSize: 14,
                        color: '#6e6e73',
                        margin: 0
                      }}>
                        {response.answer}
                      </p>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                  <AppleButton
                    variant="secondary"
                    onClick={() => setShowResponsesModal(false)}
                  >
                    닫기
                  </AppleButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 학생용 UI
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 20
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: 32,
          fontWeight: 700,
          color: 'white',
          margin: '0 0 32px 0',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12
        }}>
          <QuizIcon style={{ fontSize: 40 }} />
          캔디 퀴즈타임 (스크롤 테스트 v1.0)
        </h1>

        <div className="quiz-scroll-container" style={{ 
          display: 'grid', 
          gap: 20,
          maxHeight: '70vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: 8,
          border: '3px solid red', // 테스트용 빨간 경계선
          borderRadius: 8,
          backgroundColor: 'rgba(255, 0, 0, 0.1)' // 테스트용 빨간 배경
        }}>
          {quizzes.filter(quiz => quiz.isActive).map(quiz => (
            <AppleCard key={quiz.id}>
              <h3 style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: 20,
                fontWeight: 600,
                color: '#1d1d1f',
                margin: '0 0 16px 0'
              }}>
                {quiz.title}
              </h3>
              <p style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: 16,
                color: '#6e6e73',
                margin: '0 0 20px 0'
              }}>
                {quiz.question}
              </p>

              {hasUserResponded(quiz.id) ? (
                <div style={{
                  background: 'rgba(52, 199, 89, 0.1)',
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center'
                }}>
                  <CheckCircleIcon style={{ color: '#34c759', fontSize: 24, marginBottom: 8 }} />
                  <p style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#34c759',
                    margin: 0
                  }}>
                    응답 완료
                  </p>
                </div>
              ) : (
                <div>
                  {quiz.type === 'multiple' && (
                    <div style={{ marginBottom: 20 }}>
                      {quiz.options.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedOption(index)}
                          style={{
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            fontSize: 16,
                            padding: '12px 16px',
                            borderRadius: 12,
                            border: selectedOption === index ? '2px solid #007AFF' : '1px solid rgba(0, 0, 0, 0.1)',
                            background: selectedOption === index ? 'rgba(0, 122, 255, 0.1)' : 'white',
                            width: '100%',
                            textAlign: 'left',
                            cursor: 'pointer',
                            marginBottom: 8,
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}

                  {quiz.type === 'text' && (
                    <div style={{ marginBottom: 20 }}>
                      <AppleInput
                        placeholder="답을 입력하세요"
                        value={studentAnswer}
                        onChange={(e) => setStudentAnswer(e.target.value)}
                        multiline
                      />
                    </div>
                  )}

                  <AppleButton
                    onClick={() => handleSubmitResponse(quiz)}
                    disabled={
                      (quiz.type === 'multiple' && selectedOption === -1) ||
                      (quiz.type === 'text' && !studentAnswer.trim())
                    }
                  >
                    <SendIcon />
                    답안 제출
                  </AppleButton>
                </div>
              )}
            </AppleCard>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuizSystem; 