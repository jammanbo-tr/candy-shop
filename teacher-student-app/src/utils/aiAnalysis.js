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