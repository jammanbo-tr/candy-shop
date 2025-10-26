import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// 원래 학생 데이터 (이미지 기준)
const originalStudentsData = [
  { name: '김규민', level: 4, exp: 74, levelName: '수제 사탕' },
  { name: '김범준', level: 2, exp: 120, levelName: '막대사탕' },
  { name: '김성준', level: 2, exp: 124, levelName: '막대사탕' },  
  { name: '김수겸', level: 3, exp: 245, levelName: '플라리' },
  { name: '김주원', level: 2, exp: 143, levelName: '막대사탕' },
  { name: '김주하', level: 3, exp: 205, levelName: '플라리' },
  { name: '문기훈', level: 2, exp: 187, levelName: '막대사탕' },
  { name: '박동하', level: 2, exp: 193, levelName: '막대사탕' }
];

export const restoreStudentData = async () => {
  try {
    console.log('학생 데이터 복원 시작...');
    
    const studentsCollection = collection(db, 'students');
    const studentsSnapshot = await getDocs(studentsCollection);
    
    const updatePromises = [];
    
    studentsSnapshot.forEach((docSnapshot) => {
      const studentData = docSnapshot.data();
      const originalData = originalStudentsData.find(s => s.name === studentData.name);
      
      if (originalData) {
        const updatePromise = updateDoc(doc(db, 'students', docSnapshot.id), {
          level: originalData.level,
          exp: originalData.exp,
          levelName: originalData.levelName,
          friendTokens: 10 // 토큰 기본값으로 리셋
        });
        
        updatePromises.push(updatePromise);
        console.log(`${studentData.name}: 레벨 ${originalData.level}, 경험치 ${originalData.exp}로 복원 예정`);
      }
    });
    
    await Promise.all(updatePromises);
    console.log('✅ 모든 학생 데이터 복원 완료!');
    
    return true;
  } catch (error) {
    console.error('❌ 복원 중 오류:', error);
    return false;
  }
};

// 브라우저 콘솔에서 직접 호출할 수 있도록 window 객체에 추가
if (typeof window !== 'undefined') {
  window.restoreStudentData = restoreStudentData;
}