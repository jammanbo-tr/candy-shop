// 새로운 학생들 추가 스크립트
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

// 새로운 학생들 추가
const addNewStudents = async () => {
  const newStudents = [
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

  console.log('새로운 31명의 학생 추가 시작...');
  
  try {
    for (const student of newStudents) {
      await addDoc(collection(db, 'copy_students'), student);
      console.log(`${student.name} 학생 추가 완료`);
    }
    
    console.log('✅ 새로운 학생들 추가 완료!');
    alert(`새로운 31명의 학생들이 추가되었습니다!\n\n추가된 학생들:\n${newStudents.map(s => s.name).join(', ')}`);
  } catch (error) {
    console.error('❌ 학생 추가 중 오류 발생:', error);
    alert('학생 추가 중 오류가 발생했습니다. 콘솔을 확인해주세요.');
  }
};

// 개발 환경에서 직접 실행하고 싶을 때 사용
if (typeof window !== 'undefined') {
  window.addNewStudents = addNewStudents;
}

export { addNewStudents }; 