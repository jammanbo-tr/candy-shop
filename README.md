# Jammanbo Play Creator

A comprehensive gaming platform with various interactive experiences.

## 🎮 Games Collection

### 🍭 RYTHM CANDY
**Location:** `./rythm-candy-game/`

타이밍에 맞춰 터치하는 네온 스타일의 리듬 액션 게임

#### 주요 기능:
- 🎯 타이밍 기반 리듬 액션 게임플레이
- 🎨 화려한 네온 비주얼 효과와 파티클 시스템
- 📈 레벨업 시스템과 난이도 증가
- 💾 로컬 스토리지 베스트 스코어
- 📱 PC 및 모바일 지원

#### 플레이 방법:
1. `rythm-candy-game/index.html` 파일을 웹 브라우저에서 열기
2. PC: 스페이스바 또는 마우스 클릭
3. 모바일: 화면 터치

---

## Original Project Description

Jammanbo Play Creator is a gaming platform that allows users to create, play, and share various interactive gaming experiences. 

## Chrome Extension · Classroom Relay

Manifest V3 기반의 크롬 확장프로그램으로 관리자·교사·학생이 Firebase를 통해 연결되어 수업을 운영할 수 있습니다. 확장 자산은 `chrome-extension/` 아래에 존재합니다.

### 주요 기능

- Email/Password Auth와 Firestore를 활용한 역할별 로그인/가입
- 초대코드 기반 관리자→교사→학생 순 가입 흐름
- 교사의 학생 실시간 접속 상태 모니터링 (Firestore snapshot listener)
- 교사 클래스 시작 시 Firestore 컬렉션을 활용한 실시간 채팅룸 개설
- 옵션 페이지에서 Firebase 웹 앱 구성 정보 저장 (`chrome.storage.sync`)

### 디렉터리 구조

```
chrome-extension/
├── manifest.json
├── background/service-worker.js
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── options/
│   ├── options.html
│   ├── options.css
│   └── options.js
└── shared/
    ├── firebase.js
    └── storage.js
```

### Firebase 설정 절차

1. Firebase 콘솔에서 새 프로젝트 생성 후 Firestore(네이티브 모드)와 Email/Password 인증을 활성화합니다.
2. `루트/firestore.rules` 내용을 Firestore 보안 규칙에 적용하고 배포합니다.
3. 프로젝트 설정 > 일반 > 웹 앱 구성에서 `apiKey`, `authDomain`, `projectId` 등을 복사합니다.
4. 확장을 로드한 뒤 팝업의 “옵션” 버튼 또는 `chrome-extension/options/options.html`에 접근해 구성 값을 저장합니다.

### Firestore 주요 컬렉션

- `roles/{uid}`: 사용자 역할 및 상위 관리자/교사 식별자.
- `inviteCodes/{code}`: 초대코드 정보(`publicLookup`로 미가입자 검증 허용, 사용 시 비활성화).
- `teachers/{uid}` / `teachers/{uid}/students/{studentUid}`: 교사/학생 실시간 상태 문서.
- `classSessions/{teacherId}` / `classSessions/{teacherId}/messages/{messageId}`: 수업 세션 정보와 채팅 메시지.
- `status/{uid}`: 사용자 온라인 상태 스냅샷(교사용 뷰 동기화를 위해 중복 기록).

### 확장 빌드 및 로드

1. 크롬에서 `chrome://extensions` 이동 후 우측 상단 “개발자 모드” 활성화.
2. “압축해제된 확장 프로그램을 로드합니다” 클릭 후 `chrome-extension/` 폴더 선택.
3. 옵션 페이지에서 Firebase 구성을 저장하고, 관리자 계정을 생성한 뒤 순차적으로 초대코드 흐름을 진행합니다.

### 배포 시 주의사항

- Firebase 프로젝트별로 확장 옵션 페이지에서 설정을 초기화하고 재입력해야 합니다.
- `firestore.rules` 예제는 최소 권한 원칙에 따라 작성되었으며, 실제 서비스 정책에 맞춰 추가 점검이 필요합니다.
- 초대코드 문서에 `publicLookup: true` 필드를 사용해 미인증 조회를 허용하므로, 배포 환경에서는 만료 시간 등을 추가해 보안을 강화하세요.
- 채팅/상태 정보는 Firestore 실시간 리스너 기반이므로, 사용 패턴에 따라 읽기/쓰기 비용을 모니터링하세요.
