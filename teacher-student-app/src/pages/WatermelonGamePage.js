import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { addDoc, collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const WatermelonGamePage = () => {
  // CSS 애니메이션 스타일 추가
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const loadedImages = useRef({});
  
  // 새로운 상태들
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [gameTimeLeft, setGameTimeLeft] = useState(300); // 5분 = 300초
  const [gameTimerStarted, setGameTimerStarted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const gameStartTimeRef = useRef(null);
  const nextItemLevel = useRef(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSmallMobile, setIsSmallMobile] = useState(window.innerWidth <= 480);

  // 게임 초기화 함수 (useCallback으로 먼저 정의)
  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 모바일 반응형 캔버스 크기
    const canvasWidth = isMobile ? Math.min(window.innerWidth - 40, 400) : 600;
    const canvasHeight = isMobile ? Math.round(canvasWidth * 4/3) : 800;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    const game = new WatermelonGame(canvas);
    gameRef.current = game;
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setCurrentLevel(1);
  }, [isMobile]);

  // 8단계 한국사 아이템 정의
  const historyItems = useMemo(() => ({
    1: { name: '삼국시대', emoji: '🏺', color: '#8B4513', size: 50, score: 1, image: '/melon1.png', description: '고구려, 백제, 신라가 한반도를 나누어 다스리던 시대 (기원후 1~7세기)' },
    2: { name: '근초고왕', emoji: '👑', color: '#FFD700', size: 65, score: 3, image: '/melon2.png', description: '백제의 전성기를 이끈 왕 (재위 346~375년), 한강 유역을 장악하고 왜에까지 세력을 확장했습니다.' },
    3: { name: '광개토대왕', emoji: '⚔️', color: '#B22222', size: 85, score: 7, image: '/melon3.png', description: '고구려의 영토를 만주와 한반도 북부로 크게 확장한 정복군주 (재위 391~413년)' },
    4: { name: '진흥왕', emoji: '🏛️', color: '#4169E1', size: 110, score: 15, image: '/melon4.png', description: '신라의 영토를 한강 유역까지 확장하며 삼국통일의 기반을 마련한 왕 (재위 540~576년)' },
    5: { name: '금동대향로', emoji: '🔥', color: '#FF6347', size: 145, score: 31, image: '/melon5.png', description: '백제의 뛰어난 공예 기술을 보여주는 국보 제287호, 정교한 장식이 특징입니다.' },
    6: { name: '고구려벽화', emoji: '🖼️', color: '#9932CC', size: 190, score: 63, image: '/melon6.png', description: '고구려 고분에 그려진 벽화들, 당시의 생활상과 사상을 보여주는 귀중한 문화유산입니다.' },
    7: { name: '첨성대', emoji: '🗼', color: '#20B2AA', size: 245, score: 127, image: '/melon7.png', description: '신라 선덕여왕 때 건설된 동양 최고(最古)의 천문대 (632~647년 건설)' },
    8: { name: '삼국통일', emoji: '🗺️', color: '#FF1493', size: 320, score: 255, image: '/melon8.png', description: '676년 신라가 고구려와 백제를 멸망시키고 당나라 세력을 축출하여 이룬 한반도 통일' }
  }), []);

  // 이미지 로드 함수
  const loadImages = useCallback(() => {
    let loadedCount = 0;
    const totalImages = Object.keys(historyItems).length;
    
    Object.entries(historyItems).forEach(([level, item]) => {
      const img = new Image();
      img.onload = () => {
        loadedImages.current[level] = img;
        loadedCount++;
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        console.error(`Failed to load image: ${item.image}`);
        loadedCount++;
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
      img.src = item.image;
    });
  }, [historyItems]);

  // 컴포넌트 마운트 시 이미지 로드 및 자동 시작
  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // 화면 크기 변화 감지
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsSmallMobile(window.innerWidth <= 480);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 컴포넌트 로드 시 저장된 플레이어 정보 복원
  useEffect(() => {
    const savedSchool = localStorage.getItem('watermelon_school');
    const savedPlayer = localStorage.getItem('watermelon_player');
    
    if (savedSchool) {
      setSchoolName(savedSchool);
      console.log('저장된 학교명 복원:', savedSchool);
    }
    if (savedPlayer) {
      setPlayerName(savedPlayer);
      console.log('저장된 플레이어명 복원:', savedPlayer);
    }
  }, []);
  
  // 이미지 로드 완료 시 자동 게임 시작 (이제 모달 닫힌 후)
  useEffect(() => {
    if (imagesLoaded && !gameStarted && !gameOver && !showWelcomeModal && !showUserInfoModal && playerName && schoolName) {
      console.log('게임 자동 시작 조건 만족');
      setTimeout(() => {
        initGame();
        setGameTimerStarted(true);
        gameStartTimeRef.current = Date.now();
      }, 500);
    }
  }, [imagesLoaded, gameStarted, gameOver, showWelcomeModal, showUserInfoModal, playerName, schoolName, initGame]);

  // 게임 타이머
  useEffect(() => {
    if (!gameTimerStarted || gameOver || isPaused) return;

    const timer = setInterval(() => {
      setGameTimeLeft(prev => {
        if (prev <= 1) {
          // 시간 끝! 게임 종료
          const currentGameScore = gameRef.current?.currentScore || score;
          console.log('시간 종료로 게임 오버 - 게임 내부 점수:', currentGameScore);
          setGameOver(true);
          setFinalScore(currentGameScore);
          setScore(currentGameScore);
          // 점수 자동 저장
          setTimeout(() => {
            saveScoreToLeaderboard();
          }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameTimerStarted, gameOver, isPaused, score]);

  // 실시간 리더보드 구독 관리
  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;
    
    if (showLeaderboard && playerName && schoolName && db) {
      console.log('리더보드 실시간 구독 시작');
      try {
        console.log('실시간 리더보드 구독 시작...');
        
        try {
          const q = query(
            collection(db, 'watermelon_leaderboard'),
            orderBy('score', 'desc')
          );
          
          unsubscribe = onSnapshot(q, 
            (querySnapshot) => {
              try {
                const allLeaderboard = [];
                querySnapshot.forEach((doc) => {
                  const data = doc.data();
                  // 데이터 유효성 검사
                  if (data && data.playerName && data.schoolName && typeof data.score === 'number') {
                    allLeaderboard.push({ id: doc.id, ...data });
                  }
                });
                
                console.log('실시간 리더보드 업데이트:', allLeaderboard.length, '개 항목');
                
                if (allLeaderboard.length === 0) {
                  setLeaderboardData({
                    leaderboard: [],
                    currentPlayerRank: null,
                    currentPlayerData: null
                  });
                  return;
                }
                
                // 현재 플레이어의 순위 찾기
                let currentPlayerRank = null;
                let currentPlayerData = null;
                
                allLeaderboard.forEach((entry, index) => {
                  if (entry.playerName === playerName && entry.schoolName === schoolName) {
                    if (!currentPlayerRank || Math.abs(entry.score - (finalScore || score)) < Math.abs(currentPlayerData.score - (finalScore || score))) {
                      currentPlayerRank = index + 1;
                      currentPlayerData = { ...entry, rank: index + 1 };
                    }
                  }
                });
                
                // Top 10에 실제 순위 정보 추가
                let displayLeaderboard = allLeaderboard.slice(0, 10).map((entry, index) => ({
                  ...entry,
                  actualRank: index + 1,
                  isCurrentPlayer: entry.playerName === playerName && entry.schoolName === schoolName
                }));
                
                // 현재 플레이어가 Top 10에 없다면 추가
                if (currentPlayerData && currentPlayerRank > 10) {
                  displayLeaderboard.push({
                    ...currentPlayerData,
                    isCurrentPlayer: true,
                    actualRank: currentPlayerRank
                  });
                }
                
                setLeaderboardData({
                  leaderboard: displayLeaderboard,
                  currentPlayerRank,
                  currentPlayerData
                });
              } catch (error) {
                console.error('리더보드 데이터 처리 오류:', error);
              }
            }, 
            (error) => {
              console.error('실시간 리더보드 구독 오류:', error);
              // 오류 발생 시 아무것도 하지 않음 - 에러 상태 유지
            }
          );
        } catch (error) {
          console.error('실시간 리더보드 구독 초기화 오류:', error);
          // 오류 발생 시 아무것도 하지 않음
          unsubscribe = () => {}; // 빈 unsubscribe 함수 설정
        }
      } catch (error) {
        console.error('구독 시작 오류:', error);
        // 에러 발생 시 아무것도 하지 않음
      }
    }
    
    return () => {
      isMounted = false;
      if (unsubscribe && typeof unsubscribe === 'function') {
        try {
          console.log('리더보드 실시간 구독 해제');
          unsubscribe();
        } catch (error) {
          console.error('구독 해제 오류:', error);
        }
      }
    };
  }, [showLeaderboard, playerName, schoolName]);

  // 리더보드에 점수 저장
  const saveScoreToLeaderboard = useCallback(async () => {
    // 플레이어 정보가 없으면 로컬 스토리지에서 복원 시도
    let currentSchool = schoolName;
    let currentPlayer = playerName;
    
    if (!currentSchool || !currentPlayer) {
      const savedSchool = localStorage.getItem('watermelon_school');
      const savedPlayer = localStorage.getItem('watermelon_player');
      
      if (savedSchool && savedPlayer) {
        currentSchool = savedSchool;
        currentPlayer = savedPlayer;
        setSchoolName(savedSchool);
        setPlayerName(savedPlayer);
        console.log('로컬 스토리지에서 플레이어 정보 복원:', { savedSchool, savedPlayer });
      }
    }
    
    // 여전히 정보가 없으면 에러
    if (!currentPlayer || !currentSchool) {
      console.error('플레이어 정보가 없습니다');
      alert('플레이어 정보가 없습니다. 학교명과 닉네임을 확인해주세요.');
      return;
    }

    console.log('Firebase DB 상태 확인:', db);
    console.log('addDoc 함수 확인:', addDoc);
    console.log('collection 함수 확인:', collection);

    try {
      // 게임 인스턴스에서 직접 점수를 가져오거나 React 상태 사용
      let currentScore = finalScore || score;
      
      // 게임이 실행 중이거나 방금 끝났다면 게임 인스턴스의 점수 사용
      if (gameRef.current && gameRef.current.currentScore !== undefined) {
        currentScore = gameRef.current.currentScore;
        console.log('게임 인스턴스에서 점수 가져옴:', currentScore);
      }
      
      console.log('점수 저장 시 상태 확인:', {
        finalScore,
        score,
        gameInstanceScore: gameRef.current?.currentScore,
        currentScore,
        gameStarted,
        gameOver
      });
      
      const now = new Date();
      const scoreData = {
        playerName: currentPlayer.trim(),
        schoolName: currentSchool.trim(),
        score: Math.max(currentScore, 0), // 최소 0점 보장
        timestamp: now.getTime(), // Unix timestamp 사용
        gameDate: now.toISOString().split('T')[0],
        createdAt: now.toISOString() // ISO 문자열도 추가
      };
      
      console.log('점수 저장 시도:', scoreData);
      console.log('DB Collection 경로:', 'watermelon_leaderboard');
      
      const collectionRef = collection(db, 'watermelon_leaderboard');
      console.log('Collection 참조:', collectionRef);
      
      const docRef = await addDoc(collectionRef, scoreData);
      console.log('점수 저장 성공! 문서 ID:', docRef.id);
      
      console.log(`점수가 성공적으로 저장되었습니다! 문서 ID: ${docRef.id}`);
      
      // 실시간 리더보드가 자동으로 업데이트됩니다
      setShowLeaderboard(true);
      
    } catch (error) {
      console.error('리더보드 저장 상세 오류:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error stack:', error.stack);
      
      // 상세 오류 정보 표시
      let errorMessage = '점수 저장 중 오류가 발생했습니다.\\n\\n';
      if (error.code === 'permission-denied') {
        errorMessage += '권한이 없습니다. Firebase 보안 규칙을 확인해주세요.';
      } else if (error.code === 'unavailable') {
        errorMessage += '네트워크 연결을 확인해주세요.';
      } else if (error.code === 'unauthenticated') {
        errorMessage += '인증이 필요합니다. 로그인 상태를 확인해주세요.';
      } else {
        errorMessage += `오류 코드: ${error.code || 'unknown'}\\n메시지: ${error.message}`;
      }
      
      alert(errorMessage);
    }
  }, [playerName, schoolName, finalScore, score]);


  // 기존 loadLeaderboard 함수 (초기 로딩용)
  const loadLeaderboard = useCallback(async () => {
    try {
      console.log('리더보드 로딩 시작...');
      
      // 모든 점수를 가져와서 현재 플레이어의 실제 순위 찾기
      const q = query(
        collection(db, 'watermelon_leaderboard'),
        orderBy('score', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const allLeaderboard = [];
      querySnapshot.forEach((doc) => {
        allLeaderboard.push({ id: doc.id, ...doc.data() });
      });
      
      console.log('로드된 데이터:', allLeaderboard);
      
      if (allLeaderboard.length === 0) {
        // 데이터가 없는 경우
        setLeaderboardData({
          leaderboard: [],
          currentPlayerRank: null,
          currentPlayerData: null
        });
        setShowLeaderboard(true);
        return;
      }
      
      // 현재 플레이어의 순위 찾기
      let currentPlayerRank = null;
      let currentPlayerData = null;
      
      allLeaderboard.forEach((entry, index) => {
        if (entry.playerName === playerName && entry.schoolName === schoolName) {
          if (!currentPlayerRank || Math.abs(entry.score - (finalScore || score)) < Math.abs(currentPlayerData.score - (finalScore || score))) {
            currentPlayerRank = index + 1;
            currentPlayerData = { ...entry, rank: index + 1 };
          }
        }
      });
      
      // Top 10에 실제 순위 정보 추가
      let displayLeaderboard = allLeaderboard.slice(0, 10).map((entry, index) => ({
        ...entry,
        actualRank: index + 1,
        isCurrentPlayer: entry.playerName === playerName && entry.schoolName === schoolName
      }));
      
      // 현재 플레이어가 Top 10에 없다면 추가
      if (currentPlayerData && currentPlayerRank > 10) {
        displayLeaderboard.push({
          ...currentPlayerData,
          isCurrentPlayer: true,
          actualRank: currentPlayerRank
        });
      }
      
      setLeaderboardData({
        leaderboard: displayLeaderboard,
        currentPlayerRank,
        currentPlayerData
      });
      setShowLeaderboard(true);
    } catch (error) {
      console.error('리더보드 로드 오류:', error);
      alert('리더보드 로딩 중 오류가 발생했습니다: ' + error.message);
    }
  }, [playerName, schoolName, finalScore, score]);

  // 웰컴 모달 닫기
  const handleWelcomeNext = () => {
    setShowWelcomeModal(false);
    setShowUserInfoModal(true);
  };

  // 사용자 정보 입력 완료
  const handleUserInfoSubmit = () => {
    if (playerName.trim() && schoolName.trim()) {
      // 로컬 스토리지에도 저장하여 정보 유지
      localStorage.setItem('watermelon_school', schoolName.trim());
      localStorage.setItem('watermelon_player', playerName.trim());
      console.log('플레이어 정보 저장됨:', { schoolName: schoolName.trim(), playerName: playerName.trim() });
      setShowUserInfoModal(false);
    }
  };

  // 게임 그만하기 (진행 중 종료)
  const quitGame = () => {
    if (gameStarted && !gameOver) {
      setGameOver(true);
      setGameTimerStarted(false);
      setFinalScore(score);
      // 점수 자동 저장
      setTimeout(() => {
        saveScoreToLeaderboard();
      }, 500);
    }
  };


  // 게임 아이템 클래스
  class GameItem {
    constructor(x, y, level) {
      this.x = x;
      this.y = y;
      this.level = level;
      this.radius = historyItems[level].size / 2;
      this.vx = 0;
      this.vy = 0;
      this.color = historyItems[level].color;
      this.emoji = historyItems[level].emoji;
      this.name = historyItems[level].name;
      this.merged = false;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.6; // 중력을 약간 증가 (더 자연스러운 낙하)

      // 상단 경계 체크 (게임 영역 위쪽)
      if (this.y - this.radius < 120) {
        this.y = 120 + this.radius;
        this.vy = Math.abs(this.vy) * 0.3; // 위쪽 충돌 시 아래로 밀어냄
      }

      // 바닥 충돌
      if (this.y + this.radius > 720) {
        this.y = 720 - this.radius;
        this.vy *= -0.3;
        this.vx *= 0.85; // 바닥 마찰력 약간 증가
        this.isDropping = false; // 바닥에 닿으면 드롭 완료
      }

      // 벽 충돌 (게임 영역 경계)
      if (this.x - this.radius < 40) {
        this.x = 40 + this.radius;
        this.vx *= -0.7; // 벽 반발계수 조정
      }
      if (this.x + this.radius > 560) {
        this.x = 560 - this.radius;
        this.vx *= -0.7; // 벽 반발계수 조정
      }

      // 공기 저항 및 마찰력
      this.vx *= 0.995; // 수평 마찰력 약간 증가
      if (Math.abs(this.vy) < 0.1 && this.y + this.radius >= 720) {
        this.vy = 0; // 바닥에서 미세한 진동 방지
      }
      
      // 속도가 충분히 느려지면 드롭 상태 해제
      if (this.isDropping && Math.abs(this.vx) < 0.5 && Math.abs(this.vy) < 0.5) {
        this.isDropping = false;
      }
    }

    draw(ctx) {
      // 그림자
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(this.x + 3, this.y + 3, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // 로드된 이미지 사용
      const img = loadedImages.current[this.level];
      
      if (img) {
        // 이미지가 로드되면 원형으로 클리핑해서 그리기
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.clip();
        
        // 이미지를 원형에 맞게 그리기
        const imgSize = this.radius * 2;
        ctx.drawImage(img, this.x - this.radius, this.y - this.radius, imgSize, imgSize);
        
        ctx.restore();
        
        // 테두리
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // 이미지가 로드되지 않은 경우 기본 원형 배경
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 테두리
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 이모지
        ctx.font = `${this.radius * 1.2}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.x, this.y);
      }

      // 단계명 표시 (공의 중앙 하단)
      const fontSize = Math.min(this.radius / 3, 16);
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 텍스트 배경 (반투명 검은색)
      const textWidth = ctx.measureText(this.name).width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(this.x - textWidth/2 - 4, this.y + this.radius/3 - fontSize/2 - 2, textWidth + 8, fontSize + 4);
      
      // 텍스트 그리기 (테두리 효과)
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.strokeText(this.name, this.x, this.y + this.radius/3);
      ctx.fillStyle = 'white';
      ctx.fillText(this.name, this.x, this.y + this.radius/3);
    }

    checkCollision(other) {
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < this.radius + other.radius;
    }
  }

  // 게임 클래스
  class WatermelonGame {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.items = [];
      this.nextItem = null;
      this.dropX = 300;
      this.gameRunning = true;
      this.currentScore = 0; // 게임 내부 점수 추적
      console.log('WatermelonGame 생성자 호출 - 게임 시작');
      this.initNextItem();
    }

    initNextItem() {
      const level = Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 2 : 3;
      nextItemLevel.current = level; // 다음 아이템 레벨 저장
      this.nextItem = new GameItem(this.dropX, 140, level);
      this.nextItem.isDropping = false; // 드롭 중이 아님
    }

    dropItem() {
      if (!this.nextItem || !this.gameRunning) return;
      
      // 드롭 아이템에 초기 속도 부여
      this.nextItem.isDropping = true;
      this.nextItem.vy = 3; // 초기 드롭 속도
      this.items.push(this.nextItem);
      this.initNextItem();
    }

    update() {
      if (!this.gameRunning) return;

      // 아이템 업데이트
      this.items.forEach(item => item.update());

      // 충돌 및 합성 체크
      for (let i = 0; i < this.items.length; i++) {
        for (let j = i + 1; j < this.items.length; j++) {
          const item1 = this.items[i];
          const item2 = this.items[j];

          if (item1.checkCollision(item2)) {
            // 같은 레벨이면 합성
            if (item1.level === item2.level && !item1.merged && !item2.merged && item1.level < 8) {
              const newX = (item1.x + item2.x) / 2;
              const newY = (item1.y + item2.y) / 2;
              const newLevel = item1.level + 1;
              
              // 점수 추가 (내부 점수와 React 상태 모두 업데이트)
              const scoreToAdd = historyItems[newLevel].score;
              this.currentScore += scoreToAdd;
              setScore(this.currentScore);
              setCurrentLevel(prev => Math.max(prev, newLevel));
              console.log(`점수 추가: +${scoreToAdd}, 총 점수: ${this.currentScore}`);

              // 기존 아이템 제거
              this.items.splice(Math.max(i, j), 1);
              this.items.splice(Math.min(i, j), 1);

              // 새 아이템 추가
              this.items.push(new GameItem(newX, newY, newLevel));
              break;
            } else {
              // 물리적 충돌 처리
              const dx = item2.x - item1.x;
              const dy = item2.y - item1.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const overlap = item1.radius + item2.radius - distance;

              if (overlap > 0) {
                const separateX = (dx / distance) * overlap * 0.5;
                const separateY = (dy / distance) * overlap * 0.5;

                // 위치 분리
                item1.x -= separateX;
                item1.y -= separateY;
                item2.x += separateX;
                item2.y += separateY;

                // 경계 체크 - 분리 후 경계를 벗어나지 않도록 보정
                // item1 경계 체크
                if (item1.x - item1.radius < 40) item1.x = 40 + item1.radius;
                if (item1.x + item1.radius > 560) item1.x = 560 - item1.radius;
                if (item1.y + item1.radius > 720) item1.y = 720 - item1.radius;
                if (item1.y - item1.radius < 120) item1.y = 120 + item1.radius;

                // item2 경계 체크
                if (item2.x - item2.radius < 40) item2.x = 40 + item2.radius;
                if (item2.x + item2.radius > 560) item2.x = 560 - item2.radius;
                if (item2.y + item2.radius > 720) item2.y = 720 - item2.radius;
                if (item2.y - item2.radius < 120) item2.y = 120 + item2.radius;

                // 속도 교환 (탄성 충돌)
                const vx1 = item1.vx, vy1 = item1.vy;
                const vx2 = item2.vx, vy2 = item2.vy;

                item1.vx = vx2 * 0.8;
                item1.vy = vy2 * 0.8;
                item2.vx = vx1 * 0.8;
                item2.vy = vy1 * 0.8;
              }
            }
          }
        }
      }

      // 게임 오버 체크 (정지된 아이템이 위험선에 닿으면)
      const dangerLine = 180; // 위험선을 더 높게 조정 (절반 정도 찰 때까지 게임 지속)
      const staticItems = this.items.filter(item => 
        !item.isDropping && 
        Math.abs(item.vy) < 0.5 && 
        Math.abs(item.vx) < 0.5
      );
      
      // 게임 시작 후 최소 8초 후에만 위험선 체크 (충분한 안정화 시간)
      const gameStartTime = gameStartTimeRef.current;
      const gameRunningTime = gameStartTime ? Date.now() - gameStartTime : 0;
      
      // 위험선을 넘는 정지된 아이템들 체크 (연속 2초간 위험선 위에 있어야 게임오버)
      const dangerousItems = staticItems.filter(item => item.y - item.radius < dangerLine);
      
      if (gameRunningTime > 8000 && dangerousItems.length > 0) {
        if (!this.dangerTime) {
          this.dangerTime = Date.now();
        } else if (Date.now() - this.dangerTime > 2000) { // 2초 대기
          console.log('위험선 터치로 게임 오버 - 게임 진행 시간:', gameRunningTime + 'ms', '내부 점수:', this.currentScore);
          this.gameRunning = false;
          setGameOver(true);
          setFinalScore(this.currentScore); // 내부 점수 사용
          setScore(this.currentScore); // React 상태도 최종 업데이트
          console.log('finalScore 설정됨:', this.currentScore);
          // 점수 자동 저장
          setTimeout(() => {
            saveScoreToLeaderboard();
          }, 500);
        }
      } else {
        this.dangerTime = null; // 위험 상태 해제
      }
    }

    draw() {
      // 배경 그라데이션
      const gradient = this.ctx.createLinearGradient(0, 0, 0, 800);
      gradient.addColorStop(0, '#FFF8DC');
      gradient.addColorStop(1, '#F5DEB3');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, 600, 800);

      // 게임 영역 테두리 (둥근 모서리)
      this.ctx.strokeStyle = '#8B4513';
      this.ctx.lineWidth = 8;
      this.ctx.fillStyle = '#FFFFE0';
      this.ctx.fillRect(20, 120, 560, 600);
      this.ctx.strokeRect(20, 120, 560, 600);

      // 위험 라인 (게임 오버 라인)
      const dangerLine = 180; // 위험선을 더 높게 조정 (절반 정도 찰 때까지 게임 지속)
      this.ctx.strokeStyle = '#FF4444';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([10, 10]);
      this.ctx.beginPath();
      this.ctx.moveTo(20, dangerLine);
      this.ctx.lineTo(580, dangerLine);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      
      // 위험 라인 텍스트
      this.ctx.fillStyle = '#FF4444';
      this.ctx.font = 'bold 14px Arial';
      this.ctx.textAlign = 'right';
      this.ctx.fillText('위험선', 575, dangerLine - 5);

      // 드롭 라인 (다음 아이템이 있을 때만)
      if (this.nextItem && !this.nextItem.isDropping) {
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.dropX, 140);
        this.ctx.lineTo(this.dropX, 720);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }

      // 다음 아이템 미리보기 (드롭 중이 아니면)
      if (this.nextItem && !this.nextItem.isDropping) {
        this.nextItem.draw(this.ctx);
      }

      // 아이템들 그리기
      this.items.forEach(item => item.draw(this.ctx));

      // 게임 오버 표시
      if (!this.gameRunning) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, 600, 800);
        
        this.ctx.font = '48px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('게임 끝', 300, 350);
        
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`최종 점수: ${score}`, 300, 400);
        this.ctx.fillText(`도달 단계: ${currentLevel}`, 300, 440);
      }
    }

    setDropX(x) {
      this.dropX = Math.max(60, Math.min(540, x)); // 경계 조정
      if (this.nextItem) {
        this.nextItem.x = this.dropX;
      }
    }
  }


  // 게임 루프
  useEffect(() => {
    if (!gameStarted || isPaused) return;

    const gameLoop = () => {
      const game = gameRef.current;
      if (game) {
        game.update();
        game.draw();
      }
      requestAnimationFrame(gameLoop);
    };

    gameLoop();
  }, [gameStarted, isPaused]);

  // 마우스 이벤트
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !gameRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    gameRef.current.setDropX(x);
  };

  const handleClick = (e) => {
    if (!gameRef.current || gameOver || isPaused || !gameStarted || !imagesLoaded) return;
    gameRef.current.dropItem();
  };

  // 게임 재시작
  const resetGame = () => {
    // 현재 게임 인스턴스 완전히 정지
    if (gameRef.current) {
      gameRef.current.gameRunning = false;
      gameRef.current = null;
    }
    
    // 캔버스 초기화
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // 상태 완전 초기화
    setGameStarted(false);
    setGameOver(false);
    setGameTimeLeft(300);
    setGameTimerStarted(false);
    setScore(0);
    setCurrentLevel(1);
    setFinalScore(0);
    setShowLeaderboard(false);
    setIsPaused(false);
    gameStartTimeRef.current = null;
    nextItemLevel.current = 1;
    
    console.log('게임 완전 초기화 완료');
    
    // 새 게임 인스턴스 생성
    setTimeout(initGame, 100);
  };

  // 일시정지
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // 정보 모달
  const showItemInfo = (level) => {
    setSelectedItem(historyItems[level]);
    setShowInfo(true);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FFE4B5 0%, #DEB887 100%)',
      padding: '10px',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* 웰컴 모달 */}
      {showWelcomeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            maxWidth: '500px',
            margin: '20px'
          }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>🏺</div>
            <h2 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '28px' }}>
              삼국시대 수박게임입니다!
            </h2>
            <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
              게임할 준비가 됐나요?
            </p>
            <button
              onClick={handleWelcomeNext}
              style={{
                padding: '15px 30px',
                fontSize: '18px',
                fontWeight: 'bold',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              네, 준비됐어요!
            </button>
          </div>
        </div>
      )}

      {/* 사용자 정보 입력 모달 */}
      {showUserInfoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            maxWidth: '500px',
            margin: '20px'
          }}>
            <div style={{ fontSize: '50px', marginBottom: '20px' }}>🏠</div>
            <h2 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '24px' }}>
              학교와 여러분의 닉네임을 적어주세요
            </h2>
            <p style={{ fontSize: '16px', color: '#666', marginBottom: '15px', lineHeight: '1.5' }}>
              게임 속에서도 책임감있게 닉네임을 사용해야 합니다.
            </p>
            <p style={{ fontSize: '14px', color: '#4CAF50', marginBottom: '25px', lineHeight: '1.4', fontWeight: 'bold' }}>
              📱 책임감있는 디지털 윤리를 갖도록 합시다
            </p>
            
            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                학교명
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="학교명을 입력하세요"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '30px', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                닉네임
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="닉네임을 입력하세요"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              />
            </div>
            
            <button
              onClick={handleUserInfoSubmit}
              disabled={!playerName.trim() || !schoolName.trim()}
              style={{
                padding: '15px 30px',
                fontSize: '18px',
                fontWeight: 'bold',
                backgroundColor: playerName.trim() && schoolName.trim() ? '#4CAF50' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: playerName.trim() && schoolName.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              게임 시작!
            </button>
          </div>
        </div>
      )}

      {/* 리더보드 모달 */}
      {showLeaderboard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: isMobile ? '30px' : '50px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            maxWidth: isMobile ? '95%' : '1500px',
            width: isMobile ? '95%' : '1500px',
            maxHeight: '85vh',
            overflow: 'auto',
            margin: '20px'
          }}>
            <div style={{ fontSize: '50px', marginBottom: '20px' }}>🏆</div>
            <h2 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '28px' }}>
              순위표
            </h2>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#4CAF50',
              fontWeight: 'bold'
            }}>
              <span style={{ 
                display: 'inline-block',
                width: '8px',
                height: '8px',
                backgroundColor: '#4CAF50',
                borderRadius: '50%',
                marginRight: '8px',
                animation: 'pulse 2s infinite'
              }}></span>
              실시간 업데이트
            </div>
            {leaderboardData.currentPlayerRank && (
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>
                나의 점수: <strong>{leaderboardData.currentPlayerData?.score || finalScore || score}점</strong> | 
                순위: <strong style={{ color: leaderboardData.currentPlayerRank <= 3 ? '#FF6B35' : '#4CAF50' }}>
                  {leaderboardData.currentPlayerRank}위
                </strong>
              </p>
            )}
            
            <div style={{ textAlign: 'left', marginBottom: '30px' }}>
              {leaderboardData.leaderboard && leaderboardData.leaderboard.length > 0 ? (
                leaderboardData.leaderboard.map((entry, index) => {
                const actualRank = entry.actualRank;
                const isCurrentPlayer = entry.isCurrentPlayer || (entry.playerName === playerName && entry.schoolName === schoolName);
                const isTopRank = actualRank <= 10;
                
                return (
                  <div key={entry.id || `${entry.playerName}-${entry.score}`}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: isMobile ? '18px' : '25px',
                      marginBottom: '15px',
                      backgroundColor: isCurrentPlayer ? '#e3f2fd' : '#f8f9fa',
                      borderRadius: '15px',
                      border: isCurrentPlayer ? '3px solid #2196F3' : '1px solid #ddd',
                      boxShadow: isCurrentPlayer ? '0 4px 12px rgba(33, 150, 243, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ 
                        width: '50px', 
                        fontSize: '20px', 
                        fontWeight: 'bold',
                        color: actualRank === 1 ? '#FFD700' : actualRank === 2 ? '#C0C0C0' : actualRank === 3 ? '#CD7F32' : '#666',
                        textAlign: 'center'
                      }}>
                        {actualRank === 1 ? '🥇' : actualRank === 2 ? '🥈' : actualRank === 3 ? '🥉' : actualRank}
                      </div>
                      <div style={{ flex: 1, marginLeft: '20px' }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          fontSize: '18px', 
                          color: isCurrentPlayer ? '#1976D2' : '#333',
                          marginBottom: '4px'
                        }}>
                          {entry.playerName}
                          {isCurrentPlayer && <span style={{ marginLeft: '10px', color: '#2196F3', fontSize: '16px' }}>👈 나</span>}
                        </div>
                        <div style={{ fontSize: '15px', color: '#666' }}>
                          {entry.schoolName}
                        </div>
                      </div>
                      <div style={{ 
                        fontSize: '20px', 
                        fontWeight: 'bold', 
                        color: isCurrentPlayer ? '#1976D2' : '#4CAF50',
                        minWidth: '80px',
                        textAlign: 'right'
                      }}>
                        {entry.score.toLocaleString()}점
                      </div>
                    </div>
                    
                    {/* Top 10과 나의 순위 사이에 구분선 */}
                    {index === 9 && leaderboardData.currentPlayerRank > 10 && (
                      <div style={{
                        textAlign: 'center',
                        margin: '15px 0',
                        color: '#999',
                        fontSize: '14px',
                        position: 'relative'
                      }}>
                        <div style={{
                          height: '1px',
                          backgroundColor: '#ddd',
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: '50%'
                        }} />
                        <span style={{
                          backgroundColor: 'white',
                          padding: '0 15px'
                        }}>
                          • • •
                        </span>
                      </div>
                    )}
                  </div>
                );
                })
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#666',
                  fontSize: '16px'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                  <p>아직 등록된 점수가 없습니다.</p>
                  <p style={{ fontSize: '14px', color: '#999' }}>첫 번째 플레이어가 되어보세요!</p>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowLeaderboard(false)}
                style={{
                  padding: '15px 25px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
              
              <button
                onClick={resetGame}
                style={{
                  padding: '15px 25px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                다시 하기
              </button>
              
            </div>
          </div>
        </div>
      )}

      {/* 상단 정보 바 */}
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        padding: '0 20px',
        gap: isMobile ? '15px' : '0'
      }}>
        <div style={{
          fontSize: isMobile ? '20px' : '28px',
          fontWeight: 'bold',
          color: '#8B4513',
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          🏛️ 한국사 수박게임
        </div>
        <div style={{
          display: 'flex',
          flexDirection: isSmallMobile ? 'column' : 'row',
          gap: isSmallMobile ? '8px' : isMobile ? '15px' : '30px',
          fontSize: isMobile ? '16px' : '20px',
          fontWeight: 'bold',
          color: '#8B4513',
          alignItems: 'center'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.8)',
            padding: isMobile ? '6px 12px' : '8px 16px',
            borderRadius: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            fontSize: isSmallMobile ? '14px' : 'inherit'
          }}>
            ⏰ 시간: {Math.floor(gameTimeLeft / 60)}:{String(gameTimeLeft % 60).padStart(2, '0')}
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.8)',
            padding: isMobile ? '6px 12px' : '8px 16px',
            borderRadius: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            fontSize: isSmallMobile ? '14px' : 'inherit'
          }}>
            🎯 점수: {score.toLocaleString()}
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.8)',
            padding: isMobile ? '6px 12px' : '8px 16px',
            borderRadius: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            fontSize: isSmallMobile ? '14px' : 'inherit'
          }}>
            📊 {currentLevel}단계: {historyItems[currentLevel]?.name}
          </div>
        </div>
      </div>

      {/* 메인 게임 영역 */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '15px' : '20px',
        alignItems: isMobile ? 'center' : 'flex-start',
        maxWidth: '1200px',
        width: '100%',
        justifyContent: 'center'
      }}>
        {/* 왼쪽: 다음 아이템 및 컨트롤 */}
        <div style={{
          width: isMobile ? '100%' : '200px',
          maxWidth: isMobile ? '400px' : '200px',
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          gap: '15px',
          justifyContent: isMobile ? 'center' : 'flex-start'
        }}>
          {/* 다음 아이템 */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '15px',
            padding: '20px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#8B4513', fontSize: '16px' }}>다음</h3>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: currentLevel <= 3 ? historyItems[currentLevel]?.color : '#ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              margin: '0 auto',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {nextItemLevel.current <= 3 && loadedImages.current[nextItemLevel.current] ? (
                <img 
                  src={historyItems[nextItemLevel.current]?.image} 
                  alt={historyItems[nextItemLevel.current]?.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '50%'
                  }}
                />
              ) : (
                nextItemLevel.current <= 3 ? historyItems[nextItemLevel.current]?.emoji : '❓'
              )}
            </div>
          </div>

          {/* 컨트롤 버튼 */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '15px',
            padding: '20px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#8B4513', fontSize: '16px' }}>게임 컨트롤</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {!imagesLoaded ? (
                <div style={{
                  width: '100%', padding: '12px', fontSize: '16px', fontWeight: 'bold',
                  backgroundColor: '#ccc', color: 'white', border: 'none',
                  borderRadius: '8px', textAlign: 'center'
                }}>
                  📥 이미지 로딩중...
                </div>
              ) : (
                <>
                  <button onClick={togglePause} style={{
                    width: '100%', padding: '10px', fontSize: '14px', fontWeight: 'bold',
                    backgroundColor: isPaused ? '#4CAF50' : '#FF9800', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer'
                  }}>
                    {isPaused ? '▶️ 계속' : '⏸️ 일시정지'}
                  </button>
                  <button onClick={quitGame} style={{
                    width: '100%', padding: '10px', fontSize: '14px', fontWeight: 'bold',
                    backgroundColor: '#f44336', color: 'white', border: 'none',
                    borderRadius: '8px', cursor: 'pointer'
                  }}>
                    ❌ 그만하기
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 중앙: 게임 캔버스 */}
        <div style={{
          border: '6px solid #8B4513',
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          backgroundColor: 'white'
        }}>
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            style={{
              display: 'block',
              cursor: 'crosshair',
              borderRadius: '14px'
            }}
          />
        </div>

        {/* 오른쪽: 한국사 단계 */}
        <div style={{
          width: isMobile ? '100%' : '300px',
          maxWidth: isMobile ? '400px' : '300px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '15px',
          padding: isMobile ? '15px' : '20px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#8B4513' }}>📚 한국사 단계</h3>
          
          <div style={{ maxHeight: '700px', overflowY: 'auto' }}>
            {Object.entries(historyItems).map(([level, item]) => (
              <div
                key={level}
                onClick={() => showItemInfo(parseInt(level))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: currentLevel >= parseInt(level) ? '#e8f5e8' : '#f5f5f5',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: currentLevel >= parseInt(level) ? '2px solid #4CAF50' : '1px solid #ddd',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  backgroundColor: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {loadedImages.current[level] ? (
                    <img 
                      src={item.image} 
                      alt={item.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '50%'
                      }}
                    />
                  ) : (
                    item.emoji
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#333', fontSize: '16px' }}>
                    {level}단계: {item.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    점수: {item.score}점
                  </div>
                </div>
                {currentLevel >= parseInt(level) && (
                  <div style={{ color: '#4CAF50', fontSize: '20px' }}>✅</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 역사 정보 모달 */}
      {showInfo && selectedItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '15px',
            padding: '30px',
            maxWidth: '500px',
            margin: '20px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              fontSize: '60px',
              marginBottom: '15px'
            }}>
              {selectedItem.emoji}
            </div>
            <h2 style={{
              margin: '0 0 15px 0',
              color: '#333',
              fontSize: '28px'
            }}>
              {selectedItem.name}
            </h2>
            <p style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: '#666',
              marginBottom: '20px'
            }}>
              {selectedItem.description}
            </p>
            <button
              onClick={() => setShowInfo(false)}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 게임 오버 모달 */}
      {gameOver && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '15px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            minWidth: '300px'
          }}>
            <div style={{ fontSize: '50px', marginBottom: '15px' }}>😢</div>
            <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>게임 종료</h2>
            <p style={{ fontSize: '18px', color: '#666', marginBottom: '10px' }}>
              최종 점수: <strong>{score.toLocaleString()}점</strong>
            </p>
            <p style={{ fontSize: '16px', color: '#666', marginBottom: '15px' }}>
              도달 단계: <strong>{currentLevel}단계 ({historyItems[currentLevel]?.name})</strong>
            </p>
            <p style={{ fontSize: '14px', color: '#999', marginBottom: '25px' }}>
              점수가 자동으로 리더보드에 저장되었습니다.
            </p>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={loadLeaderboard}
                style={{
                  padding: '15px 25px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: '#FFD700',
                  color: '#333',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                🏆 순위표 보기
              </button>
              
              <button
                onClick={resetGame}
                style={{
                  padding: '15px 25px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                🔄 다시 도전하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게임 설명 */}
      <div style={{
        textAlign: 'center',
        marginTop: '20px',
        color: '#8B4513',
        fontSize: '14px',
        opacity: 0.8,
        maxWidth: '800px'
      }}>
        <p><strong>📖 게임 방법:</strong> 마우스로 드롭 위치를 조정하고 클릭해서 아이템을 떨어뜨리세요!</p>
        <p><strong>🔗 합성:</strong> 같은 단계의 아이템끼리 합쳐서 다음 단계로 진화시키세요!</p>
        <p><strong>⚠️ 게임 오버:</strong> 아이템이 빨간 위험선에 닿거나 <strong>5분 시간</strong>이 끝나면 게임이 종료됩니다!</p>
        <p><strong>🏆 목표:</strong> 5분 내에 최대한 높은 점수를 얻어 리더보드에 오르세요!</p>
      </div>
    </div>
  );
};

export default WatermelonGamePage;