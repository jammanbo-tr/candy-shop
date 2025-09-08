const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyCQzb-xECyWXRt5pEe1ktpzzZ6E3q8QzEg",
    authDomain: "candy-shop-8394b.firebaseapp.com",
    projectId: "candy-shop-8394b",
    storageBucket: "candy-shop-8394b.appspot.com",
    messagingSenderId: "37833066657",
    appId: "1:37833066657:web:75e8f44ff8817b9e1788e0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const students = [
  { name: '김규민', exp: 0, level: 0, messages: [], quests: [] },
  { name: '김범준', exp: 0, level: 0, messages: [], quests: [] },
  { name: '김성준', exp: 0, level: 0, messages: [], quests: [] },
  { name: '김수겸', exp: 0, level: 0, messages: [], quests: [] },
  { name: '김주원', exp: 0, level: 0, messages: [], quests: [] },
  { name: '문기훈', exp: 0, level: 0, messages: [], quests: [] },
  { name: '박동하', exp: 0, level: 0, messages: [], quests: [] },
  { name: '백주원', exp: 0, level: 0, messages: [], quests: [] },
  { name: '백지원', exp: 0, level: 0, messages: [], quests: [] },
  { name: '손정환', exp: 0, level: 0, messages: [], quests: [] },
  { name: '이도윤', exp: 0, level: 0, messages: [], quests: [] },
  { name: '이예준', exp: 0, level: 0, messages: [], quests: [] },
  { name: '임재희', exp: 0, level: 0, messages: [], quests: [] },
  { name: '조은빈', exp: 0, level: 0, messages: [], quests: [] },
  { name: '조찬희', exp: 0, level: 0, messages: [], quests: [] },
  { name: '최서윤', exp: 0, level: 0, messages: [], quests: [] },
  { name: '최서현', exp: 0, level: 0, messages: [], quests: [] },
  { name: '한서우', exp: 0, level: 0, messages: [], quests: [] },
  { name: '황리아', exp: 0, level: 0, messages: [], quests: [] },
  { name: '하지수', exp: 0, level: 0, messages: [], quests: [] },
  { name: '테스트', exp: 0, level: 0, messages: [], quests: [] },
];

async function resetStudents() {
  // 기존 students 컬렉션의 모든 문서 삭제
  const querySnapshot = await getDocs(collection(db, 'students'));
  for (const document of querySnapshot.docs) {
    await deleteDoc(doc(db, 'students', document.id));
  }
  // 새로운 학생 데이터 추가
  for (const student of students) {
    await addDoc(collection(db, 'students'), student);
  }
  console.log('새 학생 데이터가 추가되었습니다.');
}

resetStudents(); 