import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const STUDENTS = [
  '김규민', '김범준', '김성준', '김수겸', '김주원', '문기훈', '박동하', '백주원',
  '백지원', '손정환', '이도윤', '이예준', '임재희', '조은빈', '조찬희', '최서윤',
  '최서현', '한서우', '황리아', '김주하', '이해원', '하지수', '테스트'
];

const PERIODS = ['1교시', '2교시', '3교시', '4교시', '5교시', '6교시', '기타 교시'];

const LearningJournalPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    studentName: '',
    period: '',
    understanding: 3,
    satisfaction: 3,
    content: '',
    keyword: ''
  });

  const totalSteps = 6;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const questions = [
    {
      title: '누구의 학습일지인가요?',
      subtitle: '이름을 선택해주세요',
      type: 'select',
      options: STUDENTS,
      key: 'studentName'
    },
    {
      title: '수업시간 선택',
      subtitle: '몇 교시 수업이었나요?',
      type: 'select',
      options: PERIODS,
      key: 'period'
    },
    {
      title: '나는 이 수업을 얼마나 이해했을까요?',
      subtitle: '솔직하게 답해주세요',
      type: 'slider',
      emoji: '🟢',
      key: 'understanding'
    },
    {
      title: '나는 이 수업에서 얼마나 만족했나요?',
      subtitle: '재미있었나요?',
      type: 'slider',
      emoji: '❤️',
      key: 'satisfaction'
    },
    {
      title: '학습한 내용을 적어보세요',
      subtitle: '배운 내용을 자유롭게 적어보세요',
      type: 'textarea',
      placeholder: '오늘 배운 내용을 자세히 써주세요...',
      key: 'content'
    },
    {
      title: '이 수업에서 가장 중요하다고 생각한 단어는?',
      subtitle: '핵심 키워드를 입력해주세요',
      type: 'text',
      placeholder: '#광개토대왕, #분수의곱셈',
      key: 'keyword'
    }
  ];

  const currentQuestion = questions[currentStep];

  const handleNext = () => {
    const currentValue = formData[currentQuestion.key];
    
    // 필수 필드 검증
    if (currentQuestion.type === 'select' && !currentValue) {
      alert(`${currentQuestion.title}에 답해주세요.`);
      return;
    }
    if ((currentQuestion.type === 'textarea' || currentQuestion.type === 'text') && !currentValue?.trim()) {
      alert(`${currentQuestion.title}에 답해주세요.`);
      return;
    }
    
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      await addDoc(collection(db, `journals/${today}/entries`), {
        ...formData,
        createdAt: serverTimestamp(),
        date: today
      });

      setShowSuccess(true);
      setFormData({
        studentName: '',
        period: '',
        understanding: 3,
        satisfaction: 3,
        content: '',
        keyword: ''
      });
      setCurrentStep(0);
    } catch (error) {
      console.error('Error submitting entry:', error);
      alert('제출 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (key, value) => {
    setFormData({ ...formData, [key]: value });
  };

  const renderEmojis = (count, emoji) => {
    return emoji.repeat(count);
  };

  // 성공 화면
  if (showSuccess) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '30px',
          padding: '60px',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #4CAF50, #45a049)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 30px',
            fontSize: '40px',
            color: 'white'
          }}>
            ✓
          </div>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '20px'
          }}>
            완료! 🎉
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#666',
            marginBottom: '40px'
          }}>
            학습일지가 성공적으로 제출되었어요!
          </p>
          <button
            onClick={() => setShowSuccess(false)}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              padding: '20px',
              borderRadius: '25px',
              border: 'none',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            ✨ 새로 입력하기
          </button>
        </div>
      </div>
    );
  }

  // 질문 내용 렌더링
  const renderQuestionContent = () => {
    const question = currentQuestion;
    const currentValue = formData[question.key];

    switch (question.type) {
      case 'select':
        return (
          <div style={{ marginTop: '30px' }}>
            {question.options.map((option) => (
              <button
                key={option}
                onClick={() => updateFormData(question.key, option)}
                style={{
                  width: '100%',
                  padding: '20px',
                  marginBottom: '15px',
                  border: currentValue === option ? '3px solid #667eea' : '2px solid #e1e5e9',
                  borderRadius: '20px',
                  background: currentValue === option 
                    ? 'linear-gradient(135deg, #667eea20, #764ba220)' 
                    : 'white',
                  fontSize: '18px',
                  fontWeight: currentValue === option ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onMouseOver={(e) => {
                  if (currentValue !== option) {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentValue !== option) {
                    e.target.style.borderColor = '#e1e5e9';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                <span>{option}</span>
                {currentValue === option && <span style={{ color: '#667eea' }}>✨</span>}
              </button>
            ))}
          </div>
        );

      case 'slider':
        return (
          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <div style={{ marginBottom: '30px' }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>
                {renderEmojis(currentValue, question.emoji)}
              </div>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {currentValue}점
              </div>
            </div>
            <div style={{ padding: '0 20px' }}>
              <input
                type="range"
                min="1"
                max="5"
                value={currentValue}
                onChange={(e) => updateFormData(question.key, Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '10px',
                  borderRadius: '10px',
                  background: 'linear-gradient(to right, #667eea, #764ba2)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '15px',
                fontSize: '14px',
                color: '#666'
              }}>
                <span>별로</span>
                <span>최고!</span>
              </div>
            </div>
          </div>
        );

      case 'textarea':
        return (
          <textarea
            value={currentValue}
            onChange={(e) => updateFormData(question.key, e.target.value)}
            placeholder={question.placeholder}
            style={{
              width: '100%',
              padding: '25px',
              border: '2px solid #e1e5e9',
              borderRadius: '20px',
              fontSize: '18px',
              height: '200px',
              resize: 'none',
              marginTop: '30px',
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
          />
        );

      case 'text':
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => updateFormData(question.key, e.target.value)}
            placeholder={question.placeholder}
            style={{
              width: '100%',
              padding: '25px',
              border: '2px solid #e1e5e9',
              borderRadius: '20px',
              fontSize: '18px',
              marginTop: '30px',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '20px'
    }}>
      {/* 로딩 오버레이 */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <p style={{ fontSize: '18px', color: '#333' }}>제출 중...</p>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* 헤더와 진행률 */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h1 style={{
              fontSize: '36px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0
            }}>
              학습일지 📚
            </h1>
            <div style={{
              fontSize: '16px',
              color: '#666',
              fontWeight: 'bold'
            }}>
              {currentStep + 1} / {totalSteps}
            </div>
          </div>
          
          {/* 진행률 바 */}
          <div style={{
            width: '100%',
            height: '12px',
            background: '#e1e5e9',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              transition: 'width 0.5s ease'
            }}></div>
          </div>
        </div>

        {/* 질문 카드 */}
        <div style={{
          background: 'white',
          borderRadius: '30px',
          padding: '50px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
          border: '1px solid rgba(102,126,234,0.1)'
        }}>
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '15px',
              margin: 0
            }}>
              {currentQuestion.title}
            </h2>
            <p style={{
              fontSize: '18px',
              color: '#666',
              margin: 0
            }}>
              {currentQuestion.subtitle}
            </p>
          </div>

          {renderQuestionContent()}

          {/* 네비게이션 버튼 */}
          <div style={{
            display: 'flex',
            gap: '20px',
            marginTop: '50px'
          }}>
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                style={{
                  flex: 1,
                  background: '#f8f9fa',
                  color: '#666',
                  padding: '20px',
                  borderRadius: '20px',
                  border: '2px solid #e1e5e9',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#e9ecef';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#f8f9fa';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                ← 이전
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={loading}
              style={{
                flex: currentStep === 0 ? 1 : 1,
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                padding: '20px',
                borderRadius: '20px',
                border: 'none',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px) scale(1.02)';
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(0) scale(1)';
                }
              }}
            >
              {currentStep === totalSteps - 1 ? (loading ? '제출 중...' : '✨ 완료') : '다음 →'}
            </button>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          input[type="range"] {
            -webkit-appearance: none;
            appearance: none;
          }
          
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: white;
            cursor: pointer;
            border: 4px solid #667eea;
            box-shadow: 0 4px 12px rgba(102,126,234,0.4);
            transition: all 0.3s ease;
          }
          
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.2);
            box-shadow: 0 6px 20px rgba(102,126,234,0.6);
          }
        `}
      </style>
    </div>
  );
};

export default LearningJournalPage;