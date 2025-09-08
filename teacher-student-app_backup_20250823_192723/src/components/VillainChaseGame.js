import React, { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import styled from 'styled-components';

// 스타일 컴포넌트들
const GameContainer = styled.div`
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'Noto Sans KR', sans-serif;
  position: relative;
  overflow: hidden;
`;

const GameCanvas = styled.canvas`
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  background: #2c3e50;
  backdrop-filter: blur(10px);
`;

const UIOverlay = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  pointer-events: none;
  z-index: 100;
`;

const GameInfo = styled.div`
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 20px;
  color: white;
  pointer-events: auto;
  min-width: 200px;
`;

const MenuScreen = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const MenuCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: 30px;
  padding: 40px;
  text-align: center;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
`;

const GameTitle = styled.h1`
  color: white;
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 10px;
  background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 30px rgba(79, 172, 254, 0.5);
`;

const GameSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.2rem;
  margin-bottom: 30px;
`;

const MenuButton = styled.button`
  background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%);
  border: none;
  border-radius: 25px;
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  padding: 15px 30px;
  margin: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 20px rgba(79, 172, 254, 0.3);
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 30px rgba(79, 172, 254, 0.4);
  }
  
  &:active {
    transform: translateY(-1px);
  }
`;

const Input = styled.input`
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 15px;
  color: white;
  font-size: 1.1rem;
  padding: 15px 20px;
  margin: 10px;
  width: 100%;
  max-width: 300px;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  &:focus {
    outline: none;
    border-color: #4facfe;
    box-shadow: 0 0 20px rgba(79, 172, 254, 0.3);
  }
`;

const Select = styled.select`
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 15px;
  color: white;
  font-size: 1.1rem;
  padding: 15px 20px;
  margin: 10px;
  width: 100%;
  max-width: 300px;
  
  option {
    background: #2c3e50;
    color: white;
  }
  
  &:focus {
    outline: none;
    border-color: #4facfe;
  }
`;

const MobileControls = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 200px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 20px;
  pointer-events: none;
  z-index: 1000;
  
  @media (min-width: 768px) {
    display: none;
  }
`;

const Joystick = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 3px solid rgba(255, 255, 255, 0.4);
  position: relative;
  backdrop-filter: blur(10px);
  pointer-events: auto;
`;

const JoystickStick = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(79, 172, 254, 0.8);
  border: 2px solid #fff;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.1s ease;
`;

const AttackButton = styled.button`
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.4);
  background: rgba(245, 87, 108, 0.3);
  color: white;
  font-weight: bold;
  font-size: 12px;
  backdrop-filter: blur(10px);
  touch-action: manipulation;
  user-select: none;
  pointer-events: auto;
  cursor: pointer;
  
  &:active {
    background: rgba(79, 172, 254, 0.6);
    transform: scale(0.95);
  }
`;

const VillainChaseGame = () => {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const joystickRef = useRef(null);
  const attackButtonRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [currentScreen, setCurrentScreen] = useState('mainMenu');
  const [roomData, setRoomData] = useState({
    name: '',
    maxPlayers: 8,
    timeLimit: 180
  });
  const [joinCode, setJoinCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [gameInfo, setGameInfo] = useState({
    timeRemaining: 180,
    villainHP: 100,
    villainMaxHP: 100
  });
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });

  // 모바일 감지
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // 조이스틱 터치 이벤트 핸들러
  const handleJoystickTouch = useCallback((e) => {
    e.preventDefault();
    
    if (!gameRef.current || !joystickRef.current) return;
    
    const touch = e.touches[0] || e.changedTouches[0];
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const touchX = touch.clientX - centerX;
    const touchY = touch.clientY - centerY;
    
    // 조이스틱 스틱 위치 업데이트
    const maxDistance = 30; // 조이스틱 최대 거리
    const distance = Math.sqrt(touchX * touchX + touchY * touchY);
    
    if (distance <= maxDistance) {
      setJoystickPosition({ x: touchX, y: touchY });
    } else {
      const angle = Math.atan2(touchY, touchX);
      setJoystickPosition({
        x: Math.cos(angle) * maxDistance,
        y: Math.sin(angle) * maxDistance
      });
    }
    
    // 게임 엔진에 터치 상태 전달
    gameRef.current.handleJoystickTouch(touchX, touchY, true);
  }, []);

  const handleJoystickTouchEnd = useCallback((e) => {
    e.preventDefault();
    setJoystickPosition({ x: 0, y: 0 });
    
    if (gameRef.current) {
      gameRef.current.handleJoystickTouch(0, 0, false);
    }
  }, []);

  // 공격 버튼 터치 이벤트 핸들러
  const handleAttackTouch = useCallback((isPressed) => {
    if (gameRef.current) {
      gameRef.current.handleAttackTouch(isPressed);
    }
  }, []);

  // 모바일 터치 이벤트 설정
  useEffect(() => {
    if (!isMobile || gameState !== 'playing') return;

    const joystick = joystickRef.current;
    const attackButton = attackButtonRef.current;

    if (joystick) {
      joystick.addEventListener('touchstart', handleJoystickTouch, { passive: false });
      joystick.addEventListener('touchmove', handleJoystickTouch, { passive: false });
      joystick.addEventListener('touchend', handleJoystickTouchEnd, { passive: false });
    }

    if (attackButton) {
      attackButton.addEventListener('touchstart', () => handleAttackTouch(true), { passive: false });
      attackButton.addEventListener('touchend', () => handleAttackTouch(false), { passive: false });
    }

    return () => {
      if (joystick) {
        joystick.removeEventListener('touchstart', handleJoystickTouch);
        joystick.removeEventListener('touchmove', handleJoystickTouch);
        joystick.removeEventListener('touchend', handleJoystickTouchEnd);
      }
      
      if (attackButton) {
        attackButton.removeEventListener('touchstart', () => handleAttackTouch(true));
        attackButton.removeEventListener('touchend', () => handleAttackTouch(false));
      }
    };
  }, [gameState, isMobile, handleJoystickTouch, handleJoystickTouchEnd, handleAttackTouch]);

  // 게임 클래스 (기존 로직 유지)
  const initializeGame = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.9;
    canvas.height = window.innerHeight * 0.7;

    // 기존 게임 로직을 여기에 통합
    gameRef.current = new GameEngine(canvas, {
      onStateChange: setGameState,
      onRoomUpdate: setCurrentRoom,
      onPlayerCountUpdate: setPlayerCount,
      onGameInfoUpdate: setGameInfo
    });
  }, []);

  useEffect(() => {
    initializeGame();
    
    return () => {
      if (gameRef.current) {
        gameRef.current.cleanup();
      }
    };
  }, [initializeGame]);

  const handleCreateRoom = async () => {
    try {
      if (gameRef.current) {
        const roomCode = await gameRef.current.createRoom(roomData);
        setCurrentScreen('gamePlay');
        setGameState('playing');
      }
    } catch (error) {
      console.error('방 생성 실패:', error);
      alert('방 생성에 실패했습니다.');
    }
  };

  const handleJoinRoom = async () => {
    try {
      if (gameRef.current && joinCode) {
        await gameRef.current.joinRoom(joinCode);
        setCurrentScreen('gamePlay');
        setGameState('playing');
      }
    } catch (error) {
      console.error('방 참여 실패:', error);
      alert('방 참여에 실패했습니다.');
    }
  };

  const handleSoloPlay = () => {
    if (gameRef.current) {
      gameRef.current.startSoloGame();
      setCurrentScreen('gamePlay');
      setGameState('playing');
    }
  };

  const renderMenuScreen = () => {
    switch (currentScreen) {
      case 'mainMenu':
        return (
          <MenuScreen>
            <MenuCard>
              <GameTitle>🎯 빌런 체이스</GameTitle>
              <GameSubtitle>최대 30명이 협력해서 영리한 빌런을 잡아라!</GameSubtitle>
              
              <MenuButton onClick={() => setCurrentScreen('createRoom')}>
                🏠 방 만들기
              </MenuButton>
              
              <MenuButton onClick={() => setCurrentScreen('joinRoom')}>
                🚪 방 참여하기
              </MenuButton>
              
              <MenuButton onClick={handleSoloPlay}>
                👤 혼자 플레이
              </MenuButton>
              
              <MenuButton onClick={() => setCurrentScreen('howToPlay')}>
                ❓ 게임 방법
              </MenuButton>
            </MenuCard>
          </MenuScreen>
        );

      case 'createRoom':
        return (
          <MenuScreen>
            <MenuCard>
              <GameTitle>🏠 방 만들기</GameTitle>
              
              <Input
                type="text"
                placeholder="방 이름"
                value={roomData.name}
                onChange={(e) => setRoomData({...roomData, name: e.target.value})}
              />
              
              <Select
                value={roomData.maxPlayers}
                onChange={(e) => setRoomData({...roomData, maxPlayers: parseInt(e.target.value)})}
              >
                <option value={8}>최대 8명</option>
                <option value={15}>최대 15명</option>
                <option value={30}>최대 30명</option>
              </Select>
              
              <Select
                value={roomData.timeLimit}
                onChange={(e) => setRoomData({...roomData, timeLimit: parseInt(e.target.value)})}
              >
                <option value={180}>3분</option>
                <option value={300}>5분</option>
                <option value={600}>10분</option>
              </Select>
              
              <div>
                <MenuButton onClick={handleCreateRoom}>방 생성</MenuButton>
                <MenuButton onClick={() => setCurrentScreen('mainMenu')}>뒤로가기</MenuButton>
              </div>
            </MenuCard>
          </MenuScreen>
        );

      case 'joinRoom':
        return (
          <MenuScreen>
            <MenuCard>
              <GameTitle>🚪 방 참여하기</GameTitle>
              
              <Input
                type="text"
                placeholder="방 코드 (6자리)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              
              <div>
                <MenuButton onClick={handleJoinRoom}>참여하기</MenuButton>
                <MenuButton onClick={() => setCurrentScreen('mainMenu')}>뒤로가기</MenuButton>
              </div>
            </MenuCard>
          </MenuScreen>
        );

      case 'howToPlay':
        return (
          <MenuScreen>
            <MenuCard>
              <GameTitle>❓ 게임 방법</GameTitle>
              
              <div style={{ color: 'white', textAlign: 'left', fontSize: '1.1rem', lineHeight: 1.6 }}>
                <p>🎯 <strong>목표:</strong> 제한 시간 내에 빌런의 HP를 0으로 만들기</p>
                <p>🎮 <strong>조작:</strong> WASD 또는 화살표 키로 이동, 클릭으로 공격</p>
                <p>👥 <strong>협공:</strong> 여러 명이 동시에 공격하면 추가 데미지!</p>
                <p>🧪 <strong>아이템:</strong> 맵에서 슬로우 포션과 스턴 트랩 수집</p>
                <p>📱 <strong>모바일:</strong> 조이스틱과 공격 버튼 사용</p>
              </div>
              
              <MenuButton onClick={() => setCurrentScreen('mainMenu')}>뒤로가기</MenuButton>
            </MenuCard>
          </MenuScreen>
        );

      default:
        return null;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <GameContainer>
      {/* 메뉴 화면 */}
      {gameState === 'menu' && renderMenuScreen()}

      {/* 게임 캔버스 */}
      <GameCanvas ref={canvasRef} />

      {/* 게임 UI 오버레이 */}
      {gameState === 'playing' && (
        <UIOverlay>
          <GameInfo>
            <div>⏰ {formatTime(gameInfo.timeRemaining)}</div>
            <div>👥 {playerCount}/{currentRoom?.maxPlayers || 1}명</div>
            <div>❤️ {gameInfo.villainHP}/{gameInfo.villainMaxHP}</div>
            {currentRoom && <div>🏠 {currentRoom.roomCode}</div>}
          </GameInfo>
          
          <div>
            <MenuButton onClick={() => {
              setGameState('menu');
              setCurrentScreen('mainMenu');
            }}>
              ⏸️ 메뉴
            </MenuButton>
          </div>
        </UIOverlay>
      )}

      {/* 모바일 컨트롤 */}
      {isMobile && gameState === 'playing' && (
        <MobileControls>
          <Joystick ref={joystickRef}>
            <JoystickStick style={{ transform: `translate(${joystickPosition.x}px, ${joystickPosition.y}px)` }} />
          </Joystick>
          
          <AttackButton ref={attackButtonRef}>공격</AttackButton>
        </MobileControls>
      )}
    </GameContainer>
  );
};

// 게임 엔진 클래스 (기존 로직 래핑)
class GameEngine {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = callbacks;
    
    // 게임 설정
    this.mapWidth = 1200;
    this.mapHeight = 800;
    this.playerSpeed = 1.5;
    this.villainSpeed = 4;
    
    // 게임 상태
    this.timeLimit = 180;
    this.timeRemaining = this.timeLimit;
    this.gameStartTime = 0;
    
    // 플레이어들
    this.players = [];
    this.localPlayerId = Math.random().toString(36).substr(2, 9);
    this.playerName = `플레이어${Math.floor(Math.random() * 1000)}`;
    this.maxPlayers = 30;
    
    // 방 관련
    this.currentRoom = null;
    this.roomCode = null;
    this.isHost = false;
    this.roomListener = null;
    this.lastPositionUpdate = 0;
    this.positionUpdateThrottle = 50; // 실시간성 유지 (50ms)
    this.lastVillainUpdate = 0;
    this.villainUpdateThrottle = 30; // 빌런은 더 빠르게 (30ms)
    
    // 스마트 업데이트 시스템
    this.lastPlayerPosition = { x: 0, y: 0 }; // 이전 위치 저장
    this.significantMoveThreshold = 3; // 3픽셀 이상 움직일 때만 업데이트
    this.lastVillainPosition = { x: 0, y: 0 };
    this.lastVillainHP = 0;
    this.lastVillainStatus = { stunned: false, slowed: false };
    
    // 서버 시간 동기화
    this.serverTimeOffset = 0; // 로컬 시간과 서버 시간의 차이
    this.gameStartServerTime = null; // 서버 기준 게임 시작 시간
    this.lastSyncTime = 0; // 마지막 동기화 시간
    this.syncInterval = 10000; // 10초마다 동기화 (덜 자주)
    this.lastGameStateUpdate = 0; // 게임 상태 마지막 업데이트
    this.gameStateUpdateInterval = 2000; // 게임 상태는 2초마다만 업데이트
    
    // 빌런
    this.villain = null;
    this.villainMaxHP = 300;
    this.villainHP = this.villainMaxHP;
    this.villainTarget = { x: 600, y: 400 };
    
    // 빌런 이미지
    this.villainImage = new Image();
    this.villainImage.src = '/villain.png';
    this.villainImageLoaded = false;
    
    this.villainImage.onload = () => {
      this.villainImageLoaded = true;
      console.log('빌런 이미지 로드 완료');
    };
    
    this.villainImage.onerror = () => {
      console.warn('빌런 이미지 로드 실패, 기본 형태 사용');
      this.villainImageLoaded = false;
    };
    
    // 아이템들
    this.items = [];
    this.itemSpawnInterval = 10000;
    this.lastItemSpawn = 0;
    
    // 협공 시스템
    this.recentHits = [];
    this.cooperationWindow = 3000;
    
    // 입력 처리
    this.keys = {};
    this.mousePos = { x: 0, y: 0 };
    
    // 모바일 지원
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.touchControls = {
      up: false,
      down: false,
      left: false,
      right: false,
      attack: false
    };
    
    // 게임 루프
    this.lastTime = 0;
    this.animationId = null;
    this.lastTimeUpdate = 0;
    
    // 성능 최적화
    this.maxRenderDistance = 500;
    
    this.initializeGameLogic();
  }

  initializeGameLogic() {
    this.setupEventListeners();
    this.createLocalPlayer();
    this.createVillain();
    this.syncServerTime(); // 서버 시간 초기 동기화
    this.updateCallbacks();
  }

  // 서버 시간 동기화
  async syncServerTime() {
    try {
      const tempDoc = doc(collection(db, 'temp'), 'sync-' + Date.now());
      const now = Date.now();
      
      await setDoc(tempDoc, {
        timestamp: serverTimestamp(),
        clientTime: now
      });
      
      const syncDoc = await getDoc(tempDoc);
      if (syncDoc.exists()) {
        const data = syncDoc.data();
        const serverTime = data.timestamp.toMillis();
        const roundTripTime = Date.now() - now;
        
        // 네트워크 지연의 절반을 보정
        this.serverTimeOffset = serverTime - now - (roundTripTime / 2);
        
        console.log(`서버 시간 동기화 완료. 오프셋: ${this.serverTimeOffset}ms`);
        
        // 임시 문서 삭제는 생략 (Firestore 자동 정리에 맡김)
      }
    } catch (error) {
      console.warn('서버 시간 동기화 실패:', error);
      this.serverTimeOffset = 0; // 기본값
    }
  }

  // 현재 서버 시간 계산
  getServerTime() {
    return Date.now() + this.serverTimeOffset;
  }

  setupEventListeners() {
    // 키보드 입력 (PC 전용)
    if (!this.isMobile) {
      document.addEventListener('keydown', (e) => {
        this.keys[e.code] = true;
      });
      
      document.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
      });
    }
    
    // 마우스 입력
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = e.clientX - rect.left;
      this.mousePos.y = e.clientY - rect.top;
    });
    
    this.canvas.addEventListener('click', (e) => {
      this.handleCanvasClick(e);
    });
    
    // 모바일 터치 이벤트 설정
    if (this.isMobile) {
      this.setupMobileControls();
    }
  }

  setupMobileControls() {
    // 조이스틱과 공격 버튼 이벤트 리스너는 React 컴포넌트에서 설정됨
    // 대신 터치 상태를 관리하는 메서드들을 준비
    this.joystickCenter = { x: 50, y: 50 }; // 조이스틱 중심점
    this.joystickRadius = 35; // 조이스틱 반지름
    this.joystickActive = false;
  }

  // 조이스틱 터치 처리
  handleJoystickTouch(touchX, touchY, isActive) {
    if (!isActive) {
      this.touchControls = {
        up: false,
        down: false,
        left: false,
        right: false,
        attack: false
      };
      this.joystickActive = false;
      return;
    }

    this.joystickActive = true;
    
    // 조이스틱 중심점으로부터의 거리 계산
    const deltaX = touchX - this.joystickCenter.x;
    const deltaY = touchY - this.joystickCenter.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 임계값을 넘으면 방향 설정
    const threshold = 15;
    
    if (distance > threshold) {
      const angle = Math.atan2(deltaY, deltaX);
      
      // 8방향으로 단순화
      this.touchControls.up = deltaY < -threshold;
      this.touchControls.down = deltaY > threshold;
      this.touchControls.left = deltaX < -threshold;
      this.touchControls.right = deltaX > threshold;
    } else {
      this.touchControls.up = false;
      this.touchControls.down = false;
      this.touchControls.left = false;
      this.touchControls.right = false;
    }
  }

  // 공격 버튼 터치 처리
  handleAttackTouch(isPressed) {
    this.touchControls.attack = isPressed;
    
    if (isPressed) {
      // 공격 로직 실행
      const localPlayer = this.players.find(p => p.id === this.localPlayerId);
      if (localPlayer) {
        this.damageVillain(localPlayer, 15);
      }
    }
  }

  createLocalPlayer() {
    const colors = ['#4facfe', '#00ff88', '#ffd700', '#f5576c', '#9b59b6', '#e67e22', '#1abc9c', '#e74c3c'];
    const player = {
      id: this.localPlayerId,
      name: this.playerName,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: 30,
      height: 30,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: this.playerSpeed,
      inventory: { slow: 0, trap: 0 },
      lastUpdate: Date.now()
    };
    this.players = [player];
    
    // 초기 위치 기록
    this.lastPlayerPosition.x = player.x;
    this.lastPlayerPosition.y = player.y;
  }

  createVillain() {
    this.villain = {
      x: 600,
      y: 400,
      width: 50,
      height: 50,
      color: '#f5576c',
      speed: this.villainSpeed,
      stunned: false,
      slowed: false,
      direction: { x: 1, y: 1 },
      lastDirectionChange: 0,
      lastDamageTime: 0,
      damageImmunity: 500
    };
    
    this.villainTarget = { x: 600, y: 400 };
    
    // 초기 빌런 상태 기록
    this.lastVillainPosition.x = 600;
    this.lastVillainPosition.y = 400;
    this.lastVillainHP = this.villainMaxHP;
    this.lastVillainStatus = { stunned: false, slowed: false };
  }

  async createRoom(roomData) {
    try {
      const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
      
      const roomDataToSave = {
        roomCode: roomCode,
        name: roomData.name || '빌런 체이스 방',
        host: this.localPlayerId,
        hostName: this.playerName,
        maxPlayers: roomData.maxPlayers,
        timeLimit: roomData.timeLimit,
        status: 'waiting',
        players: [{
          id: this.localPlayerId,
          name: this.playerName,
          ready: true,
          x: 100 + Math.random() * 100,
          y: 100 + Math.random() * 100,
          color: this.players[0].color
        }],
        villain: {
          x: 600,
          y: 400,
          targetX: 600,
          targetY: 400,
          hp: Math.max(300, roomData.maxPlayers * 10),
          stunned: false,
          slowed: false,
          lastUpdate: serverTimestamp()
        },
        gameState: {
          timeRemaining: roomData.timeLimit,
          started: false,
          gameStartTime: null, // 게임 시작 시 설정될 예정
          gameStartServerTime: null // 서버 기준 시작 시간
        },
        items: [],
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(collection(db, 'rooms'), roomCode), roomDataToSave);
      
      this.roomCode = roomCode;
      this.currentRoom = roomDataToSave;
      this.isHost = true;
      
      this.startRoomListener();
      
      this.timeLimit = roomData.timeLimit;
      this.timeRemaining = roomData.timeLimit;
      this.villainMaxHP = Math.max(300, roomData.maxPlayers * 10);
      this.villainHP = this.villainMaxHP;
      
      this.updateCallbacks();
      this.startGame();
      
      console.log(`방이 생성되었습니다! 방 코드: ${roomCode}`);
      return roomCode;
    } catch (error) {
      console.error('방 생성 실패:', error);
      throw error;
    }
  }

  async joinRoom(roomCode) {
    try {
      const roomRef = doc(db, 'rooms', roomCode);
      const roomSnapshot = await getDoc(roomRef);
      
      if (!roomSnapshot.exists()) {
        throw new Error('존재하지 않는 방 코드입니다.');
      }
      
      const roomData = roomSnapshot.data();
      
      if (roomData.status !== 'waiting') {
        throw new Error('이미 시작된 게임입니다.');
      }
      
      if (roomData.players.length >= roomData.maxPlayers) {
        throw new Error('방이 가득찼습니다.');
      }
      
      const colors = ['#4facfe', '#00ff88', '#ffd700', '#f5576c', '#9b59b6', '#e67e22', '#1abc9c', '#e74c3c'];
      const newPlayer = {
        id: this.localPlayerId,
        name: this.playerName,
        ready: false,
        x: 100 + (roomData.players.length * 50) + Math.random() * 50,
        y: 100 + (roomData.players.length * 30) + Math.random() * 50,
        color: colors[roomData.players.length % colors.length]
      };
      
      await updateDoc(roomRef, {
        players: [...roomData.players, newPlayer]
      });
      
      this.roomCode = roomCode;
      this.currentRoom = roomData;
      this.isHost = false;
      
      this.startRoomListener();
      
      this.timeLimit = roomData.timeLimit;
      this.timeRemaining = roomData.timeLimit;
      this.villainMaxHP = Math.max(300, roomData.maxPlayers * 10);
      this.villainHP = roomData.villain.hp;
      
      // 서버 시간 동기화 후 게임 시작 시간 설정
      await this.syncServerTime();
      
      // 호스트의 게임 시작 시간으로 동기화
      if (roomData.gameState && roomData.gameState.gameStartServerTime) {
        const serverStartTime = roomData.gameState.gameStartServerTime.toMillis();
        this.gameStartServerTime = serverStartTime - this.serverTimeOffset;
      } else {
        this.gameStartServerTime = this.getServerTime();
      }
      
      this.updateCallbacks();
      this.startGame();
      
      console.log(`방에 참여했습니다! 플레이어: ${roomData.players.length}/${roomData.maxPlayers}명`);
    } catch (error) {
      console.error('방 참여 실패:', error);
      throw error;
    }
  }

  startRoomListener() {
    if (this.roomListener) {
      this.roomListener();
    }
    
    const roomRef = doc(db, 'rooms', this.roomCode);
    this.roomListener = onSnapshot(roomRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const roomData = docSnapshot.data();
        this.currentRoom = roomData;
        
        console.log('방 데이터 업데이트:', roomData);
        console.log('현재 플레이어 수:', roomData.players.length);
        
        this.updatePlayersFromRoom(roomData);
        this.updateGameStateFromRoom(roomData);
        
        // 호스트가 아닌 경우 빌런 상태 동기화
        if (!this.isHost && roomData.villain) {
          this.syncVillainFromHost(roomData.villain);
        }
        
        // 아이템 동기화
        if (roomData.items) {
          this.items = roomData.items;
        }
        
        this.updateCallbacks();
      }
    }, (error) => {
      console.error('방 상태 감시 오류:', error);
    });
  }

  updatePlayersFromRoom(roomData) {
    const oldPlayersCount = this.players.length;
    
    this.players = roomData.players.map(playerData => {
      const existingPlayer = this.players.find(p => p.id === playerData.id);
      
      return {
        id: playerData.id,
        name: playerData.name,
        x: playerData.x,
        y: playerData.y,
        width: 30,
        height: 30,
        color: playerData.color || (playerData.id === this.localPlayerId ? '#4facfe' : '#00ff88'),
        speed: this.playerSpeed,
        inventory: existingPlayer ? existingPlayer.inventory : { slow: 0, trap: 0 },
        lastUpdate: Date.now()
      };
    });
    
    const newPlayersCount = this.players.length;
    
    if (oldPlayersCount !== newPlayersCount) {
      console.log(`플레이어 수 변경: ${oldPlayersCount} → ${newPlayersCount}`);
    }
  }

  updateGameStateFromRoom(roomData) {
    if (roomData.gameState && !this.isHost) {
      // 서버 기준 게임 시작 시간이 있으면 동기화
      if (roomData.gameState.gameStartServerTime) {
        // 서버 타임스탬프를 로컬 시간으로 변환
        const serverStartTime = roomData.gameState.gameStartServerTime.toMillis();
        this.gameStartServerTime = serverStartTime - this.serverTimeOffset;
        
        console.log('게임 시작 시간 동기화 완료');
      }
    }
  }

  syncVillainFromHost(villainData) {
    if (!this.villain) return;
    
    // 부드러운 보간을 위해 목표 위치 설정
    this.villainTarget.x = villainData.x;
    this.villainTarget.y = villainData.y;
    
    // 상태 즉시 동기화
    this.villainHP = villainData.hp;
    this.villain.stunned = villainData.stunned;
    this.villain.slowed = villainData.slowed;
    
    // 위치는 부드럽게 보간
    const lerpFactor = 0.15;
    this.villain.x += (this.villainTarget.x - this.villain.x) * lerpFactor;
    this.villain.y += (this.villainTarget.y - this.villain.y) * lerpFactor;
  }

  startSoloGame() {
    this.timeRemaining = this.timeLimit;
    this.villainHP = this.villainMaxHP;
    this.gameStartServerTime = this.getServerTime();
    this.createLocalPlayer();
    this.createVillain();
    this.updateCallbacks();
    this.startGame();
  }

  startGame() {
    // 서버 기준 게임 시작 시간 설정
    this.gameStartServerTime = this.getServerTime();
    this.gameStartTime = Date.now(); // 로컬 기준도 유지 (호환성)
    this.lastTimeUpdate = this.gameStartTime;
    
    // 호스트인 경우 Firebase에 게임 시작 시간 기록
    if (this.isHost && this.roomCode) {
      this.updateGameStartTime();
    }
    
    this.gameLoop();
  }

  // 게임 시작 시간을 Firebase에 업데이트
  async updateGameStartTime() {
    try {
      await updateDoc(doc(db, 'rooms', this.roomCode), {
        'gameState.gameStartServerTime': serverTimestamp(),
        'gameState.started': true
      });
    } catch (error) {
      console.error('게임 시작 시간 업데이트 실패:', error);
    }
  }

  update(deltaTime) {
    const now = Date.now();
    
    // 주기적으로 서버 시간 재동기화
    if (now - this.lastSyncTime > this.syncInterval) {
      this.syncServerTime();
      this.lastSyncTime = now;
    }
    
    // 시간 계산 - 서버 기준 사용
    if (this.gameStartServerTime) {
      const currentServerTime = this.getServerTime();
      const elapsedSeconds = (currentServerTime - this.gameStartServerTime) / 1000;
      this.timeRemaining = Math.max(0, this.timeLimit - elapsedSeconds);
    }
    
    // 호스트만 빌런 AI 업데이트
    if (this.isHost || !this.currentRoom) {
      this.updateVillainAI();
      
      // 호스트가 덜 자주 게임 상태를 업데이트 (3초마다)
      if (this.currentRoom && now - this.lastGameStateUpdate > this.gameStateUpdateInterval) {
        this.updateGameStateToFirebase();
        this.lastGameStateUpdate = now;
      }
    }
    
    this.updatePlayerMovement();
    this.checkCollisions();
    this.updateItemSpawn();
    this.checkGameEnd();
    this.updateCallbacks();
  }

  // 게임 상태를 Firebase에 업데이트하는 별도 메서드 (최적화됨)
  async updateGameStateToFirebase() {
    if (!this.isHost || !this.currentRoom || !this.roomCode) return;
    
    try {
      // 필요한 데이터만 업데이트
      const updateData = {};
      
      // 시간 정보는 계산으로 처리하므로 Firebase에 자주 업데이트할 필요 없음
      if (this.gameStartServerTime) {
        updateData['gameState.timeRemaining'] = this.timeRemaining;
      }
      
      // 변경사항이 있을 때만 업데이트
      if (Object.keys(updateData).length > 0) {
        await updateDoc(doc(db, 'rooms', this.roomCode), updateData);
      }
    } catch (error) {
      console.error('게임 상태 업데이트 실패:', error);
    }
  }

  updatePlayerMovement() {
    const localPlayer = this.players.find(p => p.id === this.localPlayerId);
    if (!localPlayer) return;
    
    let moved = false;
    
    // PC 키보드 또는 모바일 터치 컨트롤
    const moveUp = (this.keys['KeyW'] || this.keys['ArrowUp'] || this.touchControls.up) && true;
    const moveDown = (this.keys['KeyS'] || this.keys['ArrowDown'] || this.touchControls.down) && true;
    const moveLeft = (this.keys['KeyA'] || this.keys['ArrowLeft'] || this.touchControls.left) && true;
    const moveRight = (this.keys['KeyD'] || this.keys['ArrowRight'] || this.touchControls.right) && true;
    
    if (moveUp) {
      localPlayer.y = Math.max(0, localPlayer.y - localPlayer.speed);
      moved = true;
    }
    if (moveDown) {
      localPlayer.y = Math.min(this.canvas.height - localPlayer.height, localPlayer.y + localPlayer.speed);
      moved = true;
    }
    if (moveLeft) {
      localPlayer.x = Math.max(0, localPlayer.x - localPlayer.speed);
      moved = true;
    }
    if (moveRight) {
      localPlayer.x = Math.min(this.canvas.width - localPlayer.width, localPlayer.x + localPlayer.speed);
      moved = true;
    }
    
    if (moved) {
      localPlayer.lastUpdate = Date.now();
      this.updatePlayerPosition();
    }
  }

  async updatePlayerPosition() {
    if (!this.currentRoom || !this.roomCode) return;
    
    const now = Date.now();
    if (now - this.lastPositionUpdate < this.positionUpdateThrottle) return;
    
    try {
      const playerIndex = this.currentRoom.players.findIndex(p => p.id === this.localPlayerId);
      if (playerIndex !== -1) {
        const localPlayer = this.players.find(p => p.id === this.localPlayerId);
        if (localPlayer) {
          // 의미있는 움직임이 있는지 확인 (실시간성 + 데이터 절약)
          const deltaX = Math.abs(localPlayer.x - this.lastPlayerPosition.x);
          const deltaY = Math.abs(localPlayer.y - this.lastPlayerPosition.y);
          const significantMove = deltaX > this.significantMoveThreshold || 
                                 deltaY > this.significantMoveThreshold;
          
          // 처음 움직임이거나 의미있는 움직임일 때만 Firebase 업데이트
          if (significantMove || this.lastPlayerPosition.x === 0) {
            this.currentRoom.players[playerIndex].x = localPlayer.x;
            this.currentRoom.players[playerIndex].y = localPlayer.y;
            
            // 개별 필드 업데이트로 데이터 사용량 최소화
            await updateDoc(doc(db, 'rooms', this.roomCode), {
              [`players.${playerIndex}.x`]: Math.round(localPlayer.x),
              [`players.${playerIndex}.y`]: Math.round(localPlayer.y)
            });
            
            // 위치 기록 업데이트
            this.lastPlayerPosition.x = localPlayer.x;
            this.lastPlayerPosition.y = localPlayer.y;
            this.lastPositionUpdate = now;
            
            console.log(`플레이어 위치 업데이트: (${Math.round(localPlayer.x)}, ${Math.round(localPlayer.y)})`);
          }
        }
      }
    } catch (error) {
      console.error('플레이어 위치 업데이트 실패:', error);
    }
  }

  updateVillainAI() {
    if (!this.villain || this.villain.stunned || (!this.isHost && this.currentRoom)) return;
    
    const speed = this.villain.slowed ? this.villain.speed * 0.5 : this.villain.speed;
    
    let escapeX = 0, escapeY = 0;
    let threatCount = 0;
    
    const nearbyPlayers = this.players.filter(player => {
      const dx = this.villain.x - player.x;
      const dy = this.villain.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < 300;
    });
    
    nearbyPlayers.forEach(player => {
      const dx = this.villain.x - player.x;
      const dy = this.villain.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 200) {
        const weight = 1 / (distance + 1);
        escapeX += (dx / distance) * weight;
        escapeY += (dy / distance) * weight;
        threatCount++;
      }
    });
    
    const panicMultiplier = Math.min(1.5, 1 + (threatCount * 0.1));
    
    const escapeLength = Math.sqrt(escapeX * escapeX + escapeY * escapeY);
    if (escapeLength > 0) {
      escapeX /= escapeLength;
      escapeY /= escapeLength;
    } else {
      const now = Date.now();
      if (now - this.villain.lastDirectionChange > 2000) {
        this.villain.direction.x = (Math.random() - 0.5) * 2;
        this.villain.direction.y = (Math.random() - 0.5) * 2;
        this.villain.lastDirectionChange = now;
      }
      escapeX = this.villain.direction.x;
      escapeY = this.villain.direction.y;
    }
    
    this.villainTarget.x = this.villain.x + escapeX * speed * panicMultiplier * 3;
    this.villainTarget.y = this.villain.y + escapeY * speed * panicMultiplier * 3;
    
    this.villainTarget.x = Math.max(0, Math.min(this.canvas.width - this.villain.width, this.villainTarget.x));
    this.villainTarget.y = Math.max(0, Math.min(this.canvas.height - this.villain.height, this.villainTarget.y));
    
    const lerpFactor = 0.1;
    this.villain.x += (this.villainTarget.x - this.villain.x) * lerpFactor;
    this.villain.y += (this.villainTarget.y - this.villain.y) * lerpFactor;
    
    this.villain.x = Math.max(0, Math.min(this.canvas.width - this.villain.width, this.villain.x));
    this.villain.y = Math.max(0, Math.min(this.canvas.height - this.villain.height, this.villain.y));
  }

  checkCollisions() {
    const now = Date.now();
    if (now - this.villain.lastDamageTime < this.villain.damageImmunity) return;
    
    this.players.forEach(player => {
      if (this.isColliding(player, this.villain)) {
        this.damageVillain(player, 5);
        this.villain.lastDamageTime = now;
      }
    });
  }

  isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  damageVillain(player, damage) {
    if (this.currentRoom && !this.isHost) return;
    
    this.villainHP = Math.max(0, this.villainHP - damage);
    
    const now = Date.now();
    this.recentHits.push({ player: player.id, time: now });
    
    this.recentHits = this.recentHits.filter(hit => now - hit.time < this.cooperationWindow);
    
    const uniquePlayers = [...new Set(this.recentHits.map(hit => hit.player))];
    const cooperationCount = uniquePlayers.length;
    
    if (cooperationCount >= 5) {
      this.villainHP = Math.max(0, this.villainHP - damage * 4);
    } else if (cooperationCount >= 3) {
      this.villainHP = Math.max(0, this.villainHP - damage * 2);
    } else if (cooperationCount >= 2) {
      this.villainHP = Math.max(0, this.villainHP - damage);
    }
  }

  updateItemSpawn() {
    if (this.currentRoom && !this.isHost) return;
    
    const now = Date.now();
    if (now - this.lastItemSpawn > this.itemSpawnInterval) {
      const itemCount = Math.min(5, Math.floor(this.players.length / 6) + 1);
      for (let i = 0; i < itemCount; i++) {
        this.spawnItem();
      }
      this.lastItemSpawn = now;
    }
  }

  spawnItem() {
    const itemTypes = [
      { type: 'slow', icon: '🧪', color: '#00ff88' },
      { type: 'trap', icon: '🕳️', color: '#ffd700' }
    ];
    
    const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    
    const item = {
      type: itemType.type,
      icon: itemType.icon,
      color: itemType.color,
      x: Math.random() * (this.canvas.width - 30),
      y: Math.random() * (this.canvas.height - 30),
      width: 30,
      height: 30
    };
    
    this.items.push(item);
    
    if (this.items.length > 20) {
      this.items.shift();
    }
  }

  checkGameEnd() {
    if (this.villainHP <= 0) {
      console.log('승리!');
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange('victory');
      }
    } else if (this.timeRemaining <= 0) {
      console.log('패배!');
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange('defeat');
      }
    }
  }

  handleCanvasClick(e) {
    const localPlayer = this.players.find(p => p.id === this.localPlayerId);
    if (!localPlayer) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // 빌런 공격
    const dx = clickX - (this.villain.x + this.villain.width / 2);
    const dy = clickY - (this.villain.y + this.villain.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 80) {
      this.damageVillain(localPlayer, 15);
    }
    
    // 아이템 수집
    this.items = this.items.filter(item => {
      const itemDx = clickX - (item.x + item.width / 2);
      const itemDy = clickY - (item.y + item.height / 2);
      const itemDistance = Math.sqrt(itemDx * itemDx + itemDy * itemDy);
      
      if (itemDistance < 50) {
        localPlayer.inventory[item.type]++;
        return false;
      }
      return true;
    });
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = '#2c3e50';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.drawPlayers();
    this.drawVillain();
    this.drawItems();
  }

  drawPlayers() {
    this.players.forEach(player => {
      // 그림자
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.fillRect(player.x + 2, player.y + 2, player.width, player.height);
      
      // 플레이어
      this.ctx.fillStyle = player.color;
      this.ctx.fillRect(player.x, player.y, player.width, player.height);
      
      // 테두리
      this.ctx.strokeStyle = player.id === this.localPlayerId ? '#fff' : '#ddd';
      this.ctx.lineWidth = player.id === this.localPlayerId ? 3 : 2;
      this.ctx.strokeRect(player.x, player.y, player.width, player.height);
      
      // 이름
      if (player.id === this.localPlayerId || this.players.length <= 10) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(player.name, player.x + player.width / 2, player.y - 5);
      }
    });
  }

  drawVillain() {
    // 그림자 효과
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(this.villain.x + 3, this.villain.y + 3, this.villain.width, this.villain.height);
    
    if (this.villainImageLoaded) {
      // 이미지로 그리기
      this.ctx.drawImage(this.villainImage, this.villain.x, this.villain.y, this.villain.width, this.villain.height);
    } else {
      // 기본 형태로 그리기
      this.ctx.fillStyle = this.villain.color;
      this.ctx.fillRect(this.villain.x, this.villain.y, this.villain.width, this.villain.height);
      
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(this.villain.x, this.villain.y, this.villain.width, this.villain.height);
    }
    
    // 상태 아이콘
    let statusIcon = '😈';
    if (this.villain.stunned) statusIcon = '😵';
    else if (this.villain.slowed) statusIcon = '🐌';
    
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#fff';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeText(statusIcon, this.villain.x + this.villain.width / 2, this.villain.y + this.villain.height / 2 + 8);
    this.ctx.fillText(statusIcon, this.villain.x + this.villain.width / 2, this.villain.y + this.villain.height / 2 + 8);
    
    // HP 바
    const barWidth = 60;
    const barHeight = 8;
    const barX = this.villain.x + this.villain.width / 2 - barWidth / 2;
    const barY = this.villain.y - 20;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    
    const hpRatio = this.villainHP / this.villainMaxHP;
    this.ctx.fillStyle = hpRatio > 0.5 ? '#4facfe' : hpRatio > 0.25 ? '#ffd700' : '#f5576c';
    this.ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
    
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${this.villainHP}/${this.villainMaxHP}`, this.villain.x + this.villain.width / 2, barY - 5);
  }

  drawItems() {
    this.items.forEach(item => {
      this.ctx.fillStyle = item.color;
      this.ctx.fillRect(item.x, item.y, item.width, item.height);
      
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(item.x, item.y, item.width, item.height);
      
      this.ctx.font = '20px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText(item.icon, item.x + item.width / 2, item.y + item.height / 2 + 7);
    });
  }

  gameLoop(currentTime = 0) {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    this.update(deltaTime);
    this.render();
    
    // 호스트만 빌런 상태 업데이트
    if (this.currentRoom && this.isHost) {
      this.updateVillainState();
    }
    
    this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  async updateVillainState() {
    if (!this.isHost || !this.currentRoom || !this.roomCode) return;
    
    const now = Date.now();
    if (now - this.lastVillainUpdate < this.villainUpdateThrottle) return;
    
    try {
      // 변화가 있는지 확인
      const positionChanged = Math.abs(this.villain.x - this.lastVillainPosition.x) > 2 ||
                             Math.abs(this.villain.y - this.lastVillainPosition.y) > 2;
      const hpChanged = this.villainHP !== this.lastVillainHP;
      const statusChanged = this.villain.stunned !== this.lastVillainStatus?.stunned ||
                          this.villain.slowed !== this.lastVillainStatus?.slowed;
      
      // 변화가 있을 때만 업데이트
      if (positionChanged || hpChanged || statusChanged || !this.lastVillainPosition.x) {
        const updateData = {};
        
        if (positionChanged || !this.lastVillainPosition.x) {
          updateData['villain.x'] = Math.round(this.villain.x);
          updateData['villain.y'] = Math.round(this.villain.y);
          updateData['villain.targetX'] = Math.round(this.villainTarget.x);
          updateData['villain.targetY'] = Math.round(this.villainTarget.y);
          
          // 위치 기록 업데이트
          this.lastVillainPosition.x = this.villain.x;
          this.lastVillainPosition.y = this.villain.y;
        }
        
        if (hpChanged) {
          updateData['villain.hp'] = this.villainHP;
          this.lastVillainHP = this.villainHP;
        }
        
        if (statusChanged) {
          updateData['villain.stunned'] = this.villain.stunned;
          updateData['villain.slowed'] = this.villain.slowed;
          this.lastVillainStatus = {
            stunned: this.villain.stunned,
            slowed: this.villain.slowed
          };
        }
        
        updateData['villain.lastUpdate'] = serverTimestamp();
        
        await updateDoc(doc(db, 'rooms', this.roomCode), updateData);
        this.lastVillainUpdate = now;
        
        console.log('빌런 상태 업데이트:', Object.keys(updateData).join(', '));
      }
    } catch (error) {
      console.error('빌런 상태 업데이트 실패:', error);
    }
  }

  updateCallbacks() {
    if (this.callbacks.onPlayerCountUpdate) {
      this.callbacks.onPlayerCountUpdate(this.players.length);
    }
    
    if (this.callbacks.onGameInfoUpdate) {
      this.callbacks.onGameInfoUpdate({
        timeRemaining: this.timeRemaining,
        villainHP: this.villainHP,
        villainMaxHP: this.villainMaxHP
      });
    }
    
    if (this.callbacks.onRoomUpdate) {
      this.callbacks.onRoomUpdate(this.currentRoom);
    }
  }

  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this.roomListener) {
      this.roomListener();
    }
    
    // 이벤트 리스너 제거
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    
    console.log('게임 엔진 정리');
  }
}

export default VillainChaseGame; 