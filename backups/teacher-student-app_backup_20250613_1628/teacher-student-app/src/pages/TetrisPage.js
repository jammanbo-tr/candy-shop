import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './TetrisPage.css';

// 테트리스 블록 모양 정의
const TETROMINOS = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: '#00f5ff'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#ffff00'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: '#800080'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: '#00ff00'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: '#ff0000'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: '#0000ff'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: '#ffa500'
  }
};

// 이벤트 블록 타입
const EVENT_BLOCKS = {
  CLEAR_VERTICAL: { type: 'CLEAR_VERTICAL', image: 'lv1.png', color: '#ff69b4' },
  CLEAR_BOTTOM: { type: 'CLEAR_BOTTOM', image: 'lv2.png', color: '#32cd32' },
  CLEAR_CROSS: { type: 'CLEAR_CROSS', image: 'lv3.png', color: '#9c27b0' },
  CLEAR_RANDOM: { type: 'CLEAR_RANDOM', image: 'lv4.png', color: '#ff5722' },
  CLEAR_SIDES: { type: 'CLEAR_SIDES', image: 'lv5.png', color: '#607d8b' },
  CLEAR_CENTER: { type: 'CLEAR_CENTER', image: 'lv6.png', color: '#795548' }
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const INITIAL_SPEED = 1000;

const TetrisPage = () => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [showNicknameDialog, setShowNicknameDialog] = useState(true);
  const [board, setBoard] = useState(Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(null)));
  const [currentPiece, setCurrentPiece] = useState(null);
  const [nextPiece, setNextPiece] = useState(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [isMobile, setIsMobile] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [rankings, setRankings] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  
  const gameLoopRef = useRef();
  const boardRef = useRef(board);
  boardRef.current = board;

  // 다음 블록 참조
  const nextPieceRef = useRef(null);
  
  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // nextPiece 상태와 ref 동기화
  useEffect(() => {
    if (nextPiece) {
      nextPieceRef.current = nextPiece;
      console.log('NextPiece ref updated:', nextPiece.type, nextPiece.id);
    }
  }, [nextPiece]);

  // 랜덤 테트로미노 생성 - 완전히 새로운 방식
  const createRandomTetromino = () => {
    const pieceTypes = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    
    // 강력한 랜덤 생성
    const randomValue = Math.random();
    const randomIndex = Math.floor(randomValue * pieceTypes.length);
    const pieceType = pieceTypes[randomIndex];
    
    console.log('Creating piece:', pieceType, 'random:', randomValue, 'index:', randomIndex);
    
    // 완전히 새로운 객체 생성 (깊은 복사)
    const originalShape = TETROMINOS[pieceType].shape;
    const newShape = originalShape.map(row => [...row]);
    
    // 2% 확률로 이벤트 블록 생성
    const isEventBlock = Math.random() < 0.02;
    let eventPositions = [];
    
    if (isEventBlock) {
      const eventTypes = Object.keys(EVENT_BLOCKS);
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      // 블록의 모든 위치를 찾기
      const positions = [];
      for (let y = 0; y < newShape.length; y++) {
        for (let x = 0; x < newShape[y].length; x++) {
          if (newShape[y][x]) {
            positions.push({ x, y });
          }
        }
      }
      
      // 블록 중 1개 위치만 이벤트 블록으로 설정
      if (positions.length > 0) {
        const randomPos = positions[Math.floor(Math.random() * positions.length)];
        eventPositions = [{ ...randomPos, eventType }];
      }
    }
    
    const piece = {
      type: pieceType,
      shape: newShape,
      color: TETROMINOS[pieceType].color,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(newShape[0].length / 2),
      y: 0,
      eventPositions: eventPositions,
      id: Date.now() + Math.random() // 고유 ID 추가
    };
    
    console.log('Created piece object:', piece);
    return piece;
  };

  // 랜덤 테트로미노 생성 (useCallback 제거)
  const getRandomTetromino = () => {
    return createRandomTetromino();
  };

  // 게임 초기화
  const initGame = () => {
    console.log('=== INITIALIZING GAME ===');
    const newBoard = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(null));
    setBoard(newBoard);
    
    // 첫 번째 블록 생성
    const firstPiece = getRandomTetromino();
    console.log('First piece created:', firstPiece.type, firstPiece.id);
    
    // 두 번째 블록 생성
    const secondPiece = getRandomTetromino();
    console.log('Second piece created:', secondPiece.type, secondPiece.id);
    
    // ref 업데이트
    nextPieceRef.current = secondPiece;
    
    setCurrentPiece(firstPiece);
    setNextPiece(secondPiece);
    setScore(0);
    setLevel(1);
    setLines(0);
    setGameOver(false);
    setPaused(false);
    setSpeed(INITIAL_SPEED);
    setShowRankingModal(false);
    setMyRank(null);
    setRankings([]);
    
    console.log('Game initialized with pieces:', firstPiece.type, 'and', secondPiece.type);
    console.log('========================');
  };

  // 닉네임 확인 후 게임 시작
  const handleStartGame = () => {
    if (nickname.trim()) {
      setShowNicknameDialog(false);
      setGameStarted(true);
      initGame();
    }
  };

  // 점수를 DB에 저장
  const saveScore = async (finalScore, finalLevel, finalLines) => {
    if (isSubmittingScore) return;
    setIsSubmittingScore(true);
    
    try {
      await addDoc(collection(db, 'tetrisScores'), {
        nickname: nickname,
        score: finalScore,
        level: finalLevel,
        lines: finalLines,
        timestamp: new Date(),
        createdAt: Date.now()
      });
      
      // 점수 저장 후 랭킹 조회
      await fetchRankings();
      setShowRankingModal(true);
    } catch (error) {
      console.error('점수 저장 실패:', error);
    } finally {
      setIsSubmittingScore(false);
    }
  };

  // 랭킹 조회
  const fetchRankings = async () => {
    try {
      const q = query(
        collection(db, 'tetrisScores'),
        orderBy('score', 'desc'),
        limit(100) // 상위 100명까지 조회
      );
      
      const querySnapshot = await getDocs(q);
      const rankingData = [];
      
      querySnapshot.forEach((doc) => {
        rankingData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setRankings(rankingData);
      
      // 내 순위 찾기
      const myRankIndex = rankingData.findIndex(
        (rank) => rank.nickname === nickname && rank.score === score
      );
      
      if (myRankIndex !== -1) {
        setMyRank({
          rank: myRankIndex + 1,
          score: score,
          nickname: nickname
        });
      }
    } catch (error) {
      console.error('랭킹 조회 실패:', error);
    }
  };

  // 블록 회전
  const rotatePiece = useCallback((piece) => {
    const rotated = piece.shape[0].map((_, index) =>
      piece.shape.map(row => row[index]).reverse()
    );
    return { ...piece, shape: rotated };
  }, []);

  // 충돌 검사
  const isValidMove = useCallback((piece, x, y, currentBoard) => {
    if (!piece || !piece.shape) return false;
    if (!currentBoard) currentBoard = boardRef.current;
    
    for (let py = 0; py < piece.shape.length; py++) {
      for (let px = 0; px < piece.shape[py].length; px++) {
        if (piece.shape[py][px]) {
          const newX = x + px;
          const newY = y + py;
          
          // 경계 체크
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return false;
          }
          
          // 위쪽 경계는 허용 (블록이 위에서 시작)
          if (newY < 0) {
            continue;
          }
          
          // 다른 블록과 충돌 체크
          if (currentBoard[newY][newX] !== null) {
            return false;
          }
        }
      }
    }
    
    return true;
  }, []);

  // 블록을 보드에 고정
  const placePiece = useCallback((piece, currentBoard) => {
    if (!currentBoard) currentBoard = boardRef.current;
    const newBoard = currentBoard.map(row => [...row]);
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = piece.y + y;
          const boardX = piece.x + x;
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            const eventPos = piece.eventPositions?.find(pos => pos.x === x && pos.y === y);
            newBoard[boardY][boardX] = {
              color: piece.color,
              eventType: eventPos?.eventType || null,
              eventImage: eventPos ? EVENT_BLOCKS[eventPos.eventType]?.image : null,
              isActive: false
            };
          }
        }
      }
    }
    
    return newBoard;
  }, []);

  // 중력 적용 (빈 공간을 아래로 당기기)
  const applyGravity = useCallback((board) => {
    const newBoard = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(null));
    
    for (let col = 0; col < BOARD_WIDTH; col++) {
      const column = [];
      // 해당 열의 모든 블록을 수집 (null이 아닌 것만)
      for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
        if (board[row][col]) {
          column.push(board[row][col]);
        }
      }
      // 아래부터 채우기
      for (let i = 0; i < column.length; i++) {
        newBoard[BOARD_HEIGHT - 1 - i][col] = column[i];
      }
    }
    
    return newBoard;
  }, []);

  // 이벤트 블록 처리 함수
  const handleEventBlock = useCallback((board, eventType, row, col) => {
    const newBoard = board.map(row => [...row]);
    
    switch (eventType) {
      case 'bomb':
        // 폭탄: 3x3 영역 제거
        for (let r = Math.max(0, row - 1); r <= Math.min(BOARD_HEIGHT - 1, row + 1); r++) {
          for (let c = Math.max(0, col - 1); c <= Math.min(BOARD_WIDTH - 1, col + 1); c++) {
            newBoard[r][c] = null;
          }
        }
        break;
      case 'line':
        // 라인 클리어: 전체 행 제거
        for (let c = 0; c < BOARD_WIDTH; c++) {
          newBoard[row][c] = null;
        }
        break;
      case 'column':
        // 컬럼 클리어: 전체 열 제거
        for (let r = 0; r < BOARD_HEIGHT; r++) {
          newBoard[r][col] = null;
        }
        break;
      default:
        break;
    }
    
    return newBoard;
  }, []);

  // 완성된 줄 제거 및 점수 계산
  const clearLines = useCallback((newBoard, scoreCallback, linesCallback, levelCallback, speedCallback, currentLevel, currentLines, eventHandler) => {
    let clearedLines = 0;
    let eventTriggered = false;
    
    for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
      if (newBoard[row].every(cell => cell !== null)) {
        // 이벤트 블록 처리
        for (let col = 0; col < BOARD_WIDTH; col++) {
          const cell = newBoard[row][col];
          if (cell?.eventType) {
            eventTriggered = true;
            newBoard = eventHandler(newBoard, cell.eventType, row, col);
          }
        }
        
        // 줄 제거
        newBoard.splice(row, 1);
        newBoard.unshift(Array(BOARD_WIDTH).fill(null));
        clearedLines++;
        row++; // 같은 행을 다시 확인
      }
    }
    
    if (clearedLines > 0 || eventTriggered) {
      // 콤보 점수 계산
      const comboScores = [0, 10, 25, 45, 65];
      const lineScore = comboScores[Math.min(clearedLines, 4)] || (65 + (clearedLines - 4) * 20);
      const eventBonus = eventTriggered ? 50 : 0;
      
      scoreCallback(prev => prev + lineScore + eventBonus);
      linesCallback(prev => prev + clearedLines);
      
      // 레벨업 (10줄마다)
      const newLines = currentLines + clearedLines;
      const newLevel = Math.floor(newLines / 10) + 1;
      if (newLevel > currentLevel) {
        levelCallback(newLevel);
        speedCallback(prev => Math.max(100, prev - 50));
      }
    }
    
    return newBoard;
  }, []);

  // 블록 이동 (좌우 이동만)
  const movePiece = useCallback((direction) => {
    if (!currentPiece || gameOver || isPaused) return;
    
    let newX = currentPiece.x;
    let newY = currentPiece.y;
    
    switch (direction) {
      case 'left':
        newX--;
        break;
      case 'right':
        newX++;
        break;
      case 'down':
        newY++;
        break;
      default:
        return;
    }
    
    if (isValidMove(currentPiece, newX, newY, boardRef.current)) {
      setCurrentPiece(prev => ({ ...prev, x: newX, y: newY }));
    }
  }, [currentPiece, gameOver, isPaused, isValidMove]);

  // 블록 회전
  const rotatePieceHandler = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;
    
    const rotated = rotatePiece(currentPiece);
    if (isValidMove(rotated, rotated.x, rotated.y, boardRef.current)) {
      setCurrentPiece(rotated);
    }
  }, [currentPiece, gameOver, isPaused, rotatePiece, isValidMove]);

  // 하드 드롭 (한 번에 내려가기) - 새로운 구조에 맞게 수정
  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;
    
    // 1. 현재 블록을 가장 아래까지 이동
    let newY = currentPiece.y;
    while (isValidMove(currentPiece, currentPiece.x, newY + 1, boardRef.current)) {
      newY++;
    }
    
    const droppedPiece = { ...currentPiece, y: newY };
    
    // 2. 블록을 보드에 고정
    const newBoard = placePiece(droppedPiece, boardRef.current);
    
    // 3. 게임 오버 체크
    let gameOverCheck = false;
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (newBoard[y][x] !== null) {
          gameOverCheck = true;
          break;
        }
      }
      if (gameOverCheck) break;
    }
    
    if (gameOverCheck) {
      setGameOver(true);
      saveScore(score, level, lines);
      setBoard(newBoard);
      setCurrentPiece(null);
      return;
    }
    
    // 4. 줄 제거 및 이벤트 처리
    let processedBoard = [...newBoard];
    let clearedLines = 0;
    let eventTriggered = false;
    
    for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
      if (processedBoard[row].every(cell => cell !== null)) {
        // 이벤트 블록이 있는지 확인
        for (let col = 0; col < BOARD_WIDTH; col++) {
          const cell = processedBoard[row][col];
          if (cell?.eventType) {
            eventTriggered = true;
            processedBoard = handleEventBlock(processedBoard, cell.eventType, row, col);
            break;
          }
        }
        
        // 줄 제거
        processedBoard.splice(row, 1);
        processedBoard.unshift(Array(BOARD_WIDTH).fill(null));
        clearedLines++;
        row++;
      }
    }
    
    // 5. 점수 업데이트
    if (clearedLines > 0 || eventTriggered) {
      const comboScores = [0, 10, 25, 45, 65];
      const lineScore = comboScores[Math.min(clearedLines, 4)] || (65 + (clearedLines - 4) * 20);
      const eventBonus = eventTriggered ? 50 : 0;
      
      setScore(prev => prev + lineScore + eventBonus);
      setLines(prev => prev + clearedLines);
      
      // 레벨업 체크
      setLevel(currentLevel => {
        const newLines = lines + clearedLines;
        const newLevel = Math.floor(newLines / 10) + 1;
        if (newLevel > currentLevel) {
          setSpeed(prev => Math.max(100, prev - 50));
          return newLevel;
        }
        return currentLevel;
      });
    }
    
    // 6. 보드 업데이트 및 새 블록 생성
    setBoard(processedBoard);
    setCurrentPiece(null); // 다음 게임 루프에서 새 블록 생성
  }, [currentPiece, gameOver, isPaused, isValidMove, placePiece, handleEventBlock, saveScore, score, level, lines]);

  // 키보드 이벤트 수정 - 스페이스 키를 하드 드롭으로 변경
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!gameStarted) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          movePiece('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          movePiece('right');
          break;
        case 'ArrowDown':
          e.preventDefault();
          movePiece('down');
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotatePieceHandler();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'Enter':
          e.preventDefault();
          rotatePieceHandler();
          break;
        case 'p':
        case 'P':
          setPaused(prev => !prev);
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, movePiece, rotatePieceHandler, hardDrop]);

  // 테트리스 게임 루프 - 완전히 새로운 구조로 재작성
  useEffect(() => {
    if (!gameStarted || gameOver || isPaused) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    // 기존 인터벌 정리
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }

    const dropPiece = () => {
      setCurrentPiece(prevPiece => {
        // 현재 블록이 없으면 새 블록 생성
        if (!prevPiece) {
          console.log('=== NEW PIECE NEEDED ===');
          
          // ref에서 다음 블록 가져오기
          const nextFromRef = nextPieceRef.current;
          console.log('Next piece from ref:', nextFromRef?.type, 'ID:', nextFromRef?.id);
          
          // nextPiece가 없으면 새로 생성
          if (!nextFromRef) {
            console.log('ERROR: No nextPiece in ref, creating emergency pieces');
            const emergencyPiece = getRandomTetromino();
            const emergencyNext = getRandomTetromino();
            
            console.log('Emergency current:', emergencyPiece.type, 'ID:', emergencyPiece.id);
            console.log('Emergency next:', emergencyNext.type, 'ID:', emergencyNext.id);
            
            nextPieceRef.current = emergencyNext;
            setNextPiece(emergencyNext);
            return emergencyPiece;
          }
          
          // nextPiece를 현재 블록으로 사용 (완전한 복사)
          const currentPieceToUse = {
            type: nextFromRef.type,
            shape: nextFromRef.shape.map(row => [...row]), // 깊은 복사
            color: nextFromRef.color,
            x: nextFromRef.x,
            y: nextFromRef.y,
            eventPositions: nextFromRef.eventPositions ? [...nextFromRef.eventPositions] : [],
            id: nextFromRef.id
          };
          
          // 새로운 다음 블록 생성
          const newNextPiece = getRandomTetromino();
          
          console.log('Using piece:', currentPieceToUse.type, 'ID:', currentPieceToUse.id);
          console.log('Generated new next piece:', newNextPiece.type, 'ID:', newNextPiece.id);
          console.log('=======================');
          
          // 게임 오버 체크
          if (!isValidMove(currentPieceToUse, currentPieceToUse.x, currentPieceToUse.y, boardRef.current)) {
            setGameOver(true);
            saveScore(score, level, lines);
            return null;
          }
          
          // ref와 state 모두 업데이트
          nextPieceRef.current = newNextPiece;
          setNextPiece(newNextPiece);
          
          return currentPieceToUse;
        }

        const newY = prevPiece.y + 1;
        
        // 블록이 아래로 이동할 수 있는지 확인
        if (isValidMove(prevPiece, prevPiece.x, newY, boardRef.current)) {
          // 이동 가능하면 블록을 아래로 이동
          return { ...prevPiece, y: newY };
        } else {
          // 이동 불가능하면 블록을 보드에 고정
          const newBoard = placePiece(prevPiece, boardRef.current);
          
          // 게임 오버 체크 - 블록이 맨 위 영역(y < 2)에 고정되면 게임 오버
          let gameOverCheck = false;
          for (let y = 0; y < 2; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
              if (newBoard[y][x] !== null) {
                gameOverCheck = true;
                break;
              }
            }
            if (gameOverCheck) break;
          }
          
          if (gameOverCheck) {
            setGameOver(true);
            saveScore(score, level, lines);
            setBoard(newBoard);
            return null;
          }
          
          // 줄 제거 및 이벤트 처리
          let processedBoard = [...newBoard];
          let clearedLines = 0;
          let eventTriggered = false;
          
          // 완성된 줄 찾기 및 이벤트 블록 처리
          for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
            if (processedBoard[row].every(cell => cell !== null)) {
              // 이벤트 블록이 있는지 확인
              for (let col = 0; col < BOARD_WIDTH; col++) {
                const cell = processedBoard[row][col];
                if (cell?.eventType) {
                  eventTriggered = true;
                  processedBoard = handleEventBlock(processedBoard, cell.eventType, row, col);
                  break;
                }
              }
              
              // 줄 제거
              processedBoard.splice(row, 1);
              processedBoard.unshift(Array(BOARD_WIDTH).fill(null));
              clearedLines++;
              row++; // 같은 행을 다시 확인
            }
          }
          
          // 점수 업데이트
          if (clearedLines > 0 || eventTriggered) {
            const comboScores = [0, 10, 25, 45, 65];
            const lineScore = comboScores[Math.min(clearedLines, 4)] || (65 + (clearedLines - 4) * 20);
            const eventBonus = eventTriggered ? 50 : 0;
            
            setScore(prev => prev + lineScore + eventBonus);
            setLines(prev => prev + clearedLines);
            
            // 레벨업 체크
            setLevel(currentLevel => {
              const newLines = lines + clearedLines;
              const newLevel = Math.floor(newLines / 10) + 1;
              if (newLevel > currentLevel) {
                setSpeed(prev => Math.max(100, prev - 50));
                return newLevel;
              }
              return currentLevel;
            });
          }
          
          // 보드 업데이트
          setBoard(processedBoard);
          
          // 다음 블록을 위해 null 반환
          return null;
        }
      });
    };

    gameLoopRef.current = setInterval(dropPiece, speed);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameStarted, gameOver, isPaused, speed]);

  // 보드 렌더링 (현재 블록 포함)
  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);
    
    // 현재 블록을 보드에 표시
    if (currentPiece) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = currentPiece.y + y;
            const boardX = currentPiece.x + x;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              const eventPos = currentPiece.eventPositions?.find(pos => pos.x === x && pos.y === y);
              displayBoard[boardY][boardX] = {
                color: currentPiece.color,
                eventType: eventPos?.eventType || null,
                eventImage: eventPos ? EVENT_BLOCKS[eventPos.eventType]?.image : null,
                isActive: true
              };
            }
          }
        }
      }
    }
    
    return displayBoard;
  };

  const displayBoard = renderBoard();

  return (
    <div className="tetris-container">
      {/* 상단 네비게이션 바 - 세련된 스타일 */}
      <div className="tetris-header">
        <div className="header-left">
          <Button
            variant="contained"
            onClick={() => navigate('/teacher')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: '14px',
              padding: '10px 20px',
              borderRadius: '12px',
              marginRight: '16px',
              textTransform: 'none',
              fontWeight: '600',
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
              border: 'none'
            }}
          >
            홈으로
          </Button>
          <h1 className="tetris-title">테트리스 게임</h1>
        </div>
        {gameStarted && (
          <div className="header-right">
            <span className="player-name">{nickname}</span>
          </div>
        )}
      </div>

      {/* 닉네임 입력 다이얼로그 - 세련된 스타일 */}
      <Dialog 
        open={showNicknameDialog} 
        disableEscapeKeyDown
        PaperProps={{
          style: {
            borderRadius: '16px',
            padding: '32px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            minWidth: '400px'
          }
        }}
      >
        <DialogTitle style={{ 
          textAlign: 'center', 
          fontSize: '24px', 
          fontWeight: '700',
          color: '#2c3e50',
          paddingBottom: '24px',
          marginBottom: '0'
        }}>
          테트리스 게임
        </DialogTitle>
        <DialogContent style={{ paddingTop: '0px' }}>
          <TextField
            autoFocus
            margin="dense"
            label="닉네임을 입력하세요"
            fullWidth
            variant="outlined"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleStartGame()}
            style={{ marginTop: '20px' }}
            InputProps={{
              style: {
                borderRadius: '12px',
                fontSize: '16px',
                backgroundColor: '#f8f9fa'
              }
            }}
            InputLabelProps={{
              style: {
                fontSize: '16px',
                color: '#6c757d'
              }
            }}
          />
        </DialogContent>
        <DialogActions style={{ justifyContent: 'center', padding: '24px 0 0 0' }}>
          <Button 
            onClick={handleStartGame} 
            variant="contained"
            disabled={!nickname.trim()}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: '16px',
              padding: '12px 32px',
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: '600',
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
              minWidth: '140px'
            }}
          >
            시작하기
          </Button>
        </DialogActions>
      </Dialog>

      {gameStarted && (
        <div className="game-area">
          <div className="game-content">
            {/* 게임 보드 */}
            <div className="game-board-container">
              <div className="game-board">
                {displayBoard.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`cell ${cell ? 'filled' : 'empty'} ${cell?.isActive ? 'active' : ''} ${cell?.eventType ? 'event-block' : ''}`}
                      style={{
                        backgroundColor: cell?.color || 'transparent',
                        border: cell ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      {cell?.eventType && cell?.eventImage && (
                        <img 
                          src={`/${cell.eventImage}`} 
                          alt="event" 
                          className="event-image"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 우측 정보 패널 */}
            <div className="info-panel">
              {/* 점수 */}
              <div className="score-container">
                <h3>점수</h3>
                <div className="score-value">{score.toLocaleString()}</div>
              </div>

              {/* 레벨 & 줄 */}
              <div className="level-lines-container">
                <div className="level-info">
                  <span className="label">레벨</span>
                  <span className="value">{level}</span>
                </div>
                <div className="lines-info">
                  <span className="label">줄</span>
                  <span className="value">{lines}</span>
                </div>
              </div>

              {/* 다음 블록 미리보기 - 수정된 버전 */}
              <div className="next-piece-container">
                <h3>다음 블록</h3>
                {nextPiece && (
                  <div className="next-piece-info">
                    <p style={{ 
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      color: nextPiece.color,
                      margin: '8px 0',
                      textAlign: 'center'
                    }}>
                      {nextPiece.type}형 블록
                    </p>
                    <div className="next-piece-preview">
                      <div 
                        className="next-piece-grid"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, 1fr)`,
                          gridTemplateRows: `repeat(${nextPiece.shape.length}, 1fr)`,
                          gap: '1px',
                          width: 'fit-content',
                          margin: '0 auto'
                        }}
                      >
                        {nextPiece.shape.map((row, rowIndex) =>
                          row.map((cell, colIndex) => (
                            <div
                              key={`next-${rowIndex}-${colIndex}`}
                              className={`next-cell ${cell ? 'filled' : 'empty'}`}
                              style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: cell ? nextPiece.color : 'transparent',
                                border: cell ? '1px solid rgba(255,255,255,0.3)' : 'none'
                              }}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 게임 컨트롤 버튼들 */}
              <div className="game-controls">
                {/* 일시정지 버튼 - 모바일에서만 숨김 */}
                {!isMobile && (
                  <Button
                    variant="contained"
                    onClick={() => setPaused(!isPaused)}
                    style={{
                      backgroundColor: isPaused ? '#27ae60' : '#f39c12',
                      color: 'white',
                      fontSize: '14px',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      width: '100%',
                      textTransform: 'none',
                      fontWeight: '500',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {isPaused ? '▶️ 계속하기' : '⏸️ 일시정지'}
                  </Button>
                )}
                
                {/* 모바일용 일시정지 버튼 */}
                {isMobile && (
                  <button 
                    className="mobile-pause-btn"
                    onClick={() => setPaused(!isPaused)}
                    aria-label="일시정지"
                  >
                    <div className="btn-face">
                      <span className="btn-label">{isPaused ? 'PLAY' : 'PAUSE'}</span>
                      <span className="btn-icon">{isPaused ? '▶' : '⏸'}</span>
                    </div>
                  </button>
                )}
                
                <Button
                  variant="outlined"
                  onClick={() => setShowRankingModal(true)}
                  style={{
                    borderColor: '#3498db',
                    color: '#3498db',
                    fontSize: '14px',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    width: '100%',
                    textTransform: 'none',
                    fontWeight: '500',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  🏆 랭킹 보기
                </Button>
              </div>
            </div>
          </div>

          {/* 모바일 컨트롤 - 마인크래프트 스타일 */}
          {isMobile && (
            <div className="mobile-controls-minecraft">
              <div className="controls-container">
                {/* 방향 패드 (회전 버튼 제거) */}
                <div className="dpad-container">
                  <div className="dpad">
                    <div className="dpad-empty"></div>
                    <button 
                      className="dpad-btn dpad-left" 
                      onClick={() => movePiece('left')}
                      aria-label="왼쪽"
                    >
                      <div className="btn-face">
                        <span className="btn-icon">←</span>
                      </div>
                    </button>
                    <div className="dpad-center"></div>
                    <button 
                      className="dpad-btn dpad-right" 
                      onClick={() => movePiece('right')}
                      aria-label="오른쪽"
                    >
                      <div className="btn-face">
                        <span className="btn-icon">→</span>
                      </div>
                    </button>
                    <button 
                      className="dpad-btn dpad-down" 
                      onClick={() => movePiece('down')}
                      aria-label="아래"
                    >
                      <div className="btn-face">
                        <span className="btn-icon">↓</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 우측 액션 버튼들 - 한 줄 배치 */}
                <div className="action-buttons-horizontal">
                  <button 
                    className="action-btn rotate-btn" 
                    onClick={rotatePieceHandler}
                    aria-label="회전"
                  >
                    <div className="btn-face">
                      <span className="btn-label">회전</span>
                      <span className="btn-icon">↻</span>
                    </div>
                  </button>
                  <button 
                    className="action-btn drop-btn" 
                    onClick={hardDrop}
                    aria-label="떨어뜨리기"
                  >
                    <div className="btn-face">
                      <span className="btn-label">떨어뜨리기</span>
                      <span className="btn-icon">⬇</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 게임 오버 - TeacherPage 완전 동일 스타일 */}
          {gameOver && !showRankingModal && (
            <div className="game-over-overlay">
              <div className="game-over-modal">
                <h2 style={{
                  background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontSize: '28px',
                  fontWeight: 'bold',
                  marginBottom: '20px'
                }}>🎮 게임 오버! 🎮</h2>
                <div className="game-over-content">
                  <p style={{
                    fontSize: '18px',
                    color: '#333',
                    marginBottom: '15px'
                  }}><strong>{nickname}</strong>님의 최종 점수</p>
                  <div className="final-score" style={{
                    fontSize: '36px',
                    fontWeight: 'bold',
                    background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    margin: '15px 0'
                  }}>{score.toLocaleString()}점</div>
                  <div className="game-stats" style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '30px',
                    marginTop: '20px',
                    fontSize: '16px',
                    color: '#666'
                  }}>
                    <span>레벨: <strong style={{color: '#333'}}>{level}</strong></span>
                    <span>제거한 줄: <strong style={{color: '#333'}}>{lines}</strong></span>
                  </div>
                </div>
                {isSubmittingScore ? (
                  <div className="loading-message" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    marginTop: '25px',
                    color: '#666',
                    fontSize: '16px'
                  }}>
                    <span>점수 저장 중...</span>
                    <div className="loading-spinner"></div>
                  </div>
                ) : (
                  <Button
                    variant="contained"
                    onClick={() => setShowRankingModal(true)}
                    style={{
                      background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                      color: 'white',
                      fontSize: '18px',
                      padding: '15px 35px',
                      borderRadius: '25px',
                      marginTop: '25px',
                      textTransform: 'none',
                      fontWeight: 'bold',
                      boxShadow: '0 3px 15px rgba(255, 105, 135, 0.4)',
                      minWidth: '180px'
                    }}
                  >
                    랭킹 보기 🏆
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 랭킹 모달 - TeacherPage 스타일 */}
          {showRankingModal && (
            <div className="ranking-overlay">
              <div className="ranking-modal">
                <div className="modal-header">
                  <h2>🏆 테트리스 랭킹</h2>
                  <button 
                    className="close-btn"
                    onClick={() => setShowRankingModal(false)}
                  >
                    ✕
                  </button>
                </div>
                
                {/* 내 순위 정보 */}
                {myRank && (
                  <div className="my-rank-info">
                    <h3>🎯 {nickname}님의 결과</h3>
                    <div className="rank-summary">
                      <span className="rank-number">{myRank.rank}위</span>
                      <span className="rank-score">{myRank.score.toLocaleString()}점</span>
                    </div>
                    {myRank.rank <= 5 && (
                      <p className="congratulations">🎉 TOP 5 달성! 축하합니다! 🎉</p>
                    )}
                  </div>
                )}

                {/* 랭킹 리스트 */}
                <div className="ranking-list-container">
                  <h3>🏅 전체 랭킹</h3>
                  <div className="ranking-list">
                    {rankings.map((rank, index) => (
                      <div 
                        key={rank.id} 
                        className={`ranking-item ${index < 5 ? 'top-rank' : ''} ${
                          rank.nickname === nickname && rank.score === score ? 'my-score' : ''
                        }`}
                      >
                        <div className="rank-position">
                          {index + 1 <= 3 ? (
                            <span className="medal">
                              {index + 1 === 1 ? '🥇' : index + 1 === 2 ? '🥈' : '🥉'}
                            </span>
                          ) : (
                            <span className="rank-num">{index + 1}</span>
                          )}
                        </div>
                        <div className="rank-info">
                          <div className="rank-nickname">{rank.nickname}</div>
                          <div className="rank-details">
                            <span className="rank-score">{rank.score.toLocaleString()}점</span>
                            <span className="rank-level">Lv.{rank.level}</span>
                            <span className="rank-lines">{rank.lines}줄</span>
                          </div>
                        </div>
                        <div className="rank-date">
                          {new Date(rank.timestamp?.toDate()).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ranking-buttons">
                  <Button
                    variant="contained"
                    onClick={initGame}
                    style={{
                      backgroundColor: '#3498db',
                      color: 'white',
                      fontSize: '14px',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      marginRight: '8px',
                      textTransform: 'none',
                      fontWeight: '500',
                      boxShadow: '0 2px 8px rgba(52, 152, 219, 0.2)'
                    }}
                  >
                    다시 시작! 🚀
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setShowRankingModal(false);
                      setGameOver(false);
                      setShowNicknameDialog(true);
                      setGameStarted(false);
                    }}
                    style={{
                      borderColor: '#95a5a6',
                      color: '#7f8c8d',
                      fontSize: '14px',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: '500'
                    }}
                  >
                    닉네임 변경 ✏️
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 일시정지 - TeacherPage 스타일 */}
          {isPaused && (
            <div className="pause-overlay">
              <div className="pause-modal">
                <h2>⏸️ 일시정지</h2>
                <p>게임이 일시정지되었습니다.</p>
                <Button
                  variant="contained"
                  onClick={() => setPaused(false)}
                  style={{
                    backgroundColor: '#27ae60',
                    color: 'white',
                    fontSize: '14px',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: '500',
                    boxShadow: '0 2px 8px rgba(39, 174, 96, 0.2)'
                  }}
                >
                  계속하기 ▶️
                </Button>
              </div>
            </div>
          )}

          {/* 게임 설명 */}
          <div className="game-instructions">
            <h3>🎯 게임 방법</h3>
            <div className="instructions-grid">
              <div>⬅️➡️⬇️ 이동</div>
              <div>🔄 회전 (↑ 또는 Enter)</div>
              <div>⬇️⬇️ 한번에 내리기 (스페이스)</div>
              <div>⏸️ 일시정지 (P)</div>
              <div>⭐ 이벤트 블록으로 특별 효과!</div>
              <div>🎯 콤보로 더 많은 점수를!</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TetrisPage; 