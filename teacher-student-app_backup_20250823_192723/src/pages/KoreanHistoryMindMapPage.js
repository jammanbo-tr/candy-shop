import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ForceGraph2D from 'react-force-graph-2d';

// Gemini AI 초기화
const genAI = new GoogleGenerativeAI('AIzaSyDWuEDjA__mWPWE1njZpGPYSG__MnHYycM');

const KOREAN_HISTORY_TOPICS = {
  '고조선': {
    color: '#FF6B6B',
    emoji: '🏺',
    keywords: ['단군', '청동기', '8조법', '위만조선']
  },
  '삼국시대': {
    color: '#4ECDC4', 
    emoji: '⚔️',
    keywords: ['고구려', '백제', '신라', '가야']
  },
  '고려시대': {
    color: '#45B7D1',
    emoji: '👑',
    keywords: ['고려청자', '몽골침입', '무신정권', '조선']
  },
  '조선시대': {
    color: '#96CEB4',
    emoji: '📜',
    keywords: ['세종대왕', '한글창제', '임진왜란', '실학']
  },
  '근현대': {
    color: '#FF8C42',
    emoji: '🚂',
    keywords: ['일제강점기', '광복', '한국전쟁', '민주화']
  }
};

// 한글 단어 정규화(롤백): 한글만 남기고 공백 정리만 수행
const normalizeKoreanWord = (raw) => {
  if (!raw) return '';
  const word = String(raw).replace(/[^\uAC00-\uD7A3,\s]/g, '').trim();
  return word;
};

// 키워드 정제: 조사, 연결어, 불필요한 단어 제거하고 핵심 키워드만 추출
const refineKeyword = (text) => {
  if (!text) return '';
  
  // 조사, 연결어, 불필요한 단어들
  const stopWords = [
    '이', '가', '을', '를', '은', '는', '이', '가', '도', '만', '부터', '까지', '에서', '으로', '에게', '와', '과', '하고', '며', '거나', '하지만', '그리고', '또는', '또한', '그러나', '하지만', '따라서', '그래서', '그런데', '그런', '이런', '저런', '어떤', '무슨', '어떻게', '언제', '어디서', '왜', '무엇을', '누가', '어떤', '몇', '얼마나', '얼마', '그', '이', '저', '그것', '이것', '저것', '그때', '이때', '저때', '그곳', '이곳', '저곳'
  ];
  
  // 문장을 단어로 분리 (한글, 숫자, 영문만)
  const words = text.match(/[가-힣a-zA-Z0-9]+/g) || [];
  
  // 핵심 키워드만 필터링
  const refinedWords = words
    .filter(word => {
      // 2글자 미만 제외
      if (word.length < 2) return false;
      
      // 조사/연결어 제외
      if (stopWords.includes(word)) return false;
      
      // 숫자만 있는 경우 제외
      if (/^\d+$/.test(word)) return false;
      
      return true;
    })
    .slice(0, 5); // 최대 5개 키워드만 추출
  
  return refinedWords.join(', ');
};

// 키워드 정규화: 조사나 연결어가 붙은 단어들을 기본 형태로 통합
const normalizeKeyword = (word) => {
  if (!word) return '';
  
  // 조사나 연결어 패턴 제거
  const patterns = [
    /을$/, /를$/, /이$/, /가$/, /은$/, /는$/, /도$/, /만$/, /부터$/, /까지$/, /에서$/, /으로$/, /에게$/, /와$/, /과$/, /하고$/, /며$/, /거나$/, /하지만$/, /그리고$/, /또는$/, /또한$/, /그러나$/, /따라서$/, /그래서$/, /그런데$/, /그런$/, /이런$/, /저런$/, /어떤$/, /무슨$/, /어떻게$/, /언제$/, /어디서$/, /왜$/, /무엇을$/, /누가$/, /몇$/, /얼마나$/, /얼마$/, /그$/, /이$/, /저$/, /그것$/, /이것$/, /저것$/, /그때$/, /이때$/, /저때$/, /그곳$/, /이곳$/, /저곳$/
  ];
  
  let normalized = word;
  
  // 패턴에 맞는 조사/연결어 제거
  patterns.forEach(pattern => {
    normalized = normalized.replace(pattern, '');
  });
  
  // 연속된 조사 제거 (예: "한글을을" -> "한글")
  normalized = normalized.replace(/(을|를|이|가|은|는|도|만|부터|까지|에서|으로|에게|와|과|하고|며|거나|하지만|그리고|또는|또한|그러나|따라서|그래서|그런데|그런|이런|저런|어떤|무슨|어떻게|언제|어디서|왜|무엇을|누가|몇|얼마나|얼마|그|이|저|그것|이것|저것|그때|이때|저때|그곳|이곳|저곳)+$/, '');
  
  return normalized.trim();
};

// 공통 빈도 계산(워드클라우드/마인드맵 모두 사용)
// - 쉼표로 구분된 키워드 분할 후 집계
// - 문장 내 단어 집계(2글자 이상)
// - 키워드가 아니어도 문장에서 3회 이상 등장하면 포함
const computeWordStats = (topicResponses) => {
  const keywordFrequency = {};
  const sentenceFrequency = {};

  // 키워드 필드 집계
  topicResponses.forEach((response) => {
    const text = (response.word || '').trim();
    if (!text) return;
    
    // 긴 문장인 경우 키워드 정제
    if (text.length > 20) {
      const refinedText = refineKeyword(text);
      if (refinedText) {
        const parts = refinedText.split(',').map((k) => k.trim()).filter((k) => k.length > 0);
        parts.forEach((k) => {
          const normalizedKey = normalizeKeyword(k);
          if (normalizedKey) {
            keywordFrequency[normalizedKey] = (keywordFrequency[normalizedKey] || 0) + 1;
          }
        });
      }
    } else {
      // 짧은 키워드는 정규화 후 사용
      const parts = text.split(',').map((k) => k.trim()).filter((k) => k.length > 0);
      parts.forEach((k) => {
        const normalizedKey = normalizeKeyword(k);
        if (normalizedKey) {
          keywordFrequency[normalizedKey] = (keywordFrequency[normalizedKey] || 0) + 1;
        }
      });
    }
  });

  // 문장 집계 (긴 문장은 키워드 정제)
  const allSentences = topicResponses.map((r) => {
    const sentence = r.sentence || '';
    // 긴 문장인 경우 키워드 정제
    if (sentence.length > 30) {
      return refineKeyword(sentence);
    }
    return sentence;
  }).join(' ');
  
  const sentenceWords = allSentences.match(/[가-힣]+/g) || [];
  const wordCount = {};
  sentenceWords.forEach((w) => {
    if (w.length >= 2) {
      const normalizedWord = normalizeKeyword(w);
      if (normalizedWord) {
        wordCount[normalizedWord] = (wordCount[normalizedWord] || 0) + 1;
      }
    }
  });

  // 통합
  const allKeys = new Set([
    ...Object.keys(keywordFrequency),
    ...Object.keys(wordCount).filter((w) => !keywordFrequency[w] && wordCount[w] >= 3),
  ]);

  const results = Array.from(allKeys).map((word) => {
    const k = keywordFrequency[word] || 0;
    const s = wordCount[word] || 0;
    const total = k * 3 + s; // 동일 가중치 규칙
    sentenceFrequency[word] = s;
    return { word, keywordCount: k, sentenceCount: s, totalScore: total };
  });

  return results;
};

// 떠다니는 이모지 컴포넌트
const FloatingEmoji = ({ emoji, response, onClick, x, y, delay }) => {
  const emojiRef = useRef(null);
  
  useEffect(() => {
    const element = emojiRef.current;
    if (!element) return;
    
                      // 보드 전체를 자유롭게 떠돌아다니는 애니메이션 (즉시 시작)
                  const animate = () => {
                    const time = Date.now() * 0.001 + delay;
                    
                    // 보드 전체 영역을 자유롭게 탐험
                    const boardWidth = window.innerWidth > 1200 ? 1000 : 900;
                    const boardHeight = 500;
                    
                    // 각 이모지마다 독립적인 움직임 패턴
                    const speedX = 0.15 + (delay % 7) * 0.02; // 개별 속도
                    const speedY = 0.12 + (delay % 11) * 0.015; // 개별 속도
                    const amplitudeX = boardWidth * 0.6; // X축 움직임 범위 극한 확장
                    const amplitudeY = boardHeight * 0.6; // Y축 움직임 범위 극한 확장
                    
                    // 보드 전체를 탐험하는 움직임
                    const moveX = Math.sin(time * speedX + delay * 0.3) * amplitudeX;
                    const moveY = Math.cos(time * speedY + delay * 0.5) * amplitudeY;
                    
                    // 초기 위치 + 자유로운 움직임
                    const newX = x + moveX;
                    const newY = y + moveY;
                    
                    // 테두리 튕김 효과 + 보드 전체 영역 활용
                    let finalX = newX;
                    let finalY = newY;
                    
                    // X축 테두리 튕김 (오른쪽 영역 강제 활용)
                    if (newX < 10) {
                      finalX = 10 + Math.abs(newX - 10) * 0.6; // 왼쪽 테두리에서 튕김
                    } else if (newX > boardWidth - 10) {
                      finalX = boardWidth - 10 - Math.abs(newX - (boardWidth - 10)) * 0.6; // 오른쪽 테두리에서 튕김
                    }
                    
                    // Y축 테두리 튕김 (아래쪽 영역 강제 활용)
                    if (newY < 10) {
                      finalY = 10 + Math.abs(newY - 10) * 0.6; // 위쪽 테두리에서 튕김
                    } else if (newY > boardHeight - 10) {
                      finalY = boardHeight - 10 - Math.abs(newY - (boardHeight - 10)) * 0.6; // 아래쪽 테두리에서 튕김
                    }
                    
                    // 절대 위치로 설정 (보드 전체 탐험)
                    element.style.transform = `translate(${finalX - x}px, ${finalY - y}px)`;
                    
                    requestAnimationFrame(animate);
                  };
                  
                  // 즉시 애니메이션 시작 (지연 없음)
                  animate();
  }, [delay, x, y]);

                    return (
                    <div
                      ref={emojiRef}
                      onClick={() => onClick(response)}
                      style={{
                        position: 'absolute',
                        left: `${x}px`,
                        top: `${y}px`,
                        fontSize: '32px',
                        cursor: 'pointer',
                        zIndex: 10,
                        userSelect: 'none',
                        filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))',
                      }}
                    >
                      {emoji}
                    </div>
                  );
};

// 워드클라우드 모달 컴포넌트
const WordCloudModal = ({ isOpen, onClose, topic, responses }) => {
  const [wordCloudData, setWordCloudData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });

  useEffect(() => {
    if (isOpen && responses.length > 0) {
      generateWordCloud();
    }
  }, [isOpen, responses]);

  const generateWordCloud = async () => {
    setLoading(true);
    try {
      // 키워드와 문장을 분리하여 추출 (키워드 우선 분석) - 쉼표로 구분된 키워드 분리
      const allKeywords = responses
        .map(r => r.word)
        .flatMap(keyword => keyword
          .split(',')
          .map(k => normalizeKoreanWord(k))
          .filter(k => k.length > 0)
        )
        .join(', ');
      const allSentences = responses.map(r => r.sentence).join(' ');
      const allText = responses.map(r => `${r.word} ${r.sentence}`).join(' ');
      
      // Gemini API를 사용하여 총체적 키워드 추출 (키워드 우선 분석)
      const prompt = `
다음은 "${topic}" 주제에 대한 학생들의 응답입니다.

=== 학생들이 직접 제시한 핵심 키워드 ===
${allKeywords}

=== 학생들의 설명 문장 ===
${allSentences}

위 두 부분을 종합적으로 분석하여 가장 중요한 키워드들을 추출해주세요.
**특히 학생들이 직접 제시한 키워드는 높은 우선순위로 고려해주세요.**

제외/정규화 규칙(엄격 적용):
1) 조사 제거: 의, 는, 을, 를, 이, 가, 에, 로, 와, 과, 도, 만, 에서, 에게, 으로, 로서, 로써, 처럼, 까지, 부터 등은 단어 뒤에 붙어도 모두 제거
2) 어미/활용형 제거: 다, 했다, 했다가, 하고, 하면, 하며, 해서 등은 어간만 남김
3) 접속사/지시사/불용어 제외: 그리고, 하지만, 이, 그, 저, 여기, 것, 때, 곳, 수, 등, 및, 또는 등
4) 출력은 반드시 ‘명사 기본형’만, 쉼표로 구분해 나열

우선 추출해야 할 단어들:
1. **학생들이 직접 제시한 키워드 중 의미있는 것들 (최우선)**
   - 학생들이 입력한 모든 키워드는 반드시 포함해야 함
   - "곰", "호랑이" 등 구체적인 명사는 절대 제외하지 말 것
2. 역사적 인물, 지명, 사건명
3. 문화, 제도, 개념 관련 명사
4. ${topic}과 직접 관련된 중요한 키워드들

**중요**: 학생들이 직접 입력한 키워드는 의미가 있든 없든 반드시 포함해야 합니다.

응답 형식: 키워드1, 키워드2, 키워드3, ...
(최대 15개, 중요도 순으로 나열)
`;

      // 무료 API 키 호환성을 위해 여러 모델 시도
      let response;
      let text;
      
      try {
        // 1차 시도: gemini-1.5-flash (무료 API에서 주로 지원)
        response = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent(prompt);
        const result = await response.response;
        text = result.text().trim();
      } catch (flashError) {
        console.log('gemini-1.5-flash 모델 실패, gemini-pro 시도:', flashError);
        try {
          // 2차 시도: gemini-pro
          response = await genAI.getGenerativeModel({ model: "gemini-pro" }).generateContent(prompt);
          const result = await response.response;
          text = result.text().trim();
        } catch (proError) {
          console.log('gemini-pro 모델도 실패, 기본 모델 시도:', proError);
          // 3차 시도: 기본 모델명 없이 시도
          response = await genAI.getGenerativeModel({}).generateContent(prompt);
          const result = await response.response;
          text = result.text().trim();
        }
      }
      
      console.log('Gemini AI 응답:', text); // 디버깅용
      
      if (!text || text.length < 3) {
        throw new Error('Gemini API 응답이 비어있음');
      }
      
      // Gemini 응답에서 키워드 추출 (더 유연한 파싱)
      let extractedKeywords = [];
      
      // 쉼표로 분리 시도
      if (text.includes(',')) {
        extractedKeywords = text
          .split(',')
          .map(word => word.trim().replace(/\d+\./g, '').replace(/^-\s*/, '')) // 번호와 대시 제거
          .filter(word => word.length > 1 && !word.includes('\n') && !word.includes('키워드') && !word.includes('단어'))
          .slice(0, 15);
      }
      
      // 줄바꿈으로 분리 시도 (쉼표 분리 실패 시)
      if (extractedKeywords.length === 0 && text.includes('\n')) {
        extractedKeywords = text
          .split('\n')
          .map(word => word.trim().replace(/\d+\./g, '').replace(/^-\s*/, ''))
          .filter(word => word.length > 1 && !word.includes('키워드') && !word.includes('단어'))
          .slice(0, 15);
      }
      
      // 공백으로 분리 시도 (마지막 수단)
      if (extractedKeywords.length === 0) {
        extractedKeywords = text
          .split(/\s+/)
          .map(word => word.trim().replace(/[.,\n]/g, ''))
          .filter(word => word.length > 1)
          .slice(0, 15);
      }

      console.log('추출된 키워드:', extractedKeywords); // 디버깅용
      
      // Gemini API가 학생 키워드를 제대로 추출하지 못한 경우를 대비한 안전장치
      const studentKeywords = responses
        .map(r => normalizeKoreanWord(r.word))
        .filter(word => word.length > 0);
      const missingKeywords = studentKeywords.filter(keyword => 
        !extractedKeywords.some(extracted => 
          extracted.toLowerCase() === keyword.toLowerCase() || 
          extracted.includes(keyword) || 
          keyword.includes(extracted)
        )
      );
      
      if (missingKeywords.length > 0) {
        console.log('Gemini API에서 누락된 학생 키워드:', missingKeywords);
        // 누락된 키워드를 extractedKeywords에 추가
        extractedKeywords = [...extractedKeywords, ...missingKeywords];
        console.log('누락된 키워드 추가 후:', extractedKeywords);
      }

      if (extractedKeywords.length === 0) {
        throw new Error('키워드 추출 실패');
      }

      // 공통 규칙으로 빈도 계산 → 워드클라우드와 마인드맵 일치
      const stats = computeWordStats(responses);
      const wordData = {};
      stats.forEach(({ word, keywordCount, sentenceCount, totalScore }) => {
        wordData[word] = { totalScore, keywordCount, sentenceCount, keywordScore: keywordCount * 3 };
      });

      // 빈도순 정렬
      const sortedWords = Object.entries(wordData)
        .sort(([,a], [,b]) => b.totalScore - a.totalScore)
        .map(([word, data]) => ({
          word,
          count: data.totalScore,
          weight: data.totalScore,
          keywordCount: data.keywordCount,
          sentenceCount: data.sentenceCount,
          keywordScore: data.keywordScore
        }));

      setWordCloudData({
        keywords: sortedWords.length > 0 ? sortedWords : [
          { word: topic, weight: 10, count: 10 },
          { word: '역사', weight: 8, count: 8 },
          { word: '문화', weight: 6, count: 6 }
        ]
      });
    } catch (error) {
      console.error('Gemini API 워드클라우드 생성 오류:', error);
      
      // Gemini API 실패 시 강력한 폴백: 학생들이 입력한 키워드와 문장 분석
      console.log('Gemini API 실패, 학생 키워드 기반 강력한 폴백 시작');
      
      const allKeywords = responses
        .map(r => {
          const word = r.word.trim();
          // 긴 문장인 경우 키워드 정제
          if (word.length > 20) {
            return refineKeyword(word);
          }
          return word;
        })
        .flatMap(keyword => keyword.split(',').map(k => k.trim()).filter(k => k.length > 0));
      
      const allSentences = responses.map(r => {
        const sentence = r.sentence || '';
        // 긴 문장인 경우 키워드 정제
        if (sentence.length > 30) {
          return refineKeyword(sentence);
        }
        return sentence;
      }).join(' ');
      
      // 학생 키워드별 빈도 계산 (정규화 적용)
      const keywordFrequency = {};
      allKeywords.forEach(keyword => {
        const normalizedKey = normalizeKeyword(keyword);
        if (normalizedKey) {
          if (!keywordFrequency[normalizedKey]) {
            keywordFrequency[normalizedKey] = 0;
          }
          keywordFrequency[normalizedKey]++;
        }
      });
      
      // 문장에서도 키워드 등장 횟수 확인
      const sentenceFrequency = {};
      allKeywords.forEach(keyword => {
        const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = allSentences.match(regex);
        sentenceFrequency[keyword] = matches ? matches.length : 0;
      });
      
      console.log('키워드 빈도:', keywordFrequency);
      console.log('문장 빈도:', sentenceFrequency);
      
      // 워드클라우드 데이터 생성
      const fallbackKeywords = computeWordStats(responses)
        .map(({ word, keywordCount, sentenceCount, totalScore }) => ({
          word,
          count: totalScore,
          weight: totalScore,
          keywordCount,
          sentenceCount,
          keywordScore: keywordCount * 3,
        }))
        .sort((a, b) => b.count - a.count);

      setWordCloudData({
        keywords: fallbackKeywords.length > 0 ? fallbackKeywords : [
          { word: topic, weight: 10, count: 10, keywordCount: 0, sentenceCount: 0, keywordScore: 0 },
          { word: '역사', weight: 8, count: 8, keywordCount: 0, sentenceCount: 0, keywordScore: 0 },
          { word: '문화', weight: 6, count: 6, keywordCount: 0, sentenceCount: 0, keywordScore: 0 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '1000px',
        width: '95%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ×
        </button>
        
        <h2 style={{
          textAlign: 'center',
          marginBottom: '20px',
          color: KOREAN_HISTORY_TOPICS[topic]?.color || '#333',
          fontSize: '24px'
        }}>
          {KOREAN_HISTORY_TOPICS[topic]?.emoji} {topic} 워드클라우드
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div>🔄 AI가 키워드를 분석중입니다...</div>
          </div>
        ) : wordCloudData ? (
          <div style={{
            position: 'relative',
            padding: '40px',
            backgroundColor: '#f8f9fa',
            borderRadius: '15px',
            minHeight: '650px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {/* 깔끔한 배경 */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '300px',
              height: '300px',
              zIndex: 0,
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              borderRadius: '50%',
              opacity: '0.3'
            }} />
            
            {/* 워드클라우드 컨테이너 */}
            <div style={{
              position: 'relative',
              zIndex: 1,
              width: '800px',
              height: '500px',
              margin: '0 auto',
              left: '50%',
              transform: 'translateX(-50%)'
            }}>
              {(() => {
                // 최대 빈도와 최소 빈도 계산
                const maxCount = Math.max(...wordCloudData.keywords.map(k => k.count || k.weight));
                const minCount = Math.min(...wordCloudData.keywords.map(k => k.count || k.weight));
                const countRange = maxCount - minCount || 1;
                const totalKeywords = wordCloudData.keywords.length;

                // 겹침 방지를 위한 워드 위치 배열 (useMemo로 한 번만 계산)
                const placedWords = useMemo(() => {
                  const positions = [];
                  
                  wordCloudData.keywords.forEach((item, index) => {
                    const count = item.count || item.weight;
                    const fontSize = 14 + ((count - minCount) / countRange) * 28;
                    
                    // 워드크기 계산
                    const wordWidth = Math.max(16, item.word.length * fontSize * 0.7);
                    const wordHeight = fontSize + 4;
                    const wordRadius = Math.sqrt((wordWidth/2)**2 + (wordHeight/2)**2);
                    
                    // 겹침 방지를 위한 위치 계산
                    let x, y;
                    let attempts = 0;
                    const maxAttempts = 100;
                    
                    do {
                      if (attempts === 0) {
                        const baseRadius = Math.random() * 30;
                        const angle = Math.random() * 2 * Math.PI;
                        x = 400 + Math.cos(angle) * baseRadius;
                        y = 250 + Math.sin(angle) * baseRadius;
                      } else {
                        const expandRadius = 60 + (attempts * 8);
                        const angle = attempts * (2 * Math.PI * 0.618);
                        x = 400 + Math.cos(angle) * expandRadius;
                        y = 250 + Math.sin(angle) * expandRadius;
                      }
                      
                      // 경계 확인
                      if (x < 50 || x > 750 || y < 50 || y > 450) {
                        attempts++;
                        continue;
                      }
                      
                      // 겹침 확인
                      const hasOverlap = positions.some(pos => {
                        const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
                        const minDistance = wordRadius + pos.radius + 15; // 15px 여백으로 증가
                        return distance < minDistance;
                      });
                      
                      if (!hasOverlap) break;
                      attempts++;
                    } while (attempts < maxAttempts);
                    
                    // 위치 저장
                    positions.push({ x, y, radius: wordRadius, fontSize });
                  });
                  
                  return positions;
                }, [wordCloudData.keywords, minCount, countRange]);
                
                return wordCloudData.keywords.map((item, index) => {
                  const count = item.count || item.weight;
                  // 한국 전통 색상 팔레트: 단청, 태극, 한지 색상
                  const colors = ['#e74c3c', '#3498db', '#f39c12', '#27ae60', '#8e44ad', '#e67e22', '#16a085', '#c0392b'];
                  const color = colors[index % colors.length];
                  
                  // 폰트 크기 계산 (14px ~ 42px)로 더 조밀한 크기
                  const fontSize = 14 + ((count - minCount) / countRange) * 28;
                  
                  // 워드크기 계산 (겹침 방지용) - 더 정확한 계산
                  const wordWidth = Math.max(16, item.word.length * fontSize * 0.7);
                  const wordHeight = fontSize + 4; // 여백 추가
                  const wordRadius = Math.sqrt((wordWidth/2)**2 + (wordHeight/2)**2);
                  
                  // 겹침 방지를 위한 동적 위치 계산
                  let x, y;
                  let attempts = 0;
                  const maxAttempts = 100;
                  
                  // 이미 배치된 워드들의 위치 저장
                  const placedWords = [];
                  
                  do {
                    if (attempts === 0) {
                      // 첫 번째 시도: 중앙 근처에 배치
                      const baseRadius = Math.random() * 30;
                      const angle = Math.random() * 2 * Math.PI;
                      x = 400 + Math.cos(angle) * baseRadius;
                      y = 250 + Math.sin(angle) * baseRadius;
                                         } else {
                       // 겹침이 있는 경우: 중앙에서 점진적으로 확장
                       const expandRadius = 60 + (attempts * 8);
                       const angle = attempts * (2 * Math.PI * 0.618); // 황금각
                       x = 400 + Math.cos(angle) * expandRadius;
                       y = 250 + Math.sin(angle) * expandRadius;
                     }
                    
                    // 경계 내에 있는지 확인
                    if (x < 50 || x > 750 || y < 50 || y > 450) {
                      attempts++;
                      continue;
                    }
                    
                    // 겹침 확인
                    const hasOverlap = placedWords.some(placed => {
                      const distance = Math.sqrt((x - placed.x) ** 2 + (y - placed.y) ** 2);
                      const minDistance = wordRadius + placed.radius + 12; // 12px 여백으로 증가
                      return distance < minDistance;
                    });
                    
                    if (!hasOverlap) {
                      break;
                    }
                    
                    attempts++;
                  } while (attempts < maxAttempts);
                  
                  // 위치 저장
                  placedWords.push({ x, y, radius: wordRadius });
                  
                  // 정적 위치 사용으로 위치 저장 불필요
                  
                  return (
                    <div
                      key={index}
                      data-original-x={x}
                      data-original-y={y}
                      style={{
                        position: 'absolute',
                        left: `${x}px`,
                        top: `${y}px`,
                        transform: 'translate(-50%, -50%)',
                        '--original-x': `${x}px`,
                        '--original-y': `${y}px`,
                        fontSize: `${fontSize}px`,
                        color: color,
                        fontWeight: count >= maxCount * 0.8 ? '900' : 
                                   count >= maxCount * 0.6 ? 'bold' : 
                                   count >= maxCount * 0.4 ? '600' : 'normal',
                        fontFamily: "'Noto Sans KR', 'Malgun Gothic', sans-serif",
                        textShadow: `2px 2px 4px rgba(0,0,0,0.3)`,
                        cursor: 'default',
                        userSelect: 'none',
                        transition: 'transform 0.3s ease-out, filter 0.3s ease-out, text-shadow 0.3s ease-out',
                        zIndex: count >= maxCount * 0.6 ? 3 : 2,
                        filter: count >= maxCount * 0.8 ? 'drop-shadow(0 0 15px rgba(231, 76, 60, 0.6))' : 'none',
                        animation: `float ${2 + index * 0.2}s ease-in-out infinite`
                      }}
                      onMouseEnter={(e) => {
                        // 호버 시 애니메이션만 정지하고 위치는 절대 고정
                        e.target.style.setProperty('animation', 'none', 'important');
                        e.target.style.setProperty('animation-play-state', 'paused', 'important');
                        
                        // 원래 위치를 절대적으로 고정 (CSS 변수 사용) - !important로 강제 고정
                        e.target.style.setProperty('position', 'absolute', 'important');
                        e.target.style.setProperty('left', `var(--original-x)`, 'important');
                        e.target.style.setProperty('top', `var(--original-y)`, 'important');
                        
                        // 확대 효과만 적용 (위치 변화 없음) - !important로 강제 고정
                        e.target.style.setProperty('transform', 'translate(-50%, -50%) scale(1.1)', 'important');
                        e.target.style.textShadow = `3px 3px 6px rgba(0,0,0,0.4)`;
                        e.target.style.filter = 'brightness(1.2) drop-shadow(0 0 12px rgba(231, 76, 60, 0.6))';
                        
                        // 커스텀 툴팁 표시 (안정적인 위치 계산)
                        const rect = e.target.getBoundingClientRect();
                        const modalElement = e.currentTarget.closest('div[style*="backgroundColor: white"]');
                        
                        if (modalElement) {
                          const modalRect = modalElement.getBoundingClientRect();
                          setTooltip({
                            show: true,
                            content: `🔍 "${item.word}" 상세 정보

📊 총 점수: ${count}점
📝 키워드: ${item.keywordCount || 0}회
💬 문장: ${item.sentenceCount || 0}회

🎯 중요도: ${count >= maxCount * 0.8 ? '매우 높음' : count >= maxCount * 0.6 ? '높음' : count >= maxCount * 0.4 ? '보통' : '낮음'}`,
                            x: Math.max(10, Math.min(window.innerWidth - 320, rect.left + rect.width / 2)),
                            y: Math.max(10, rect.top - 10)
                          });
                        } else {
                          setTooltip({
                            show: true,
                            content: `🔍 "${item.word}" 상세 정보

📊 총 점수: ${count}점
📝 키워드: ${item.keywordCount || 0}회
💬 문장: ${item.sentenceCount || 0}회

🎯 중요도: ${count >= maxCount * 0.8 ? '매우 높음' : count >= maxCount * 0.6 ? '높음' : count >= maxCount * 0.4 ? '보통' : '낮음'}`,
                            x: Math.max(10, Math.min(window.innerWidth - 320, rect.left + rect.width / 2)),
                            y: Math.max(10, rect.top - 10)
                          });
                        }
                      }}
                      onMouseLeave={(e) => {
                        // 애니메이션 재시작 및 원래 상태 완벽 복원
                        e.target.style.setProperty('animation', `float ${2 + index * 0.2}s ease-in-out infinite`, 'important');
                        e.target.style.setProperty('animation-play-state', 'running', 'important');
                        
                        // 원래 위치와 상태로 완벽 복원 (CSS 변수 사용) - !important로 강제 고정
                        e.target.style.setProperty('position', 'absolute', 'important');
                        e.target.style.setProperty('left', `var(--original-x)`, 'important');
                        e.target.style.setProperty('top', `var(--original-y)`, 'important');
                        e.target.style.setProperty('transform', 'translate(-50%, -50%) scale(1)', 'important');
                        e.target.style.textShadow = `2px 2px 4px rgba(0,0,0,0.3)`;
                        e.target.style.filter = count >= maxCount * 0.8 ? 'drop-shadow(0 0 10px rgba(231, 76, 60, 0.5))' : 'none';
                        
                        // 툴팁 숨기기
                        setTooltip({ show: false, content: '', x: 0, y: 0 });
                      }}
                    >
                      {item.word}
                    </div>
                  );
                });
              })()}
            </div>
            
            {/* 커스텀 툴팁 */}
            {tooltip.show && (
              <div style={{
                position: 'fixed',
                left: Math.max(10, Math.min(window.innerWidth - 320, tooltip.x)),
                top: Math.max(10, tooltip.y),
                backgroundColor: 'rgba(0,0,0,0.95)',
                color: 'white',
                padding: '16px 20px',
                borderRadius: '12px',
                fontSize: '15px',
                whiteSpace: 'pre-line',
                zIndex: 1001,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                border: '2px solid rgba(255,255,255,0.3)',
                maxWidth: '320px',
                pointerEvents: 'none',
                backdropFilter: 'blur(8px)',
                fontFamily: "'Noto Sans KR', 'Malgun Gothic', sans-serif",
                lineHeight: '1.6'
              }}>
                {tooltip.content}
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '8px solid rgba(0,0,0,0.95)'
                }} />
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div>데이터를 불러오는 중...</div>
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <h3>학생 응답 ({responses.length}개)</h3>
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {responses.map((response, index) => (
              <div key={index} style={{
                padding: '10px',
                margin: '5px 0',
                backgroundColor: '#f0f0f0',
                borderRadius: '8px',
                borderLeft: `4px solid ${KOREAN_HISTORY_TOPICS[topic]?.color || '#333'}`
              }}>
                <strong>{response.studentName}:</strong> {response.word}
                <br />
                <small style={{ color: '#666' }}>{response.sentence}</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { 
            transform: translate(-50%, -50%) translateY(0px) rotate(0deg); 
          }
          25% { 
            transform: translate(-50%, -50%) translateY(-8px) rotate(1deg); 
          }
          50% { 
            transform: translate(-50%, -50%) translateY(-15px) rotate(0deg); 
          }
          75% { 
            transform: translate(-50%, -50%) translateY(-8px) rotate(-1deg); 
          }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// 응답 입력 모달
const ResponseModal = ({ isOpen, onClose, topic, onSubmit }) => {
  const [studentName, setStudentName] = useState('');
  const [word, setWord] = useState('');
  const [sentence, setSentence] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (studentName.trim() && word.trim() && sentence.trim()) {
      // 쉼표로 구분된 키워드를 하나의 응답으로 처리
      const cleanWord = word.trim();
      const cleanSentence = sentence.trim();
      
      onSubmit({
        studentName: studentName.trim(),
        word: cleanWord, // 쉼표 포함된 전체 키워드
        sentence: cleanSentence,
        timestamp: Date.now()
      });
      
      setStudentName('');
      setWord('');
      setSentence('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '30px',
        maxWidth: '500px',
        width: '90%',
        position: 'relative',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ×
        </button>

        <h2 style={{
          textAlign: 'center',
          marginBottom: '20px',
          color: KOREAN_HISTORY_TOPICS[topic]?.color || '#333'
        }}>
          {KOREAN_HISTORY_TOPICS[topic]?.emoji} {topic} 응답하기
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              학생 이름
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: `2px solid ${KOREAN_HISTORY_TOPICS[topic]?.color || '#ddd'}`,
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="이름을 입력하세요"
              required
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              생각나는 키워드
            </label>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: `2px solid ${KOREAN_HISTORY_TOPICS[topic]?.color || '#ddd'}`,
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="단어가 여러 개인 경우에는 ,로 구분해주세요"
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              생각한 문장
            </label>
            <textarea
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: `2px solid ${KOREAN_HISTORY_TOPICS[topic]?.color || '#ddd'}`,
                borderRadius: '8px',
                fontSize: '16px',
                minHeight: '80px',
                resize: 'vertical'
              }}
              placeholder="자세한 생각을 문장으로 적어주세요"
              required
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: KOREAN_HISTORY_TOPICS[topic]?.color || '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            응답 제출하기
          </button>
        </form>
      </div>
    </div>
  );
};

// 응답 확인 모달 (떠다니는 이모지 포함)
const ResponsesViewModal = ({ isOpen, onClose, topic, responses, onShowWordCloud, onAddResponse, onEmojiClick }) => {
  const modalRef = useRef(null);

  const topicData = KOREAN_HISTORY_TOPICS[topic] || {};

  // 랜덤 위치를 한 번만 생성 (useMemo 사용) - 보드 전체 영역 균등 분산
  const randomPositions = useMemo(() => {
    if (responses.length === 0) return [];
    
    const boardWidth = window.innerWidth > 1200 ? 1000 : 900;
    const boardHeight = 500;
    
    // 보드 전체 영역을 균등하게 분할하여 랜덤 위치 생성 (오른쪽 영역 강제 활용)
    return responses.map((_, index) => {
      // 보드 전체 영역을 균등하게 활용 (경계를 극한으로 넓게)
      const x = 10 + Math.random() * (boardWidth - 20); // 10 ~ boardWidth-10
      const y = 10 + Math.random() * (boardHeight - 20); // 10 ~ boardHeight-10
      
      return { x, y };
    });
  }, [responses.length]); // responses.length가 변경될 때만 재계산

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div 
        ref={modalRef}
        style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '30px',
          maxWidth: '1200px',
          width: '95%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ×
        </button>

        <h2 style={{
          textAlign: 'center',
          marginBottom: '20px',
          color: topicData.color || '#333',
          fontSize: '24px'
        }}>
          {topicData.emoji} {topic} 응답 확인
        </h2>

        {/* 떠다니는 이모지 영역 */}
        <div style={{
          position: 'relative',
          height: '500px',
          backgroundColor: '#f8f9fa',
          borderRadius: '15px',
          marginBottom: '20px',
          overflow: 'hidden',
          border: `3px solid ${topicData.color || '#ddd'}`
        }}>
          {responses.length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#666',
              fontSize: '18px'
            }}>
              아직 응답이 없습니다
            </div>
          ) : (
            responses.map((response, index) => {
              // 미리 생성된 랜덤 위치 사용
              const position = randomPositions[index];
              const x = position.x;
              const y = position.y;

              return (
                <div key={`${topic}-${index}`}>
                  <FloatingEmoji
                    emoji={topicData.emoji}
                    response={response}
                    onClick={() => onEmojiClick(response)}
                    x={x}
                    y={y}
                    delay={index}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* 액션 버튼들 */}
        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <button
            onClick={onAddResponse}
            style={{
              padding: '10px 20px',
              backgroundColor: topicData.color || '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ✏️ 응답 추가하기
          </button>
          
          {responses.length > 0 && (
            <button
              onClick={onShowWordCloud}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ☁️ 워드클라우드 보기
            </button>
          )}
        </div>

        {/* 응답 목록 */}
        {responses.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3>학생 응답 ({responses.length}개)</h3>
            <div style={{ maxHeight: '200px', overflow: 'auto' }}>
              {responses.map((response, index) => (
                <div key={index} style={{
                  padding: '10px',
                  margin: '5px 0',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${topicData.color || '#333'}`
                }}>
                  <strong>{response.studentName}:</strong> {response.word}
                  <br />
                  <small style={{ color: '#666' }}>{response.sentence}</small>
                  <br />
                  <small style={{ color: '#999' }}>
                    {new Date(response.timestamp).toLocaleString()}
                  </small>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 응답 상세보기 모달 (개별 응답용)
const ResponseDetailModal = ({ isOpen, onClose, response }) => {
  if (!isOpen || !response) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex: 1001,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '30px',
        maxWidth: '400px',
        width: '90%',
        position: 'relative',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ×
        </button>

        <h3 style={{ marginBottom: '20px', color: '#333' }}>
          📝 {response.studentName}의 응답
        </h3>

        <div style={{
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '10px',
          marginBottom: '15px'
        }}>
          <div style={{ marginBottom: '10px' }}>
            <strong>키워드:</strong> {response.word}
          </div>
          <div>
            <strong>문장:</strong> {response.sentence}
          </div>
        </div>

        <div style={{
          fontSize: '12px',
          color: '#666',
          textAlign: 'center'
        }}>
          {new Date(response.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

const KoreanHistoryMindMapPage = () => {
  const navigate = useNavigate();
  const { classId } = useParams();

  // 페이지 진입 시 항상 상단으로 스크롤하여 헤더+타이틀이 보이도록 고정
  useEffect(() => {
    // 즉시, next frame, 약간의 지연 2단계로 보장
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
    const t = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, 150);
    return () => clearTimeout(t);
  }, []);
  const [responses, setResponses] = useState({});
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showResponsesViewModal, setShowResponsesViewModal] = useState(false);
  const [showWordCloudModal, setShowWordCloudModal] = useState(false);
  const [showResponseDetail, setShowResponseDetail] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  
  // D3.js Force Simulation 기반 완벽한 유기체적 시스템
  // Force Graph 관련 상태
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [graphRef, setGraphRef] = useState(null);

  // Firestore 실시간 동기화
  // - classId가 있으면 해당 학급 경로 구독
  // - 없으면 '단일 저장소' 경로 구독 (/korean-history-mindmap 전용)
  useEffect(() => {
    let unsubscribe = () => {};
    if (classId) {
      unsubscribe = onSnapshot(
        doc(db, 'mindmap_classes', classId, 'responses', 'data'),
        (snap) => {
          if (snap.exists()) {
            setResponses(snap.data());
          } else {
            setResponses({});
          }
        }
      );
    } else {
      unsubscribe = onSnapshot(
        doc(db, 'koreanHistoryMindMap', 'responses'),
        (snap) => {
          if (snap.exists()) {
            setResponses(snap.data());
          } else {
            setResponses({});
          }
        }
      );
    }
    return () => unsubscribe();
  }, [classId]);

  // 응답 제출 처리 (classId별로 분리)
  const handleSubmitResponse = async (responseData) => {
    try {
      if (classId) {
        // 학급 경로 저장 (허브용)
        const classRef = doc(db, 'mindmap_classes', classId, 'responses', 'data');
        const classSnap = await getDoc(classRef);
        const classData = classSnap.exists() ? classSnap.data() : {};
        const classTopicArray = Array.isArray(classData[selectedTopic])
          ? classData[selectedTopic]
          : [];
        await setDoc(
          classRef,
          { [selectedTopic]: [...classTopicArray, responseData] },
          { merge: true }
        );

        // 선택: 전역 집계에도 누적 유지 (원하실 때 제거 가능)
        try {
          const globalRef = doc(db, 'mindmap_global', 'responses');
          const globalSnap = await getDoc(globalRef);
          const globalData = globalSnap.exists() ? globalSnap.data() : {};
          const mergedTopicArray = Array.isArray(globalData[selectedTopic])
            ? [...globalData[selectedTopic], responseData]
            : [responseData];
          await setDoc(globalRef, { [selectedTopic]: mergedTopicArray }, { merge: true });
        } catch (e) {
          console.error('전역 집계 누적 실패:', e);
        }

        // 추가: 단일 마인드맵에도 동시에 누적 (/korean-history-mindmap)
        try {
          const singleRefMirror = doc(db, 'koreanHistoryMindMap', 'responses');
          const singleSnapMirror = await getDoc(singleRefMirror);
          const singleDataMirror = singleSnapMirror.exists() ? singleSnapMirror.data() : {};
          const mergedSingleTopicArray = Array.isArray(singleDataMirror[selectedTopic])
            ? [...singleDataMirror[selectedTopic], responseData]
            : [responseData];
          await setDoc(singleRefMirror, { [selectedTopic]: mergedSingleTopicArray }, { merge: true });
        } catch (e) {
          console.error('단일 페이지 누적 실패:', e);
        }
      } else {
        // 단일 저장소 저장 (/korean-history-mindmap 전용) - 기존 단일 DB 경로로 복원
        const singleRef = doc(db, 'koreanHistoryMindMap', 'responses');
        const singleSnap = await getDoc(singleRef);
        const singleData = singleSnap.exists() ? singleSnap.data() : {};
        const singleTopicArray = Array.isArray(singleData[selectedTopic])
          ? singleData[selectedTopic]
          : [];
        await setDoc(
          singleRef,
          { [selectedTopic]: [...singleTopicArray, responseData] },
          { merge: true }
        );
      }
    } catch (error) {
      console.error('응답 저장 오류:', error);
    }
  };

  // 토픽 클릭 처리 (응답 확인 모달 열기)
  const handleTopicClick = (topic) => {
    setSelectedTopic(topic);
    setShowResponsesViewModal(true);
  };

  // 응답 추가하기 버튼 클릭
  const handleAddResponse = () => {
    setShowResponsesViewModal(false);
    setShowResponseModal(true);
  };

  // 워드클라우드 보기
  const handleShowWordCloud = () => {
    setShowResponsesViewModal(false);
    setShowWordCloudModal(true);
  };

  // 이모지 클릭 처리
  const handleEmojiClick = (response) => {
    setSelectedResponse(response);
    setShowResponseDetail(true);
  };



  // 키워드 빈도 분석 함수 (실제 등장 횟수 기준) - 수정됨
  const analyzeKeywordFrequency = useCallback((topicResponses) => {
    if (!topicResponses || topicResponses.length === 0) return [];
    const stats = computeWordStats(topicResponses);
    const frequent = stats
      .filter((s) => s.totalScore >= 5)
      .sort((a, b) => b.totalScore - a.totalScore)
      .map(({ word, totalScore, keywordCount, sentenceCount }) => ({
        keyword: word,
        count: totalScore,
        keywordCount,
        sentenceCount,
      }));
    // 환웅 보정
    if (!frequent.some((k) => k.keyword === '환웅')) {
      const h = stats.find((s) => s.word === '환웅');
      if (h && h.totalScore >= 5) {
        frequent.push({ keyword: '환웅', count: h.totalScore, keywordCount: h.keywordCount, sentenceCount: h.sentenceCount });
      }
    }
    return frequent;
  }, []);

  // Force Graph 데이터 메모이제이션
  const graphDataMemo = useMemo(() => {
    const centerNode = {
      id: 'korean-history',
      name: '한국사',
      type: 'center',
      emoji: '🏛️',
      color: '#4a90e2',
      val: 35,
      x: -200, // 화면 중앙에서 좌측으로 이동
      y: 0,
      fx: -200,
      fy: 0
    };

    // 소주제(5개)를 360/5=72도 간격으로 균등 배치 (중앙 기준 원형)
    const topicOrder = ['고조선', '근현대', '삼국시대', '고려시대', '조선시대'];
    const angleStep = (2 * Math.PI) / 5; // 72도
    const startAngle = -Math.PI / 2; // 위쪽에서 시작
    const topicRadius = 300;

    const topicNodes = topicOrder.map((topicName, index) => {
      const topicData = KOREAN_HISTORY_TOPICS[topicName];
      const angle = startAngle + index * angleStep;
      const tx = centerNode.fx + Math.cos(angle) * topicRadius;
      const ty = centerNode.fy + Math.sin(angle) * topicRadius;
      return {
        id: topicName,
        name: topicName,
        type: 'topic',
        emoji: topicData.emoji,
        color: topicData.color,
        val: 28,
        x: tx,
        y: ty,
        fx: tx,
        fy: ty
      };
    });

    // 키워드 노드 생성 (5회 이상 등장하는 키워드)
    const keywordNodes = [];
    const keywordLinks = [];
    
    Object.entries(KOREAN_HISTORY_TOPICS).forEach(([topicName, topicData], topicIndex) => {
      const topicResponses = responses[topicName] || [];
      const frequentKeywords = analyzeKeywordFrequency(topicResponses);
      
      // 디버깅: 각 토픽별 키워드 분석 결과 출력
      console.log(`토픽 "${topicName}" 키워드 분석:`, {
        응답수: topicResponses.length,
        빈번키워드: frequentKeywords,
        전체응답: topicResponses
      });
      
      frequentKeywords.forEach((keywordData, keywordIndex) => {
        // 디버깅: 각 키워드 노드 생성 정보 출력
        console.log(`키워드 노드 생성: "${keywordData.keyword}" (${keywordData.count}회) - ${topicName}`);
        
        // 10회 이상일 때 색상 강조
        const isHighFrequency = keywordData.count >= 10;
        const keywordColor = isHighFrequency ? '#FFD700' : '#FF6B9D'; // 10회 이상: 금색, 5-9회: 분홍색
        const keywordSize = isHighFrequency ? 25 : 20; // 10회 이상: 크게
        
        const keywordNode = {
          id: `${topicName}-${keywordData.keyword}`,
          name: keywordData.keyword,
          type: 'keyword',
          emoji: isHighFrequency ? '🔥' : '🔑', // 10회 이상: 🔥, 5-9회: 🔑
          color: keywordColor,
          val: keywordSize,
          count: keywordData.count,
          parentTopic: topicName,
          isHighFrequency: isHighFrequency
        };
        
        // 방사형 배치로 키워드 노드 겹침 방지 (좌측 중심)
        const topicNode = topicNodes[topicIndex];
        
        // 방사형 배치 함수 (진짜 중심부 반대 방향으로 배치)
        const createRadialPositions = (topicX, topicY, keywords, centerNodeX, centerNodeY, baseRadius = 100) => {
          const positions = {};
          const numKeywords = keywords.length;
          if (numKeywords === 0) return positions;

          // 중심부(한국사)에서 토픽 노드로의 방향 계산
          const topicAngle = Math.atan2(topicY - centerNodeY, topicX - centerNodeX);
          
          // 중심부 반대 방향으로 120도 범위에 키워드들을 분산 배치
          const spreadAngle = (8 * Math.PI) / 9; // 160도로 더 넓게 분산
          const startAngle = topicAngle - spreadAngle / 2; // 중심부 반대 방향 (Math.PI 제거)
          const angleStep = spreadAngle / numKeywords;

          keywords.forEach((keyword, index) => {
            const currentAngle = startAngle + index * angleStep;
            // 각 키워드마다 거리를 점진적으로 증가시켜 겹침 방지
            const radius = baseRadius + (index * 20);
            
            let x = topicX + Math.cos(currentAngle) * radius;
            let y = topicY + Math.sin(currentAngle) * radius;
            
            // "오물풍신" 특별 위치 조정 (근현대 쪽으로 이동)
            if (keyword === '오물풍신') {
              // 근현대 노드 근처로 이동하여 구분 개선
              x = -150; // 근현대와 고조선 사이 중간 지점
              y = -120; // 약간 위쪽으로 조정
            }
            
            positions[keyword] = { x, y };
          });
          
          return positions;
        };
        
        // 각 시대별 키워드들을 방사형으로 배치 (중심부 반대 방향)
        const keywordPositions = {
          '고조선': createRadialPositions(-375, -100, [
            '곰', '호랑이', '단군', '웅녀', '환웅', '오물풍산', '단군왕검', '마블'
          ], -200, 0), // 중심부 좌표 (-200, 0) 전달
          '삼국시대': createRadialPositions(-25, -100, [
            '고구려', '백제', '신라', '곰이', '전두환'
          ], -200, 0),
          '고려시대': createRadialPositions(-25, 100, [
            '고려청자', '왕건', '고려청시', '팔만대장경'
          ], -200, 0),
          '조선시대': createRadialPositions(-375, 100, [
            '세종대왕', '이순신', '경국대전', '훈민정음'
          ], -200, 0),
          '근현대': createRadialPositions(-200, -175, [
            '일제강점기', '광복', '한국전쟁', '민주화', '전두환'
          ], -200, 0)
        };
        
        // 해당 토픽의 키워드 위치가 있으면 사용, 없으면 자동 계산
        const topicKeywordPositions = keywordPositions[topicName] || {};
        const keywordPosition = topicKeywordPositions[keywordData.keyword];
        
        if (keywordPosition) {
          // 수동 위치 사용
          keywordNode.x = keywordPosition.x;
          keywordNode.y = keywordPosition.y;
        } else {
          // 자동 위치 계산 (충돌 방지 로직 강화)
          const keywordAngle = (keywordIndex * 2 * Math.PI) / Math.max(frequentKeywords.length, 1);
          const baseRadius = 120; // 기본 거리 추가 증가
          const collisionRadius = 70; // 충돌 방지 반지름 확대
          
          // 충돌 방지를 위한 안전한 위치 찾기
          let safeX, safeY;
          let attempts = 0;
          const maxAttempts = 10;
          
          do {
            const radius = baseRadius + (attempts * 20); // 시도할 때마다 거리 증가
            safeX = topicNode.x + Math.cos(keywordAngle) * radius;
            safeY = topicNode.y + Math.sin(keywordAngle) * radius;
            
            // 기존 노드들과의 충돌 검사
            const hasCollision = [...topicNodes, ...keywordNodes].some(existingNode => {
              if (existingNode.id === keywordNode.id) return false;
              const distance = Math.sqrt(
                Math.pow(safeX - existingNode.x, 2) + Math.pow(safeY - existingNode.y, 2)
              );
              return distance < collisionRadius;
            });
            
            if (!hasCollision) break;
            attempts++;
          } while (attempts < maxAttempts);
          
          keywordNode.x = safeX;
          keywordNode.y = safeY;
        }
        
        keywordNode.fx = keywordNode.x;
        keywordNode.fy = keywordNode.y;
        
        keywordNodes.push(keywordNode);
        
        // 토픽 노드와 키워드 노드 연결
        keywordLinks.push({
          source: topicName,
          target: keywordNode.id,
          color: '#FFB6C1',
          width: 1.5
        });
      });
    });

    // 1차 배치 이후 키워드 간 자동 충돌 해소(겹침 방지) — 가벼운 반복 이완 알고리즘
    const relaxKeywordCollisions = (nodes, iterations = 2) => {
      for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            // 같은 위치 혹은 매우 가까운 경우 무한대 방지
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (!dist) {
              dist = 0.001;
              dx = 0.001;
              dy = 0.001;
            }
            // 노드 크기(반지름) + 마진(20) 기준 최소 거리 산정
            const minDist = (a.val || 18) + (b.val || 18) + 20;
            if (dist < minDist) {
              const overlap = (minDist - dist) / 2;
              const nx = dx / dist;
              const ny = dy / dist;
              a.x -= nx * overlap;
              a.y -= ny * overlap;
              b.x += nx * overlap;
              b.y += ny * overlap;
            }
          }
        }
      }
      // 위치 고정
      nodes.forEach((n) => { n.fx = n.x; n.fy = n.y; });
    };

    // 토픽별로 키워드 그룹화
    const keywordsByTopic = {};
    keywordNodes.forEach((n) => {
      if (!keywordsByTopic[n.parentTopic]) keywordsByTopic[n.parentTopic] = [];
      keywordsByTopic[n.parentTopic].push(n);
    });

    // 클러스터 반경 계산 및 토픽별 정렬(부채꼴 격자) + 내부 충돌 해소
    const topicPosMap = Object.fromEntries(topicNodes.map(t => [t.id, t]));
    const clusterRadiusByTopic = {};
    Object.keys(keywordsByTopic).forEach((topicName) => {
      const clusterNodes = keywordsByTopic[topicName];
      const topicCenter = topicPosMap[topicName] || { x: 0, y: 0 };
      const clusterRadius = 200 + clusterNodes.length * 6; // 키워드 수에 비례해 반경 확대
      clusterRadiusByTopic[topicName] = clusterRadius;

      // 부채꼴 그리드 정렬: 중심 반대 방향을 기준으로 외곽으로 여러 링과 슬롯에 배치
      const baseAngle = Math.atan2(topicCenter.y - 0, topicCenter.x - (-200)); // 중심(한국사:-200,0)에서의 각도
      const spread = Math.PI * 0.9; // 162도 범위에 정렬
      const slotsPerRing = 12; // 링당 슬롯 수(균등 간격)
      const ringGap = 46; // 링 간 거리(겹침 방지용 확대)
      const startRadius = 140; // 첫 링 반지름(소주제에서 더 띄움)

      clusterNodes.forEach((n, idx) => {
        const ring = Math.floor(idx / slotsPerRing);
        const posInRing = idx % slotsPerRing;
        const angle = baseAngle + (-spread / 2) + (spread * (posInRing / Math.max(slotsPerRing - 1, 1)));
        const r = startRadius + ring * ringGap;
        n.x = topicCenter.x + Math.cos(angle) * Math.min(r, clusterRadius);
        n.y = topicCenter.y + Math.sin(angle) * Math.min(r, clusterRadius);
      });

      // 군집 내부 충돌 해소
      relaxKeywordCollisions(clusterNodes, 3);
    });

    // 토픽 노드에 클러스터 반경 저장(배경 표시용)
    topicNodes.forEach((t) => { t.clusterRadius = clusterRadiusByTopic[t.id] || 220; });

    const allNodes = [centerNode, ...topicNodes, ...keywordNodes];
    const allLinks = [
      ...topicNodes.map(topic => ({
        source: 'korean-history',
        target: topic.id,
        color: '#666'
      })),
      ...keywordLinks
    ];

    return { nodes: allNodes, links: allLinks };
  }, [responses, analyzeKeywordFrequency]);

  // Force Graph 초기화
  useEffect(() => {
    setGraphData(graphDataMemo);
  }, [graphDataMemo]);

  // Force Graph 드래그 및 상호작용 설정
  const [isDragging, setIsDragging] = useState(false);
  
  const handleNodeDragStart = useCallback((node) => {
    setIsDragging(true);
    // 개발 모드에서만 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.log('드래그 시작:', node.id);
    }
  }, []);
  
  const handleNodeDrag = useCallback((node, translate) => {
    // 드래그 중에는 로그 출력 안함 (성능 최적화)
    // console.log('노드 드래그:', node.id, translate);
  }, []);
  
  const handleNodeDragEnd = useCallback((node) => {
    setIsDragging(false);
    // 드래그 후 위치 고정 (중앙 노드 제외)
    if (node.type !== 'center') {
      node.fx = node.x;
      node.fy = node.y;
      // 그래프 데이터 업데이트를 위해 강제 리렌더링
      setGraphData(prevData => ({ ...prevData }));
    }
    // 개발 모드에서만 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.log('드래그 종료:', node.id, '위치 고정:', { x: node.x, y: node.y });
    }
  }, []);

  const handleNodeClick = useCallback((node) => {
    // 노드 클릭 시 처리
    if (node.type === 'topic') {
      handleTopicClick(node.name);
    } else if (node.type === 'keyword') {
      // 키워드 노드 클릭 시 해당 토픽의 워드클라우드 모달 열기
      setSelectedTopic(node.parentTopic);
      setShowWordCloudModal(true);
    }
  }, []);



  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: window.innerWidth <= 768 ? '10px' : '20px',
      fontFamily: 'Arial, sans-serif',
      overflowX: 'hidden'
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: window.innerWidth <= 768 ? '20px' : '30px',
        flexWrap: window.innerWidth <= 768 ? 'wrap' : 'nowrap'
      }}>
        <button
          onClick={() => navigate('/mindmap-hub')}
          style={{
            padding: window.innerWidth <= 768 ? '8px 16px' : '10px 20px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '20px',
            color: 'white',
            cursor: 'pointer',
            fontSize: window.innerWidth <= 768 ? '12px' : '14px',
            minWidth: window.innerWidth <= 768 ? 'auto' : '120px',
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.3)',
            }
          }}
        >
          🏠 허브로
        </button>
        
        {/* 링크 복사 버튼 */}
        <button
          onClick={() => {
            const currentUrl = window.location.href;
            navigator.clipboard.writeText(currentUrl).then(() => {
              alert('마인드맵 링크가 클립보드에 복사되었습니다! 📋');
            }).catch(() => {
              alert('링크 복사에 실패했습니다. 수동으로 복사해주세요.');
            });
          }}
          style={{
            padding: window.innerWidth <= 768 ? '8px 16px' : '10px 20px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '20px',
            color: 'white',
            cursor: 'pointer',
            fontSize: window.innerWidth <= 768 ? '12px' : '14px',
            minWidth: window.innerWidth <= 768 ? 'auto' : '120px',
            transition: 'all 0.3s ease',
            marginLeft: '10px',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.3)',
            }
          }}
        >
          📋 링크 복사
        </button>
        <h1 style={{
          color: 'white',
          textAlign: 'center',
          fontSize: window.innerWidth <= 768 ? '20px' : '28px',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          margin: window.innerWidth <= 768 ? '10px 0' : '0',
          flex: '1'
        }}>
          🇰🇷 우리나라 역사 마인드맵
        </h1>
        <div style={{ width: window.innerWidth <= 768 ? '0px' : '100px' }} />
      </div>

      {/* 중앙 제목 */}
      <div style={{
        textAlign: 'center',
        marginBottom: window.innerWidth <= 768 ? '30px' : '50px'
      }}>
        <div style={{
          fontSize: window.innerWidth <= 768 ? '36px' : '48px',
          marginBottom: '10px'
        }}>
          🏛️
        </div>
        <h2 style={{
          color: 'white',
          fontSize: window.innerWidth <= 768 ? '24px' : '32px',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          margin: 0
        }}>
          우리나라 역사
        </h2>
        
        {/* 시대별 입력 안내문구 */}
        <div style={{
          textAlign: 'center',
          marginTop: '15px',
          color: 'rgba(255,255,255,0.8)',
          fontSize: window.innerWidth <= 768 ? '14px' : '16px',
          lineHeight: '1.5',
          textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
          padding: window.innerWidth <= 768 ? '0 10px' : '0'
        }}>
          💡 <strong>고조선</strong>, <strong>고려시대</strong>, <strong>조선시대</strong>, <strong>삼국시대</strong>, <strong>근현대</strong> 시대 원을 클릭하여<br/>
          {window.innerWidth <= 768 ? '여러분의 생각을 입력해보세요! 🎯' : '여러분의 생각을 입력해보세요! 🎯'}
        </div>
      </div>

      {/* React Force Graph 기반 완벽한 유기체적 마인드맵 */}
      <div 
        id="mindmap-container"
        style={{
          position: 'relative',
          maxWidth: window.innerWidth <= 768 ? '95vw' : '1000px',
          margin: '0 auto',
          height: window.innerWidth <= 768 ? '70vh' : '800px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: window.innerWidth <= 768 ? '15px' : '20px',
          padding: window.innerWidth <= 768 ? '20px' : '40px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          overflow: 'hidden'
        }}
      >
                  <ForceGraph2D
            ref={setGraphRef}
            graphData={graphData}
            nodeLabel={(node) => `<div style="
              background: rgba(0,0,0,0.8);
              color: white;
              padding: ${window.innerWidth <= 768 ? '8px 12px' : '12px 16px'};
              border-radius: 8px;
              font-size: ${window.innerWidth <= 768 ? '14px' : '18px'};
              font-weight: bold;
              border: 2px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              white-space: nowrap;
              z-index: 1000;
              max-width: ${window.innerWidth <= 768 ? '200px' : '300px'};
            ">${node.emoji} ${node.name}</div>`}
            nodeColor={(node) => node.color}
            nodeVal={(node) => window.innerWidth <= 768 ? Math.max(node.val * 0.8, 15) : node.val}
            linkColor={(link) => link.color}
            linkWidth={window.innerWidth <= 768 ? 1.5 : 2}
            onNodeDragStart={handleNodeDragStart}
            onNodeDrag={handleNodeDrag}
            onNodeDragEnd={handleNodeDragEnd}
            enableNodeDrag={true}
            enableZoomInteraction={true}
            enablePanInteraction={true}
            d3Force="charge"
            d3ForceStrength={-240}
            cooldownTicks={150}
            onEngineStop={() => setGraphRef.current?.zoomToFit(400)}
            onNodeClick={handleNodeClick}
            d3ForceDistanceMin={40}
            linkDistance={120}
            linkStrength={0.5}
            warmupTicks={80}
            minZoom={0.5}
            maxZoom={3}
          nodeCanvasObject={(node, ctx, globalScale) => {
            // 노드 렌더링
            let label = `${node.emoji} ${node.name}`;
            let fontSize = 10;
            
            // 노드 타입별 폰트 크기 조정
            if (node.type === 'center') {
              fontSize = 14;
            } else if (node.type === 'topic') {
              fontSize = 10;
                              } else if (node.type === 'keyword') {
                    fontSize = 8; // 키워드 노드는 더 작게
                    // 키워드+문장 합계만 표시 (0인 경우 숨김)
                    const totalCount = node.count || 0;
                    const keywordCount = node.keywordCount || 0;
                    const sentenceCount = node.sentenceCount || 0;
                    
                    if (keywordCount > 0 && sentenceCount > 0) {
                      label = `${node.emoji} ${node.name}\n(${totalCount}회)\n키:${keywordCount} 문:${sentenceCount}`;
                    } else if (keywordCount > 0) {
                      label = `${node.emoji} ${node.name}\n(${totalCount}회)`;
                    } else if (sentenceCount > 0) {
                      label = `${node.emoji} ${node.name}\n(${totalCount}회)`;
                    } else {
                      label = `${node.emoji} ${node.name}\n(${totalCount}회)`;
                    }
                  }
            
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 노드 원형 그리기
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI);
            ctx.fillStyle = node.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // 텍스트 그리기 (키워드 노드는 여러 줄 지원)
            ctx.fillStyle = '#fff';
            if (node.type === 'keyword' && label.includes('\n')) {
              const lines = label.split('\n');
              lines.forEach((line, index) => {
                ctx.fillText(line, node.x, node.y + (index - 0.5) * fontSize);
              });
            } else {
              ctx.fillText(label, node.x, node.y);
            }
            
            // 응답 수 배지 (토픽 노드에만)
            if (node.type === 'topic' && responses[node.name] && responses[node.name].length > 0) {
              ctx.beginPath();
              ctx.arc(node.x + 25, node.y - 25, 12, 0, 2 * Math.PI);
              ctx.fillStyle = '#ff4757';
              ctx.fill();
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 2;
              ctx.stroke();
              
              ctx.fillStyle = '#fff';
              ctx.font = 'bold 9px Arial';
              ctx.fillText(responses[node.name].length.toString(), node.x + 25, node.y - 25);
            }
            
                          // 키워드 노드에 등장 횟수 배지 (10회 이상 특별 강조)
              if (node.type === 'keyword' && node.isHighFrequency) {
                // 금색 글로우 효과
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.val + 5, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                ctx.fill();
                
                // 중앙 별 모양 배지
                ctx.beginPath();
                ctx.arc(node.x + 18, node.y - 18, 10, 0, 2 * Math.PI);
                ctx.fillStyle = '#FFD700';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // 별 이모지
                ctx.fillStyle = '#000';
                ctx.font = 'bold 8px Arial';
                ctx.fillText('⭐', node.x + 18, node.y - 18);
              }
          }}
        />
      </div>

      {/* 안내 텍스트 */}
                  <div style={{
              textAlign: 'center',
              marginTop: window.innerWidth <= 768 ? '20px' : '30px',
              color: 'rgba(255,255,255,0.8)',
              fontSize: window.innerWidth <= 768 ? '12px' : '14px',
              lineHeight: '1.6',
              padding: window.innerWidth <= 768 ? '0 15px' : '0'
            }}>
              💡 시대를 클릭하여 생각을 입력하고, 이모지를 클릭하여 다른 학생들의 응답을 확인해보세요!<br/>
              🔑 **핵심 키워드 노드**: 5회 이상 등장하는 키워드는 🔑 아이콘으로 표시되며, 10회 이상은 🔥⭐로 특별 강조됩니다!<br/>
              {window.innerWidth <= 768 ? '클릭하면 해당 시대의 워드클라우드를 볼 수 있습니다!' : '클릭하면 해당 시대의 워드클라우드를 볼 수 있습니다!'}<br/>
              🖱️ **React Force Graph 기반 완벽한 유기체적 시스템**: 노드를 드래그하면 전체가 자연스럽게 반응합니다!<br/>
              🔧 현재 시스템: React Force Graph 2D (자연스러운 연결성과 움직임)
            </div>

      {/* 모달들 */}
      <ResponsesViewModal
        isOpen={showResponsesViewModal}
        onClose={() => setShowResponsesViewModal(false)}
        topic={selectedTopic}
        responses={responses[selectedTopic] || []}
        onShowWordCloud={handleShowWordCloud}
        onAddResponse={handleAddResponse}
        onEmojiClick={(response) => {
          setSelectedResponse(response);
          setShowResponseDetail(true);
        }}
      />

      <ResponseModal
        isOpen={showResponseModal}
        onClose={() => setShowResponseModal(false)}
        topic={selectedTopic}
        onSubmit={handleSubmitResponse}
      />

      <WordCloudModal
        isOpen={showWordCloudModal}
        onClose={() => setShowWordCloudModal(false)}
        topic={selectedTopic}
        responses={responses[selectedTopic] || []}
      />

      <ResponseDetailModal
        isOpen={showResponseDetail}
        onClose={() => setShowResponseDetail(false)}
        response={selectedResponse}
      />
    </div>
  );
};

export default KoreanHistoryMindMapPage;
