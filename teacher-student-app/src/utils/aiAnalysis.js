import { GoogleGenerativeAI } from '@google/generative-ai';

// 기존 프로젝트에서 사용 중인 Gemini API 키 사용
const GEMINI_API_KEY = 'AIzaSyDWuEDjA__mWPWE1njZpGPYSG__MnHYycM';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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

  // genAI 초기화 확인
  if (!genAI) {
    return { 
      error: "Gemini AI 초기화에 실패했습니다.",
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

⚠️ **절대 준수 사항**: 다음은 반드시 지켜주세요:
   - **오직 명사만 추출하세요**: 구체적인 사물, 개념, 인물, 장소, 시대, 기관 등 실체가 있는 명사만 선택
   - **절대 포함하지 말 것**: 동사(만드, 했다, 됐다, 있다 등), 형용사(좋은, 나쁜, 크다 등), 부사(많이, 조금, 정말 등), 조사(안에, 위에, 에서 등), 어미(~는데, ~어서, ~지만 등)
   - **예시 - 올바른 명사**: 고구려, 백제, 신라, 무덤, 고분, 문화, 예술, 역사, 왕, 대왕, 도시, 수도, 건축, 기술, 종교, 불교, 전쟁, 정벌, 통일, 발전, 변화
   - **예시 - 제외할 비명사**: 만드(동사), 안에(조사), 있고(동사+어미), 좋은(형용사), 많이(부사), 했다(동사), 됐다(동사), 크게(부사), 잘(부사)
   - **동의어 통합**: "무덤"과 "무덤처럼" → "무덤", "고구려"와 "고구려왕조" → "고구려"
   - **어미/조사 제거**: "백제의", "백제에서" → "백제"
   - **최소 2회 이상** 언급된 중요한 단어들만 선별
   
🔍 **검증 방법**: 각 단어가 "이것은 ____이다/____다"로 설명될 수 있으면 명사입니다. 
   - 예: "이것은 고구려다" (O, 명사), "이것은 만든다" (X, 동사), "이것은 안에다" (X, 조사)

2.  **메타인지 우수 학생 추천:** 학습 내용을 깊이 이해하고 자신의 생각이나 배운 점을 연결하여 작성하는 등 메타인지 능력이 뛰어나다고 생각되는 학생의 이름과 해당 내용 일부(1~2개)를 인용하고, 그렇게 생각하는 이유를 간략히 설명해주세요. (만약 없다면 "추천 대상 없음"으로 표시)

3.  **단순 사실/사건 나열 학생 피드백:** 학습 내용을 깊이 이해하기보다는 단순히 수업 중 있었던 사실이나 사건만 나열한 것으로 보이는 학생의 이름과 해당 내용 일부(1~2개)를 인용하고, 어떤 점을 더 생각해보면 좋을지 피드백 방향을 제안해주세요. (만약 없다면 "해당 내용 없음"으로 표시)

🚨 **최종 검증**: 응답하기 전에 keywords 배열의 모든 단어가 명사인지 한 번 더 확인하세요:
- "만드", "안에", "있고", "좋은", "많이", "했다", "됐다", "크게", "잘" 같은 단어가 포함되어 있다면 즉시 제거하세요
- 각 단어 앞에 "이것은"을 붙여서 자연스러운지 확인하세요

분석 결과는 반드시 다음 형식의 JSON 객체로만 제공해주세요. 다른 설명이나 텍스트는 절대 포함하지 마세요:
{
  "keywords": [ {"text": "명사단어1", "count": 빈도수}, {"text": "명사단어2", "count": 빈도수}, ... ],
  "recommendations": [ { "name": "학생이름", "quote": "인용 내용...", "reason": "이유..." }, ... ],
  "feedback_suggestions": [ { "name": "학생이름", "quote": "인용 내용...", "suggestion": "피드백 방향..." }, ... ]
}
`;

  try {
    console.log('Gemini AI 분석 시작...');
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
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
 * 텍스트에서 핵심 단어를 추출하는 함수 (명사 위주, 동의어 통합)
 */
function extractKeywords(text) {
  // 불용어 목록 (명사가 아닌 단어들 포함)
  const stopWords = new Set([
    // 접속사, 부사
    '그리고', '그래서', '하지만', '그런데', '또한', '그러나', '때문에', '이때', '그때',
    '오늘', '어제', '내일', '지금', '나는', '우리는', '이것', '그것', '저것',
    '정말', '많이', '조금', '너무', '아주', '정도', '같이', '함께',
    '모든', '여러', '다른', '새로운', '중요한', '특별한', '좋은', '나쁜',
    // 동사들
    '했다', '했습니다', '합니다', '입니다', '있다', '없다', '되었다', '한다',
    '만들다', '만드', '보다', '봤다', '듣다', '들었다', '가다', '갔다',
    '오다', '왔다', '하다', '한다', '되다', '된다', '알다', '안다',
    // 조사, 어미
    '에서', '에게', '에서는', '에게는', '으로', '로', '와', '과', '도', '만',
    '의', '이', '가', '을', '를', '은', '는', '처럼', '같이', '부터',
    '까지', '마저', '조차', '안에', '밖에', '위에', '아래', '옆에',
    // 일반적인 교실 단어
    '수업', '시간', '교시', '학교', '선생님', '친구', '학습', '공부', '활동',
    '내용', '모습', '이야기', '말씀', '설명', '이번', '다음', '처음', '마지막',
    '때문', '생각', '느낌', '마음'
  ]);

  // 동의어 그룹 (같은 의미의 단어들을 하나로 통합)
  const synonymGroups = {
    '고구려': ['고구려', '고구려왕조', '고구려국'],
    '백제': ['백제', '백제국', '백제왕조'],
    '신라': ['신라', '신라국', '신라왕조'],
    '통일': ['통일', '통합', '합병'],
    '문화': ['문화', '문명', '전통'],
    '역사': ['역사', '과거', '옛날'],
    '왕': ['왕', '임금', '군주', '대왕'],
    '전쟁': ['전쟁', '싸움', '전투', '정벌'],
    '발전': ['발전', '성장', '진보', '발달'],
    '생각': ['생각', '의견', '견해', '느낌'],
    '공부': ['공부', '학습', '연구', '탐구'],
    '이해': ['이해', '깨달음', '파악', '인식'],
    '관찰': ['관찰', '살펴봄', '지켜봄', '확인'],
    '실험': ['실험', '탐구', '조사', '연구'],
    '과학': ['과학', '과학기술', '기술'],
    '변화': ['변화', '변환', '바뀜', '달라짐'],
    '결과': ['결과', '성과', '효과', '산출물'],
    '무덤': ['무덤', '고분', '분묘', '능', '릉'],
    '건축': ['건축', '건물', '건설', '구조물'],
    '도시': ['도시', '수도', '도읍', '성'],
    '기술': ['기술', '기법', '방법', '방식'],
    '예술': ['예술', '미술', '공예', '작품'],
    '종교': ['종교', '불교', '유교', '신앙']
  };

  // 어근이 같은 단어들을 찾는 함수 (명사 위주)
  const findWordRoot = (word) => {
    // 명사형 어미 제거 (-에서, -에게, -처럼, -같이, -으로, -로 등)
    const nounSuffixes = ['에서', '에게', '처럼', '같이', '으로', '로써', '로부터', '까지', '부터', '마저', '조차'];
    
    for (const suffix of nounSuffixes) {
      if (word.endsWith(suffix) && word.length > suffix.length + 1) {
        return word.slice(0, -suffix.length);
      }
    }
    
    // 복수형이나 관형어 어미 제거 (-들, -의, -이/가, -을/를 등)
    const grammaticalSuffixes = ['들', '의', '이', '가', '을', '를', '은', '는', '과', '와', '도'];
    
    for (const suffix of grammaticalSuffixes) {
      if (word.endsWith(suffix) && word.length > suffix.length + 1) {
        return word.slice(0, -suffix.length);
      }
    }
    
    return word;
  };

  // 명사인지 확인하는 함수 (한국어 특성 고려)
  const isLikelyNoun = (word) => {
    // 명확한 비명사 패턴들
    const nonNounPatterns = [
      /다$/, /었다$/, /았다$/, /였다$/, /했다$/, // 동사 과거형
      /는다$/, /ㄴ다$/, /는가$/, /냐$/, // 동사 현재형, 의문형
      /게$/, /히$/, /이$/, /적으로$/, // 부사형
      /면서$/, /으며$/, /며$/, // 연결어미
      /^안/, /^밖/, /^위/, /^아래/, /^옆/, // 위치 관련 (조사와 함께 쓰임)
      /^만/, /^좀/, /^더/, /^덜/, /^별로$/, // 정도 부사
    ];
    
    // 비명사 패턴과 매치되면 제외
    for (const pattern of nonNounPatterns) {
      if (pattern.test(word)) {
        return false;
      }
    }
    
    // 길이가 1글자이거나 너무 긴 경우 제외
    if (word.length < 2 || word.length > 6) {
      return false;
    }
    
    return true;
  };

  // 단어를 대표 단어로 변환하는 함수
  const normalizeWord = (word) => {
    // 먼저 명사인지 확인
    if (!isLikelyNoun(word)) {
      return null; // 명사가 아니면 null 반환
    }
    
    // 동의어 그룹에서 찾기
    for (const [representative, synonyms] of Object.entries(synonymGroups)) {
      if (synonyms.includes(word)) {
        return representative;
      }
    }
    
    // 동의어 그룹에 없으면 어근 추출
    const root = findWordRoot(word);
    
    // 어근이 다른 경우, 기존 단어들과 비교해서 같은 어근이 있는지 확인
    if (root !== word && root.length >= 2) {
      return root;
    }
    
    return word;
  };

  // 명사 패턴 우선 추출 (한글 2글자 이상)
  const words = text.match(/[가-힣]{2,}/g) || [];
  
  // 단어 빈도 계산 (동의어 통합 및 명사 필터링)
  const wordCount = {};
  words.forEach(word => {
    if (!stopWords.has(word)) {
      const normalizedWord = normalizeWord(word);
      // null이 아닌 명사만 카운트
      if (normalizedWord !== null) {
        wordCount[normalizedWord] = (wordCount[normalizedWord] || 0) + 1;
      }
    }
  });

  // 빈도가 1인 단어는 제외하고, 빈도순으로 정렬하여 상위 5-10개 선택
  const filteredWords = Object.entries(wordCount)
    .filter(([word, count]) => count >= 2) // 최소 2번 이상 언급된 단어만
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // 최소 5개는 보장 (빈도 1인 것도 포함)
  if (filteredWords.length < 5) {
    const additionalWords = Object.entries(wordCount)
      .filter(([word, count]) => count === 1)
      .sort((a, b) => a[0].localeCompare(b[0])) // 알파벳 순 정렬
      .slice(0, 5 - filteredWords.length);
    
    filteredWords.push(...additionalWords);
  }

  return filteredWords.map(([text, count]) => ({ text, count }));
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