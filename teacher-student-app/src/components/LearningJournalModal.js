import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import DataBoardModal from './DataBoardModal';

const STUDENTS = [
  '김규민', '김범준', '김성준', '김수겸', '김주원', '문기훈', '박동하', '백주원',
  '백지원', '손정환', '이도윤', '이예준', '임재희', '조은빈', '조찬희', '최서윤',
  '최서현', '한서우', '황리아', '김주하', '이해원', '하지수', '테스트'
];

const PERIODS = ['1교시', '2교시', '3교시', '4교시', '5교시', '6교시', '기타 교시'];

const LearningJournalModal = ({ isOpen, onClose, studentName = '' }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDataBoard, setShowDataBoard] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    studentName: studentName || '',
    period: '',
    understanding: 3,
    satisfaction: 3,
    content: '',
    keyword: '',
    imageUrl: '',
    hasImage: false
  });

  const allQuestions = [
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
      title: '학습한 내용을 사진으로 올려보세요',
      subtitle: '노트에 적은 내용을 사진으로 찍어서 올려주세요',
      type: 'image',
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

  // 학생 이름이 있으면 첫 번째 질문(학생 선택) 건너뛰기
  const questions = studentName ? allQuestions.slice(1) : allQuestions;
  const totalSteps = questions.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const currentQuestion = questions[currentStep];

  // studentName이 변경되면 formData 업데이트
  useEffect(() => {
    if (studentName) {
      setFormData(prev => ({ ...prev, studentName }));
    }
  }, [studentName]);

  const resetModal = () => {
    setCurrentStep(0);
    setLoading(false);
    setShowSuccess(false);
    setShowDataBoard(false);
    setSelectedImage(null);
    setImagePreview(null);
    setFormData({
      studentName: studentName || '',
      period: '',
      understanding: 3,
      satisfaction: 3,
      content: '',
      keyword: '',
      imageUrl: '',
      hasImage: false
    });
  };

  const handleClose = () => {
    resetModal();
    setShowDataBoard(false);
    onClose();
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB 제한
        alert('파일 크기는 10MB 이하여야 합니다.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        setSelectedImage(file);
        updateFormData('content', 'image_uploaded');
        updateFormData('hasImage', true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    const currentValue = formData[currentQuestion.key];
    
    if (currentQuestion.type === 'select' && !currentValue) {
      alert(`${currentQuestion.title}에 답해주세요.`);
      return;
    }
    if (currentQuestion.type === 'text' && !currentValue?.trim()) {
      alert(`${currentQuestion.title}에 답해주세요.`);
      return;
    }
    if (currentQuestion.type === 'image' && !selectedImage) {
      alert('사진을 선택해주세요.');
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
      let imageUrl = '';
      
      // 이미지가 선택된 경우 Firebase Storage에 업로드
      if (selectedImage) {
        const timestamp = Date.now();
        const fileName = `learning-journals/${today}/${formData.studentName}_${formData.period}_${timestamp}.jpg`;
        const imageRef = ref(storage, fileName);
        
        const snapshot = await uploadBytes(imageRef, selectedImage);
        imageUrl = await getDownloadURL(snapshot.ref);
      }
      
      await addDoc(collection(db, `journals/${today}/entries`), {
        ...formData,
        imageUrl: imageUrl,
        hasImage: !!selectedImage,
        content: selectedImage ? 'image_uploaded' : formData.content,
        createdAt: serverTimestamp(),
        date: today
      });

      setShowSuccess(true);
      // 자동 닫기 제거하여 사용자가 데이터 전광판을 볼 수 있도록 함
    } catch (error) {
      console.error('Error submitting entry:', error);
      alert('제출 중 오류가 발생했습니다: ' + error.message);
      setLoading(false);
    }
  };

  const updateFormData = (key, value) => {
    setFormData({ ...formData, [key]: value });
  };

  const renderEmojis = (count, emoji) => {
    return emoji.repeat(count);
  };

  if (!isOpen) return null;

  // 성공 화면
  if (showSuccess) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99997,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          padding: '60px',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#4285f4',
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
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#4285f4',
            marginBottom: '16px',
            margin: 0
          }}>
            완료! 🎉
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#666',
            margin: '0 0 30px 0'
          }}>
            학습일지가 성공적으로 제출되었어요!
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => handleClose()}
              style={{ 
                background: '#f5f5f5', 
                border: 'none', 
                borderRadius: 999, 
                padding: '12px 24px', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                fontSize: '16px',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontWeight: 700, color: '#666', fontSize: 16 }}>닫기</span>
            </button>
            <button
              onClick={() => {
                console.log('데이터 전광판 버튼 클릭됨');
                setShowDataBoard(true);
                console.log('showDataBoard 상태:', true);
              }}
              style={{ 
                background: '#fffde7', 
                border: 'none', 
                borderRadius: 999, 
                padding: '12px 24px', 
                boxShadow: '0 2px 8px #b2ebf240', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                fontSize: '16px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 16px #b2ebf260';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px #b2ebf240';
              }}
            >
              <span style={{ fontWeight: 700, color: '#1976d2', fontSize: 20, lineHeight: '1', display: 'flex', alignItems: 'center' }}>📊</span>
              <span style={{ fontWeight: 700, color: '#1976d2', fontSize: 16 }}>데이터 전광판</span>
            </button>
          </div>
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
          <div style={{ marginTop: '24px' }}>
            {question.options.map((option) => (
              <button
                key={option}
                onClick={() => updateFormData(question.key, option)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  marginBottom: '12px',
                  border: currentValue === option ? '2px solid #4285f4' : '2px solid #e8eaed',
                  borderRadius: '16px',
                  backgroundColor: currentValue === option ? '#f8f9ff' : 'white',
                  fontSize: '16px',
                  fontWeight: currentValue === option ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: '#202124'
                }}
                onMouseOver={(e) => {
                  if (currentValue !== option) {
                    e.target.style.borderColor = '#4285f4';
                    e.target.style.backgroundColor = '#f8f9ff';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentValue !== option) {
                    e.target.style.borderColor = '#e8eaed';
                    e.target.style.backgroundColor = 'white';
                  }
                }}
              >
                <span>{option}</span>
                {currentValue === option && <span style={{ color: '#4285f4', fontSize: '18px' }}>✓</span>}
              </button>
            ))}
          </div>
        );

      case 'slider':
        return (
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '80px', marginBottom: '16px' }}>
                {renderEmojis(currentValue, question.emoji)}
              </div>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#4285f4'
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
                  height: '6px',
                  borderRadius: '3px',
                  background: '#4285f4',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '12px',
                fontSize: '14px',
                color: '#666'
              }}>
                <span>별로</span>
                <span>최고!</span>
              </div>
            </div>
          </div>
        );

      case 'image':
        return (
          <div style={{ marginTop: '24px' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                minHeight: '240px',
                border: '2px dashed #e8eaed',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: imagePreview ? 'transparent' : '#f8f9fa',
                padding: '20px',
                boxSizing: 'border-box'
              }}
              onMouseOver={(e) => {
                if (!imagePreview) {
                  e.target.style.borderColor = '#4285f4';
                  e.target.style.backgroundColor = '#f0f4ff';
                }
              }}
              onMouseOut={(e) => {
                if (!imagePreview) {
                  e.target.style.borderColor = '#e8eaed';
                  e.target.style.backgroundColor = '#f8f9fa';
                }
              }}
            >
              {imagePreview ? (
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <img
                    src={imagePreview}
                    alt="선택된 이미지"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '200px',
                      borderRadius: '8px',
                      marginBottom: '12px'
                    }}
                  />
                  <p style={{
                    fontSize: '14px',
                    color: '#4285f4',
                    margin: 0,
                    fontWeight: '500'
                  }}>
                    ✓ 이미지가 선택되었습니다. 다른 이미지를 선택하려면 클릭하세요.
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '16px',
                    color: '#9aa0a6'
                  }}>
                    📷
                  </div>
                  <h3 style={{
                    fontSize: '18px',
                    color: '#202124',
                    margin: '0 0 8px 0',
                    fontWeight: '500'
                  }}>
                    사진을 선택해주세요
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#666',
                    margin: 0
                  }}>
                    클릭하여 갤러리에서 사진을 선택하거나<br />
                    카메라로 직접 촬영해보세요
                  </p>
                </div>
              )}
            </div>
          </div>
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
              padding: '20px',
              border: '2px solid #e8eaed',
              borderRadius: '16px',
              fontSize: '16px',
              marginTop: '24px',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#4285f4'}
            onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99998,
      padding: '20px'
    }}>
      {/* 로딩 오버레이 */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #4285f4',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      )}

      <div style={{
        backgroundColor: 'white',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
        border: '4px solid transparent',
        background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #4285f4, #00c851, #4285f4, #00c851, #4285f4) border-box',
        animation: 'borderAnimation 3s linear infinite'
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '40px 60px 30px',
          borderBottom: '1px solid #e8eaed'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#4285f4',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              학습일지 <img src="/lv5.png" alt="level 5" style={{ width: '28px', height: '28px' }} />
            </h1>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{
                fontSize: '14px',
                color: '#666',
                fontWeight: '500'
              }}>
                {currentStep + 1} / {totalSteps}
              </span>
              <button
                onClick={handleClose}
                style={{
                  width: '32px',
                  height: '32px',
                  border: 'none',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#e8eaed'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#f8f9fa'}
              >
                ×
              </button>
            </div>
          </div>
          
          {/* 진행률 바 */}
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e8eaed',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#4285f4',
              transition: 'width 0.3s ease'
            }}></div>
          </div>
        </div>

        {/* 질문 영역 */}
        <div style={{ padding: '50px 60px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#202124',
              marginBottom: '8px',
              margin: 0,
              lineHeight: '1.44'
            }}>
              {currentQuestion.title}
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#666',
              margin: 0,
              lineHeight: '1.44'
            }}>
              {currentQuestion.subtitle}
            </p>
          </div>

          {renderQuestionContent()}

          {/* 네비게이션 버튼 */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginTop: '40px'
          }}>
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                style={{
                  flex: 1,
                  backgroundColor: 'white',
                  color: '#666',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid #e8eaed',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#f8f9fa';
                  e.target.style.borderColor = '#4285f4';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.borderColor = '#e8eaed';
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
                backgroundColor: '#4285f4',
                color: 'white',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#3367d6';
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#4285f4';
                }
              }}
            >
              {currentStep === totalSteps - 1 ? (loading ? '제출 중...' : '✓ OK') : '다음 →'}
            </button>
          </div>
        </div>
      </div>

      <DataBoardModal 
        isOpen={showDataBoard} 
        onClose={() => setShowDataBoard(false)}
        defaultPeriod={formData.period}
      />

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes borderAnimation {
            0% { 
              background: linear-gradient(white, white) padding-box, 
                         linear-gradient(45deg, #4285f4, #00c851, #4285f4, #00c851, #4285f4) border-box; 
            }
            25% { 
              background: linear-gradient(white, white) padding-box, 
                         linear-gradient(135deg, #00c851, #4285f4, #00c851, #4285f4, #00c851) border-box; 
            }
            50% { 
              background: linear-gradient(white, white) padding-box, 
                         linear-gradient(225deg, #4285f4, #00c851, #4285f4, #00c851, #4285f4) border-box; 
            }
            75% { 
              background: linear-gradient(white, white) padding-box, 
                         linear-gradient(315deg, #00c851, #4285f4, #00c851, #4285f4, #00c851) border-box; 
            }
            100% { 
              background: linear-gradient(white, white) padding-box, 
                         linear-gradient(45deg, #4285f4, #00c851, #4285f4, #00c851, #4285f4) border-box; 
            }
          }
          
          
          input[type="range"] {
            -webkit-appearance: none;
            appearance: none;
          }
          
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: white;
            cursor: pointer;
            border: 3px solid #4285f4;
            box-shadow: 0 2px 6px rgba(66, 133, 244, 0.3);
            transition: all 0.2s ease;
          }
          
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: white;
            cursor: pointer;
            border: 3px solid #4285f4;
            box-shadow: 0 2px 6px rgba(66, 133, 244, 0.3);
          }
        `}
      </style>
    </div>
  );
};

export default LearningJournalModal;