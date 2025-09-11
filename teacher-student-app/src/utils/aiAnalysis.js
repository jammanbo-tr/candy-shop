import { GoogleGenerativeAI } from '@google/generative-ai';

// 🚨 주의: 실제 프로덕션에서는 환경변수나 Firebase Functions를 통해 API 키를 관리해야 합니다
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || 'API_KEY_PLACEHOLDER';

let genAI;
if (GEMINI_API_KEY && GEMINI_API_KEY !== 'API_KEY_PLACEHOLDER') {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

/**
 * 학습 데이터를 Gemini AI로 분석하는 함수
 * @param {Array} learningDataList - {name: string, content: string} 객체 배열
 * @returns {Object} 분석 결과 객체
 */
export async function analyzeDataWithGemini(learningDataList) {
  // 입력 검증
  if (!Array.isArray(learningDataList) || learningDataList.length === 0) {
    return { error: "분석할 학습 데이터가 없습니다." };
  }

  // API 키 검증
  if (!genAI) {
    return { 
      error: "Gemini API 키가 설정되지 않았습니다. 환경변수 REACT_APP_GEMINI_API_KEY를 확인해주세요.",
      demo: true 
    };
  }

  // 학습 내용 포맷팅
  const learningContentListFormatted = learningDataList.map(item => 
    `학생: ${item.name}\n내용: ${item.content || ""}`
  );

  if (learningContentListFormatted.length === 0) {
    return { error: "유효한 학습 내용이 없습니다." };
  }

  const combinedContent = learningContentListFormatted.join("\n---\n");

  // 프롬프트 구성 (Google Apps Script 코드에서 가져온 프롬프트)
  const prompt = `
다음은 초등학교 5학년 학생들의 수업 내용 기록입니다. 각 내용은 학생 이름과 함께 제공되며 "---"로 구분됩니다.

[학습 내용 시작]
${combinedContent}
[학습 내용 끝]

이 학습 내용들을 분석하여 다음 정보를 알려주세요:

1.  **핵심 단어:** 전체 내용에서 중요하게 반복적으로 나타나는 핵심 단어들과 각 단어의 빈도수를 함께 추출해주세요. (명사 위주, 5~10개)
2.  **메타인지 우수 학생 추천:** 학습 내용을 깊이 이해하고 자신의 생각이나 배운 점을 연결하여 작성하는 등 메타인지 능력이 뛰어나다고 생각되는 학생의 이름과 해당 내용 일부(1~2개)를 인용하고, 그렇게 생각하는 이유를 간략히 설명해주세요. (만약 없다면 "추천 대상 없음"으로 표시)
3.  **단순 사실/사건 나열 학생 피드백:** 학습 내용을 깊이 이해하기보다는 단순히 수업 중 있었던 사실이나 사건만 나열한 것으로 보이는 학생의 이름과 해당 내용 일부(1~2개)를 인용하고, 어떤 점을 더 생각해보면 좋을지 피드백 방향을 제안해주세요. (만약 없다면 "해당 내용 없음"으로 표시)

분석 결과는 반드시 다음 형식의 JSON 객체로만 제공해주세요. 다른 설명이나 텍스트는 절대 포함하지 마세요:
{
  "keywords": [ {"text": "단어1", "count": 빈도수}, {"text": "단어2", "count": 빈도수}, ... ],
  "recommendations": [ { "name": "학생이름", "quote": "인용 내용...", "reason": "이유..." }, ... ],
  "feedback_suggestions": [ { "name": "학생이름", "quote": "인용 내용...", "suggestion": "피드백 방향..." }, ... ]
}
`;

  try {
    console.log('Gemini AI 분석 시작...');
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('Gemini AI 응답:', text);

    try {
      // JSON 추출 시도
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch && jsonMatch[0]) {
        const potentialJson = jsonMatch[0];
        const analysisResult = JSON.parse(potentialJson);
        
        // 구조 검증
        if (typeof analysisResult === 'object' && 
            analysisResult !== null && 
            Array.isArray(analysisResult.keywords)) {
          console.log('Gemini AI 분석 성공');
          return analysisResult;
        } else {
          throw new Error("파싱된 JSON 구조가 올바르지 않습니다.");
        }
      } else {
        // 마크다운 백틱 제거 시도
        const cleanedJsonString = text.replace(/^```json\s*|```$/g, '').trim();
        if (cleanedJsonString.startsWith('{') && cleanedJsonString.endsWith('}')) {
          const analysisResult = JSON.parse(cleanedJsonString);
          if (typeof analysisResult === 'object' && 
              analysisResult !== null && 
              Array.isArray(analysisResult.keywords)) {
            console.log('Gemini AI 분석 성공 (마크다운 정리 후)');
            return analysisResult;
          } else {
            throw new Error("정리된 JSON 구조가 올바르지 않습니다.");
          }
        } else {
          throw new Error("응답에서 유효한 JSON 객체를 찾을 수 없습니다.");
        }
      }
    } catch (parseError) {
      console.error('Gemini JSON 파싱 오류:', parseError);
      // 원본 텍스트를 반환하여 사용자가 확인할 수 있도록 함
      return { 
        raw_analysis: text, 
        error: `분석 결과 파싱 실패: ${parseError.message}` 
      };
    }
  } catch (error) {
    console.error('Gemini AI 호출 오류:', error);
    return { 
      error: `AI 분석 실패: ${error.message}` 
    };
  }
}

/**
 * 실제 학습 데이터를 기반으로 간단한 키워드 분석을 수행하는 함수
 * @param {Array} learningDataList - {name: string, content: string} 객체 배열
 * @returns {Object} 분석 결과 객체
 */
export function analyzeDataLocally(learningDataList) {
  if (!Array.isArray(learningDataList) || learningDataList.length === 0) {
    return { error: "분석할 학습 데이터가 없습니다." };
  }

  // 모든 학습 내용을 합치기
  const allContent = learningDataList.map(item => item.content).join(' ');
  
  // 간단한 키워드 추출 (한글 단어, 2글자 이상)
  const keywords = extractKeywords(allContent);
  
  // 메타인지 분석
  const recommendations = analyzeMetacognition(learningDataList);
  
  // 피드백 분석
  const feedback_suggestions = analyzeFeedback(learningDataList);

  return {
    keywords,
    recommendations,
    feedback_suggestions,
    local: true
  };
}

/**
 * 텍스트에서 키워드를 추출하는 함수
 */
function extractKeywords(text) {
  // 불용어 목록
  const stopWords = new Set([
    '그리고', '그래서', '하지만', '그런데', '또한', '그러나', '때문에', '이때', '그때',
    '오늘', '어제', '내일', '지금', '나는', '우리는', '이것', '그것', '저것',
    '했다', '했습니다', '합니다', '입니다', '있다', '없다', '되었다', '한다',
    '수업', '시간', '교시', '학교', '선생님', '친구', '학습', '공부'
  ]);

  // 한글 단어만 추출 (2글자 이상)
  const words = text.match(/[가-힣]{2,}/g) || [];
  
  // 단어 빈도 계산
  const wordCount = {};
  words.forEach(word => {
    if (!stopWords.has(word)) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });

  // 빈도순으로 정렬하고 상위 10개만 선택
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([text, count]) => ({ text, count }));
}

/**
 * 메타인지 능력 분석 (간단한 휴리스틱 기반)
 */
function analyzeMetacognition(learningDataList) {
  const metacognitionKeywords = [
    '생각', '느낌', '깨달음', '이해', '연결', '비교', '차이점', '공통점',
    '왜', '어떻게', '만약', '그러면', '때문에', '결론', '추론', '판단',
    '경험', '과거', '미래', '예상', '예측', '상상', '추측'
  ];

  const recommendations = [];

  learningDataList.forEach(student => {
    const content = student.content.toLowerCase();
    let metacognitionScore = 0;
    let foundKeywords = [];

    metacognitionKeywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'g');
      const matches = content.match(regex);
      if (matches) {
        metacognitionScore += matches.length;
        foundKeywords.push(keyword);
      }
    });

    // 문장의 복잡성 점수 (문장 길이와 구두점 사용)
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 10);
    const complexityScore = sentences.length > 0 ? 
      sentences.reduce((sum, sentence) => sum + sentence.length, 0) / sentences.length : 0;

    // 총 점수 계산
    const totalScore = metacognitionScore * 2 + complexityScore * 0.1;

    if (totalScore > 8 && content.length > 50) {
      const quote = content.length > 100 ? content.substring(0, 97) + '...' : content;
      recommendations.push({
        name: student.name,
        quote,
        reason: `메타인지 키워드 ${foundKeywords.length}개 사용, 상세한 설명과 성찰적 사고를 보임`
      });
    }
  });

  return recommendations.slice(0, 3); // 상위 3명만
}

/**
 * 피드백 필요 학생 분석
 */
function analyzeFeedback(learningDataList) {
  const feedback_suggestions = [];

  learningDataList.forEach(student => {
    const content = student.content;
    
    // 단순 나열 패턴 감지
    const shortSentences = content.split(/[.!?]/).filter(s => s.trim().length > 0);
    const avgLength = shortSentences.length > 0 ? 
      shortSentences.reduce((sum, s) => sum + s.length, 0) / shortSentences.length : 0;

    const simplePatterns = [
      /했다\s*\./g,
      /봤다\s*\./g,
      /들었다\s*\./g,
      /배웠다\s*\./g
    ];

    let simplePatternCount = 0;
    simplePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) simplePatternCount += matches.length;
    });

    // 짧은 문장이 많고, 단순 패턴이 많으면 피드백 대상
    if (avgLength < 15 && simplePatternCount >= 2 && content.length < 100) {
      const quote = content.length > 60 ? content.substring(0, 57) + '...' : content;
      feedback_suggestions.push({
        name: student.name,
        quote,
        suggestion: "구체적인 예시나 자신의 생각, 느낀 점을 더 자세히 써보면 좋겠습니다."
      });
    }
  });

  return feedback_suggestions.slice(0, 3); // 상위 3명만
}

/**
 * 데모용 분석 결과를 반환하는 함수
 * @returns {Object} 데모 분석 결과
 */
export function getDemoAnalysisResult() {
  return {
    keywords: [
      { text: "과학", count: 8 },
      { text: "실험", count: 6 },
      { text: "관찰", count: 5 },
      { text: "물질", count: 4 },
      { text: "변화", count: 4 },
      { text: "온도", count: 3 },
      { text: "결과", count: 3 }
    ],
    recommendations: [
      {
        name: "김지민",
        quote: "물이 얼 때 부피가 늘어나는 것을 보고, 겨울에 수도관이 터지는 이유를 연결해서 생각해보았다.",
        reason: "실험 결과를 일상생활과 연결하여 깊이 있게 사고하는 메타인지 능력을 보임"
      }
    ],
    feedback_suggestions: [
      {
        name: "박민수",
        quote: "실험을 했다. 물이 얼었다. 결과를 기록했다.",
        suggestion: "실험을 통해 무엇을 알게 되었는지, 왜 그런 현상이 일어났는지 생각해보는 습관을 기르면 좋겠습니다."
      }
    ],
    demo: true
  };
}