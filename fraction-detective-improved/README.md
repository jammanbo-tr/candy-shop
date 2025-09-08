# 🕵️‍♀️ 알쏭달쏭 분수 탐정단

초등학생을 위한 재미있는 분수 뺄셈 학습 게임입니다.

## 🎯 프로젝트 목표

- 분수 뺄셈을 스토리텔링을 통해 재미있게 학습
- 즉각적인 피드백으로 학습 효과 극대화
- 모바일 친화적인 반응형 디자인
- 접근성을 고려한 사용자 경험

## ✨ 주요 기능

### 🎮 게임 기능
- **스토리 기반 문제**: 일상생활 속 상황을 분수 문제로 구성
- **진행률 표시**: 실시간 진행 상황 및 점수 확인
- **힌트 시스템**: 어려운 문제에 대한 단계별 힌트 제공
- **음향 효과**: 정답/오답에 따른 사운드 피드백
- **애니메이션**: 시각적 만족도를 높이는 CSS 애니메이션

### 📱 사용자 경험
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 모든 기기 지원
- **키보드 지원**: Enter 키로 답안 제출 가능
- **접근성**: 스크린 리더 친화적 설계
- **직관적 UI**: 초등학생도 쉽게 사용할 수 있는 인터페이스

## 🛠 기술 스택

### 현재 구현
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **스타일링**: Tailwind CSS, Custom CSS
- **애니메이션**: Animate.css, CSS Animations
- **폰트**: Google Fonts (Jua)
- **음향**: Web Audio API

### 권장 개발 환경

#### 🌟 추천 기술 스택 (업그레이드 버전)

```javascript
// 1. React + TypeScript 버전
{
  "framework": "React 18 + TypeScript",
  "bundler": "Vite",
  "styling": "Tailwind CSS + Framer Motion",
  "state": "Zustand 또는 Context API",
  "testing": "Jest + React Testing Library",
  "deployment": "Vercel 또는 Netlify"
}

// 2. Next.js 버전 (더 발전된 기능 원할 시)
{
  "framework": "Next.js 14 + TypeScript",
  "styling": "Tailwind CSS + shadcn/ui",
  "animation": "Framer Motion",
  "backend": "Next.js API Routes + Prisma",
  "database": "PostgreSQL 또는 MongoDB",
  "auth": "NextAuth.js",
  "deployment": "Vercel"
}
```

## 🚀 시작하기

### 현재 버전 실행
```bash
# 1. 간단한 서버 실행
npx http-server . -p 3000

# 2. 또는 live-server 사용 (자동 새로고침)
npx live-server --port=3000

# 3. 브라우저에서 http://localhost:3000 접속
```

### 개발 환경 설정 (권장)
```bash
# Node.js 설치 확인 (18.0.0 이상 권장)
node --version

# 프로젝트 의존성 설치
npm install

# 개발 서버 시작
npm run dev

# 빌드 (최적화)
npm run build
```

## 📁 프로젝트 구조

```
fraction-detective-improved/
├── index.html              # 메인 HTML 파일
├── package.json            # 프로젝트 설정
├── README.md              # 프로젝트 문서
├── scripts/               # 빌드 스크립트
│   └── optimize.js        # 최적화 스크립트
├── assets/                # 정적 리소스
│   ├── images/           # 이미지 파일
│   ├── sounds/           # 음향 파일
│   └── fonts/            # 웹폰트
└── docs/                  # 문서
    ├── development.md     # 개발 가이드
    └── deployment.md      # 배포 가이드
```

## 🔧 개발 권장사항

### 1. 운영 환경
```yaml
개발 언어: 
  - 현재: HTML/CSS/JavaScript (ES6+)
  - 권장: TypeScript + React/Next.js

서버 환경:
  - 개발: Node.js + Express 또는 Vite Dev Server
  - 프로덕션: Vercel, Netlify, Firebase Hosting

데이터베이스:
  - 현재: 로컬 데이터 (problems 배열)
  - 권장: PostgreSQL + Prisma 또는 Firebase Firestore

모니터링:
  - Google Analytics
  - Sentry (에러 추적)
  - Vercel Analytics
```

### 2. 성능 최적화
- **이미지 최적화**: WebP 포맷 사용
- **코드 분할**: 라우팅별 지연 로딩
- **캐싱**: 서비스 워커 구현
- **압축**: Gzip/Brotli 압축

### 3. 교육적 개선사항
- **학습 분석**: 사용자 진행률 추적
- **적응형 학습**: 난이도 자동 조절
- **게이미피케이션**: 배지, 레벨 시스템
- **다국어 지원**: i18n 구현

## 📊 개발 로드맵

### Phase 1: 기본 기능 완성 ✅
- [x] 분수 계산 로직
- [x] 기본 UI/UX
- [x] 반응형 디자인

### Phase 2: 향상된 기능 🚧
- [ ] 사용자 진행률 저장
- [ ] 더 많은 문제 추가
- [ ] 난이도별 분류
- [ ] 성취도 분석

### Phase 3: 고급 기능 📋
- [ ] 멀티플레이어 모드
- [ ] 교사용 대시보드
- [ ] 학습 분석 리포트
- [ ] API 연동

## 🎨 디자인 시스템

### 컬러 팔레트
```css
/* Primary Colors */
--amber-600: #d97706;     /* 메인 브랜딩 */
--blue-600: #2563eb;      /* 정답 */
--green-500: #10b981;     /* 성공 */
--red-500: #ef4444;       /* 오답 */
--purple-500: #8b5cf6;    /* 힌트 */

/* Gradients */
background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
```

### 타이포그래피
- **헤딩**: Jua (Google Fonts)
- **본문**: system-ui 폴백
- **크기**: 반응형 텍스트 스케일

## 🔍 품질 보증

### 테스트 전략
```javascript
// 단위 테스트
describe('분수 계산', () => {
  test('분수 뺄셈 정확성', () => {
    expect(subtractFractions(1, 2, 1, 4)).toEqual([1, 4]);
  });
});

// E2E 테스트
describe('게임 플로우', () => {
  test('전체 게임 완주', async () => {
    // 게임 시작부터 완료까지
  });
});
```

### 접근성 체크리스트
- [ ] 키보드 네비게이션
- [ ] 스크린 리더 지원
- [ ] 색상 대비 준수
- [ ] 텍스트 크기 조절

## 📈 배포 및 운영

### 배포 옵션
1. **정적 호스팅**: Vercel, Netlify (무료)
2. **클라우드**: AWS S3 + CloudFront
3. **Firebase**: Firebase Hosting + Functions

### 모니터링
```javascript
// Google Analytics 4
gtag('config', 'GA_MEASUREMENT_ID');

// 사용자 행동 추적
gtag('event', 'problem_solved', {
  'problem_number': currentProblem,
  'attempts': attempts,
  'time_spent': timeSpent
});
```

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능

## 📞 지원

- **이슈 리포트**: GitHub Issues
- **기능 요청**: GitHub Discussions
- **문의사항**: [이메일 주소]

---

**🎯 교육적 가치를 높이는 재미있는 수학 학습 경험을 만들어봅시다!**




