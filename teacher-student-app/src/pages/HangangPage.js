import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini AI 초기화
const genAI = new GoogleGenerativeAI('AIzaSyDWuEDjA__mWPWE1njZpGPYSG__MnHYycM');

const HangangPage = () => {
  // URL 파라미터 및 인증 정보
  const { classId } = useParams();
  const { user } = useAuth();
  
  // 사용자 이름 관리
  const [userName, setUserName] = useState('');
  const [showNameModal, setShowNameModal] = useState(true);
  
  // 모달 상태
  const [showPastModal, setShowPastModal] = useState(false);
  const [showPresentModal, setShowPresentModal] = useState(false);
  const [showPastDashboard, setShowPastDashboard] = useState(false);
  const [showPresentDashboard, setShowPresentDashboard] = useState(false);
  const [showPastAIModal, setShowPastAIModal] = useState(false);
  const [showPresentAIModal, setShowPresentAIModal] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const [savedDataType, setSavedDataType] = useState(null); // 'past' 또는 'present'
  
  // 편지 기능 상태
  const [letterContent, setLetterContent] = useState('');
  const [allLetters, setAllLetters] = useState([]);
  
  // 호버 툴팁 상태
  const [hoveredTriangle, setHoveredTriangle] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // AI 추천 상태
  const [aiRecommendations, setAiRecommendations] = useState({
    past: { loading: false, recommendation: null },
    present: { loading: false, recommendation: null }
  });
  
  // 과거 한강 가치 데이터
  const [pastValues, setPastValues] = useState({
    trade: 5,      // 강과 바다를 통한 중국과의 교역
    farming: 5,    // 넓고 기름진 한강 주변 평야
    strategic: 5   // 공격과 방어에 좋은 요충지
  });
  const [pastDescription, setPastDescription] = useState('');
  
  // 현재 한강 가치 데이터
  const [emotionPoint, setEmotionPoint] = useState({ x: 0, y: 0 });
  const [presentDescription, setPresentDescription] = useState('');
  
  // 대시보드 데이터
  const [allPastData, setAllPastData] = useState([]);
  const [allPresentData, setAllPresentData] = useState([]);

  // 실시간 데이터 수신
  useEffect(() => {
    let pastQuery, presentQuery, letterQuery;
    
    if (classId) {
      // 특정 클래스의 데이터 로드
      pastQuery = query(collection(db, `hangang-past-values-${classId}`), orderBy('createdAt', 'desc'));
      presentQuery = query(collection(db, `hangang-present-values-${classId}`), orderBy('createdAt', 'desc'));
      letterQuery = query(collection(db, `hangang-letters-${classId}`), orderBy('createdAt', 'desc'));
    } else {
      // 전체 데이터 로드
      pastQuery = query(collection(db, 'hangang-past-values-all'), orderBy('createdAt', 'desc'));
      presentQuery = query(collection(db, 'hangang-present-values-all'), orderBy('createdAt', 'desc'));
      letterQuery = query(collection(db, 'hangang-letters-all'), orderBy('createdAt', 'desc'));
    }

    const unsubscribePast = onSnapshot(pastQuery, (snapshot) => {
      const pastData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllPastData(pastData);
    });

    const unsubscribePresent = onSnapshot(presentQuery, (snapshot) => {
      const presentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllPresentData(presentData);
    });

    const unsubscribeLetters = onSnapshot(letterQuery, (snapshot) => {
      const letterData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllLetters(letterData);
    });

    return () => {
      unsubscribePast();
      unsubscribePresent();
      unsubscribeLetters();
    };
  }, [classId]);

  // AI 분석 실행 - AI 모달이 열릴 때
  useEffect(() => {
    if (showPastAIModal && allPastData.length > 0 && !aiRecommendations.past.recommendation && !aiRecommendations.past.loading) {
      analyzePastResponses(allPastData);
    }
  }, [showPastAIModal, allPastData]);

  useEffect(() => {
    if (showPresentAIModal && allPresentData.length > 0 && !aiRecommendations.present.recommendation && !aiRecommendations.present.loading) {
      analyzePresentResponses(allPresentData);
    }
  }, [showPresentAIModal, allPresentData]);

  // 포인트 조절 함수
  const adjustPoint = (category, change) => {
    const total = pastValues.trade + pastValues.farming + pastValues.strategic;
    const currentValue = pastValues[category];
    
    // 증가 시 체크
    if (change > 0) {
      if (total >= 15) {
        alert('⚠️ 포인트는 최대 15점까지 분배할 수 있습니다!');
        return;
      }
      if (currentValue >= 15) {
        alert('⚠️ 하나의 항목에는 최대 15점까지 배정할 수 있습니다!');
        return;
      }
    }
    
    // 감소 시 체크
    if (change < 0 && currentValue <= 0) {
      alert('⚠️ 포인트는 0점 이하로 설정할 수 없습니다!');
      return;
    }
    
    const newValue = Math.max(0, Math.min(15, currentValue + change));
    
    setPastValues(prev => ({
      ...prev,
      [category]: newValue
    }));
  };

  // 과거 데이터 저장
  const savePastData = async () => {
    const total = pastValues.trade + pastValues.farming + pastValues.strategic;
    
    if (total !== 15) {
      if (total < 15) {
        alert(`📝 포인트를 모두 사용해주세요! (현재 ${total}/15점 사용)`);
      } else {
        alert(`⚠️ 포인트가 초과되었습니다! (현재 ${total}/15점 사용)`);
      }
      return;
    }
    
    if (!pastDescription.trim()) {
      alert('한강의 가치에 대한 설명을 입력해주세요.');
      return;
    }

    try {
      const effectiveClassId = classId || 'general';

      // 개별 클래스 컬렉션에 저장 (classId가 없으면 general 사용)
      await addDoc(collection(db, `hangang-past-values-${effectiveClassId}`), {
        userId: userName, // 이름이 곧 ID 역할
        userName: userName,
        values: pastValues,
        description: pastDescription,
        createdAt: new Date().toISOString()
      });

      // 전체 데이터 컬렉션에도 저장 (classId 정보 포함)
      await addDoc(collection(db, 'hangang-past-values-all'), {
        userId: userName,
        userName: userName,
        classId: effectiveClassId,
        values: pastValues,
        description: pastDescription,
        createdAt: new Date().toISOString()
      });

      setShowPastModal(false);
      setPastValues({ trade: 5, farming: 5, strategic: 5 });
      setPastDescription('');
      setSavedDataType('past');
      setShowDashboardModal(true);
    } catch (error) {
      console.error('데이터 저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  // 현재 데이터 저장
  const savePresentData = async () => {
    if (!presentDescription.trim()) {
      alert('한강의 가치에 대한 설명을 입력해주세요.');
      return;
    }

    try {
      const effectiveClassId = classId || 'general';

      // 개별 클래스 컬렉션에 저장 (classId가 없으면 general 사용)
      await addDoc(collection(db, `hangang-present-values-${effectiveClassId}`), {
        userId: userName, // 이름이 곧 ID 역할
        userName: userName,
        emotionPoint: emotionPoint,
        description: presentDescription,
        createdAt: new Date().toISOString()
      });

      // 전체 데이터 컬렉션에도 저장 (classId 정보 포함)
      await addDoc(collection(db, 'hangang-present-values-all'), {
        userId: userName,
        userName: userName,
        classId: effectiveClassId,
        emotionPoint: emotionPoint,
        description: presentDescription,
        createdAt: new Date().toISOString()
      });

      setShowPresentModal(false);
      setEmotionPoint({ x: 0, y: 0 });
      setPresentDescription('');
      setSavedDataType('present');
      setShowDashboardModal(true);
    } catch (error) {
      console.error('데이터 저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  // 2D 평면 클릭 핸들러
  const handlePlaneClick = (event) => {
    const rect = event.target.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = ((event.clientX - rect.left - centerX) / centerX) * 100;
    const y = -((event.clientY - rect.top - centerY) / centerY) * 100;
    
    setEmotionPoint({ x: Math.round(x), y: Math.round(y) });
  };

  // 대시보드로 이동
  const handleNavigateToDashboard = () => {
    setShowDashboardModal(false);
    // 과거 데이터 입력 후 과거 대시보드로 이동
    if (savedDataType === 'past') {
      setShowPastDashboard(true);
    } 
    // 현재 데이터 입력 후 현재 대시보드로 이동
    else if (savedDataType === 'present') {
      setShowPresentDashboard(true);
    }
  };

  // 대시보드로 이동하지 않고 모달 닫기
  const handleStayHere = () => {
    setShowDashboardModal(false);
    setSavedDataType(null);
  };

  // 과거 데이터 평균 계산
  const getPastDataAverage = () => {
    if (allPastData.length === 0) return { trade: 0, farming: 0, strategic: 0 };
    
    const total = allPastData.reduce((acc, data) => ({
      trade: acc.trade + (data.values?.trade || 0),
      farming: acc.farming + (data.values?.farming || 0),
      strategic: acc.strategic + (data.values?.strategic || 0)
    }), { trade: 0, farming: 0, strategic: 0 });
    
    return {
      trade: Math.round(total.trade / allPastData.length),
      farming: Math.round(total.farming / allPastData.length),
      strategic: Math.round(total.strategic / allPastData.length)
    };
  };

  // 마우스 호버 이벤트 핸들러
  const handleMouseEnter = (triangleType, data, event) => {
    const rect = event.target.getBoundingClientRect();
    setTooltipPosition({ 
      x: rect.left + rect.width / 2, 
      y: rect.top - 10 
    });
    setHoveredTriangle({ type: triangleType, data });
  };

  const handleMouseLeave = () => {
    setHoveredTriangle(null);
  };

  // 이름 입력 처리
  const handleNameSubmit = () => {
    if (!userName.trim()) {
      alert('이름을 입력해주세요!');
      return;
    }
    setShowNameModal(false);
  };

  // 이름이 설정되지 않은 경우 모달만 표시
  if (showNameModal) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: `
          linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)),
          url('/hangang2.png') center/cover no-repeat
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          width: '400px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏞️</div>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#2c3e50',
            marginBottom: '10px'
          }}>
            한강 가치 탐구
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#64748b',
            marginBottom: '30px'
          }}>
            과거와 현재 한강의 가치를 비교해보세요
          </p>
          
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="이름을 입력하세요"
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '10px',
              border: '2px solid #e9ecef',
              fontSize: '16px',
              marginBottom: '20px',
              boxSizing: 'border-box',
              textAlign: 'center'
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleNameSubmit();
              }
            }}
          />
          
          <button
            onClick={handleNameSubmit}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '15px',
              padding: '15px 30px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%',
              boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
            }}
          >
            시작하기
          </button>
        </div>
      </div>
    );
  }

  // 편지 저장 함수
  const handleLetterSubmit = async () => {
    if (!letterContent.trim()) {
      alert('편지 내용을 입력해주세요!');
      return;
    }

    try {
      const effectiveClassId = classId || 'general';

      // 개별 클래스 컬렉션에 저장 (classId가 없으면 general 사용)
      await addDoc(collection(db, `hangang-letters-${effectiveClassId}`), {
        userId: userName,
        userName: userName,
        content: letterContent.trim(),
        createdAt: new Date().toISOString()
      });

      // 전체 편지 컬렉션에도 저장 (classId 정보 포함)
      await addDoc(collection(db, 'hangang-letters-all'), {
        userId: userName,
        userName: userName,
        classId: effectiveClassId,
        content: letterContent.trim(),
        createdAt: new Date().toISOString()
      });

      setLetterContent('');
      alert('한강에게 편지를 보냈습니다! 💌');
    } catch (error) {
      console.error('편지 저장 오류:', error);
      alert('편지 전송 중 오류가 발생했습니다.');
    }
  };


  // 감정 좌표에 따른 색상 계산 함수
  const getEmotionColor = (x, y) => {
    // 중심에서의 거리 계산 (0-1 정규화)
    const distance = Math.sqrt(x * x + y * y) / Math.sqrt(50 * 50 + 50 * 50);
    const intensity = Math.min(distance, 1);
    
    // 사분면 결정
    const isPositiveX = x >= 0;
    const isPositiveY = y >= 0;
    
    // 기본 색상 (HSL)
    let hue, saturation, lightness;
    
    if (isPositiveX && isPositiveY) {
      // 1사분면: 편안하고 신나다 (밝은 초록)
      hue = 120;
      saturation = 60 + intensity * 30; // 60-90%
      lightness = 70 - intensity * 20;  // 50-70%
    } else if (!isPositiveX && isPositiveY) {
      // 2사분면: 불편하지만 신나다 (주황)
      hue = 30;
      saturation = 60 + intensity * 30;
      lightness = 70 - intensity * 20;
    } else if (!isPositiveX && !isPositiveY) {
      // 3사분면: 불편하고 지루하다 (빨강)
      hue = 0;
      saturation = 60 + intensity * 30;
      lightness = 70 - intensity * 20;
    } else {
      // 4사분면: 편안하지만 지루하다 (파랑)
      hue = 210;
      saturation = 60 + intensity * 30;
      lightness = 70 - intensity * 20;
    }
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // AI 응답 파싱 함수
  const parseAIResponse = (response) => {
    const sections = response.split('\n\n').filter(section => section.trim());
    const parsed = [];
    
    sections.forEach(section => {
      const lines = section.split('\n');
      let currentItem = {};
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.includes('👍 칭찬할 만한 응답:') || trimmedLine.includes('**👍 칭찬할 만한 응답:**')) {
          const match = trimmedLine.match(/(\d+)번/);
          if (match) {
            currentItem.number = match[1];
            currentItem.type = 'praise';
          }
        } else if (trimmedLine.includes('칭찬 포인트:') || trimmedLine.includes('**칭찬 포인트:**')) {
          currentItem.reason = trimmedLine.replace(/\*\*칭찬 포인트:\*\*\s*/, '').replace(/칭찬 포인트:\s*/, '');
        } else if (trimmedLine.includes('응답 내용:') || trimmedLine.includes('**응답 내용:**')) {
          currentItem.content = trimmedLine.replace(/\*\*응답 내용:\*\*\s*/, '').replace(/응답 내용:\s*/, '');
        }
      });
      
      if (currentItem.number) {
        parsed.push(currentItem);
      }
    });
    
    // 파싱된 항목이 없으면 원본 텍스트 반환
    if (parsed.length === 0) {
      return response;
    }
    
    return parsed;
  };

  // AI 분석 함수 - 과거 한강 가치 우수 응답 추천
  const analyzePastResponses = async (responses) => {
    if (!responses || responses.length === 0) return null;
    
    setAiRecommendations(prev => ({ 
      ...prev, 
      past: { loading: true, recommendation: null } 
    }));

    try {
      const responseTexts = responses
        .filter(r => r.description && r.description.trim().length > 10)
        .map((r, index) => `${index + 1}. ${r.description} (교역: ${r.values?.trade}점, 평야: ${r.values?.farming}점, 요충지: ${r.values?.strategic}점)`)
        .join('\n');

      if (!responseTexts) {
        setAiRecommendations(prev => ({ 
          ...prev, 
          past: { loading: false, recommendation: "아직 더 많은 학생들의 생각이 필요해요!" } 
        }));
        return;
      }

      const prompt = `다음은 초등학교 5학년 학생들이 삼국시대 한강의 가치에 대해 작성한 응답들입니다:

${responseTexts}

초등학생 수준에 맞게 다음 기준으로 칭찬할 만한 응답을 1-2개 선정해 주세요:
1. 한강이 왜 중요했는지 자신의 생각을 잘 표현했는가?
2. 교역, 농업, 군사 중 하나라도 언급하며 이유를 설명했는가?
3. 진심으로 생각해서 쓴 느낌이 드는가?

너무 완벽하지 않아도 괜찮습니다. 학생들의 노력과 생각이 보이는 응답을 격려해주세요.

선정된 응답이 있다면 다음 형식으로 답변해 주세요:
**👍 칭찬할 만한 응답:** [응답 번호]번
**칭찬 포인트:** [어떤 점이 좋았는지 초등학생이 이해하기 쉽게 설명]
**응답 내용:** [해당 응답의 내용]

여러 개가 있다면 각각 소개해주세요. 적당한 응답이 없다면 "아직 더 많은 학생들의 생각이 필요해요!"라고 답변해 주세요.`;

      let response;
      let text;
      
      try {
        response = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent(prompt);
        const result = await response.response;
        text = result.text().trim();
      } catch (flashError) {
        try {
          response = await genAI.getGenerativeModel({ model: "gemini-pro" }).generateContent(prompt);
          const result = await response.response;
          text = result.text().trim();
        } catch (proError) {
          response = await genAI.getGenerativeModel({}).generateContent(prompt);
          const result = await response.response;
          text = result.text().trim();
        }
      }

      const parsedResponse = parseAIResponse(text);
      setAiRecommendations(prev => ({ 
        ...prev, 
        past: { loading: false, recommendation: parsedResponse } 
      }));

    } catch (error) {
      console.error('과거 응답 분석 오류:', error);
      setAiRecommendations(prev => ({ 
        ...prev, 
        past: { loading: false, recommendation: "지금은 분석이 어려워요. 나중에 다시 시도해주세요!" } 
      }));
    }
  };

  // AI 분석 함수 - 현재 한강 가치 우수 응답 추천
  const analyzePresentResponses = async (responses) => {
    if (!responses || responses.length === 0) return null;
    
    setAiRecommendations(prev => ({ 
      ...prev, 
      present: { loading: true, recommendation: null } 
    }));

    try {
      const responseTexts = responses
        .filter(r => r.description && r.description.trim().length > 10)
        .map((r, index) => `${index + 1}. ${r.description} (감정 좌표: x=${r.emotionPoint?.x}, y=${r.emotionPoint?.y})`)
        .join('\n');

      if (!responseTexts) {
        setAiRecommendations(prev => ({ 
          ...prev, 
          present: { loading: false, recommendation: "아직 더 많은 학생들의 생각이 필요해요!" } 
        }));
        return;
      }

      const prompt = `다음은 초등학교 5학년 학생들이 현재 한강의 가치에 대해 작성한 응답들입니다:

${responseTexts}

초등학생 수준에 맞게 다음 기준으로 칭찬할 만한 응답을 1-2개 선정해 주세요:
1. 한강에 대한 자신만의 생각이나 느낌을 잘 표현했는가?
2. 구체적인 경험이나 예시를 들어 설명했는가?
3. 한강이 사람들에게 어떤 의미인지 자신의 말로 표현했는가?

완벽하지 않아도 괜찮습니다. 학생들이 진심으로 생각하고 쓴 응답을 격려해주세요.

선정된 응답이 있다면 다음 형식으로 답변해 주세요:
**👍 칭찬할 만한 응답:** [응답 번호]번
**칭찬 포인트:** [어떤 점이 좋았는지 초등학생이 이해하기 쉽게 설명]
**응답 내용:** [해당 응답의 내용]

여러 개가 있다면 각각 소개해주세요. 적당한 응답이 없다면 "아직 더 많은 학생들의 생각이 필요해요!"라고 답변해 주세요.`;

      let response;
      let text;
      
      try {
        response = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent(prompt);
        const result = await response.response;
        text = result.text().trim();
      } catch (flashError) {
        try {
          response = await genAI.getGenerativeModel({ model: "gemini-pro" }).generateContent(prompt);
          const result = await response.response;
          text = result.text().trim();
        } catch (proError) {
          response = await genAI.getGenerativeModel({}).generateContent(prompt);
          const result = await response.response;
          text = result.text().trim();
        }
      }

      const parsedResponse = parseAIResponse(text);
      setAiRecommendations(prev => ({ 
        ...prev, 
        present: { loading: false, recommendation: parsedResponse } 
      }));

    } catch (error) {
      console.error('현재 응답 분석 오류:', error);
      setAiRecommendations(prev => ({ 
        ...prev, 
        present: { loading: false, recommendation: "지금은 분석이 어려워요. 나중에 다시 시도해주세요!" } 
      }));
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #e8f4fd, #b8e0f0)',
      backgroundImage: 'url(/hangang_BG.gif)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      position: 'relative',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      

      {/* 중앙 버튼 영역 */}
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '40px',
        padding: '40px 20px'
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: '800',
          color: '#2c3e50',
          textAlign: 'center',
          marginBottom: '40px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
        }}>
          한강의 가치 탐구
        </h1>

        <button
          onClick={() => setShowPastModal(true)}
          style={{
            background: 'linear-gradient(135deg, #00bcd4, #0097a7)',
            border: 'none',
            borderRadius: '25px',
            padding: '20px 40px',
            fontSize: '18px',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 8px 25px rgba(0, 188, 212, 0.3)',
            transition: 'all 0.3s ease',
            minWidth: '300px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 12px 35px rgba(0, 188, 212, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(0, 188, 212, 0.3)';
          }}
        >
          + 과거의 한강의 가치는?
        </button>

        <button
          onClick={() => setShowPresentModal(true)}
          style={{
            background: 'linear-gradient(135deg, #00bcd4, #0097a7)',
            border: 'none',
            borderRadius: '25px',
            padding: '20px 40px',
            fontSize: '18px',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 8px 25px rgba(0, 188, 212, 0.3)',
            transition: 'all 0.3s ease',
            minWidth: '300px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 12px 35px rgba(0, 188, 212, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(0, 188, 212, 0.3)';
          }}
        >
          + 오늘날의 한강의 가치는?
        </button>

        <button
          onClick={() => setShowLetterModal(true)}
          style={{
            background: '#ff6b6b',
            border: 'none',
            borderRadius: '25px',
            padding: '20px 40px',
            fontSize: '18px',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 8px 25px rgba(255, 107, 107, 0.3)',
            transition: 'all 0.3s ease',
            minWidth: '300px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 12px 35px rgba(255, 107, 107, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.3)';
          }}
        >
          💌 한강에 보내는 편지
        </button>

      </div>

      {/* 하단 대시보드 버튼들 */}
      <div style={{
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '20px',
        zIndex: 10
      }}>
        <button
          onClick={() => setShowPastDashboard(true)}
          style={{
            background: '#00bcd4',
            backdropFilter: 'blur(10px)',
            border: 'none',
            borderRadius: '15px',
            padding: '15px 20px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
            fontSize: '16px',
            fontWeight: '600',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
          }}
        >
          📊 과거 데이터 ({allPastData.length})
        </button>
        
        <button
          onClick={() => setShowPresentDashboard(true)}
          style={{
            background: '#00bcd4',
            backdropFilter: 'blur(10px)',
            border: 'none',
            borderRadius: '15px',
            padding: '15px 20px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
            fontSize: '16px',
            fontWeight: '600',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
          }}
        >
          🗺️ 현재 데이터 ({allPresentData.length})
        </button>
      </div>

      {/* 과거 한강 가치 모달 */}
      {showPastModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(179, 229, 252, 0.95), rgba(129, 212, 250, 0.95))',
            backgroundImage: 'url(/hangang.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundBlendMode: 'overlay',
            borderRadius: '25px',
            padding: '40px',
            width: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <div style={{ 
              textAlign: 'center',
              marginBottom: '30px',
              background: 'rgba(255, 255, 255, 0.7)',
              padding: '20px',
              borderRadius: '15px',
              backdropFilter: 'blur(8px)'
            }}>
              <h2 style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                marginBottom: '10px',
                color: '#2c3e50'
              }}>
                과거의 한강의 가치는?
              </h2>
              <p style={{ 
                fontSize: '16px',
                color: '#2c3e50',
                marginBottom: '10px'
              }}>
                내가 과거 삼국의 왕이었다면 왜 한강을 차지하려고 했을까요?
              </p>
              <p style={{ 
                fontSize: '14px', 
                fontWeight: '600',
                color: '#2c3e50'
              }}>
                총 15점을 쓸 수 있습니다
              </p>
            </div>

            {/* 포인트 분배 시스템 */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.75)', 
              borderRadius: '15px', 
              padding: '20px', 
              marginBottom: '30px',
              backdropFilter: 'blur(8px)'
            }}>
              {[
                { key: 'trade', label: '강과 바다을 통한\n중국과의 교역', icon: '🚢' },
                { key: 'farming', label: '넓고 기름진\n한강 주변 평야', icon: '🌾' },
                { key: 'strategic', label: '공격과 방어에\n좋은 요충지', icon: '🏰' }
              ].map(category => (
                <div key={category.key} style={{
                  marginBottom: '25px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ 
                      fontSize: '24px',
                      width: '40px',
                      textAlign: 'center'
                    }}>
                      {category.icon}
                    </div>
                    <div style={{ 
                      flex: 1,
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#2c3e50',
                      lineHeight: '1.2'
                    }}>
                      {category.key === 'trade' ? '강과 바다를 통한 중국과의 교역' :
                       category.key === 'farming' ? '넓고 기름진 한강 주변 평야' :
                       '공격과 방어에 좋은 요충지'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={() => adjustPoint(category.key, -1)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: 'none',
                          background: '#e74c3c',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        -
                      </button>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#2c3e50',
                        minWidth: '25px',
                        textAlign: 'center'
                      }}>
                        {pastValues[category.key]}
                      </div>
                      <button
                        onClick={() => adjustPoint(category.key, 1)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: 'none',
                          background: '#27ae60',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {/* 게이지바 */}
                  <div style={{
                    width: '100%',
                    height: '12px',
                    background: '#ecf0f1',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid #bdc3c7'
                  }}>
                    <div style={{
                      width: `${(pastValues[category.key] / 15) * 100}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, #3498db, #2980b9)`,
                      borderRadius: '6px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ 
              textAlign: 'center', 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '20px',
              color: pastValues.trade + pastValues.farming + pastValues.strategic === 15 ? '#27ae60' : '#e74c3c',
              background: 'rgba(255, 255, 255, 0.7)',
              padding: '15px 20px',
              borderRadius: '10px',
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ marginBottom: '5px' }}>
                사용된 포인트: {pastValues.trade + pastValues.farming + pastValues.strategic} / 15
              </div>
              {pastValues.trade + pastValues.farming + pastValues.strategic === 15 ? (
                <div style={{ fontSize: '14px', color: '#27ae60' }}>
                  ✅ 포인트를 모두 사용했습니다!
                </div>
              ) : pastValues.trade + pastValues.farming + pastValues.strategic < 15 ? (
                <div style={{ fontSize: '14px', color: '#e74c3c' }}>
                  📝 {15 - (pastValues.trade + pastValues.farming + pastValues.strategic)}점 더 사용해야 합니다
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: '#e74c3c' }}>
                  ⚠️ {(pastValues.trade + pastValues.farming + pastValues.strategic) - 15}점 초과입니다
                </div>
              )}
            </div>

            <div style={{ 
              marginBottom: '30px',
              background: 'rgba(255, 255, 255, 0.75)', 
              borderRadius: '15px', 
              padding: '20px',
              backdropFilter: 'blur(8px)'
            }}>
              <p style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                marginBottom: '10px',
                color: '#2c3e50'
              }}>
                과거 한강의 가치는 '왜' 중요했을까요?
              </p>
              <textarea
                value={pastDescription}
                onChange={(e) => setPastDescription(e.target.value)}
                placeholder="여러분들의 귀한 생각을 적어주세요"
                style={{
                  width: '100%',
                  height: '100px',
                  borderRadius: '15px',
                  border: 'none',
                  padding: '15px',
                  fontSize: '14px',
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowPastModal(false)}
                style={{
                  background: '#6c757d',
                  border: 'none',
                  borderRadius: '15px',
                  padding: '12px 24px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={savePastData}
                style={{
                  background: '#007bff',
                  border: 'none',
                  borderRadius: '15px',
                  padding: '12px 24px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 현재 한강 가치 모달 */}
      {showPresentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(179, 229, 252, 0.95), rgba(129, 212, 250, 0.95))',
            backgroundImage: 'url(/hangang.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundBlendMode: 'overlay',
            borderRadius: '25px',
            padding: '40px',
            width: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <div style={{ 
              textAlign: 'center',
              marginBottom: '30px',
              background: 'rgba(255, 255, 255, 0.7)',
              padding: '20px',
              borderRadius: '15px',
              backdropFilter: 'blur(8px)'
            }}>
              <h2 style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                marginBottom: '10px',
                color: '#2c3e50'
              }}>
                오늘날의 한강의 가치는?
              </h2>
              <p style={{ 
                fontSize: '16px',
                color: '#2c3e50'
              }}>
                '한강'에 대해 여러분들은 어떤 감정을 가지고 있나요?
              </p>
            </div>

            {/* 2D 감정 평면 */}
            <div style={{
              width: '400px',
              height: '300px',
              margin: '0 auto 30px',
              position: 'relative',
              background: 'white',
              borderRadius: '15px',
              border: '2px solid #00bcd4',
              cursor: 'crosshair'
            }} onClick={handlePlaneClick}>
              {/* 축 선 */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '0',
                bottom: '0',
                width: '1px',
                background: '#ccc',
                transform: 'translateX(-50%)'
              }} />
              <div style={{
                position: 'absolute',
                left: '0',
                right: '0',
                top: '50%',
                height: '1px',
                background: '#ccc',
                transform: 'translateY(-50%)'
              }} />
              
              {/* 축 라벨 */}
              <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#666' }}>불편하다</div>
              <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#666' }}>편안하다</div>
              <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', color: '#666' }}>신나다</div>
              <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', color: '#666' }}>지루하다</div>
              
              {/* 선택된 포인트 */}
              {(emotionPoint.x !== 0 || emotionPoint.y !== 0) && (
                <div style={{
                  position: 'absolute',
                  left: `${50 + (emotionPoint.x / 100) * 40}%`,
                  top: `${50 - (emotionPoint.y / 100) * 40}%`,
                  width: '16px',
                  height: '16px',
                  background: '#ff5722',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  border: '3px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }} />
              )}
            </div>

            {emotionPoint.x !== 0 || emotionPoint.y !== 0 ? (
              <div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '14px', color: '#666' }}>
                선택된 위치: ({emotionPoint.x}, {emotionPoint.y})
              </div>
            ) : null}

            <div style={{ 
              marginBottom: '30px',
              background: 'rgba(255, 255, 255, 0.75)', 
              borderRadius: '15px', 
              padding: '20px',
              backdropFilter: 'blur(8px)'
            }}>
              <p style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                marginBottom: '10px',
                color: '#2c3e50'
              }}>
                오늘 날 한강의 가치는 '왜' 중요할까요?
              </p>
              <textarea
                value={presentDescription}
                onChange={(e) => setPresentDescription(e.target.value)}
                placeholder="여러분들의 귀한 생각을 적어주세요"
                style={{
                  width: '100%',
                  height: '100px',
                  borderRadius: '15px',
                  border: 'none',
                  padding: '15px',
                  fontSize: '14px',
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowPresentModal(false)}
                style={{
                  background: '#6c757d',
                  border: 'none',
                  borderRadius: '15px',
                  padding: '12px 24px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={savePresentData}
                style={{
                  background: '#007bff',
                  border: 'none',
                  borderRadius: '15px',
                  padding: '12px 24px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 과거 한강 가치 대시보드 모달 */}
      {showPastDashboard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            width: '900px',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
                📊 과거 한강의 가치 분석
              </h2>
              <button
                onClick={() => setShowPastDashboard(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>

            {/* AI 추천 버튼 */}
            <div style={{ marginBottom: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setShowPastAIModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '25px',
                  padding: '12px 24px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                }}
              >
                🤖 AI 추천 우수 응답
              </button>
            </div>

            {/* 삼각형 차트와 통계 */}
            <div style={{ display: 'flex', gap: '30px', marginBottom: '30px' }}>
              {/* 삼각형 차트 */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', textAlign: 'center' }}>
                  전체 응답자 평균 비교
                </h3>
                <div style={{ position: 'relative', width: '420px', height: '420px', margin: '0 auto' }}>
                  <svg width="420" height="420" viewBox="0 0 420 420">
                    {/* 중심점 */}
                    <circle cx="210" cy="210" r="2" fill="#333" />
                    
                    {/* 축 선들 */}
                    <g>
                      {/* 교역 축 (12시 방향, -90도) */}
                      <line x1="210" y1="210" x2="210" y2="40" stroke="#ddd" strokeWidth="1" />
                      {/* 평야 축 (4시 방향, 30도) */}
                      <line x1="210" y1="210" x2={210 + 170 * Math.cos(Math.PI/6)} y2={210 + 170 * Math.sin(Math.PI/6)} stroke="#ddd" strokeWidth="1" />
                      {/* 요충지 축 (8시 방향, 150도) */}
                      <line x1="210" y1="210" x2={210 + 170 * Math.cos(5*Math.PI/6)} y2={210 + 170 * Math.sin(5*Math.PI/6)} stroke="#ddd" strokeWidth="1" />
                    </g>

                    {/* 격자선 (3점 단위 정삼각형 5개) */}
                    {[3, 6, 9, 12, 15].map(level => {
                      const ratio = level / 15;
                      const centerX = 210;
                      const centerY = 210;
                      const maxRadius = 170;
                      const currentRadius = maxRadius * ratio;
                      
                      // 정삼각형 좌표 계산 - 정확한 120도 간격
                      // 교역 (12시 방향, -90도)
                      const tradeX = centerX + currentRadius * Math.cos(-Math.PI/2);
                      const tradeY = centerY + currentRadius * Math.sin(-Math.PI/2);
                      
                      // 평야 (4시 방향, 30도)
                      const farmingX = centerX + currentRadius * Math.cos(Math.PI/6);
                      const farmingY = centerY + currentRadius * Math.sin(Math.PI/6);
                      
                      // 요충지 (8시 방향, 150도)
                      const strategicX = centerX + currentRadius * Math.cos(5*Math.PI/6);
                      const strategicY = centerY + currentRadius * Math.sin(5*Math.PI/6);
                      
                      return (
                        <g key={level}>
                          <polygon 
                            points={`${tradeX},${tradeY} ${farmingX},${farmingY} ${strategicX},${strategicY}`}
                            fill="none" 
                            stroke={level === 15 ? "#333" : "#666"} 
                            strokeWidth={level === 15 ? "3" : "2"}
                          />
                          <text x={tradeX - 25} y={tradeY} fontSize="12" fontWeight="bold" fill="#333" textAnchor="middle">
                            {level}
                          </text>
                        </g>
                      );
                    })}

                    {/* 평균 데이터 삼각형 (회색) */}
                    {allPastData.length > 0 && (() => {
                      const avg = getPastDataAverage();
                      if (avg.trade + avg.farming + avg.strategic > 0) {
                        const centerX = 210;
                        const centerY = 210;
                        const maxRadius = 170;
                        
                        // 각 축의 거리 계산
                        const tradeRadius = (avg.trade / 15) * maxRadius;
                        const farmingRadius = (avg.farming / 15) * maxRadius;
                        const strategicRadius = (avg.strategic / 15) * maxRadius;
                        
                        // 정삼각형 좌표 계산
                        const tradeX = centerX + tradeRadius * Math.cos(-Math.PI/2);
                        const tradeY = centerY + tradeRadius * Math.sin(-Math.PI/2);
                        
                        const farmingX = centerX + farmingRadius * Math.cos(Math.PI/6);
                        const farmingY = centerY + farmingRadius * Math.sin(Math.PI/6);
                        
                        const strategicX = centerX + strategicRadius * Math.cos(5*Math.PI/6);
                        const strategicY = centerY + strategicRadius * Math.sin(5*Math.PI/6);
                        
                        return (
                          <polygon 
                            points={`${tradeX},${tradeY} ${farmingX},${farmingY} ${strategicX},${strategicY}`}
                            fill="rgba(150, 150, 150, 0.3)" 
                            stroke="#888" 
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={(e) => handleMouseEnter('average', avg, e)}
                            onMouseLeave={handleMouseLeave}
                          />
                        );
                      }
                    })()}

                    {/* 최신 개별 응답 삼각형 (컬러) */}
                    {allPastData.length > 0 && (() => {
                      const latestData = allPastData[0];
                      if (latestData && latestData.values) {
                        const values = latestData.values;
                        if (values.trade + values.farming + values.strategic > 0) {
                          const centerX = 210;
                          const centerY = 210;
                          const maxRadius = 170;
                          
                          // 각 축의 거리 계산
                          const tradeRadius = (values.trade / 15) * maxRadius;
                          const farmingRadius = (values.farming / 15) * maxRadius;
                          const strategicRadius = (values.strategic / 15) * maxRadius;
                          
                          // 정삼각형 좌표 계산
                          const tradeX = centerX + tradeRadius * Math.cos(-Math.PI/2);
                          const tradeY = centerY + tradeRadius * Math.sin(-Math.PI/2);
                          
                          const farmingX = centerX + farmingRadius * Math.cos(Math.PI/6);
                          const farmingY = centerY + farmingRadius * Math.sin(Math.PI/6);
                          
                          const strategicX = centerX + strategicRadius * Math.cos(5*Math.PI/6);
                          const strategicY = centerY + strategicRadius * Math.sin(5*Math.PI/6);
                          
                          return (
                            <polygon 
                              points={`${tradeX},${tradeY} ${farmingX},${farmingY} ${strategicX},${strategicY}`}
                              fill="rgba(255, 20, 147, 0.6)" 
                              stroke="#ff1493" 
                              strokeWidth="3"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={(e) => handleMouseEnter('individual', values, e)}
                              onMouseLeave={handleMouseLeave}
                            />
                          );
                        }
                      }
                    })()}

                    {/* 라벨 */}
                    <text x="210" y="25" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#333">교역</text>
                    <text x={210 + 190 * Math.cos(Math.PI/6)} y={210 + 190 * Math.sin(Math.PI/6)} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#333">평야</text>
                    <text x={210 + 190 * Math.cos(5*Math.PI/6)} y={210 + 190 * Math.sin(5*Math.PI/6)} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#333">요충지</text>
                  </svg>
                  
                  {/* 범례 */}
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '-40px', 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '20px',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ 
                        width: '15px', 
                        height: '15px', 
                        background: 'rgba(255, 20, 147, 0.6)',
                        border: '2px solid #ff1493'
                      }}></div>
                      <span>최근 응답</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ 
                        width: '15px', 
                        height: '15px', 
                        background: 'rgba(150, 150, 150, 0.3)',
                        border: '2px dashed #888'
                      }}></div>
                      <span>전체 평균</span>
                    </div>
                  </div>
                  
                  {/* 호버 툴팁 */}
                  {hoveredTriangle && (
                    <div style={{
                      position: 'fixed',
                      left: tooltipPosition.x,
                      top: tooltipPosition.y,
                      transform: 'translateX(-50%)',
                      background: 'rgba(0, 0, 0, 0.9)',
                      color: 'white',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      pointerEvents: 'none',
                      zIndex: 1000,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      maxWidth: '200px'
                    }}>
                      <div style={{ marginBottom: '8px', fontSize: '16px', color: '#00bcd4' }}>
                        {hoveredTriangle.type === 'average' ? '🔢 전체 평균' : '📊 개별 응답'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>🏛️ 교역: <span style={{ color: '#4fc3f7' }}>{hoveredTriangle.data.trade}점</span></div>
                        <div>🌾 평야: <span style={{ color: '#81c784' }}>{hoveredTriangle.data.farming}점</span></div>
                        <div>⚔️ 요충지: <span style={{ color: '#ffb74d' }}>{hoveredTriangle.data.strategic}점</span></div>
                      </div>
                      <div style={{ 
                        borderTop: '1px solid #555', 
                        marginTop: '8px', 
                        paddingTop: '8px',
                        color: '#ccc',
                        fontSize: '12px'
                      }}>
                        총 {hoveredTriangle.data.trade + hoveredTriangle.data.farming + hoveredTriangle.data.strategic}점
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 통계 정보 */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                  응답 현황
                </h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div style={{ 
                    background: '#f8f9fa', 
                    padding: '15px', 
                    borderRadius: '10px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>총 응답 수</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
                      {allPastData.length}명
                    </div>
                  </div>
                  
                  {allPastData.length > 0 && (() => {
                    const avg = getPastDataAverage();
                    return (
                      <>
                        <div style={{ 
                          background: '#e3f2fd', 
                          padding: '15px', 
                          borderRadius: '10px',
                          border: '1px solid #bbdefb'
                        }}>
                          <div style={{ fontSize: '14px', color: '#1976d2', marginBottom: '5px' }}>🚢 교역 평균</div>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: '#1565c0' }}>
                            {avg.trade}점
                          </div>
                        </div>
                        
                        <div style={{ 
                          background: '#e8f5e8', 
                          padding: '15px', 
                          borderRadius: '10px',
                          border: '1px solid #c8e6c9'
                        }}>
                          <div style={{ fontSize: '14px', color: '#388e3c', marginBottom: '5px' }}>🌾 평야 평균</div>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: '#2e7d32' }}>
                            {avg.farming}점
                          </div>
                        </div>
                        
                        <div style={{ 
                          background: '#fff3e0', 
                          padding: '15px', 
                          borderRadius: '10px',
                          border: '1px solid #ffcc02'
                        }}>
                          <div style={{ fontSize: '14px', color: '#f57c00', marginBottom: '5px' }}>🏰 요충지 평균</div>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: '#ef6c00' }}>
                            {avg.strategic}점
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* 응답 목록 */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                학생 응답 목록
              </h3>
              <div style={{ 
                maxHeight: '300px', 
                overflow: 'auto',
                border: '1px solid #e9ecef',
                borderRadius: '10px'
              }}>
                {allPastData.length === 0 ? (
                  <div style={{ 
                    padding: '40px', 
                    textAlign: 'center', 
                    color: '#666',
                    fontSize: '14px'
                  }}>
                    아직 응답이 없습니다.
                  </div>
                ) : (
                  allPastData.map((data, index) => (
                    <div key={data.id} style={{
                      padding: '15px',
                      borderBottom: index < allPastData.length - 1 ? '1px solid #f1f3f4' : 'none',
                      background: index % 2 === 0 ? '#fafafa' : 'white'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: '600', color: '#2c3e50' }}>{data.userName}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {new Date(data.createdAt).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ 
                          fontSize: '11px', 
                          background: '#e3f2fd', 
                          padding: '3px 8px', 
                          borderRadius: '12px',
                          color: '#1565c0'
                        }}>
                          교역: {data.values?.trade || 0}
                        </div>
                        <div style={{ 
                          fontSize: '11px', 
                          background: '#e8f5e8', 
                          padding: '3px 8px', 
                          borderRadius: '12px',
                          color: '#2e7d32'
                        }}>
                          평야: {data.values?.farming || 0}
                        </div>
                        <div style={{ 
                          fontSize: '11px', 
                          background: '#fff3e0', 
                          padding: '3px 8px', 
                          borderRadius: '12px',
                          color: '#ef6c00'
                        }}>
                          요충지: {data.values?.strategic || 0}
                        </div>
                      </div>
                      
                      <div style={{ fontSize: '13px', color: '#495057', lineHeight: '1.4' }}>
                        {data.description}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 현재 한강 가치 대시보드 모달 */}
      {showPresentDashboard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            width: '900px',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
                🗺️ 오늘날 한강의 가치 분석
              </h2>
              <button
                onClick={() => setShowPresentDashboard(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>

            {/* AI 추천 버튼 */}
            <div style={{ marginBottom: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setShowPresentAIModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '25px',
                  padding: '12px 24px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                }}
              >
                🤖 AI 추천 우수 응답
              </button>
            </div>

            {/* 감정 분포 차트 */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', textAlign: 'center' }}>
                감정 분포 현황
              </h3>
                <div style={{
                  width: '500px',
                  height: '350px',
                  background: '#f8f9fa',
                  borderRadius: '15px',
                  position: 'relative',
                  margin: '0 auto',
                  border: '2px solid #e9ecef',
                  overflow: 'hidden'
                }}>
                  {/* 축 선 */}
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '20px',
                    bottom: '20px',
                    width: '1px',
                    background: '#ccc',
                    transform: 'translateX(-50%)'
                  }} />
                  <div style={{
                    position: 'absolute',
                    left: '20px',
                    right: '20px',
                    top: '50%',
                    height: '1px',
                    background: '#ccc',
                    transform: 'translateY(-50%)'
                  }} />
                  
                  {/* 축 라벨 */}
                  <div style={{ position: 'absolute', left: '30px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#666' }}>불편하다</div>
                  <div style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#666' }}>편안하다</div>
                  <div style={{ position: 'absolute', top: '30px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', color: '#666' }}>신나다</div>
                  <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', color: '#666' }}>지루하다</div>
                  
                  {/* 데이터 포인트 */}
                  {allPresentData.map((data, index) => {
                    const x = data.emotionPoint?.x || 0;
                    const y = data.emotionPoint?.y || 0;
                    const color = getEmotionColor(x, y);
                    const distance = Math.sqrt(x * x + y * y) / Math.sqrt(50 * 50 + 50 * 50);
                    const size = 8 + distance * 4; // 거리에 따라 크기도 조절 (8-12px)
                    
                    return (
                      <div
                        key={data.id}
                        style={{
                          position: 'absolute',
                          width: `${size}px`,
                          height: `${size}px`,
                          background: color,
                          borderRadius: '50%',
                          left: `${50 + x * 0.4}%`,
                          top: `${50 - y * 0.4}%`,
                          transform: 'translate(-50%, -50%)',
                          boxShadow: `0 2px 8px ${color}40, 0 0 0 2px white`,
                          border: '1px solid rgba(255,255,255,0.8)',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          zIndex: 10
                        }}
                        title={`${data.userName}: (${x}, ${y}) - ${data.description?.substring(0, 50)}...`}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translate(-50%, -50%) scale(1.3)';
                          e.target.style.zIndex = '20';
                          e.target.style.boxShadow = `0 4px 16px ${color}60, 0 0 0 3px white`;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translate(-50%, -50%) scale(1)';
                          e.target.style.zIndex = '10';
                          e.target.style.boxShadow = `0 2px 8px ${color}40, 0 0 0 2px white`;
                        }}
                      />
                    );
                  })}
                </div>
                
                {/* 범례 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '20px',
                  marginTop: '15px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      background: 'hsl(120, 75%, 60%)',
                      borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.8)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                    <span style={{ fontSize: '12px', color: '#666' }}>편안하고 신나는</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      background: 'hsl(30, 75%, 60%)',
                      borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.8)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                    <span style={{ fontSize: '12px', color: '#666' }}>불편하지만 신나는</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      background: 'hsl(0, 75%, 60%)',
                      borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.8)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                    <span style={{ fontSize: '12px', color: '#666' }}>불편하고 지루한</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      background: 'hsl(210, 75%, 60%)',
                      borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.8)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                    <span style={{ fontSize: '12px', color: '#666' }}>편안하지만 지루한</span>
                  </div>
                </div>
                <div style={{
                  textAlign: 'center',
                  marginTop: '10px',
                  fontSize: '11px',
                  color: '#888'
                }}>
                  💡 중심에서 멀수록 감정이 강하며, 점의 크기와 진하기가 달라집니다
                </div>
            </div>

            {/* 응답 목록 */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                학생 응답 목록 ({allPresentData.length}명)
              </h3>
              <div style={{ 
                maxHeight: '300px', 
                overflow: 'auto',
                border: '1px solid #e9ecef',
                borderRadius: '10px'
              }}>
                {allPresentData.length === 0 ? (
                  <div style={{ 
                    padding: '40px', 
                    textAlign: 'center', 
                    color: '#666',
                    fontSize: '14px'
                  }}>
                    아직 응답이 없습니다.
                  </div>
                ) : (
                  allPresentData.map((data, index) => {
                    const x = data.emotionPoint?.x || 0;
                    const y = data.emotionPoint?.y || 0;
                    const color = getEmotionColor(x, y);
                    
                    return (
                      <div key={data.id} style={{
                        padding: '15px',
                        borderBottom: index < allPresentData.length - 1 ? '1px solid #f1f3f4' : 'none',
                        background: index % 2 === 0 ? '#fafafa' : 'white',
                        borderLeft: `4px solid ${color}`,
                        transition: 'all 0.2s ease'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px' 
                          }}>
                            <div style={{
                              width: '12px',
                              height: '12px',
                              background: color,
                              borderRadius: '50%',
                              border: '1px solid rgba(255,255,255,0.8)',
                              boxShadow: `0 2px 4px ${color}40`
                            }} />
                            <div style={{ fontWeight: '600', color: '#2c3e50' }}>{data.userName}</div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {new Date(data.createdAt).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                        
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', marginLeft: '22px' }}>
                          감정 좌표: ({x}, {y})
                        </div>
                        
                        <div style={{ fontSize: '13px', color: '#495057', lineHeight: '1.4', marginLeft: '22px' }}>
                          {data.description}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 과거 데이터 AI 추천 모달 */}
      {showPastAIModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            width: '700px',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '10px' }}>
                🤖 AI 추천 우수 응답 (과거 한강의 가치)
              </h2>
              <button
                onClick={() => setShowPastAIModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', 
              padding: '30px', 
              borderRadius: '15px',
              border: '2px solid #0ea5e9',
              minHeight: '400px'
            }}>
              {aiRecommendations.past.loading ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ 
                    fontSize: '48px', 
                    marginBottom: '20px',
                    animation: 'pulse 1.5s ease-in-out infinite alternate'
                  }}>
                    🤖
                  </div>
                  <div style={{ fontSize: '20px', color: '#0ea5e9', marginBottom: '15px', fontWeight: '600' }}>
                    AI가 학생들의 응답을 분석하고 있습니다
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>
                    삼국시대 한강의 가치에 대한 우수한 응답을 찾는 중...
                  </div>
                </div>
              ) : aiRecommendations.past.recommendation ? (
                <div>
                  {Array.isArray(aiRecommendations.past.recommendation) ? (
                    // 파싱된 응답을 카드 형태로 표시
                    <>
                      {aiRecommendations.past.recommendation.map((item, index) => (
                        <div key={index} style={{
                          background: 'rgba(14, 165, 233, 0.1)',
                          border: '1px solid #0ea5e9',
                          borderRadius: '15px',
                          padding: '20px',
                          marginBottom: '20px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '15px'
                          }}>
                            <div style={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: 'white',
                              borderRadius: '20px',
                              padding: '8px 16px',
                              fontSize: '14px',
                              fontWeight: '600',
                              marginRight: '12px'
                            }}>
                              👍 {item.number}번 응답
                            </div>
                          </div>
                          
                          <div style={{
                            background: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '10px',
                            padding: '15px',
                            marginBottom: '15px'
                          }}>
                            <h4 style={{
                              color: '#0369a1',
                              fontSize: '14px',
                              fontWeight: '600',
                              marginBottom: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              🌟 칭찬 포인트
                            </h4>
                            <p style={{
                              color: '#1f2937',
                              fontSize: '15px',
                              lineHeight: '1.6',
                              margin: '0'
                            }}>
                              {item.reason}
                            </p>
                          </div>
                          
                          <div style={{
                            background: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '10px',
                            padding: '15px'
                          }}>
                            <h4 style={{
                              color: '#0369a1',
                              fontSize: '14px',
                              fontWeight: '600',
                              marginBottom: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              📝 학생 응답
                            </h4>
                            <p style={{
                              color: '#1f2937',
                              fontSize: '15px',
                              lineHeight: '1.6',
                              margin: '0',
                              fontStyle: 'italic'
                            }}>
                              "{item.content}"
                            </p>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    // 파싱되지 않은 응답은 기존 방식으로 표시
                    <div style={{
                      background: 'rgba(14, 165, 233, 0.1)',
                      border: '1px solid #0ea5e9',
                      borderRadius: '10px',
                      padding: '20px',
                      marginBottom: '20px'
                    }}>
                      <h3 style={{ 
                        color: '#0369a1', 
                        fontSize: '16px', 
                        fontWeight: '600',
                        marginBottom: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        ✨ AI 분석 결과
                      </h3>
                      <div style={{ 
                        fontSize: '15px', 
                        lineHeight: '1.7',
                        color: '#1f2937',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {aiRecommendations.past.recommendation}
                      </div>
                    </div>
                  )}
                  
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#64748b',
                    textAlign: 'center',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '15px'
                  }}>
                    💡 이 분석은 AI가 자동으로 생성한 결과입니다. 교육적 참고용으로 활용해 주세요.
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px', opacity: '0.6' }}>
                    📝
                  </div>
                  <div style={{ fontSize: '18px', color: '#64748b', marginBottom: '15px', fontWeight: '600' }}>
                    분석할 응답이 아직 충분하지 않습니다
                  </div>
                  <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' }}>
                    학생들의 응답이 더 쌓이면<br/>
                    AI가 우수한 응답을 추천해드립니다
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 현재 데이터 AI 추천 모달 */}
      {showPresentAIModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            width: '700px',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '10px' }}>
                🤖 AI 추천 우수 응답 (현재 한강의 가치)
              </h2>
              <button
                onClick={() => setShowPresentAIModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', 
              padding: '30px', 
              borderRadius: '15px',
              border: '2px solid #0ea5e9',
              minHeight: '400px'
            }}>
              {aiRecommendations.present.loading ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ 
                    fontSize: '48px', 
                    marginBottom: '20px',
                    animation: 'pulse 1.5s ease-in-out infinite alternate'
                  }}>
                    🤖
                  </div>
                  <div style={{ fontSize: '20px', color: '#0ea5e9', marginBottom: '15px', fontWeight: '600' }}>
                    AI가 학생들의 응답을 분석하고 있습니다
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>
                    현재 한강의 가치에 대한 우수한 응답을 찾는 중...
                  </div>
                </div>
              ) : aiRecommendations.present.recommendation ? (
                <div>
                  {Array.isArray(aiRecommendations.present.recommendation) ? (
                    // 파싱된 응답을 카드 형태로 표시
                    <>
                      {aiRecommendations.present.recommendation.map((item, index) => (
                        <div key={index} style={{
                          background: 'rgba(14, 165, 233, 0.1)',
                          border: '1px solid #0ea5e9',
                          borderRadius: '15px',
                          padding: '20px',
                          marginBottom: '20px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '15px'
                          }}>
                            <div style={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: 'white',
                              borderRadius: '20px',
                              padding: '8px 16px',
                              fontSize: '14px',
                              fontWeight: '600',
                              marginRight: '12px'
                            }}>
                              👍 {item.number}번 응답
                            </div>
                          </div>
                          
                          <div style={{
                            background: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '10px',
                            padding: '15px',
                            marginBottom: '15px'
                          }}>
                            <h4 style={{
                              color: '#0369a1',
                              fontSize: '14px',
                              fontWeight: '600',
                              marginBottom: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              🌟 칭찬 포인트
                            </h4>
                            <p style={{
                              color: '#1f2937',
                              fontSize: '15px',
                              lineHeight: '1.6',
                              margin: '0'
                            }}>
                              {item.reason}
                            </p>
                          </div>
                          
                          <div style={{
                            background: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '10px',
                            padding: '15px'
                          }}>
                            <h4 style={{
                              color: '#0369a1',
                              fontSize: '14px',
                              fontWeight: '600',
                              marginBottom: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              📝 학생 응답
                            </h4>
                            <p style={{
                              color: '#1f2937',
                              fontSize: '15px',
                              lineHeight: '1.6',
                              margin: '0',
                              fontStyle: 'italic'
                            }}>
                              "{item.content}"
                            </p>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    // 파싱되지 않은 응답은 기존 방식으로 표시
                    <div style={{
                      background: 'rgba(14, 165, 233, 0.1)',
                      border: '1px solid #0ea5e9',
                      borderRadius: '10px',
                      padding: '20px',
                      marginBottom: '20px'
                    }}>
                      <h3 style={{ 
                        color: '#0369a1', 
                        fontSize: '16px', 
                        fontWeight: '600',
                        marginBottom: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        ✨ AI 분석 결과
                      </h3>
                      <div style={{ 
                        fontSize: '15px', 
                        lineHeight: '1.7',
                        color: '#1f2937',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {aiRecommendations.present.recommendation}
                      </div>
                    </div>
                  )}
                  
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#64748b',
                    textAlign: 'center',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '15px'
                  }}>
                    💡 이 분석은 AI가 자동으로 생성한 결과입니다. 교육적 참고용으로 활용해 주세요.
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px', opacity: '0.6' }}>
                    📝
                  </div>
                  <div style={{ fontSize: '18px', color: '#64748b', marginBottom: '15px', fontWeight: '600' }}>
                    분석할 응답이 아직 충분하지 않습니다
                  </div>
                  <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' }}>
                    학생들의 응답이 더 쌓이면<br/>
                    AI가 우수한 응답을 추천해드립니다
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 한강에 보내는 편지 모달 */}
      {showLetterModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            width: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '10px' }}>
                💌 한강에 보내는 편지
              </h2>
              <button
                onClick={() => setShowLetterModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>

            {/* 편지 작성 영역 */}
            <div style={{
              background: '#f8f9fa',
              borderRadius: '15px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <textarea
                value={letterContent}
                onChange={(e) => setLetterContent(e.target.value)}
                placeholder="한강에게 하고 싶은 말을 적어보세요..."
                style={{
                  width: '100%',
                  height: '120px',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '15px',
                  fontSize: '16px',
                  resize: 'none',
                  boxSizing: 'border-box',
                  background: 'white',
                  outline: 'none'
                }}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '10px'
              }}>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {letterContent.length}/200자
                </div>
                <button
                  onClick={handleLetterSubmit}
                  disabled={!letterContent.trim()}
                  style={{
                    background: letterContent.trim() ? '#ff6b6b' : '#ccc',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 20px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: letterContent.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  편지 보내기
                </button>
              </div>
            </div>

            {/* 편지 목록 */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px', color: '#2c3e50' }}>
                모두의 편지 ({allLetters.length}개)
              </h3>
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '15px',
                padding: '20px'
              }}>
                {allLetters.length === 0 ? (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '14px'
                  }}>
                    아직 편지가 없습니다. 첫 번째 편지를 보내보세요! 💌
                  </div>
                ) : (
                  allLetters.map((letter, index) => (
                    <div key={letter.id} style={{
                      marginBottom: '20px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {/* 채팅 메시지 컨테이너 */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '8px',
                        justifyContent: letter.userName === userName ? 'flex-end' : 'flex-start'
                      }}>
                        {/* 다른 사람의 메시지일 때 프로필 아이콘 */}
                        {letter.userName !== userName && (
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(45deg, #ff6b6b, #ffa726)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            color: 'white',
                            fontWeight: '600',
                            marginBottom: '4px'
                          }}>
                            {letter.userName.charAt(0)}
                          </div>
                        )}
                        
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: letter.userName === userName ? 'flex-end' : 'flex-start',
                          maxWidth: '70%'
                        }}>
                          {/* 이름 표시 (다른 사람의 메시지일 때만) */}
                          {letter.userName !== userName && (
                            <div style={{
                              fontSize: '11px',
                              color: 'rgba(255, 255, 255, 0.8)',
                              marginBottom: '4px',
                              marginLeft: '12px'
                            }}>
                              {letter.userName}
                            </div>
                          )}
                          
                          {/* 말풍선 */}
                          <div style={{
                            background: letter.userName === userName ? '#007AFF' : '#FFFFFF',
                            color: letter.userName === userName ? 'white' : '#000000',
                            padding: '12px 16px',
                            borderRadius: letter.userName === userName ? '20px 20px 8px 20px' : '20px 20px 20px 8px',
                            maxWidth: '100%',
                            boxShadow: letter.userName === userName ? 
                              '0 2px 10px rgba(0, 122, 255, 0.3)' : 
                              '0 2px 10px rgba(0, 0, 0, 0.1)',
                            position: 'relative',
                            wordWrap: 'break-word',
                            fontSize: '14px',
                            lineHeight: '1.4'
                          }}>
                            {letter.content}
                          </div>
                          
                          {/* 시간 표시 */}
                          <div style={{
                            fontSize: '10px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            marginTop: '4px',
                            marginLeft: letter.userName === userName ? '0' : '12px',
                            marginRight: letter.userName === userName ? '12px' : '0'
                          }}>
                            {new Date(letter.createdAt).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 대시보드 이동 확인 모달 */}
      {showDashboardModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            width: '480px',
            maxWidth: '90vw',
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            transform: 'scale(1)',
            animation: 'modalAppear 0.3s ease-out'
          }}>
            <div style={{
              fontSize: '50px',
              marginBottom: '20px'
            }}>
              🎉
            </div>
            
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#2c3e50',
              marginBottom: '15px'
            }}>
              데이터가 성공적으로 저장되었습니다!
            </h2>
            
            <p style={{
              fontSize: '16px',
              color: '#64748b',
              lineHeight: '1.6',
              marginBottom: '30px'
            }}>
              {savedDataType === 'past' 
                ? '과거 한강의 가치가 저장되었습니다.' 
                : '현재 한강의 가치가 저장되었습니다.'
              }<br />
              해당 대시보드에서 결과를 확인하시겠어요?
            </p>
            
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              justifyContent: 'center' 
            }}>
              <button
                onClick={handleStayHere}
                style={{
                  background: '#f8fafc',
                  border: '2px solid #e2e8f0',
                  color: '#64748b',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minWidth: '120px'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#e2e8f0';
                  e.target.style.borderColor = '#cbd5e1';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#f8fafc';
                  e.target.style.borderColor = '#e2e8f0';
                }}
              >
                나중에
              </button>
              
              <button
                onClick={handleNavigateToDashboard}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minWidth: '120px',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                }}
              >
                대시보드 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HangangPage;