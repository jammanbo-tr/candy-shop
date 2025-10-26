/**
 * 감정/색상 + 동물 조합으로 읽기 쉬운 초대 코드 생성
 * 예: 행복한강아지, 빨간고양이, 신나는토끼
 */

const adjectives = [
  '행복한', '즐거운', '신나는', '귀여운', '용감한',
  '똑똑한', '친절한', '밝은', '상냥한', '재미있는',
  '빨간', '파란', '노란', '초록', '보라',
  '분홍', '주황', '하얀', '검은', '황금'
];

const animals = [
  '고양이', '강아지', '토끼', '다람쥐', '펭귄',
  '여우', '사자', '호랑이', '코끼리', '기린',
  '판다', '곰', '늑대', '독수리', '부엉이',
  '돌고래', '거북이', '앵무새', '햄스터', '코알라'
];

/**
 * 감정/색상 + 동물 조합 코드 생성
 * @returns {string} 생성된 초대 코드 (예: "행복한강아지")
 */
export function generateReadableCode() {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];

  return `${adjective}${animal}`;
}

/**
 * 교사 초대 코드 생성
 * @returns {string}
 */
export function generateTeacherCode() {
  return generateReadableCode();
}

/**
 * 학생 초대 코드 생성
 * @returns {string}
 */
export function generateStudentCode() {
  return generateReadableCode();
}

/**
 * 코드가 유효한 형식인지 검증
 * @param {string} code
 * @returns {boolean}
 */
export function validateCodeFormat(code) {
  if (!code || typeof code !== 'string') return false;

  // 형식: 감정/색상 + 동물 (한글만)
  const pattern = /^[\u3131-\uD79D]+$/;
  return pattern.test(code);
}

/**
 * 코드에서 타입 추출 - Firestore에서 type 필드로 관리
 * @param {string} code
 * @returns {null} - 코드 자체로는 타입 구분 불가, Firestore의 type 필드 사용 필요
 */
export function getCodeType(code) {
  // 코드 형식만으로는 교사/학생 구분 불가
  // Firestore inviteCodes/{code} 문서의 type 필드로 확인해야 함
  return null;
}
