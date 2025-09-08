import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import './EscapeRoomPage.css';

const EscapeRoomPage = () => {
  // 게임 상태
  const [gameState, setGameState] = useState('intro'); // intro, playing, room1, room2, room3, room4, completed
  const [currentRoom, setCurrentRoom] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300); // 5분 = 300초
  const [playerName, setPlayerName] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(null);

  // 타이머 관리
  const timerRef = useRef(null);

  // 방 정보
  const rooms = [
    {
      id: 'rectangle',
      name: '직사각형의 방',
      description: '가로와 세로의 비밀을 풀어라!',
      color: '#FF6B6B',
      formula: '가로 × 세로',
      icon: '🔷'
    },
    {
      id: 'triangle',
      name: '삼각형의 방',
      description: '밑변과 높이의 관계를 찾아라!',
      color: '#4ECDC4',
      formula: '밑변 × 높이 ÷ 2',
      icon: '🔺'
    },
    {
      id: 'trapezoid',
      name: '사다리꼴의 방',
      description: '평행한 두 변의 힘을 합쳐라!',
      color: '#45B7D1',
      formula: '(윗변 + 아랫변) × 높이 ÷ 2',
      icon: '🔸'
    },
    {
      id: 'parallelogram',
      name: '평행사변형의 방',
      description: '기울어진 세상의 진실을 밝혀라!',
      color: '#96CEB4',
      formula: '밑변 × 높이',
      icon: '🔹'
    }
  ];

  // 문제 세트
  const questionSets = {
    rectangle: [
      { question: "가로 8cm, 세로 5cm인 직사각형의 넓이는?", answer: 40, hint: "직사각형의 넓이 = 가로 × 세로", shape: { width: 8, height: 5 } },
      { question: "가로 12cm, 세로 3cm인 직사각형의 넓이는?", answer: 36, hint: "12 × 3을 계산해보세요", shape: { width: 12, height: 3 } },
      { question: "가로 7cm, 세로 9cm인 직사각형의 넓이는?", answer: 63, hint: "7 × 9를 계산해보세요", shape: { width: 7, height: 9 } },
      { question: "가로 15cm, 세로 4cm인 직사각형의 넓이는?", answer: 60, hint: "15 × 4를 계산해보세요", shape: { width: 15, height: 4 } },
      { question: "가로 6cm, 세로 11cm인 직사각형의 넓이는?", answer: 66, hint: "6 × 11을 계산해보세요", shape: { width: 6, height: 11 } }
    ],
    triangle: [
      { question: "밑변 10cm, 높이 6cm인 삼각형의 넓이는?", answer: 30, hint: "삼각형의 넓이 = 밑변 × 높이 ÷ 2", shape: { base: 10, height: 6 } },
      { question: "밑변 8cm, 높이 5cm인 삼각형의 넓이는?", answer: 20, hint: "8 × 5 ÷ 2를 계산해보세요", shape: { base: 8, height: 5 } },
      { question: "밑변 12cm, 높이 7cm인 삼각형의 넓이는?", answer: 42, hint: "12 × 7 ÷ 2를 계산해보세요", shape: { base: 12, height: 7 } },
      { question: "밑변 14cm, 높이 4cm인 삼각형의 넓이는?", answer: 28, hint: "14 × 4 ÷ 2를 계산해보세요", shape: { base: 14, height: 4 } },
      { question: "밑변 9cm, 높이 8cm인 삼각형의 넓이는?", answer: 36, hint: "9 × 8 ÷ 2를 계산해보세요", shape: { base: 9, height: 8 } }
    ],
    trapezoid: [
      { question: "윗변 6cm, 아랫변 10cm, 높이 4cm인 사다리꼴의 넓이는?", answer: 32, hint: "사다리꼴의 넓이 = (윗변 + 아랫변) × 높이 ÷ 2", shape: { top: 6, bottom: 10, height: 4 } },
      { question: "윗변 5cm, 아랫변 9cm, 높이 6cm인 사다리꼴의 넓이는?", answer: 42, hint: "(5 + 9) × 6 ÷ 2를 계산해보세요", shape: { top: 5, bottom: 9, height: 6 } },
      { question: "윗변 8cm, 아랫변 12cm, 높이 5cm인 사다리꼴의 넓이는?", answer: 50, hint: "(8 + 12) × 5 ÷ 2를 계산해보세요", shape: { top: 8, bottom: 12, height: 5 } },
      { question: "윗변 4cm, 아랫변 14cm, 높이 3cm인 사다리꼴의 넓이는?", answer: 27, hint: "(4 + 14) × 3 ÷ 2를 계산해보세요", shape: { top: 4, bottom: 14, height: 3 } },
      { question: "윗변 7cm, 아랫변 11cm, 높이 8cm인 사다리꼴의 넓이는?", answer: 72, hint: "(7 + 11) × 8 ÷ 2를 계산해보세요", shape: { top: 7, bottom: 11, height: 8 } }
    ],
    parallelogram: [
      { question: "밑변 9cm, 높이 7cm인 평행사변형의 넓이는?", answer: 63, hint: "평행사변형의 넓이 = 밑변 × 높이", shape: { base: 9, height: 7 } },
      { question: "밑변 12cm, 높이 5cm인 평행사변형의 넓이는?", answer: 60, hint: "12 × 5를 계산해보세요", shape: { base: 12, height: 5 } },
      { question: "밑변 8cm, 높이 9cm인 평행사변형의 넓이는?", answer: 72, hint: "8 × 9를 계산해보세요", shape: { base: 8, height: 9 } },
      { question: "밑변 15cm, 높이 4cm인 평행사변형의 넓이는?", answer: 60, hint: "15 × 4를 계산해보세요", shape: { base: 15, height: 4 } },
      { question: "밑변 6cm, 높이 11cm인 평행사변형의 넓이는?", answer: 66, hint: "6 × 11을 계산해보세요", shape: { base: 6, height: 11 } }
    ]
  };

  // 타이머 시작
  useEffect(() => {
    if (gameStarted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('timeover');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    
    return () => clearInterval(timerRef.current);
  }, [gameStarted, timeLeft]);

  // 게임 시작
  const startGame = () => {
    if (!playerName.trim()) {
      alert('이름을 입력해주세요!');
      return;
    }
    
    setGameStarted(true);
    setGameState('room1');
    setCurrentRoom(0);
    setCurrentQuestion(0);
    setScore(0);
    setCorrectAnswers(0);
    setTimeLeft(300);
    setShowAnimation(true);
    // 첫 번째 문제 시작 시간 설정 (애니메이션 후에)
    setTimeout(() => {
      setShowAnimation(false);
      setQuestionStartTime(Date.now());
    }, 2000);
  };

  // 시간 기반 점수 계산
  const calculateScore = (timeInSeconds) => {
    // 기본 10점에서 시간에 따라 차감
    // 1초: 9.4점, 2초: 9.1점, 3초: 8.8점...
    const penalty = timeInSeconds * 0.3;
    const baseScore = 10 - penalty;
    // 최소 1점은 보장
    return Math.max(1, Math.round(baseScore * 10) / 10);
  };

  // 답안 제출
  const submitAnswer = () => {
    const currentQuestionData = questionSets[rooms[currentRoom].id][currentQuestion];
    const isCorrect = parseInt(userAnswer) === currentQuestionData.answer;
    
    if (isCorrect) {
      // 걸린 시간 계산 (초 단위)
      const currentTime = Date.now();
      const timeSpent = questionStartTime ? (currentTime - questionStartTime) / 1000 : 1;
      const earnedScore = calculateScore(timeSpent);
      
      setScore(score + earnedScore);
      setCorrectAnswers(correctAnswers + 1);
      setFeedbackMessage(`🎉 정답입니다! (+${earnedScore}점, ${timeSpent.toFixed(1)}초)`);
      setShowFeedback(true);
      
      setTimeout(() => {
        setShowFeedback(false);
        if (currentQuestion < 4) {
          setCurrentQuestion(currentQuestion + 1);
          setShowHint(false); // 다음 문제로 넘어갈 때 힌트 숨기기
          setQuestionStartTime(Date.now()); // 다음 문제 시작 시간 설정
        } else {
          // 방 탈출 성공
          if (currentRoom < 3) {
            setCurrentRoom(currentRoom + 1);
            setCurrentQuestion(0);
            setGameState(`room${currentRoom + 2}`);
            setShowAnimation(true);
            setShowHint(false); // 다음 방으로 넘어갈 때 힌트 숨기기
            setTimeout(() => {
              setShowAnimation(false);
              setQuestionStartTime(Date.now()); // 다음 방 첫 문제 시작 시간 설정
            }, 2000);
          } else {
            // 게임 완료
            setGameState('completed');
            saveGameResult();
          }
        }
        setUserAnswer('');
      }, 2000);
    } else {
      setFeedbackMessage('❌ 틀렸습니다. 다시 생각해보세요!');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
    }
  };

  // 힌트 보기
  const showHintMessage = () => {
    if (hintsUsed < 2) {
      setShowHint(true);
      setHintsUsed(hintsUsed + 1);
    }
  };

  // 게임 결과 저장
  const saveGameResult = async () => {
    try {
      const resultData = {
        playerName,
        score,
        correctAnswers,
        totalQuestions: 20,
        timeSpent: 300 - timeLeft,
        roomsCompleted: currentRoom + 1,
        hintsUsed,
        timestamp: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'escapeRoomResults', `${playerName}_${Date.now()}`), resultData);
    } catch (error) {
      console.error('게임 결과 저장 실패:', error);
    }
  };

  // 게임 재시작
  const restartGame = () => {
    setGameState('intro');
    setCurrentRoom(0);
    setCurrentQuestion(0);
    setScore(0);
    setCorrectAnswers(0);
    setTimeLeft(300);
    setPlayerName('');
    setShowHint(false);
    setHintsUsed(0);
    setGameStarted(false);
    setShowAnimation(false);
    setUserAnswer('');
    setFeedbackMessage('');
    setShowFeedback(false);
    setQuestionStartTime(null);
  };

  // 시간 포맷팅
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 도형 그리기 컴포넌트
  const ShapeDrawer = ({ shape, shapeType }) => {
    const svgStyle = {
      width: '400px',
      height: '280px',
      border: '3px solid #333',
      borderRadius: '15px',
      backgroundColor: 'white',
      margin: '20px 0',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
      background: 'linear-gradient(145deg, #ffffff, #f0f0f0)'
    };

    switch (shapeType) {
      case 'rectangle':
        return (
          <svg style={svgStyle} viewBox="0 0 400 280">
            <rect x="80" y="80" width={shape.width * 15} height={shape.height * 15} 
                  fill="rgba(255, 107, 107, 0.8)" stroke="#FF6B6B" strokeWidth="4" />
            <text x="200" y="40" textAnchor="middle" fontSize="20" fill="#333" fontWeight="bold">
              가로: {shape.width}cm, 세로: {shape.height}cm
            </text>
          </svg>
        );
      case 'triangle':
        return (
          <svg style={svgStyle} viewBox="0 0 400 280">
            <polygon points={`200,60 ${120 + shape.base * 8},${60 + shape.height * 15} ${280 - shape.base * 8},${60 + shape.height * 15}`} 
                     fill="rgba(78, 205, 196, 0.8)" stroke="#4ECDC4" strokeWidth="4" />
            <text x="200" y="40" textAnchor="middle" fontSize="20" fill="#333" fontWeight="bold">
              밑변: {shape.base}cm, 높이: {shape.height}cm
            </text>
          </svg>
        );
      case 'trapezoid':
        return (
          <svg style={svgStyle} viewBox="0 0 400 280">
            <polygon points={`${200 - shape.top * 8},80 ${200 + shape.top * 8},80 ${200 + shape.bottom * 8},${80 + shape.height * 15} ${200 - shape.bottom * 8},${80 + shape.height * 15}`} 
                     fill="rgba(69, 183, 209, 0.8)" stroke="#45B7D1" strokeWidth="4" />
            <text x="200" y="40" textAnchor="middle" fontSize="20" fill="#333" fontWeight="bold">
              윗변: {shape.top}cm, 아랫변: {shape.bottom}cm, 높이: {shape.height}cm
            </text>
          </svg>
        );
      case 'parallelogram':
        return (
          <svg style={svgStyle} viewBox="0 0 400 280">
            <polygon points={`120,80 ${120 + shape.base * 12},80 ${160 + shape.base * 12},${80 + shape.height * 15} ${160},${80 + shape.height * 15}`} 
                     fill="rgba(150, 206, 180, 0.8)" stroke="#96CEB4" strokeWidth="4" />
            <text x="200" y="40" textAnchor="middle" fontSize="20" fill="#333" fontWeight="bold">
              밑변: {shape.base}cm, 높이: {shape.height}cm
            </text>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="escape-room-container">
      {/* 인트로 화면 */}
      {gameState === 'intro' && (
        <div className="intro-screen">
          <div className="intro-content">
            <h1 className="game-title">🏃‍♂️ 도형 탈출 게임 🏃‍♀️</h1>
            <p className="game-description">
              4개의 신비로운 방에서 도형의 넓이를 계산하여 탈출하세요!<br/>
              각 방마다 5문제씩, 총 20문제를 풀어야 합니다.
            </p>
            <div className="room-preview">
              {rooms.map((room, index) => (
                <div key={room.id} className="room-card" style={{ backgroundColor: room.color }}>
                  <span className="room-icon">{room.icon}</span>
                  <h3>{room.name}</h3>
                  <p>{room.description}</p>
                  <small>{room.formula}</small>
                </div>
              ))}
            </div>
            <div className="player-input">
              <input 
                type="text" 
                placeholder="이름을 입력하세요" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="name-input"
              />
              <button onClick={startGame} className="start-button">
                게임 시작! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게임 플레이 화면 */}
      {gameState.startsWith('room') && (
        <div className="game-screen">
          {/* 상단 HUD */}
          <div className="game-hud">
            <div className="hud-left">
              <span className="player-name">👤 {playerName}</span>
              <span className="current-room">
                {rooms[currentRoom].icon} {rooms[currentRoom].name}
              </span>
            </div>
            <div className="hud-center">
              <span className="timer">⏰ {formatTime(timeLeft)}</span>
            </div>
            <div className="hud-right">
              <span className="score">⭐ {score.toFixed(1)}점</span>
              <span className="progress">
                📊 {currentQuestion + 1}/5 ({correctAnswers}/20)
              </span>
            </div>
          </div>

          {/* 방 배경 */}
          <div className="room-background" style={{ backgroundColor: rooms[currentRoom].color + '20' }}>
            {/* 문제 영역 */}
            <div className="question-area">
              <h2 className="question-title">
                {rooms[currentRoom].icon} 문제 {currentQuestion + 1}
              </h2>
              
              {/* 도형 그리기 */}
              <ShapeDrawer 
                shape={questionSets[rooms[currentRoom].id][currentQuestion].shape}
                shapeType={rooms[currentRoom].id}
              />

              <p className="question-text">
                {questionSets[rooms[currentRoom].id][currentQuestion].question}
              </p>

              {/* 답안 입력 */}
              <div className="answer-input">
                <input 
                  type="number" 
                  placeholder="답을 입력하세요"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="answer-field"
                />
                <span className="unit">cm²</span>
                <button onClick={submitAnswer} className="submit-button">
                  제출
                </button>
              </div>

              {/* 힌트 영역 */}
              <div className="hint-area">
                <button 
                  onClick={showHintMessage} 
                  className="hint-button"
                  disabled={hintsUsed >= 2}
                >
                  💡 힌트 ({hintsUsed}/2)
                </button>
                {showHint && (
                  <div className="hint-message">
                    {questionSets[rooms[currentRoom].id][currentQuestion].hint}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 피드백 모달 */}
          {showFeedback && (
            <div className="feedback-modal">
              <div className="feedback-content">
                <h3>{feedbackMessage}</h3>
              </div>
            </div>
          )}

          {/* 방 전환 애니메이션 */}
          {showAnimation && (
            <div className="transition-animation">
              <div className="animation-content">
                <h2>🎉 방 탈출 성공! 🎉</h2>
                <p>다음 방으로 이동중...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 게임 완료 화면 */}
      {gameState === 'completed' && (
        <div className="completion-screen">
          <div className="completion-content">
            <h1>🎊 축하합니다! 🎊</h1>
            <p className="completion-message">
              모든 방을 성공적으로 탈출했습니다!
            </p>
            <div className="final-stats">
              <div className="stat-item">
                <span className="stat-label">총 점수</span>
                <span className="stat-value">{score.toFixed(1)}점</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">정답 수</span>
                <span className="stat-value">{correctAnswers}/20</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">소요 시간</span>
                <span className="stat-value">{formatTime(300 - timeLeft)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">사용한 힌트</span>
                <span className="stat-value">{hintsUsed}개</span>
              </div>
            </div>
            <button onClick={restartGame} className="restart-button">
              다시 도전하기 🔄
            </button>
          </div>
        </div>
      )}

      {/* 시간 초과 화면 */}
      {gameState === 'timeover' && (
        <div className="timeover-screen">
          <div className="timeover-content">
            <h1>⏰ 시간 초과! ⏰</h1>
            <p>아쉽지만 시간이 모두 소모되었습니다.</p>
            <div className="current-stats">
              <p>현재 점수: {score.toFixed(1)}점</p>
              <p>정답 수: {correctAnswers}/20</p>
            </div>
            <button onClick={restartGame} className="restart-button">
              다시 도전하기 🔄
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscapeRoomPage; 