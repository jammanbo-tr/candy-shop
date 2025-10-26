const admin = require('firebase-admin');

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'candy-shop-8394b'
  });
}

const db = admin.firestore();

// 학생 데이터 원래대로 복원
const restoreStudents = async () => {
  try {
    const studentsData = [
      { name: '김규민', level: 4, exp: 74, levelName: '수제 사탕' },
      { name: '김범준', level: 2, exp: 120, levelName: '막대사탕' },
      { name: '김성준', level: 2, exp: 124, levelName: '막대사탕' },
      { name: '김수겸', level: 3, exp: 245, levelName: '플라리' },
      { name: '김주원', level: 2, exp: 143, levelName: '막대사탕' },
      { name: '김주하', level: 3, exp: 205, levelName: '플라리' },
      { name: '문기훈', level: 2, exp: 187, levelName: '막대사탕' },
      { name: '박동하', level: 2, exp: 193, levelName: '막대사탕' }
    ];

    const studentsSnapshot = await db.collection('students').get();
    
    for (const doc of studentsSnapshot.docs) {
      const studentData = doc.data();
      const originalData = studentsData.find(s => s.name === studentData.name);
      
      if (originalData) {
        await db.collection('students').doc(doc.id).update({
          level: originalData.level,
          exp: originalData.exp,
          levelName: originalData.levelName,
          friendTokens: 10 // 토큰도 기본값으로 리셋
        });
        
        console.log(`${studentData.name}: 레벨 ${originalData.level}, 경험치 ${originalData.exp}로 복원`);
      }
    }
    
    console.log('학생 데이터 복원 완료!');
  } catch (error) {
    console.error('복원 중 오류:', error);
  }
};

restoreStudents();