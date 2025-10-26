# 🍬 Candy Shop Classroom - Chrome 확장 프로그램

실시간 교실 협업을 위한 Chrome 확장 프로그램입니다. 관리자, 교사, 학생의 역할 기반 시스템으로 구성되어 있습니다.

## ✨ 주요 기능

### 📋 역할 기반 시스템
- **관리자**: 교사 초대 코드 발급 및 관리
- **교사**: 수업 생성/종료, 학생 초대, 실시간 채팅, 링크 공유
- **학생**: 수업 참여, 실시간 채팅, 링크 수신

### 🎯 핵심 기능

#### 1. 읽기 쉬운 초대 코드 시스템
- **감정/색상 + 동물** 조합으로 생성
- 예시: `교사_행복한강아지_A3Z`, `학생_빨간고양이_B7X`
- 기억하기 쉽고 입력 오류 최소화

#### 2. 실시간 사이드바
- 브라우저 사이드바에서 항상 접근 가능
- 수업 중 실시간 채팅
- 교사의 링크 공유 (학생들에게 즉시 전달)

#### 3. 수업 관리
- 교사가 수업 시작/종료 제어
- 수업 종료 시 자동으로 새로운 학생 초대 코드 생성
- 학생 접속 상태 실시간 모니터링

#### 4. Firebase 실시간 동기화
- 모든 데이터가 실시간으로 동기화
- 메시지, 접속 상태, 세션 정보 즉시 반영

## 🚀 설치 방법

### 1. Firebase 설정

먼저 Firebase 프로젝트가 필요합니다:

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
2. Firestore Database 활성화
3. Authentication > 이메일/비밀번호 로그인 활성화

### 2. 확장 프로그램 로드

1. Chrome에서 `chrome://extensions/` 접속
2. **개발자 모드** 활성화 (우측 상단)
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. `chrome-extension` 폴더 선택

### 3. Firebase 설정 입력

1. 확장 프로그램 아이콘 클릭
2. **옵션 열기** 버튼 클릭
3. Firebase 프로젝트 설정 입력:
   ```javascript
   {
     "apiKey": "your-api-key",
     "authDomain": "your-project.firebaseapp.com",
     "projectId": "your-project-id",
     "storageBucket": "your-project.appspot.com",
     "messagingSenderId": "123456789",
     "appId": "your-app-id"
   }
   ```

## 📚 사용 가이드

### 관리자 시작하기

1. **관리자 가입**
   - 확장 프로그램 팝업에서 "관리자 가입" 탭 선택
   - 이메일, 비밀번호, 표시 이름 입력
   - 계정 생성

2. **교사 초대 코드 발급**
   - 로그인 후 "교사 초대코드 발급" 버튼 클릭
   - 생성된 코드 (예: `교사_용감한사자_X9K`)를 교사에게 전달

### 교사 시작하기

1. **교사 가입**
   - "교사 가입" 탭에서 회원가입
   - 관리자로부터 받은 초대 코드 입력

2. **수업 생성**
   - 로그인 후 "학생 초대코드 발급" 버튼 클릭
   - 생성된 코드를 학생들에게 공유

3. **수업 시작**
   - "클래스 시작" 버튼 클릭
   - 사이드바에서 실시간 채팅 및 링크 공유 가능

4. **수업 종료**
   - "클래스 종료" 버튼 클릭
   - 자동으로 다음 수업용 초대 코드 생성됨

### 학생 시작하기

1. **학생 가입**
   - "학생 가입" 탭에서 회원가입
   - 교사로부터 받은 초대 코드 입력

2. **수업 참여**
   - 로그인 후 대기
   - 교사가 수업을 시작하면 사이드바에서 자동으로 채팅 활성화

3. **사이드바 사용**
   - 브라우저 우측에서 사이드바 열기
   - 실시간 채팅 참여
   - 교사가 공유한 링크 확인 및 클릭

## 🎨 화면 구성

### 팝업 (확장 프로그램 아이콘 클릭)
- 로그인/회원가입
- 초대 코드 관리
- 수업 시작/종료

### 사이드바 (역할별 차별화)

**학생 사이드바:**
```
📚 수업 참여
[수업 상태: 진행 중]
━━━━━━━━━━━━━━━
💬 채팅 영역
━━━━━━━━━━━━━━━
[메시지 입력창]
```

**교사 사이드바:**
```
👨‍🏫 교실 관리
[수업 시작] [수업 종료]
━━━━━━━━━━━━━━━
접속 학생 (5명)
- 김철수 ●
- 이영희 ●
━━━━━━━━━━━━━━━
💬 실시간 채팅
━━━━━━━━━━━━━━━
🔗 링크 공유
[URL 입력] [공유]
━━━━━━━━━━━━━━━
[메시지 입력창]
```

## 🔧 기술 스택

- **Manifest V3**: 최신 Chrome 확장 프로그램 API
- **Firebase SDK 10.12.1**:
  - Firestore: 실시간 데이터베이스
  - Authentication: 사용자 인증
- **Side Panel API**: 브라우저 사이드바 기능
- **ES6 Modules**: 모듈식 코드 구조

## 📁 프로젝트 구조

```
chrome-extension/
├── manifest.json           # 확장 프로그램 설정
├── background/
│   └── service-worker.js   # 백그라운드 서비스 워커
├── popup/                  # 팝업 UI
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── sidebar/                # 사이드바 UI
│   ├── sidebar.html
│   ├── sidebar.js
│   └── sidebar.css
├── options/                # 옵션 페이지
│   ├── options.html
│   └── options.js
├── shared/                 # 공유 모듈
│   ├── firebase.js         # Firebase 초기화
│   └── storage.js          # Chrome Storage API
├── utils/                  # 유틸리티
│   └── codeGenerator.js    # 초대 코드 생성기
└── icons/                  # 아이콘 파일
```

## 🔥 Firestore 데이터 구조

```
firestore/
├── roles/                  # 사용자 역할
│   └── {userId}
│       ├── role: "admin" | "teacher" | "student"
│       ├── adminId: string (선택)
│       └── teacherId: string (선택)
├── inviteCodes/            # 초대 코드
│   └── {code}              # 예: "교사_행복한강아지_A3Z"
│       ├── type: "teacher" | "student"
│       ├── adminId: string
│       ├── teacherId: string (학생용만)
│       ├── consumedBy: string | null
│       └── createdAt: timestamp
├── classSessions/          # 수업 세션
│   └── {teacherId}
│       ├── active: boolean
│       ├── startedAt: timestamp
│       ├── endedAt: timestamp
│       └── messages/       # 채팅 메시지
│           └── {messageId}
│               ├── type: "text" | "link"
│               ├── body: string
│               ├── senderId: string
│               ├── senderName: string
│               └── createdAt: timestamp
└── teachers/               # 교사 정보
    └── {teacherId}
        └── students/       # 접속 학생
            └── {studentId}
                ├── displayName: string
                ├── online: boolean
                └── lastActive: timestamp
```

## 🎯 주요 기능 흐름

### 초대 코드 생성 및 사용
1. 관리자/교사가 코드 생성 요청
2. `codeGenerator.js`가 읽기 쉬운 코드 생성
3. Firestore `inviteCodes` 컬렉션에 저장
4. 사용자가 코드 입력 시 검증 및 소비
5. 역할에 따라 `roles` 컬렉션에 매핑

### 실시간 채팅
1. 교사가 수업 시작 → `classSessions` 활성화
2. 학생들의 사이드바 자동 활성화
3. Firestore 실시간 리스너로 메시지 동기화
4. 새 메시지 → 모든 참여자에게 즉시 표시

### 수업 종료 후 자동 코드 생성
1. 교사가 "클래스 종료" 클릭
2. `handleEndClass()` 함수 실행
3. 세션 종료 처리
4. `createInviteCode("student")` 자동 호출
5. 다음 수업용 코드 즉시 생성

## 🛡️ 보안 고려사항

- Firebase Security Rules 설정 필요
- 초대 코드는 1회용 (consumedBy 필드로 관리)
- 역할 기반 접근 제어 (roles 컬렉션)
- 사용자 인증 필수

## 📝 추천 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 역할 정보는 본인만 읽기 가능
    match /roles/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }

    // 초대 코드는 공개 조회 가능하지만 수정은 생성자만
    match /inviteCodes/{code} {
      allow read: if resource.data.publicLookup == true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }

    // 수업 세션은 교사만 수정 가능
    match /classSessions/{teacherId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == teacherId;

      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
      }
    }

    // 교사 정보는 인증된 사용자만 읽기 가능
    match /teachers/{teacherId}/students/{studentId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == teacherId;
    }
  }
}
```

## 🤝 기여하기

이 프로젝트는 Candy Shop 교육 플랫폼의 일부입니다.

## 📄 라이선스

이 프로젝트는 Candy Shop 프로젝트의 일부입니다.

## 🎓 만든 사람

Candy Shop Team

---

**문제 발생 시:**
1. Chrome 개발자 도구(F12) → Console 탭에서 에러 확인
2. Firebase Console에서 Firestore 데이터 확인
3. 확장 프로그램 재설치 시도

**즐거운 수업 되세요! 🎉**
