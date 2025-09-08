📚 교사 개인화 웹앱 제작을 통한 학급 피드백 시스템 구축

🎯 실행 방법:
1. program/index.html 파일을 더블클릭하여 브라우저에서 실행
2. 자동으로 메인 랜딩 페이지(/lab)가 열립니다
3. "교사용 시스템" 또는 "학생용 시스템" 버튼을 클릭하여 각 기능에 접근

📁 폴더 구조:
├── media/           # 멀티미디어 교육자료
│   └── image/       # 모든 이미지 파일 저장
├── program/         # 실행 가능한 프로그램 파일
│   ├── index.html   # 메인 실행 파일 (더블클릭하여 실행)
│   └── static/      # React 앱 번들 파일들
└── source/          # 소프트웨어 개발 환경
    ├── src/         # React 소스 코드
    ├── public/      # 원본 public 파일들
    ├── package.json # 의존성 설정
    └── ...          # 전체 개발 환경

🔧 기술적 특징:
- HashRouter 사용으로 file:// 프로토콜에서 정상 동작
- media/image/ 경로로 이미지 참조하여 체계적 관리
- 상대경로 설정으로 오프라인 실행 가능
- 자동 리다이렉트 스크립트로 /lab 페이지 진입

🌐 온라인 버전:
- 웹사이트: https://candy-shop-8394b.web.app
- 메인 랜딩 페이지: https://candy-shop-8394b.web.app/lab

💻 권장 환경:
- 브라우저: Chrome, Firefox, Safari, Edge 최신 버전
- 인터넷 연결: Firebase 데이터베이스 접속을 위해 필요

🔧 주요 기능:
- 교사용: 학생 관리, 퀴즈 시스템, 리워드 관리, 감정 출석부, AI 분석
- 학생용: 개인 대시보드, 퀴즈 참여, 포인트 관리, 감정 기록
- 역사 학습: 지도 기반 학습, 군집 분석 (K-means 클러스터링)

🔍 기술 스택:
- Frontend: React.js (HashRouter), Material-UI
- Backend: Firebase (Firestore, Authentication, Hosting)
- Maps: Google Maps JavaScript API
- 기타: Chart.js, HTML2Canvas, jsPDF

✨ 특별 기능:
- 파일로 직접 실행 시 자동으로 #/lab 페이지로 이동
- 웹에서는 기존 라우팅 구조 유지
- 반응형 디자인으로 모바일/태블릿 지원
- K-means 클러스터링 기반 지리적 데이터 분석

🚀 실행 확인사항:
✅ program/index.html 더블클릭으로 즉시 실행
✅ media/image/ 구조로 체계적 이미지 관리
✅ source/ 폴더에 완전한 개발 환경 포함
✅ 상대경로로 모든 리소스 로드
✅ 오프라인 환경에서도 UI 정상 표시

📞 개발정보:
- 주요 개발언어: JavaScript (React.js)
- 개발도구: Node.js, Firebase CLI, Google Cloud SDK
- 데이터베이스: Firebase Firestore
- 지도API: Google Maps JavaScript API

📞 문의:
프로젝트 관련 문의사항이 있으시면 GitHub 저장소를 참고해주세요.