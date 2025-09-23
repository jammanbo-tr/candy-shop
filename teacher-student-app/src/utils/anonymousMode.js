// 익명 모드 Firestore 기반 상태 관리
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

let isAnonymousMode = false;
let listeners = [];
let unsubscribeFirestore = null;

// 포켓몬 이름 배열 (TeacherPage와 동일)
const POKEMON_NAMES = [
  '피카츄', '라이츄', '파이리', '리자드', '리자몽', '꼬부기', '어니부기', '거북왕',
  '캐터피', '단데기', '버터플', '뿔충이', '독침붕', '구구', '피죤', '피죤투',
  '꼬렛', '레트라', '깨비참', '깨비드릴조', '아보', '아보크', '모래두지', '고지',
  '니드런♀', '니드리나', '니드퀸', '니드런♂', '니드리노', '니드킹', '픽시', '식스테일',
  '나인테일', '푸린', '푸크린', '주뱃', '골뱃', '냄새꼬', '라플레시아', '파라스',
  '파라섹트', '콘팡', '모르페코', '디그다', '닥트리오', '나옹', '페르시온', '코덕',
  '골덕', '망키', '성원숭', '가디', '윈디', '발챙이', '슈륙챙이', '강챙이',
  '캐이시', '윤겔라', '후딘', '알통몬', '근육몬', '괴력몬', '모다피', '우츠동',
  '우츠보트', '왕눈해', '독파리', '땅콩철새', '또도가스', '뿔카노', '럭키',
  '덩쿠리', '캥카', '쏘드라', '시드라', '별가사리', '아쿠스타', '마임맨',
  '스라크', '루주라', '에레브', '마그마', '쁘사이저', '켄타로스', '잉어킹',
  '갸라도스', '라프라스', '메타몽', '이브이', '샤미드', '쥬피썬더', '부스터',
  '폴리곤', '암나이트', '암스타', '투구', '투구푸스', '프테라', '잠만보',
  '프리져', '썬더', '파이어', '미뇽', '신뇽', '망나뇽', '뮤', '뮤츠'
];

// 학생 이름 -> 포켓몬 이름 매핑을 저장하는 전역 객체
let studentToPokemonMap = {};

// 학생 이름을 포켓몬 이름으로 변환하는 함수 (중복 방지)
export const getPokemonName = (studentName, anonymousMode = isAnonymousMode) => {
  console.log('getPokemonName 호출:', { studentName, anonymousMode, globalAnonymousMode: isAnonymousMode });
  if (!anonymousMode) return studentName;
  
  // 이미 매핑된 학생이면 기존 포켓몬 이름 반환
  if (studentToPokemonMap[studentName]) {
    return studentToPokemonMap[studentName];
  }
  
  // 이미 사용된 포켓몬 이름들 확인
  const usedPokemonNames = new Set(Object.values(studentToPokemonMap));
  
  // 학생 이름의 해시값을 기반으로 시작 인덱스 결정
  let hash = 0;
  for (let i = 0; i < studentName.length; i++) {
    const char = studentName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit 정수로 변환
  }
  
  let startIndex = Math.abs(hash) % POKEMON_NAMES.length;
  
  // 사용되지 않은 포켓몬 이름 찾기
  for (let i = 0; i < POKEMON_NAMES.length; i++) {
    const index = (startIndex + i) % POKEMON_NAMES.length;
    const pokemonName = POKEMON_NAMES[index];
    
    if (!usedPokemonNames.has(pokemonName)) {
      studentToPokemonMap[studentName] = pokemonName;
      return pokemonName;
    }
  }
  
  // 모든 포켓몬 이름이 사용된 경우 (학생 수가 매우 많은 경우)
  // 기본 해시 방식으로 폴백
  const fallbackIndex = Math.abs(hash) % POKEMON_NAMES.length;
  const fallbackName = `${POKEMON_NAMES[fallbackIndex]}${Object.keys(studentToPokemonMap).length}`;
  studentToPokemonMap[studentName] = fallbackName;
  return fallbackName;
};

// Firestore에서 익명 모드 상태 초기화
const initializeAnonymousMode = async () => {
  try {
    const settingsRef = doc(db, 'settings', 'anonymousMode');
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists()) {
      const data = settingsSnap.data();
      isAnonymousMode = data.enabled || false;
      console.log('Firestore에서 익명 모드 상태 로드:', isAnonymousMode);
    } else {
      // 문서가 없으면 기본값으로 생성
      await setDoc(settingsRef, { enabled: false });
      isAnonymousMode = false;
      console.log('Firestore에 익명 모드 설정 초기화');
    }
    
    // Firestore 실시간 리스너 설정
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
    
    unsubscribeFirestore = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const newValue = data.enabled || false;
        const oldValue = isAnonymousMode;
        isAnonymousMode = newValue;
        
        console.log('Firestore 익명 모드 상태 변경:', oldValue, '->', newValue);
        
        // 익명 모드가 꺼지면 매핑 초기화
        if (!newValue) {
          studentToPokemonMap = {};
          console.log('포켓몬 매핑 초기화됨');
        }
        
        // 상태 변경을 모든 리스너에게 알림
        if (oldValue !== newValue) {
          listeners.forEach((listener, index) => {
            console.log(`리스너 ${index}에게 Firestore 상태 전달:`, newValue);
            listener(newValue);
          });
        }
      }
    });
    
  } catch (error) {
    console.error('익명 모드 초기화 오류:', error);
    isAnonymousMode = false;
  }
};

// 익명 모드 상태 설정 (Firestore에 저장)
export const setAnonymousMode = async (value) => {
  try {
    const settingsRef = doc(db, 'settings', 'anonymousMode');
    await setDoc(settingsRef, { enabled: value });
    console.log('Firestore에 익명 모드 상태 저장:', value);
  } catch (error) {
    console.error('익명 모드 상태 저장 오류:', error);
  }
};

// 익명 모드 상태 조회
export const getAnonymousMode = () => isAnonymousMode;

// 익명 모드 상태 변경 리스너 등록
export const addAnonymousModeListener = async (listener) => {
  // 첫 번째 리스너 등록 시 Firestore 초기화
  if (listeners.length === 0) {
    await initializeAnonymousMode();
  }
  
  listeners.push(listener);
  
  // Firestore 초기화 후 현재 상태를 즉시 전달 (초기 동기화)
  console.log('리스너 등록 시 현재 익명 모드 상태 전달:', isAnonymousMode);
  listener(isAnonymousMode);
  
  // 리스너 제거 함수 반환
  return () => {
    listeners = listeners.filter(l => l !== listener);
    
    // 마지막 리스너 제거 시 Firestore 리스너 정리
    if (listeners.length === 0 && unsubscribeFirestore) {
      unsubscribeFirestore();
      unsubscribeFirestore = null;
    }
  };
};