// Firebase DB에 이해원, 김주하 학생 데이터 생성 스크립트
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Firebase 설정 (firebase.js와 동일)
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "candy-shop-8394b.firebaseapp.com",
  projectId: "candy-shop-8394b",
  storageBucket: "candy-shop-8394b.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 학생 데이터 생성 함수
async function createStudents() {
  try {
    console.log('학생 데이터 생성 시작...');
    
    // 이해원 학생 데이터
    const leeHaeWon = {
      name: '이해원',
      level: 0, // 알사탕 레벨
      exp: 0, // 초기 경험치
      balance: 100, // 초기 잔액
      expEvents: [], // 경험치 이벤트 배열
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    
    // 김주하 학생 데이터
    const kimJuHa = {
      name: '김주하',
      level: 0, // 알사탕 레벨
      exp: 0, // 초기 경험치
      balance: 100, // 초기 잔액
      expEvents: [], // 경험치 이벤트 배열
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    
    // Firestore에 학생 데이터 저장
    await setDoc(doc(db, 'students', '이해원'), leeHaeWon);
    console.log('✅ 이해원 학생 데이터 생성 완료');
    
    await setDoc(doc(db, 'students', '김주하'), kimJuHa);
    console.log('✅ 김주하 학생 데이터 생성 완료');
    
    console.log('🎉 모든 학생 데이터 생성 완료!');
    
  } catch (error) {
    console.error('❌ 학생 데이터 생성 중 오류 발생:', error);
  }
}

// 스크립트 실행
createStudents();
