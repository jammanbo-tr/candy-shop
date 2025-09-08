// 사본 데이터베이스 초기화 스크립트
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

// 기존 사본 데이터 삭제
const clearCopyCollections = async () => {
  const collections = ['copy_students', 'copy_items', 'copy_notifications', 'copy_notices', 'copy_alarms'];
  
  for (const collectionName of collections) {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    console.log(`${collectionName} 컬렉션 초기화 완료`);
  }
};

// 초기 학생 데이터 생성
const createInitialStudents = async () => {
  const students = [
    { name: '피카츄', exp: 0, level: 0, money: 800, coupons: [] },
    { name: '파이리', exp: 0, level: 0, money: 600, coupons: [] },
    { name: '꼬부기', exp: 0, level: 0, money: 950, coupons: [] },
    { name: '야도란', exp: 0, level: 0, money: 300, coupons: [] },
    { name: '잠만보', exp: 0, level: 0, money: 1500, coupons: [] },
    { name: '차은우', exp: 0, level: 0, money: 1200, coupons: [] },
    { name: '송강', exp: 0, level: 0, money: 850, coupons: [] },
    { name: '이정재', exp: 0, level: 0, money: 1300, coupons: [] },
    { name: '임재범', exp: 0, level: 0, money: 700, coupons: [] },
    { name: 'BTS', exp: 0, level: 0, money: 2000, coupons: [] },
    { name: '에스파', exp: 0, level: 0, money: 1100, coupons: [] },
    { name: '스트레이키즈', exp: 0, level: 0, money: 1000, coupons: [] },
    { name: '아델', exp: 0, level: 0, money: 1800, coupons: [] },
    { name: '샘 스미스', exp: 0, level: 0, money: 750, coupons: [] },
    { name: '필 콜린스', exp: 0, level: 0, money: 1050, coupons: [] },
    { name: '비욘세', exp: 0, level: 0, money: 2200, coupons: [] },
    { name: '레이디 가가', exp: 0, level: 0, money: 1400, coupons: [] },
    { name: '잔나비', exp: 0, level: 0, money: 800, coupons: [] },
    { name: '브라운 아이즈', exp: 0, level: 0, money: 920, coupons: [] },
    { name: '악뮤', exp: 0, level: 0, money: 780, coupons: [] },
    { name: '세븐틴', exp: 0, level: 0, money: 1250, coupons: [] },
    { name: '카리나', exp: 0, level: 0, money: 980, coupons: [] },
    { name: '장원영', exp: 0, level: 0, money: 900, coupons: [] },
    { name: '메종키츠네', exp: 0, level: 0, money: 500, coupons: [] },
    { name: '라코스테', exp: 0, level: 0, money: 720, coupons: [] },
    { name: '젠틀몬스터', exp: 0, level: 0, money: 1200, coupons: [] },
    { name: 'BMW', exp: 0, level: 0, money: 1600, coupons: [] },
    { name: '렉서스', exp: 0, level: 0, money: 1550, coupons: [] },
    { name: '맥북16인치', exp: 0, level: 0, money: 2000, coupons: [] },
    { name: '하와이', exp: 0, level: 0, money: 1100, coupons: [] },
    { name: '로마', exp: 0, level: 0, money: 950, coupons: [] },
    { name: '피렌체', exp: 0, level: 0, money: 850, coupons: [] },
    { name: '바로셀로나', exp: 0, level: 0, money: 1150, coupons: [] },
    { name: '마드리드', exp: 0, level: 0, money: 1000, coupons: [] },
    { name: '런던', exp: 0, level: 0, money: 1300, coupons: [] },
    { name: '파리', exp: 0, level: 0, money: 1200, coupons: [] },
    { name: '방콕', exp: 0, level: 0, money: 750, coupons: [] },
    // 새로 추가된 학생들
    { name: '오로라핑', exp: 0, level: 0, money: 880, coupons: [] },
    { name: '행운핑', exp: 0, level: 0, money: 920, coupons: [] },
    { name: '와플핑', exp: 0, level: 0, money: 760, coupons: [] },
    { name: '하츄핑', exp: 0, level: 0, money: 840, coupons: [] },
    { name: '럼블', exp: 0, level: 0, money: 1350, coupons: [] },
    { name: '티모', exp: 0, level: 0, money: 680, coupons: [] },
    { name: '신짜오', exp: 0, level: 0, money: 1100, coupons: [] },
    { name: '리신', exp: 0, level: 0, money: 950, coupons: [] },
    { name: '광어초밥', exp: 0, level: 0, money: 1450, coupons: [] },
    { name: '연어초밥', exp: 0, level: 0, money: 1350, coupons: [] },
    { name: '장어초밥', exp: 0, level: 0, money: 1250, coupons: [] },
    { name: '유부초밥', exp: 0, level: 0, money: 600, coupons: [] },
    { name: '바베큐치킨', exp: 0, level: 0, money: 1650, coupons: [] },
    { name: '닭한마리', exp: 0, level: 0, money: 1800, coupons: [] },
    { name: '짜장면', exp: 0, level: 0, money: 450, coupons: [] },
    { name: '짬뽕', exp: 0, level: 0, money: 580, coupons: [] },
    { name: '탕수육', exp: 0, level: 0, money: 1200, coupons: [] },
    { name: '유린기', exp: 0, level: 0, money: 990, coupons: [] },
    { name: '복숭아', exp: 0, level: 0, money: 320, coupons: [] },
    { name: '토마토', exp: 0, level: 0, money: 280, coupons: [] },
    { name: '신비복숭아', exp: 0, level: 0, money: 1050, coupons: [] },
    { name: '사과', exp: 0, level: 0, money: 350, coupons: [] },
    { name: '수박', exp: 0, level: 0, money: 650, coupons: [] },
    { name: '레고', exp: 0, level: 0, money: 1750, coupons: [] },
    { name: '닌텐도스위치', exp: 0, level: 0, money: 2300, coupons: [] },
    { name: '아이패드', exp: 0, level: 0, money: 2100, coupons: [] },
    { name: '갤럭시탭', exp: 0, level: 0, money: 1950, coupons: [] },
    { name: '팥빙수', exp: 0, level: 0, money: 480, coupons: [] },
    { name: '딸기빙수', exp: 0, level: 0, money: 520, coupons: [] },
    { name: '망고빙수', exp: 0, level: 0, money: 600, coupons: [] }
  ];

  for (const student of students) {
    await addDoc(collection(db, 'copy_students'), student);
  }
  
  console.log('초기 학생 데이터 생성 완료');
};

// 초기 아이템 데이터 생성
const createInitialItems = async () => {
  const items = [
    { name: '초콜릿', price: 100 },
    { name: '사탕', price: 50 },
    { name: '젤리', price: 75 },
    { name: '과자', price: 150 },
    { name: '음료수', price: 200 },
    { name: '아이스크림', price: 250 },
    { name: '케이크', price: 500 },
    { name: '쿠키', price: 120 }
  ];

  for (const item of items) {
    await addDoc(collection(db, 'copy_items'), item);
  }
  
  console.log('초기 아이템 데이터 생성 완료');
};

// 초기 공지사항 데이터 생성
const createInitialNotices = async () => {
  const notices = [
    { 
      content: '🎉 새로운 특별 학급에 오신 것을 환영합니다! 포켓몬부터 K-POP 스타, 명품 브랜드, 세계 도시까지 다양한 학생들이 모였어요!', 
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    { 
      content: '🔄 이곳은 사본 데이터베이스를 사용하는 테스트 환경입니다. 기존 데이터에는 절대 영향을 주지 않으니 마음껏 실험해보세요!', 
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    { 
      content: '⭐ 총 68명의 특별한 학생들과 함께 즐거운 수업을 진행해보세요!', 
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    { 
      content: '🎊 새로운 친구들이 추가되었어요! 티니핑, 게임캐릭터, 맛있는 음식, 과일, 전자기기, 빙수까지 다양한 테마의 학생들을 만나보세요!', 
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];

  for (const notice of notices) {
    await addDoc(collection(db, 'copy_notices'), notice);
  }
  
  console.log('초기 공지사항 데이터 생성 완료');
};

// 전체 초기화 실행
export const initializeCopyData = async () => {
  console.log('사본 데이터베이스 초기화 시작...');
  
  try {
    await clearCopyCollections();
    await createInitialStudents();
    await createInitialItems();
    await createInitialNotices();
    
    console.log('✅ 사본 데이터베이스 초기화 완료!');
    alert('사본 데이터베이스 초기화가 완료되었습니다!');
  } catch (error) {
    console.error('❌ 초기화 중 오류 발생:', error);
    alert('초기화 중 오류가 발생했습니다. 콘솔을 확인해주세요.');
  }
};

// 개발 환경에서 직접 실행하고 싶을 때 사용
if (typeof window !== 'undefined') {
  window.initializeCopyData = initializeCopyData;
} 