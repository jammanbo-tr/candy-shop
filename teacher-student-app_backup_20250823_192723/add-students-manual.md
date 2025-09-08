# Firebase DB에 이해원, 김주하 학생 수동 추가 방법

## 🎯 **방법 1: Firebase 콘솔에서 직접 추가**

### 1단계: Firebase 콘솔 접속
- [Firebase Console](https://console.firebase.google.com/) 접속
- `candy-shop-8394b` 프로젝트 선택

### 2단계: Firestore Database 접속
- 왼쪽 메뉴에서 "Firestore Database" 클릭
- "데이터" 탭 선택

### 3단계: 이해원 학생 추가
- `students` 컬렉션 클릭
- "문서 추가" 버튼 클릭
- 문서 ID: `이해원`
- 필드 추가:
  ```
  name: "이해원" (문자열)
  level: 0 (숫자)
  exp: 0 (숫자)
  balance: 100 (숫자)
  expEvents: [] (배열)
  createdAt: 현재시간 (타임스탬프)
  lastLogin: 현재시간 (타임스탬프)
  ```

### 4단계: 김주하 학생 추가
- `students` 컬렉션 클릭
- "문서 추가" 버튼 클릭
- 문서 ID: `김주하`
- 필드 추가:
  ```
  name: "김주하" (문자열)
  level: 0 (숫자)
  exp: 0 (숫자)
  balance: 100 (숫자)
  expEvents: [] (배열)
  createdAt: 현재시간 (타임스탬프)
  lastLogin: 현재시간 (타임스탬프)
  ```

## 🎯 **방법 2: TeacherPage에서 학생 추가 모달 사용**

### 1단계: TeacherPage 접속
- `/teacher` 페이지 접속
- "학생 추가" 버튼 클릭

### 2단계: 이해원 추가
- 이름: `이해원`
- 잔액: `100`
- "추가" 버튼 클릭

### 3단계: 김주하 추가
- 이름: `김주하`
- 잔액: `100`
- "추가" 버튼 클릭

## 🎯 **방법 3: 브라우저 콘솔에서 스크립트 실행**

### 1단계: TeacherPage 접속
- `/teacher` 페이지 접속
- F12로 개발자 도구 열기
- Console 탭 선택

### 2단계: 스크립트 실행
```javascript
// 이해원 학생 추가
const addLeeHaeWon = async () => {
  try {
    await setDoc(doc(db, 'students', '이해원'), {
      name: '이해원',
      level: 0,
      exp: 0,
      balance: 100,
      expEvents: [],
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    });
    console.log('✅ 이해원 학생 추가 완료');
  } catch (error) {
    console.error('❌ 오류:', error);
  }
};

// 김주하 학생 추가
const addKimJuHa = async () => {
  try {
    await setDoc(doc(db, 'students', '김주하'), {
      name: '김주하',
      level: 0,
      exp: 0,
      balance: 100,
      expEvents: [],
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    });
    console.log('✅ 김주하 학생 추가 완료');
  } catch (error) {
    console.error('❌ 오류:', error);
  }
};

// 실행
addLeeHaeWon();
addKimJuHa();
```

## 🎯 **확인 방법**

### 1단계: TeacherPage 확인
- `/teacher` 페이지 새로고침
- 이해원, 김주하 학생 카드가 표시되는지 확인

### 2단계: StudentSelectPage 확인
- `/student-select` 페이지 접속
- 이해원, 김주하 학생 카드가 표시되는지 확인

### 3단계: 개별 학생 페이지 확인
- `/student/이해원` 페이지 접속
- `/student/김주하` 페이지 접속
- 각 학생의 개별 페이지가 정상 작동하는지 확인
