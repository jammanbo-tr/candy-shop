import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const EmotionAttendanceModalCopy = ({ isOpen, onClose, student }) => {
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [emotionIntensity, setEmotionIntensity] = useState(3);
  const [selectedCause, setSelectedCause] = useState('');
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 결과 모달 상태
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [resultType, setResultType] = useState('success'); // 'success' or 'error'
  const [rainbowPulse, setRainbowPulse] = useState(true);

  // 감정 옵션들
  const emotions = [
    { id: 'happy', emoji: '😊', name: '기쁨', color: '#2ecc71' },
    { id: 'sad', emoji: '😢', name: '슬픔', color: '#e74c3c' },
    { id: 'angry', emoji: '😠', name: '화남', color: '#e67e22' },
    { id: 'anxious', emoji: '😰', name: '불안', color: '#f39c12' },
    { id: 'calm', emoji: '😌', name: '평온함', color: '#27ae60' },
    { id: 'bored', emoji: '😴', name: '지루함', color: '#95a5a6' },
    { id: 'excited', emoji: '🤩', name: '기대감', color: '#9b59b6' },
    { id: 'confused', emoji: '😕', name: '혼란', color: '#34495e' }
  ];

  // 감정 원인 옵션들
  const causes = [
    '학업 스트레스', '친구 관계', '가족 문제', '건강 문제',
    '날씨', '특별한 일', '운동/활동', '기타'
  ];

  // 모달이 열릴 때마다 초기화
  useEffect(() => {
    if (isOpen) {
      setSelectedEmotion('');
      setEmotionIntensity(3);
      setSelectedCause('');
      setMemo('');
      setShowResultModal(false);
      setResultMessage('');
      setResultType('success');
    }
  }, [isOpen]);

  // 결과 모달 표시 함수
  const showResult = (message, type = 'success') => {
    setResultMessage(message);
    setResultType(type);
    setShowResultModal(true);
  };

  // 결과 모달 닫기
  const closeResultModal = () => {
    setShowResultModal(false);
    if (resultType === 'success') {
      onClose(); // 성공 시에만 메인 모달 닫기
    }
  };

  // 감정출석 제출
  const handleSubmit = async () => {
    // 필수 입력값 검증
    if (!selectedEmotion) {
      showResult('감정을 선택해주세요.', 'error');
      return;
    }
    if (!selectedCause) {
      showResult('감정의 주요 원인을 선택해주세요.', 'error');
      return;
    }

    // student 객체 검증
    if (!student || !student.id) {
      console.error('Student 정보가 없습니다:', student);
      showResult('학생 정보를 불러올 수 없습니다.\n페이지를 새로고침해주세요.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const today = new Date();
      // 한국 시간 기준으로 날짜 계산 (UTC+9)
      const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
      const dateString = koreaTime.toISOString().split('T')[0];

      console.log('감정출석 제출 시도:', {
        studentId: student.id,
        studentName: student.name,
        date: dateString,
        emotion: selectedEmotion,
        intensity: emotionIntensity,
        cause: selectedCause
      });

      // 학생 서브컬렉션에서 오늘 이미 제출했는지 확인
      const emotionRef = doc(db, 'copy_students', student.id, 'emotions', dateString);
      const todaySnapshot = await getDoc(emotionRef);

      if (todaySnapshot.exists()) {
        showResult('오늘은 이미 감정출석을 제출했습니다.', 'error');
        setIsSubmitting(false);
        return;
      }

      // 감정출석 데이터 저장 (학생 서브컬렉션에)
      const emotionData = {
        date: dateString,
        timestamp: Timestamp.now(),
        emotion: selectedEmotion,
        intensity: emotionIntensity,
        cause: selectedCause,
        memo: memo.trim(),
        // 메타데이터 (검색용)
        studentName: student.name || '알 수 없음',
        grade: student.grade || '',
        class: student.class || ''
      };

      console.log('저장할 데이터:', emotionData);
      console.log('저장 경로:', `students/${student.id}/emotions/${dateString}`);
      
      await setDoc(emotionRef, emotionData);

      showResult('감정출석이 성공적으로 제출되었습니다! 🌈', 'success');
    } catch (error) {
      console.error('감정출석 제출 오류:', error);
      console.error('에러 상세:', error.message);
      showResult(`감정출석 제출 중 오류가 발생했습니다.\n오류: ${error.message}\n다시 시도해주세요.`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 결과 모달 컴포넌트
  const ResultModal = () => {
    if (!showResultModal) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '30px',
          minWidth: '320px',
          maxWidth: '500px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          {/* 아이콘 */}
          <div style={{
            fontSize: '48px',
            marginBottom: '20px'
          }}>
            {resultType === 'success' ? '🎉' : '⚠️'}
          </div>
          
          {/* 메시지 */}
          <div style={{
            fontSize: '18px',
            color: '#333',
            marginBottom: '30px',
            lineHeight: '1.5',
            whiteSpace: 'pre-line'
          }}>
            {resultMessage}
          </div>
          
          {/* 확인 버튼 */}
          <button
            onClick={closeResultModal}
            style={{
              background: resultType === 'success' ? '#2ecc71' : '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            확인
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          @keyframes rainbowMove {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        zIndex: 1000,
        padding: '20px',
        overflowY: 'auto'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '30px',
          minWidth: '480px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: 'none',
          marginTop: '20px',
          marginBottom: '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 4px transparent',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          border: '4px solid transparent',
          background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0080ff, #8000ff, #ff0080) border-box',
          backgroundSize: '400% 400%',
          animation: rainbowPulse ? 'rainbowMove 4s ease-in-out infinite' : 'none'
        }}>
          {/* 헤더 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '25px',
            paddingBottom: '15px',
            borderBottom: '1px solid #eee'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '600',
              color: '#3b5998',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '28px' }}>🌈</span>
              감정출석부
            </h2>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                color: '#666',
                padding: '5px',
                opacity: isSubmitting ? 0.5 : 1
              }}
            >
              ✕
            </button>
          </div>

          {/* 감정 선택 */}
          <div style={{ marginBottom: '25px' }}>
            <div style={{
              fontSize: '18px',
              color: '#333',
              marginBottom: '15px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              😊 오늘의 감정을 선택해주세요
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px'
            }}>
              {emotions.map((emotion) => (
                <button
                  key={emotion.id}
                  onClick={() => setSelectedEmotion(emotion.id)}
                  style={{
                    background: selectedEmotion === emotion.id ? 'white' : 'transparent',
                    border: selectedEmotion === emotion.id ? `2px solid ${emotion.color}` : '2px solid transparent',
                    borderRadius: '12px',
                    padding: '16px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease',
                    minHeight: '80px',
                    boxShadow: selectedEmotion === emotion.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedEmotion !== emotion.id) {
                      e.target.style.backgroundColor = 'white';
                      e.target.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedEmotion !== emotion.id) {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <span style={{ fontSize: '32px' }}>{emotion.emoji}</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: selectedEmotion === emotion.id ? emotion.color : '#666'
                  }}>
                    {emotion.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 감정 강도 슬라이더 */}
          <div style={{ marginBottom: '25px' }}>
            <div style={{
              fontSize: '18px',
              color: '#333',
              marginBottom: '15px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⭐ 감정의 강도는 어느 정도인가요?
            </div>
            <div style={{
              background: '#f8f9fa',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #eee'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '12px',
                fontSize: '14px',
                color: '#666'
              }}>
                <span>약함</span>
                <span style={{ fontWeight: '600', color: '#3b5998', fontSize: '16px' }}>
                  {emotionIntensity}단계
                </span>
                <span>강함</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={emotionIntensity}
                onChange={(e) => setEmotionIntensity(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: 'linear-gradient(to right, #3498db 0%, #2ecc71 100%)',
                  outline: 'none',
                  WebkitAppearance: 'none',
                  cursor: 'pointer'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '12px',
                alignItems: 'center'
              }}>
                {[1, 2, 3, 4, 5].map(num => (
                  <img
                    key={num}
                    src={`/lv${num}.png`}
                    alt={`레벨 ${num}`}
                    style={{
                      width: '32px',
                      height: '32px',
                      opacity: emotionIntensity >= num ? 1 : 0.3,
                      transition: 'opacity 0.3s ease'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 감정 원인 선택 */}
          <div style={{ marginBottom: '25px' }}>
            <div style={{
              fontSize: '18px',
              color: '#333',
              marginBottom: '15px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🤔 감정의 주요 원인은 무엇인가요?
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px'
            }}>
              {causes.map((cause) => (
                <button
                  key={cause}
                  onClick={() => setSelectedCause(cause)}
                  style={{
                    background: selectedCause === cause ? 'white' : 'transparent',
                    border: selectedCause === cause ? '2px solid #3b5998' : '2px solid transparent',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: selectedCause === cause ? '#3b5998' : '#666',
                    transition: 'all 0.3s ease',
                    boxShadow: selectedCause === cause ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCause !== cause) {
                      e.target.style.backgroundColor = 'white';
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCause !== cause) {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {cause}
                </button>
              ))}
            </div>
          </div>

          {/* 메모 입력 */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{
              fontSize: '18px',
              color: '#333',
              marginBottom: '15px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📝 추가로 하고 싶은 말이 있나요? <span style={{ fontSize: '14px', color: '#999', fontWeight: 'normal' }}>(선택사항)</span>
            </div>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="오늘의 감정에 대해 더 자세히 적어보세요..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '16px',
                border: '2px solid #eee',
                borderRadius: '12px',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.3s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b5998'}
              onBlur={(e) => e.target.style.borderColor = '#eee'}
            />
          </div>

          {/* 버튼들 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            paddingTop: '15px',
            borderTop: '1px solid #eee'
          }}>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                fontWeight: '500',
                borderRadius: '8px',
                background: 'white',
                color: '#666',
                border: '2px solid #eee',
                padding: '12px 24px',
                fontSize: '16px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.5 : 1,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.target.style.backgroundColor = '#f8f9fa';
                  e.target.style.borderColor = '#ddd';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.borderColor = '#eee';
                }
              }}
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedEmotion || !selectedCause}
              style={{
                fontWeight: '600',
                borderRadius: '8px',
                background: (!selectedEmotion || !selectedCause) ? '#ccc' : '#3b5998',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                fontSize: '16px',
                cursor: (isSubmitting || !selectedEmotion || !selectedCause) ? 'not-allowed' : 'pointer',
                boxShadow: (!selectedEmotion || !selectedCause) ? 'none' : '0 4px 12px rgba(59, 89, 152, 0.3)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && selectedEmotion && selectedCause) {
                  e.target.style.backgroundColor = '#2d4373';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(59, 89, 152, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting && selectedEmotion && selectedCause) {
                  e.target.style.backgroundColor = '#3b5998';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(59, 89, 152, 0.3)';
                }
              }}
            >
              <span style={{ fontSize: '16px' }}>🌈</span>
              {isSubmitting ? '제출 중...' : '감정출석 제출'}
            </button>
          </div>
        </div>
      </div>
      
      {/* 결과 모달 */}
      <ResultModal />
    </>
  );
};

export default EmotionAttendanceModalCopy;
