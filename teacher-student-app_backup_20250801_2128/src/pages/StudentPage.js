import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocument, useCollection } from 'react-firebase-hooks/firestore';
import { doc, updateDoc, arrayUnion, collection, getDocs, query, where, orderBy, onSnapshot, getDoc, addDoc, limit, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Card, CardContent, Typography, Button, Box, Modal, Chip, Stack, Snackbar, Alert, Badge, IconButton } from '@mui/material';
import CelebrationIcon from '@mui/icons-material/Celebration';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import StorefrontIcon from '@mui/icons-material/Storefront';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LinkIcon from '@mui/icons-material/Link';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import EmotionAttendanceModal from '../components/EmotionAttendanceModal';

// CSS 애니메이션 정의 (피버타임용)
const feverAnimationCSS = `
  @keyframes feverPulse {
    0% { 
      transform: scale(1); 
      box-shadow: 0 4px 16px rgba(255, 107, 53, 0.6);
    }
    50% { 
      transform: scale(1.05); 
      box-shadow: 0 8px 24px rgba(255, 107, 53, 0.8);
    }
    100% { 
      transform: scale(1); 
      box-shadow: 0 4px 16px rgba(255, 107, 53, 0.6);
    }
  }
  
  @keyframes feverSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;

// 스타일 요소 추가
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('fever-animations');
  if (!existingStyle) {
    const styleElement = document.createElement('style');
    styleElement.id = 'fever-animations';
    styleElement.textContent = feverAnimationCSS;
    document.head.appendChild(styleElement);
  }
}

const levelImages = [
  '/lv1.png', // 알사탕
  '/lv2.png', // 새콤한 사탕
  '/lv3.png', // 막대사탕
  '/lv4.png', // 롤리팝
  '/lv5.png', // 수제 사탕
  '/lv6.png', // 사탕 마스터
];

const LEVELS = [
  '알사탕',
  '새콤한 사탕',
  '막대사탕',
  '롤리팝',
  '수제 사탕',
  '사탕 마스터',
];

const LINK_CATEGORIES = [
  { key: 'general', label: '일반', color: '#757575' },
  { key: 'video', label: '📹 동영상', color: '#ff5722' },
  { key: 'document', label: '📄 문서', color: '#2196f3' },
  { key: 'quiz', label: '📝 퀴즈', color: '#9c27b0' },
  { key: 'game', label: '🎮 게임', color: '#4caf50' },
  { key: 'reference', label: '📚 참고자료', color: '#ff9800' }
];

const getRequiredExp = (level) => 150 + level * 10;

// 날짜 포맷 함수
const formatDate = ts => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const candyImages = [
  '/lv1.png', '/lv2.png', '/lv3.png', '/lv4.png', '/lv5.png', '/lv6.png'
];

// 시간 포맷 함수 (몇 분 전, 오늘, 날짜)
function formatTimeAgo(ts) {
  const now = Date.now();
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff/60)}분 전`;
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// 레벨업 카드뽑기 및 쿠폰함 보상 목록/이미지 상수 추가
const REWARD_LIST = [
  { key: '5money', img: '/5money.png', label: '5원', prob: 15 },
  { key: '10money', img: '/10money.png', label: '10원', prob: 10 },
  { key: 'bites', img: '/bites.png', label: '사워바이츠 1개', prob: 10 },
  { key: 'chew2', img: '/chew2.png', label: '마이쮸 2개', prob: 20 },
  { key: 'chupa', img: '/chupa.png', label: '츄파춥스 1개', prob: 20 },
  { key: 'chupafr', img: '/chupafr.png', label: '친구에게 츄파춥스 1개 선물', prob: 15 },
  { key: 'bottle', img: '/bottle.png', label: '반 친구 모두 새콤달콤 1개', prob: 5 },
];
const CARD_BACK_IMAGE = '/cardback.png';

const candyRainImages = [
  '/jian1.png','/jian2.png','/jian3.png','/jian4.png','/jian5.png','/jian6.png',
  '/lv1.png','/lv2.png','/lv3.png','/lv4.png','/lv5.png','/lv6.png',
  '/chupa.png','/chupafr.png','/bottle.png'
];

const StudentPage = () => {
  const { studentId } = useParams();
  const [studentDoc, loading, error] = useDocument(doc(db, 'students', studentId));
  const [studentsSnapshot] = useCollection(collection(db, 'students'));
  const [itemsSnapshot] = useCollection(collection(db, 'items'));
  const student = useMemo(() => {
    return studentDoc?.data() ? { ...studentDoc.data(), id: studentId } : null;
  }, [studentDoc, studentId]);
  const navigate = useNavigate();

  // money 필드를 balance로 마이그레이션
  useEffect(() => {
    if (student && student.money !== undefined && student.balance === undefined) {
      console.log('money 필드를 balance로 마이그레이션:', student.money);
      updateDoc(doc(db, 'students', studentId), {
        balance: student.money,
        money: null // money 필드 제거
      }).catch(error => {
        console.error('마이그레이션 실패:', error);
      });
    }
  }, [student, studentId]);

  // 레벨업 체크 및 수정 (한 번만 실행)
  useEffect(() => {
    if (student && student.exp !== undefined && student.level !== undefined) {
      let currentExp = student.exp;
      let currentLevel = student.level;
      let shouldUpdate = false;
      let levelUps = [];
      
      // 현재 레벨에서 필요한 경험치 계산
      let required = getRequiredExp(currentLevel);
      
      // 레벨업이 필요한지 확인
      while (currentExp >= required) {
        currentExp -= required;
        currentLevel += 1;
        shouldUpdate = true;
        levelUps.push({
          type: 'levelUp',
          fromLevel: currentLevel - 1,
          toLevel: currentLevel,
          candyEarned: currentLevel - 1,
          ts: Date.now()
        });
        required = getRequiredExp(currentLevel);
      }
      
      // 레벨업이 필요한 경우 업데이트
      if (shouldUpdate) {
        console.log(`${student.name} 레벨업 처리: ${student.level} → ${currentLevel}, 남은 경험치: ${currentExp}`);
        updateDoc(doc(db, 'students', studentId), {
          exp: currentExp,
          level: currentLevel,
          expEvents: arrayUnion(...levelUps)
        }).catch(error => {
          console.error('레벨업 처리 실패:', error);
        });
      }
    }
  }, [student?.exp, student?.level, studentId]);

  // 모달 상태
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [showPraiseModal, setShowPraiseModal] = useState(false);
  const [showSelfPraiseModal, setShowSelfPraiseModal] = useState(false);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [praiseText, setPraiseText] = useState('');
  const [praiseExp, setPraiseExp] = useState(10);
  const [selfPraiseText, setSelfPraiseText] = useState('');
  const [selfPraiseExp, setSelfPraiseExp] = useState(10);
  const [expEffect, setExpEffect] = useState(false);
  const [levelUpEffect, setLevelUpEffect] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [praiseResultEffect, setPraiseResultEffect] = useState(false);
  const [praiseResultMsg, setPraiseResultMsg] = useState('');
  const [questToast, setQuestToast] = useState(false);
  const [prevQuestCount, setPrevQuestCount] = useState(0);
  const [showJarModal, setShowJarModal] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [boardCodeInput, setBoardCodeInput] = useState('');
  const [showShopModal, setShowShopModal] = useState(false);
  const [shopTab, setShopTab] = useState('deposit');
  const [depositReason, setDepositReason] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [buyQuantities, setBuyQuantities] = useState({});
  const [buyCustomAmount, setBuyCustomAmount] = useState('');
  const [buyError, setBuyError] = useState('');
  const [buySuccess, setBuySuccess] = useState('');
  const [depositError, setDepositError] = useState('');
  const [unreadAlarmCount, setUnreadAlarmCount] = useState(0);

  // 단소급수미션 관련 상태
  const [showRecorderModal, setShowRecorderModal] = useState(false);
  const [recorderTab, setRecorderTab] = useState('progress');
  const [recorderMissions, setRecorderMissions] = useState({});
  
  // 심화 단소급수미션 관련 상태
  const [showRecorderAdvancedModal, setShowRecorderAdvancedModal] = useState(false);
  const [recorderAdvancedTab, setRecorderAdvancedTab] = useState('progress');
  const [recorderMissionsAdvanced, setRecorderMissionsAdvanced] = useState({});
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [celebrationLevel, setCelebrationLevel] = useState('');
  const [showAdvancedCelebrationModal, setShowAdvancedCelebrationModal] = useState(false);
  const [advancedCelebrationLevel, setAdvancedCelebrationLevel] = useState('');
  


  // 공지사항 상태 추가
  const [notices, setNotices] = useState([]);
  const [broadcastNotice, setBroadcastNotice] = useState(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const broadcastTimeoutRef = React.useRef(null);

  // 예약 알람 모달 상태
  const [activeAlarm, setActiveAlarm] = useState(null);
  const [currentDisplayedAlarmId, setCurrentDisplayedAlarmId] = useState(null); // 현재 표시 중인 알림 ID 추적
  const autoCloseTimerRef = useRef(null); // 1분 자동 닫힘 타이머 참조
  const currentDisplayedAlarmIdRef = useRef(null); // 현재 표시 중인 알림 ID의 ref 버전

  // 알림 모달 상태
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  
  // 퀴즈 모달 상태
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [selectedQuizOption, setSelectedQuizOption] = useState(-1);
  const [showQuizResultModal, setShowQuizResultModal] = useState(false);
  const [quizResultData, setQuizResultData] = useState(null);

  // 감정출석부 모달 상태
  const [showEmotionAttendanceModal, setShowEmotionAttendanceModal] = useState(false);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);

  // 오늘 감정출석 제출 여부 확인
  useEffect(() => {
    const checkTodayEmotionSubmission = async () => {
      if (!student?.id) {
        console.log('🔍 Student 정보가 아직 로드되지 않음');
        return;
      }
      
      const now = new Date();
      // 한국 시간 기준으로 날짜 계산 (UTC+9)
      const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
      const today = koreaTime.toISOString().split('T')[0];
      
      console.log('🌈 감정출석부 상태 체크 시작', {
        studentId: student.id,
        studentName: student.name,
        currentTime: now.toLocaleString('ko-KR'),
        checkingDate: today
      });

      try {
        // 1. 새로운 구조에서 먼저 확인 (students/{id}/emotions/{date})
        const emotionRef = doc(db, 'students', student.id, 'emotions', today);
        const newStructureSnapshot = await getDoc(emotionRef);
        let hasSubmitted = newStructureSnapshot.exists();
        let dataSource = 'new';
        
        // 2. 새 구조에 없으면 기존 구조에서 확인 (호환성)
        if (!hasSubmitted) {
          const emotionQuery = query(
            collection(db, 'emotionAttendance'),
            where('studentId', '==', student.id),
            where('date', '==', today)
          );
          const oldStructureSnapshot = await getDocs(emotionQuery);
          hasSubmitted = !oldStructureSnapshot.empty;
          dataSource = 'legacy';
        }
        
        console.log('🔍 감정출석 확인 결과:', {
          hasSubmitted,
          status: hasSubmitted ? '제출함' : '미제출',
          dataSource: hasSubmitted ? dataSource : 'none',
          newStructurePath: `students/${student.id}/emotions/${today}`,
          checkTime: new Date().toLocaleString('ko-KR')
        });
        
        setHasSubmittedToday(hasSubmitted);
        
        if (hasSubmitted) {
          console.log(`❌ 오늘은 이미 감정출석을 제출했습니다. (출처: ${dataSource === 'new' ? '새 구조' : '기존 구조'})`);
        } else {
          console.log('✅ 감정출석부 버튼이 활성화되어야 합니다!');
        }
        
      } catch (error) {
        console.error('❌ 감정출석 확인 오류:', error);
        setHasSubmittedToday(false);
      }
    };

    // 초기 체크
    console.log('🔄 감정출석부 초기 체크 시작');
    checkTodayEmotionSubmission();
    
    // 날짜가 바뀔 수 있으므로 정기적으로 체크 (30초마다로 단축)
    const emotionCheckInterval = setInterval(() => {
      console.log('🔄 정기 감정출석부 체크 (30초마다)');
      checkTodayEmotionSubmission();
    }, 30000); // 30초마다 체크

    // 자정 체크 - 다음 자정까지의 시간을 계산하여 정확히 자정에 체크
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    console.log('⏰ 자정까지 남은 시간:', Math.floor(msUntilMidnight / 1000 / 60), '분');
    
    const midnightTimeout = setTimeout(() => {
      console.log('🌅 자정이 되었습니다! 감정출석부 상태를 다시 체크합니다.');
      checkTodayEmotionSubmission();
      
      // 자정 이후 매일 자정마다 체크하도록 인터벌 설정
      const dailyMidnightInterval = setInterval(() => {
        console.log('🌅 새로운 날이 시작되었습니다! 감정출석부 상태를 다시 체크합니다.');
        checkTodayEmotionSubmission();
      }, 24 * 60 * 60 * 1000); // 24시간마다
      
      return () => {
        clearInterval(dailyMidnightInterval);
      };
    }, msUntilMidnight);

    return () => {
      console.log('🧹 감정출석부 체크 정리');
      clearInterval(emotionCheckInterval);
      clearTimeout(midnightTimeout);
    };
  }, [student?.id]);

  // 퀴즈 알림 수신 (실시간 리스너)
  useEffect(() => {
    console.log('퀴즈 알림 실시간 리스너 시작');
    
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef, 
      where('type', '==', 'quiz'),
      where('isActive', '==', true)
    );
    
    // 실시간 리스너 설정
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('🚀 퀴즈 알림 실시간 업데이트:', snapshot.docs.length, '개');
      
      snapshot.docs.forEach(doc => {
        const notification = doc.data();
        const notificationTime = new Date(notification.createdAt).getTime();
        const now = Date.now();
        
        // 최근 5분 이내에 생성된 알림만 처리 (실시간이므로 여유 시간 확대)
        if ((now - notificationTime) < 300000) {
          // targetStudents 필드가 있는 경우 해당 학생만 대상인지 확인
          const targetStudents = notification.targetStudents;
          const isTargetedToMe = !targetStudents || 
                                targetStudents.length === 0 || 
                                targetStudents.includes(studentId);
          
          console.log('🎯 퀴즈 알림 대상 확인:', {
            notificationId: doc.id,
            title: notification.title,
            targetStudents: targetStudents,
            currentStudentId: studentId,
            isTargetedToMe: isTargetedToMe,
            isResend: notification.isResend,
            timeFromCreation: Math.floor((now - notificationTime) / 1000) + '초 전'
          });
          
          if (isTargetedToMe) {
            const seenQuizzes = JSON.parse(localStorage.getItem('seenQuizzes') || '[]');
            
            if (!seenQuizzes.includes(doc.id)) {
              console.log('🎉 새로운 퀴즈 즉시 수신:', notification.title);
              setCurrentQuiz(notification.quizData);
              setShowQuizModal(true);
              setQuizAnswer('');
              setSelectedQuizOption(-1);
              
              // 본 퀴즈로 표시
              localStorage.setItem('seenQuizzes', JSON.stringify([...seenQuizzes, doc.id]));
              
              // 알림 사운드 재생 (있다면)
              try {
                playAlertSound();
              } catch (e) {
                console.log('알림 사운드 재생 실패:', e);
              }
            }
          } else {
            console.log('❌ 퀴즈 알림이 나에게 해당되지 않음 - 무시');
          }
        }
      });
    }, (error) => {
      console.error('❌ 퀴즈 알림 리스너 오류:', error);
    });

    return () => {
      console.log('🧹 퀴즈 알림 리스너 정리');
      unsubscribe();
    };
  }, [studentId]);

  // 주관식 정답 체크 함수
  const checkTextAnswer = (studentAnswer, correctAnswers) => {
    if (!correctAnswers) return false;
    
    // #으로 구분된 정답들을 배열로 변환
    const answers = correctAnswers.split('#').filter(ans => ans.trim());
    const studentAnswerTrimmed = studentAnswer.trim().toLowerCase();
    
    // 각 정답과 비교 (대소문자 무시, 공백 제거)
    return answers.some(answer => 
      answer.trim().toLowerCase() === studentAnswerTrimmed
    );
  };

  // 퀴즈 답안 제출
  const handleSubmitQuiz = async () => {
    if (!currentQuiz || !student) return;
    
    let answer = '';
    let isCorrect = false;
    
    if (currentQuiz.type === 'multiple') {
      if (selectedQuizOption === -1) return;
      answer = currentQuiz.options[selectedQuizOption];
      isCorrect = selectedQuizOption === currentQuiz.correctAnswer;
    } else if (currentQuiz.type === 'text') {
      if (!quizAnswer.trim()) return;
      answer = quizAnswer;
      isCorrect = checkTextAnswer(quizAnswer, currentQuiz.textAnswer);
    }

    try {
      await addDoc(collection(db, 'quizResponses'), {
        quizId: currentQuiz.id,
        quizTitle: currentQuiz.title,
        studentName: student.name,
        studentId: studentId,
        answer,
        isCorrect,
        createdAt: new Date().toISOString()
      });

      // 정답일 경우 보상 지급 (객관식과 주관식 모두)
      if (isCorrect) {
        const expGain = currentQuiz.expReward || 0;  // 기본값을 0으로 변경
        const moneyGain = currentQuiz.moneyReward || 0;
        
        const updateData = {};
        
        // 경험치 보상이 있을 때만 업데이트 및 레벨업 처리
        if (expGain > 0) {
          let exp = (student.exp || 0) + expGain;
          let level = student.level || 0;
          let required = getRequiredExp(level);
          let levelUps = [];
          
          // 레벨업 처리
          while (exp >= required) {
            exp -= required;
            level += 1;
            levelUps.push({
              type: 'levelUp',
              fromLevel: level - 1,
              toLevel: level,
              candyEarned: level - 1,
              ts: Date.now()
            });
            required = getRequiredExp(level);
          }
          
          updateData.exp = exp;
          updateData.level = level;
          
          // 경험치 이벤트 기록
          const expEvents = [
            { type: 'exp', amount: expGain, reason: '퀴즈 정답', ts: Date.now() },
            ...levelUps
          ];
          updateData.expEvents = arrayUnion(...expEvents);
        }
        
        // 재산 보상이 있을 때만 업데이트 및 입금 내역 기록
        if (moneyGain > 0) {
          const currentBalance = student.balance || 0;
          updateData.balance = currentBalance + moneyGain;
          
          // 입금 내역 기록
          const transactionHistory = student.transactionHistory || [];
          const newTransaction = {
            type: 'quiz_reward',
            amount: moneyGain,
            description: `퀴즈 정답 보상: ${currentQuiz.title}`,
            timestamp: new Date().toISOString(),
            balanceAfter: currentBalance + moneyGain
          };
          updateData.transactionHistory = [...transactionHistory, newTransaction];
        }
        
        // 업데이트할 데이터가 있을 때만 DB 업데이트
        if (Object.keys(updateData).length > 0) {
          await updateDoc(doc(db, 'students', studentId), updateData);
        }
        
        setQuizResultData({
          isCorrect: true,
          expGain,
          moneyGain,
          message: '🎉 정답입니다!'
        });
        setShowQuizResultModal(true);
      } else {
        // 오답 처리 (객관식과 주관식 모두)
        setQuizResultData({
          isCorrect: false,
          expGain: 0,
          moneyGain: 0,
          message: currentQuiz.type === 'text' 
            ? '아쉽게도 틀렸네요.\n정답을 다시 생각해보세요! 💪'
            : '아쉽게도 틀렸네요.\n다음에 더 열심히 해보세요! 💪'
        });
        setShowQuizResultModal(true);
      }

      setShowQuizModal(false);
      setCurrentQuiz(null);
      setQuizAnswer('');
      setSelectedQuizOption(-1);
    } catch (error) {
      console.error('퀴즈 답안 제출 오류:', error);
      alert('답안 제출 중 오류가 발생했습니다.');
    }
  };

  // 광고 모달 확인 여부 체크 함수 (공지사항 광고용)
  const hasSeenBroadcast = (noticeId, broadcastTime) => {
    try {
      const seen = JSON.parse(localStorage.getItem('seenBroadcastNotices') || '[]');
      return seen.includes(`${noticeId}_${broadcastTime}`);
    } catch {
      return false;
    }
  };
  const markBroadcastAsSeen = (noticeId, broadcastTime) => {
    try {
      const seen = JSON.parse(localStorage.getItem('seenBroadcastNotices') || '[]');
      const key = `${noticeId}_${broadcastTime}`;
      if (!seen.includes(key)) {
        localStorage.setItem('seenBroadcastNotices', JSON.stringify([...seen, key]));
      }
    } catch {}
  };
  // 예약 알람 확인 여부 체크 함수 (Firestore + localStorage 복합 사용)
  const hasSeenAlarm = (alarmId) => {
    try {
      // 1. localStorage에서 먼저 확인 (빠른 응답)
      const localSeen = JSON.parse(localStorage.getItem('seenAlarms') || '[]');
      if (localSeen.includes(alarmId)) {
        return true;
      }
      
      // 2. Firestore에서 확인 (학생 문서의 seenAlarms 필드)
      if (student?.seenAlarms && student.seenAlarms.includes(alarmId)) {
        // Firestore에 있으면 localStorage에도 동기화
        localStorage.setItem('seenAlarms', JSON.stringify([...localSeen, alarmId]));
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  };
  
  const markAlarmAsSeen = useCallback(async (alarmId) => {
    try {
      console.log('알림 확인 상태 저장 시작:', alarmId);
      
      // 1. localStorage에 저장
      const seen = JSON.parse(localStorage.getItem('seenAlarms') || '[]');
      if (!seen.includes(alarmId)) {
        localStorage.setItem('seenAlarms', JSON.stringify([...seen, alarmId]));
        console.log('localStorage에 알림 확인 상태 저장:', alarmId);
      }
      
      // 2. Firestore에 저장 (학생 문서 업데이트)
      if (studentId && student && (!student?.seenAlarms || !student.seenAlarms.includes(alarmId))) {
        const currentSeenAlarms = student?.seenAlarms || [];
        await updateDoc(doc(db, 'students', studentId), {
          seenAlarms: [...currentSeenAlarms, alarmId],
          lastAlarmSeenTime: Date.now()
        });
        console.log('Firestore에 알림 확인 상태 저장:', alarmId);
      }
    } catch (error) {
      console.error('알림 상태 저장 실패:', error);
    }
  }, [studentId, student]);

  // 단소급수미션 관련 상수와 함수들
  const RECORDER_STEPS = [
    'tutorial', 'step1', 'step2', 'step3-1', 'step3-2', 
    'step4-1', 'step4-2', 'step5', 'step6-1', 'step6-2', 'step7'
  ];

  const RECORDER_STEP_NAMES = {
    'tutorial': '튜토리얼',
    'step1': '1단계',
    'step2': '2단계',
    'step3-1': '3단계(1)',
    'step3-2': '3단계(2)',
    'step4-1': '4단계(1)',
    'step4-2': '4단계(2)',
    'step5': '5단계',
    'step6-1': '6단계(1)',
    'step6-2': '6단계(2)',
    'step7': '7단계'
  };

  // 심화 단소급수미션 관련 상수
  const RECORDER_STEPS_ADVANCED = [
    'advanced1', 'advanced2', 'advanced3', 'advanced4', 'advanced5', 'advanced6'
  ];

  const RECORDER_STEP_NAMES_ADVANCED = {
    'advanced1': '심화 1단계',
    'advanced2': '심화 2단계',
    'advanced3': '심화 3단계',
    'advanced4': '심화 4단계',
    'advanced5': '심화 5단계',
    'advanced6': '심화 6단계'
  };

  const SHEET_MUSIC = {
    'tutorial': `튜토리얼 - 기본 자세와 호흡법을 익혀보세요.

출처: 피리토끼 선생님`,
    'step1': `1단계 - 태 연습곡

태--- / 태태--
태태태태 / 태---

출처: 피리토끼 선생님`,
    'step2': `2단계 - 음계

태황무임중 / 중임무황태
태황무임중 / 중임무황태

출처: 피리토끼 선생님`,
    'step3-1': `3단계(1) - 비행기

태황무황 태태태 / 황황황 태태태
태황무황 태태태/ 황황태황 무

출처: 피리토끼 선생님`,
    'step3-2': `3단계(2) - 학교종

_중중임임 중중태  
중중태태황-
중중임임 중중태
중태황태_무- 

출처: 피리토끼 선생님`,
    'step4-1': `4단계(1) - 새야새야

황임태황 / 태황임임 / 태_임_태태 / 태황임임
황임태황 / 태황임임 / 태_임_태태 / 태황임임

출처: 피리토끼 선생님`,
    'step4-2': `4단계(2) - 아리랑

중-임중임 / 무-황무황 / 태-황태황무임 / 중-임중임
무-황무황 / 태황무임중임/ 무-황 무 무-
_중-중 중_-태황 / 태-황태황무임 / 중-임중임
무-황무황 / 태황무임중임 / 무-황 무 무-

출처: 피리토끼 선생님`,
    'step5': `5단계 - 오나라

황태태 / 태-황무 / 임무무 / 무- -
황태태 / 태-중태 / 태황태 / 태- -
_중임임_ / _임-중_태 / 태중임/ 중- -
황태태 / 황-태태 / 황태임 / 무임 - -
황-무임 / 황-무임 / 황태무 / 황-태중
_임-중_태 / 황-무임 / 임중임 / 임- -

출처: 피리토끼 선생님`,
    'step6-1': `6단계(1) - 참새노래

_임-임-_태 _임-무임_ / _임-무-무 임-중_태
_임-임-_태 _임-무임_ / _임-무-무 임-중_태

출처: 피리토끼 선생님`,
    'step6-2': `6단계(2) - 도라지

태태태 태-황무 / _중-임중_ 태-황무
황태태- 황태황무임중 / 임무임중-
임 임무중 / 임 임무중 / 무무황무-황
태태태 태-황무 / _중-임중_ 태-황무
황태태- 황태황무임중 / 임무임중-

출처: 피리토끼 선생님`,
    'step7': `7단계 - 밀양아리랑

_임임- 중임중_태 / _임임- 중임중_태
_임- 중임중_태황태 _중- 임_태
태태 황-무임무 / 태태- 황-_중_태황
무- 무황무 임-중임- 무임
임-중임-무임 / 임-중임-무임
_임임- 중임중_태황태 _중-임_태
태-황-무임무 태-황-_중_태-황
무- 무황무 임-중임-무임

출처: 피리토끼 선생님`
  };

  // 심화 단소급수미션 악보
  const SHEET_MUSIC_ADVANCED = {
    'advanced1': `심화 1단계 - 가을아침

태태_중중_ / 황-_중중_ / 황-_중중_ / 무무임무-
임임무무 / 중중무무/ 임임무황 / 태황무황
태태_중중_ / 황-_중중_ / 황황_중중_ / 무무임무-
임임무무 / 중중무무/ 임임무황 / 태황무황 / 무-

출처 : 피리토끼 선생님`,
    'advanced2': `심화 2단계 - 사랑을 했다

태황무 / 태_중_ / 태황무 / 태황
태황무 / 황황 / 무황무 / 태무
태황무 / 황무 / 태_중_ / 태황무 / 태황
태황무 / 황황 / 무황무 / 태무
태황무 / 무무 / _임-중_태 / 황무 / 태황
무무무 / _임-중_태 / 황무황무
무무무 / _임-무임_ / _임무임중_
무무무 / _임-중_태 / 황무황무

출처 : 유튜브 채널 시우`,
    'advanced3': `심화 3단계 - 늴리리야

_임임임중_- / _임무임중_-_임중_
태태 / 태태_중_태황무 / 황태황무임-중
무 / 중무태황 / 무황무임중-

출처 : 피리토끼 선생님`,
    'advanced4': `심화 4단계 - 뽀롱뽀롱 뽀로로

— _중_ -태-무 / 황 - 임 - 중–
— _중_ -태-무 / 황 - _임_ - _중_–
_임_-_임_-_남_-- / _중_-_중_-_임_--
태-_임_-태-무- / 태-황-황–

출처 : 유튜브 채널 느루`,
    'advanced5': `심화 5단계 - 첨밀밀

태 _중임_태 무황-무황_중중_태
황황황태황무임중무  황태-황태_중중_황
태 _중임_태 무황-무황_중중_태 
황황황태황무임중무  태황무임중무
태   중 임무중임무
태   중 임무중임무 

출처 : 두클래스 TOP40 단소곡집`,
    'advanced6': `심화 6단계 - 비익련리

태_중임_ -_중임_태_중_
태_중임_ -_중임무황태무_
_무중임_태_중_황태- 황무황---중태
태_중임_ -_중임_태_중_
태_중임_ -_중임무황태무_
_무중임_태_중_황태- 황무황---중태

출처 : 두클래스 TOP40 단소곡집`
  };

  const fetchRecorderMissions = async () => {
    try {
      const recorderDoc = await getDoc(doc(db, 'settings', 'recorderMissions'));
      if (recorderDoc.exists()) {
        setRecorderMissions(recorderDoc.data());
      }
    } catch (error) {
      console.error('단소급수미션 데이터 로드 실패:', error);
    }
  };

  // 심화 단소급수미션 데이터 로드
  const fetchRecorderMissionsAdvanced = async () => {
    try {
      const recorderAdvancedDoc = await getDoc(doc(db, 'settings', 'recorderMissionsAdvanced'));
      if (recorderAdvancedDoc.exists()) {
        setRecorderMissionsAdvanced(recorderAdvancedDoc.data());
      }
    } catch (error) {
      console.error('심화 단소급수미션 데이터 로드 실패:', error);
    }
  };

  const getCompletedSteps = () => {
    if (!recorderMissions[studentId]) return [];
    const completed = [];
    RECORDER_STEPS.forEach(step => {
      if (recorderMissions[studentId][step]) {
        completed.push(step);
      }
    });
    return completed;
  };

  const getHighestCompletedLevel = () => {
    const completed = getCompletedSteps();
    if (completed.length === 0) return null;
    
    // 각 단계를 레벨로 변환하고 최고 레벨 찾기
    const levels = completed.map(step => {
      if (step === 'tutorial') return 0;
      if (step === 'step1') return 1;
      if (step === 'step2') return 2;
      if (step.startsWith('step3')) return 3;
      if (step.startsWith('step4')) return 4;
      if (step === 'step5') return 5;
      if (step.startsWith('step6')) return 6;
      if (step === 'step7') return 7;
      return 0;
    });
    
    return Math.max(...levels);
  };

  // 심화 미션 관련 함수들
  const getCompletedStepsAdvanced = () => {
    if (!recorderMissionsAdvanced[studentId]) return [];
    const completed = [];
    RECORDER_STEPS_ADVANCED.forEach(step => {
      if (recorderMissionsAdvanced[studentId][step]) {
        completed.push(step);
      }
    });
    return completed;
  };

  const getHighestCompletedLevelAdvanced = () => {
    const completed = getCompletedStepsAdvanced();
    if (completed.length === 0) return null;
    
    // 심화 단계를 레벨로 변환하고 최고 레벨 찾기
    const levels = completed.map(step => {
      const match = step.match(/advanced(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    
    return Math.max(...levels);
  };

  // 7단계 완료 여부 확인 (심화 미션 해금 조건)
  const isAdvancedUnlocked = () => {
    return getHighestCompletedLevel() >= 7;
  };

    const handleCelebrationClick = () => {
    setShowCelebrationModal(true);
    setCelebrationLevel(getHighestCompletedLevel());
  };

  // 심화 축하 모달 클릭 핸들러
  const handleAdvancedCelebrationClick = () => {
    setShowAdvancedCelebrationModal(true);
    setAdvancedCelebrationLevel(getHighestCompletedLevelAdvanced());
  };

  // 밑줄 그어진 높은 음을 빨간색으로 표시하는 함수
  const formatSheetMusic = (text) => {
    return text.split(/(_[^_]+_)/g).map((part, index) => {
      if (part.startsWith('_') && part.endsWith('_')) {
        const content = part.slice(1, -1); // 양쪽 _ 제거
        return (
          <span 
            key={index} 
            style={{ 
              color: '#ff4444', 
              fontWeight: 'bold' 
            }}
          >
            {content}
          </span>
        );
      }
      return part;
    });
  };
 

  // 축하 모달 확인 처리 함수
  const handleCelebrationConfirm = () => {
    setShowCelebrationModal(false);
    // 사용자가 축하 메시지를 확인했음을 localStorage에 저장
    localStorage.setItem(`lastCelebrated_${studentId}`, celebrationLevel.toString());
  };

  // 심화 축하 모달 확인 처리 함수
  const handleAdvancedCelebrationConfirm = () => {
    setShowAdvancedCelebrationModal(false);
    // 사용자가 심화 축하 메시지를 확인했음을 localStorage에 저장
    localStorage.setItem(`lastAdvancedCelebrated_${studentId}`, advancedCelebrationLevel.toString());
  };

  // 새로운 단계 통과 시 자동 축하 모달 표시
  useEffect(() => {
    const currentLevel = getHighestCompletedLevel();
    const storedLevel = localStorage.getItem(`lastCelebrated_${studentId}`);
    
    if (currentLevel !== null && currentLevel > (parseInt(storedLevel) || -1)) {
      // 새로운 단계를 통과했을 때
      setTimeout(() => {
        setShowCelebrationModal(true);
        setCelebrationLevel(currentLevel);
        // localStorage 저장은 사용자가 확인 버튼을 클릭할 때로 이동
      }, 1000); // 1초 지연 후 축하 모달 표시
    }
  }, [recorderMissions, studentId]);

  // 단소급수미션 데이터 실시간 감지
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'recorderMissions'), (doc) => {
      if (doc.exists()) {
        setRecorderMissions(doc.data());
      }
    }, (error) => {
      console.error('단소급수미션 실시간 감지 실패:', error);
      fetchRecorderMissions(); // 실패 시 일반 로드로 대체
    });

    return () => unsubscribe();
  }, []);

  // 심화 단소급수미션 데이터 실시간 감지
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'recorderMissionsAdvanced'), (doc) => {
      if (doc.exists()) {
        setRecorderMissionsAdvanced(doc.data());
      }
    }, (error) => {
      console.error('심화 단소급수미션 실시간 감지 실패:', error);
      fetchRecorderMissionsAdvanced(); // 실패 시 일반 로드로 대체
    });

    return () => unsubscribe();
  }, []);

  // 새로운 심화 단계 통과 시 자동 축하 모달 표시
  useEffect(() => {
    const currentLevel = getHighestCompletedLevelAdvanced();
    const storedLevel = localStorage.getItem(`lastAdvancedCelebrated_${studentId}`);
    
    if (currentLevel !== null && currentLevel > (parseInt(storedLevel) || 0)) {
      // 새로운 심화 단계를 통과했을 때
      setTimeout(() => {
        setShowAdvancedCelebrationModal(true);
        setAdvancedCelebrationLevel(currentLevel);
        // localStorage 저장은 사용자가 확인 버튼을 클릭할 때로 이동
      }, 1000); // 1초 지연 후 축하 모달 표시
    }
  }, [recorderMissionsAdvanced, studentId]);

  // 새로운 교사 메시지 개수 계산
  useEffect(() => {
    if (!student) return;
    // 읽지 않은 선생님 메시지
    const teacherMsgs = (student.messages || []).filter(m => m.from === 'teacher');
    const lastRead = student.lastTeacherMsgRead || 0;
    const unreadMsg = teacherMsgs.filter(m => m.ts > lastRead).length;
    // 읽지 않은 알람(notifications/announce)
    const alarms = ((student.announce||[]).concat(student.notifications||[]));
    // 친구 칭찬 승인 내역
    const praiseApproved = (student.praise || []).filter(p => p.checked && p.result === 'approved' && p.from && p.from !== 'student' && p.fromName);
    // expEvents의 친구 칭찬 내역
    const expEventsPraise = (student.expEvents || []).filter(e => e.type === 'friendPraise' && e.from && e.result === 'approved');
    // 모든 알람을 합쳐서 타임스탬프 기준으로 중복 제거
    const allAlarmsWithDuplicates = [...alarms, ...praiseApproved, ...expEventsPraise];
    const allAlarms = allAlarmsWithDuplicates.filter((alarm, index, array) => 
      array.findIndex(a => a.ts === alarm.ts) === index
    );
    const seenAlarms = JSON.parse(localStorage.getItem('seenStudentAlarms')||'[]');
    const unreadAlarms = allAlarms.filter(a => a.ts && !seenAlarms.includes(a.ts)).length;
    setUnreadCount(unreadMsg + unreadAlarms);
    setUnreadAlarmCount(unreadAlarms);
  }, [student]);

  // 공지사항 불러오기
  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const q = query(collection(db, 'notices'), orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotices(data);
        // 광고중인 공지 확인 (아직 확인하지 않은 것만, broadcastTime까지 체크)
        const broadcast = data.find(n => n.broadcast && n.broadcastTime && !hasSeenBroadcast(n.id, n.broadcastTime));
        if (broadcast) {
          setBroadcastNotice(broadcast);
          setShowBroadcastModal(true);
          if (broadcastTimeoutRef.current) clearTimeout(broadcastTimeoutRef.current);
        } else {
          setBroadcastNotice(null);
          setShowBroadcastModal(false);
          if (broadcastTimeoutRef.current) clearTimeout(broadcastTimeoutRef.current);
        }
      } catch (e) {
        setNotices([]);
      }
    };
    fetchNotices();
    const interval = setInterval(fetchNotices, 5000); // 5초마다 갱신
    return () => {
      clearInterval(interval);
      if (broadcastTimeoutRef.current) clearTimeout(broadcastTimeoutRef.current);
    };
  }, []);

  // 메시지 보내기
  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    const studentRef = doc(db, 'students', studentId);
    const newMessages = [...(student.messages || []), {
      from: 'student',
      text: messageText,
      ts: Date.now(),
      replyTo: replyToMessage ? replyToMessage.text : null
    }];
    await updateDoc(studentRef, { messages: newMessages });
    setShowMsgModal(false); // 메시지 모달 닫기
    setShowMessageModal(false); // 답장 모달도 혹시 열려있으면 닫기
    setMessageText(''); // 입력창 초기화
    setReplyToMessage(null);
  };

  // 친구 칭찬하기 (교사에게 요청)
  const handleSendPraise = async () => {
    if (selectedFriends.length === 0) return;

    setShowPraiseModal(false);
    setPraiseText('');
    setPraiseExp(10);
    setSelectedFriends([]);

    try {
      await Promise.all(selectedFriends.map(friendId => {
        const praiseObj = {
          from: studentId,
          fromName: student.name,
          text: praiseText,
          exp: praiseExp,
          ts: Date.now(),
          checked: false,
          type: 'friendPraise'
        };
        return updateDoc(doc(db, 'students', friendId), {
          praise: arrayUnion(praiseObj)
        });
      }));
      setPraiseResultMsg('친구에게 칭찬 요청을 보냈습니다!');
      setPraiseResultEffect(true);
      setTimeout(() => setPraiseResultEffect(false), 2000);
    } catch (e) {
      setPraiseResultMsg('칭찬 요청 중 오류가 발생했습니다. 다시 시도해 주세요.');
      setPraiseResultEffect(true);
      setTimeout(() => setPraiseResultEffect(false), 2000);
    }
  };

  // 나 칭찬하기 (교사에게 요청)
  const handleSendSelfPraise = async () => {
    await updateDoc(doc(db, 'students', studentId), {
      praise: arrayUnion({ from: 'student', text: selfPraiseText, exp: selfPraiseExp, self: true, ts: Date.now() })
    });
    setShowSelfPraiseModal(false);
    setSelfPraiseText('');
    setSelfPraiseExp(10);
  };

  // 알람(종) 클릭 시 교사 메시지 모달 + 읽음 처리
  const handleAlarmClick = async () => {
    setShowNotificationModal(true);
    // 선생님 메시지 읽음 처리
    if (student && (student.messages || []).some(m => m.from === 'teacher')) {
      const teacherMsgs = (student.messages || []).filter(m => m.from === 'teacher');
      const lastTs = teacherMsgs.length > 0 ? teacherMsgs[teacherMsgs.length - 1].ts : 0;
      await updateDoc(doc(db, 'students', studentId), { lastTeacherMsgRead: lastTs });
    }
    // 모든 알람 읽음 처리 - 개선
    const alarms = ((student?.announce||[]).concat(student?.notifications||[]));
    alarms.forEach(a => { if (a.ts) markStudentAlarmAsSeen(a.ts); });
    // 친구 칭찬 승인 내역도 읽음 처리
    const praiseApproved = (student?.praise || []).filter(p => p.checked && p.result === 'approved' && p.from && p.from !== 'student' && p.fromName);
    praiseApproved.forEach(p => { if (p.ts) markStudentAlarmAsSeen(p.ts); });
    // expEvents의 친구 칭찬 내역도 읽음 처리
    const expEventsPraise = (student?.expEvents || []).filter(e => e.type === 'friendPraise' && e.from && e.result === 'approved');
    expEventsPraise.forEach(e => { if (e.ts) markStudentAlarmAsSeen(e.ts); });
    setUnreadCount(0);
    setUnreadAlarmCount(0);
  };

  // 경험치/레벨업 이펙트
  React.useEffect(() => {
    if (!student) return;
    let requiredExp = getRequiredExp(student.level - 1);
    if (student.exp === 0 && student.level > 0) {
      setLevelUpEffect(true);
      setTimeout(() => setLevelUpEffect(false), 1200);
    } else {
      setExpEffect(true);
      setTimeout(() => setExpEffect(false), 800);
    }
  }, [student?.exp, student?.level]);

  // 칭찬 승인/거절 결과 이펙트 감지
  useEffect(() => {
    if (!student) return;
    // 내가 보낸 칭찬 중 승인/거절된 것 중 최근 1건
    const myPraise = (student.praise || []).filter(p => p.from === 'student' && p.checked && p.result && !p.resultNotified);
    if (myPraise.length > 0) {
      const last = myPraise[myPraise.length - 1];
      if (last.result === 'approved') {
        setPraiseResultMsg('칭찬이 승인되어 경험치가 지급되었습니다! 🎉');
      } else if (last.result === 'rejected') {
        setPraiseResultMsg(`칭찬이 거절되었습니다. 사유: ${last.reason}`);
      }
      setPraiseResultEffect(true);
      // resultNotified 플래그 추가(중복 알림 방지)
      const praiseArr = (student.praise || []).map(p => p.ts === last.ts ? { ...p, resultNotified: true } : p);
      updateDoc(doc(db, 'students', studentId), { praise: praiseArr });
      setTimeout(() => setPraiseResultEffect(false), 2000);
    }
    // [퀘스트 승인/실패 결과 이펙트 감지 추가]
    const myQuest = (student.quests || []).filter(q => (q.status === 'approved' || q.status === 'rejected') && !q.resultNotified);
    if (myQuest.length > 0) {
      const lastQ = myQuest[myQuest.length - 1];
      if (lastQ.status === 'approved') {
        setPraiseResultMsg(`퀘스트가 승인되어 경험치 ${lastQ.exp}xp가 지급되었습니다! 🎉`);
      } else if (lastQ.status === 'rejected') {
        setPraiseResultMsg(`퀘스트가 거절되었습니다. 사유: ${lastQ.reason || '없음'}`);
      }
      setPraiseResultEffect(true);
      // resultNotified 플래그 추가(중복 알림 방지)
      const questArr = (student.quests || []).map(q => q.ts === lastQ.ts ? { ...q, resultNotified: true } : q);
      updateDoc(doc(db, 'students', studentId), { quests: questArr });
      setTimeout(() => setPraiseResultEffect(false), 2000);
    }
  }, [student]);

  // 발표 횟수 계산 (expEvents의 type: 'exp'만 집계)
  let expEvents = student && Array.isArray(student.expEvents) ? student.expEvents : [];
  const expEventsExp = expEvents.filter(evt => evt.type === 'exp');
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPresentations = expEventsExp.filter(e => new Date(e.ts).toISOString().slice(0, 10) === todayStr).length;
  const totalPresentations = expEventsExp.length;

  // 새 퀘스트 도착 이펙트
  useEffect(() => {
    if (!student) return;
    const questList = Array.isArray(student.quests) ? student.quests : [];
    if (questList.length === 0) return;
    // localStorage에서 본 퀘스트 ts 목록 불러오기
    let seenQuestTs = [];
    try {
      seenQuestTs = JSON.parse(localStorage.getItem(`seenQuestToast_${studentId}`) || '[]');
    } catch {}
    // 아직 본 적 없는 퀘스트(ts) 찾기 (status: ongoing만)
    const newQuest = questList.find(q => q.status === 'ongoing' && !seenQuestTs.includes(q.ts));
    if (newQuest) {
      setQuestToast(true);
      setTimeout(() => setQuestToast(false), 1800);
      // 본 퀘스트로 기록
      try {
        localStorage.setItem(`seenQuestToast_${studentId}`,
          JSON.stringify([...seenQuestTs, newQuest.ts])
        );
      } catch {}
    }
    setPrevQuestCount(questList.length);
  }, [student?.quests, studentId]);

  // 진행 중인 퀘스트 찾기
  const ongoingQuest = student && Array.isArray(student.quests) ? student.quests.find(q => q.status === 'ongoing') : null;

  // 학급 사탕 집계 (teacher와 동일하게 level 기준)
  const candyCounts = [0,0,0,0,0,0];
  if (studentsSnapshot) {
    studentsSnapshot.docs.forEach(doc => {
      const s = doc.data();
      const currentLevel = s.level || 0;
      for (let i = 0; i < currentLevel && i < 6; i++) {
        candyCounts[i]++;
      }
    });
  }

  const handleEnterBoard = () => {
    if (boardCodeInput.trim().length > 0 && student) {
      navigate(`/board/${boardCodeInput.trim().toUpperCase()}?studentId=${studentId}&studentName=${encodeURIComponent(student.name)}`);
      setShowBoardModal(false);
      setBoardCodeInput('');
    }
  };

  // 전광판 스타일 개선
  const tickerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: 38,
    background: 'rgba(25, 118, 210, 0.08)',
    color: '#1976d2',
    fontWeight: 700,
    fontSize: 17,
    display: 'flex',
    alignItems: 'center',
    zIndex: 5000,
    overflow: 'hidden',
    pointerEvents: 'none',
    opacity: 0.80,
    backdropFilter: 'blur(2px)',
    borderBottom: '1.5px solid #e3f2fd',
  };
  const tickerTextStyle = {
    whiteSpace: 'nowrap',
    animation: 'ticker 40s linear infinite',
    fontWeight: 700,
    opacity: 0.85,
    letterSpacing: '0.5px',
    textShadow: '0 2px 8px #fff8',
  };

  // 자동 닫힘 실행 함수 (useCallback 없이 단순하게)
  const executeAutoClose = async (alarmId) => {
    console.log('===== 자동 닫힘 실행 시작 =====', alarmId);
    
    try {
      // 1. 모달 상태들 닫기
      console.log('1. 모달 상태 업데이트 중...');
      setShowAlarmModal(false);
      setActiveAlarm(null);
      setCurrentDisplayedAlarmId(null);
      currentDisplayedAlarmIdRef.current = null; // ref도 함께 초기화
      console.log('2. 모달 상태 업데이트 완료');
      
      // 2. 알림 확인 상태 저장
      console.log('3. 알림 확인 상태 저장 중...');
      await markAlarmAsSeen(alarmId);
      console.log('4. 알림 확인 상태 저장 완료');
      
      console.log('===== 자동 닫힘 실행 완료 =====', alarmId);
    } catch (error) {
      console.error('자동 닫힘 실행 중 오류:', error);
    }
  };

  // 1분 자동 닫힘 타이머 시작 함수
  const startAutoCloseTimer = useCallback((alarmId) => {
    // 기존 타이머가 있다면 클리어
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }
    
    console.log('1분 자동 닫힘 타이머 시작:', alarmId);
    autoCloseTimerRef.current = setTimeout(() => {
      executeAutoClose(alarmId);
      autoCloseTimerRef.current = null;
    }, 60000); // 60초 = 1분
  }, []);

  // 자동 닫힘 타이머 중단 함수
  const stopAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current) {
      console.log('자동 닫힘 타이머 중단');
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, []);

  // 예약 알람 감지 useEffect (의존성 최소화하여 타이머 중단 방지)
  useEffect(() => {
    let interval;
    
    const checkAlarms = async () => {
      try {
        const q = query(collection(db, 'alarms'), where('isActive', '==', true), orderBy('targetTime', 'desc'));
        const snap = await getDocs(q);
        const now = Date.now();
        const alarms = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // 예약 시간이 도달했고 아직 보지 않은 알림 찾기
        const active = alarms.find(alarm => !hasSeenAlarm(alarm.id) && now >= alarm.targetTime);
        
        // 새로운 알림이고 현재 표시 중인 알림과 다른 경우에만 표시
        if (active && currentDisplayedAlarmIdRef.current !== active.id) {
          console.log('예약 알림 표시:', active.id, active.content);
          setActiveAlarm(active);
          setShowAlarmModal(true);
          setCurrentDisplayedAlarmId(active.id);
          currentDisplayedAlarmIdRef.current = active.id; // ref도 함께 업데이트
          
          // 1분 후 자동 닫힘 타이머 시작
          startAutoCloseTimer(active.id);
        }
      } catch (error) {
        console.error('알림 확인 중 오류:', error);
      }
    };
    
    checkAlarms();
    interval = setInterval(checkAlarms, 5000);
    
    // cleanup 함수에서는 interval만 정리 (타이머는 건드리지 않음)
    return () => {
      clearInterval(interval);
    };
  }, []); // 의존성 배열을 비워서 한 번만 실행되도록 함

  // 컴포넌트 언마운트 시에만 타이머 정리
  useEffect(() => {
    return () => {
      stopAutoCloseTimer();
    };
  }, [stopAutoCloseTimer]);

  // 효과음 재생 함수
  const playAlertSound = () => {
    try {
      const audio = new window.Audio('/alert.mp3');
      // 사용자 제스처 없이는 재생되지 않을 수 있으므로 Promise를 처리
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // 자동 재생이 차단된 경우 조용히 처리
        });
      }
    } catch (e) {
      // 효과음 재생 실패 시 조용히 처리
    }
  };

  // 예약 알람 모달 효과음/진동 useEffect
  useEffect(() => {
    if (activeAlarm && showAlarmModal) {
      // 사용자 제스처 후에만 진동/효과음 재생
      const playEffects = () => {
        try {
          playAlertSound();
        } catch (e) {
          // 오디오 재생 실패 시 조용히 처리
        }
                 try {
           if (window.navigator && window.navigator.vibrate && typeof window.navigator.vibrate === 'function') {
             window.navigator.vibrate([120,80,120]);
           }
         } catch (e) {
           // 진동 실패 시 조용히 처리
         }
      };
      
      // 즉시 실행하되 에러는 조용히 처리
      playEffects();
    }
  }, [activeAlarm, showAlarmModal]);

  // 광고(브로드캐스트) 모달 효과음/진동 useEffect
  useEffect(() => {
    if (broadcastNotice && showBroadcastModal) {
      try {
        playAlertSound();
      } catch (e) {
        // 오디오 재생 실패 시 조용히 처리
      }
             try {
         if (window.navigator && window.navigator.vibrate && typeof window.navigator.vibrate === 'function') {
           window.navigator.vibrate([120, 80, 120]);
         }
       } catch (e) {
         // 진동 실패 시 조용히 처리
       }
    }
  }, [broadcastNotice, showBroadcastModal]);

  // 예약 알람 모달 진동 반복 (랜덤 패턴, 랜덤 반복주기)
  useEffect(() => {
    let vibrateTimeout;
    function randomVibrateLoop() {
      if (!(activeAlarm && showAlarmModal)) return;
      // 진동 패턴: 3~7회, 각 진동 50~200ms, 간격 30~120ms
      const count = Math.floor(Math.random() * 5) + 3;
      const pattern = [];
      for (let i = 0; i < count; i++) {
        pattern.push(Math.floor(Math.random() * 150) + 50); // 진동
        if (i < count - 1) pattern.push(Math.floor(Math.random() * 90) + 30); // 쉼
      }
              try {
          if (window.navigator && window.navigator.vibrate && typeof window.navigator.vibrate === 'function') {
            window.navigator.vibrate(pattern);
          }
        } catch (e) {
          // 진동 기능이 차단되어도 무시
        }
      // 다음 반복까지 대기시간: 0.7~1.7초 랜덤
      const next = Math.floor(Math.random() * 1000) + 700;
      vibrateTimeout = setTimeout(randomVibrateLoop, next);
    }
    if (activeAlarm && showAlarmModal) {
      randomVibrateLoop();
    }
    return () => {
      if (vibrateTimeout) clearTimeout(vibrateTimeout);
      try {
        if (window.navigator && window.navigator.vibrate && typeof window.navigator.vibrate === 'function') {
          window.navigator.vibrate(0);
        }
      } catch (e) {
        // 진동 기능이 차단되어도 무시
      }
    };
  }, [activeAlarm, showAlarmModal]);

  // 알림 모달 상태 계산
  const unreadTeacherMessages = (student?.messages || []).filter(m => m.from === 'teacher' && (!student.lastTeacherMsgRead || m.ts > student.lastTeacherMsgRead));
  const unreadQuests = (student?.quests || []).filter(q => !q.read);

  const allNotifications = [
    // 발표 이벤트
    ...(student?.expEvents||[]).map(e => ({
      type: e.type === 'exp' ? 'presentation' : e.type === 'quest' ? 'quest-exp' : e.type,
      text: e.type === 'exp' ? `발표 경험치 +${e.amount}` : e.type === 'quest' ? `퀘스트 보상 +${e.amount}xp (${e.text||''})` : '',
      ts: e.ts
    })),
    // 교사 메시지
    ...(student?.messages||[]).filter(m=>m.from==='teacher').map(m => ({
      type: 'teacher-message',
      text: m.text,
      ts: m.ts
    })),
    // 퀘스트 내역
    ...(student?.quests||[]).map(q => ({
      type: q.status === 'approved' ? 'quest-approved' : q.status === 'rejected' ? 'quest-rejected' : 'quest',
      text: q.status === 'approved' ? `퀘스트 승인: ${q.text} (+${q.exp}xp)` : q.status === 'rejected' ? `퀘스트 실패: ${q.text} (보상: 0xp${q.reason ? ', 사유: ' + q.reason : ''})` : `퀘스트: ${q.text} (보상: ${q.exp}xp)` ,
      ts: q.ts
    })),
    // 퀘스트 승인/거절 결과 메시지(내가 보낸 퀘스트 요청 결과)
    ...(student?.praise||[]).filter(p=>p.checked && p.result).map(p => ({
      type: p.result==='approved' ? 'praise-approved' : 'praise-rejected',
      text: p.result==='approved' ? `칭찬 승인: ${p.text} (+${p.exp}xp)` : `칭찬 거절: ${p.text} (사유: ${p.reason||'없음'})`,
      ts: p.ts
    }))
  ].filter(n=>n.text).sort((a,b)=>b.ts-a.ts);

  const [lastNotificationRead, setLastNotificationRead] = useState(() => Number(localStorage.getItem('lastNotificationRead') || 0));

  // 카드뽑기/쿠폰함 상태 추가
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardChoices, setCardChoices] = useState([]); // 3장 보상 후보
  const [cardResult, setCardResult] = useState(null); // 뽑은 보상
  const [cardEffect, setCardEffect] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState(null); // 선택된 카드 인덱스
  const [couponBoxOpen, setCouponBoxOpen] = useState(false);
  const [coupons, setCoupons] = useState([]); // Firestore 쿠폰함 내역
  const [levelRewardDrawn, setLevelRewardDrawn] = useState({}); // Firestore에서 관리

  // Firestore에서 쿠폰함, 레벨업 뽑기 완료 여부 실시간 구독
  useEffect(() => {
    if (!studentId) return;
    const unsub = onSnapshot(doc(db, 'students', studentId), (snap) => {
      const data = snap.data();
      setCoupons(data?.coupons || []);
      setLevelRewardDrawn(data?.levelRewardDrawn || {});
    });
    return () => unsub();
  }, [studentId]);

  // 쿠폰 사용 처리 함수 (Firestore 반영)
  const handleUseCoupon = async (coupon) => {
    if (coupon.used) return;
    // 보상 지급 로직 (기존과 동일)
    if (coupon.key === '5money' || coupon.key === '10money') {
      const amount = coupon.key === '5money' ? 5 : 10;
      await updateDoc(doc(db, 'students', studentId), {
        balance: (student.balance || 0) + amount,
        transactions: arrayUnion({
          type: 'deposit',
          reason: '레벨업 보상',
          amount: amount,
          ts: Date.now()
        })
      });
    } else if (coupon.key === 'bites' || coupon.key === 'chew2' || coupon.key === 'chupa') {
      const itemName = coupon.key === 'bites' ? '사워바이츠' : coupon.key === 'chew2' ? '마이쮸' : '츄파춥스';
      const quantity = coupon.key === 'chew2' ? 2 : 1;
      await updateDoc(doc(db, 'students', studentId), {
        items: arrayUnion({
          name: itemName,
          quantity: quantity,
          ts: Date.now()
        })
      });
    } else if (coupon.key === 'chupafr' || coupon.key === 'bottle') {
      await updateDoc(doc(db, 'students', studentId), {
        messages: arrayUnion({
          from: 'system',
          text: coupon.key === 'chupafr' ? '친구에게 츄파춥스 1개를 선물했습니다!' : '반 친구 모두에게 새콤달콤 1개를 선물했습니다!',
          ts: Date.now()
        })
      });
    }
    // Firestore 쿠폰 used 처리
    const updatedCoupons = coupons.map(c => c.ts === coupon.ts ? { ...c, used: true } : c);
    await updateDoc(doc(db, 'students', studentId), { coupons: updatedCoupons });
  };

  // Firestore 기반 레벨업 보상 뽑기 완료 여부
  const hasDrawnLevelReward = (level) => {
    return !!levelRewardDrawn[level];
  };
  const markLevelRewardAsDrawn = async (level) => {
    await updateDoc(doc(db, 'students', studentId), {
      levelRewardDrawn: { ...levelRewardDrawn, [level]: true }
    });
  };

  // 1. 로컬스토리지 함수 (studentId 기반)
  const getLocalLevelRewardDrawn = (level) => {
    try {
      const drawn = JSON.parse(localStorage.getItem(`levelRewardDrawn_${studentId}`) || '{}');
      return !!drawn[level];
    } catch {
      return false;
    }
  };
  const setLocalLevelRewardDrawn = (level) => {
    try {
      const drawn = JSON.parse(localStorage.getItem(`levelRewardDrawn_${studentId}`) || '{}');
      drawn[level] = true;
      localStorage.setItem(`levelRewardDrawn_${studentId}`, JSON.stringify(drawn));
    } catch {}
  };
  // 2. Firestore + localStorage 둘 다 확인
  const hasDrawnLevelRewardAll = (level) => {
    return hasDrawnLevelReward(level) || getLocalLevelRewardDrawn(level);
  };
  // 3. mark 함수도 둘 다 업데이트
  const markLevelRewardAsDrawnAll = async (level) => {
    setLocalLevelRewardDrawn(level);
    await updateDoc(doc(db, 'students', studentId), {
      levelRewardDrawn: { ...levelRewardDrawn, [level]: true }
    });
  };
  // 4. 로딩 상태
  const [studentLoaded, setStudentLoaded] = useState(false);
  useEffect(() => {
    if (studentDoc) setStudentLoaded(true);
  }, [studentDoc]);

  // 동기화 useEffect (최적화)
  useEffect(() => {
    if (!studentLoaded || !student) return;
    const local = getLocalLevelRewardDrawn(student.level);
    const remote = hasDrawnLevelReward(student.level);
    if (local === remote) return; // 둘 다 같으면 아무것도 안 함
    if (local && !remote) {
      markLevelRewardAsDrawn(student.level);
    } else if (!local && remote) {
      setLocalLevelRewardDrawn(student.level);
    }
  }, [student?.level, studentLoaded]);

  // 카드뽑기 모달 트리거 useEffect (최적화)
  useEffect(() => {
    if (!studentLoaded || !student) return;
    if (hasDrawnLevelRewardAll(student.level)) return; // 이미 받았으면 아무것도 안 함
    /*
    // 디버깅 로그 (필요시만 주석 해제)
    console.log('[디버그] 레벨업 보상 체크:', {
      studentId,
      studentLevel: student.level,
      firestore보상받음: hasDrawnLevelReward(student.level),
      로컬스토리지키: `levelRewardDrawn_${studentId}`,
      로컬스토리지보상받음: getLocalLevelRewardDrawn(student.level),
      종합보상받음: hasDrawnLevelRewardAll(student.level),
      showCardModal: showCardModal
    });
    */
      // 카드 3장 보상 후보 생성 (확률 기반)
      const pick3 = () => {
        const weightedRandom = () => {
          const totalProb = REWARD_LIST.reduce((sum, item) => sum + item.prob, 0);
          let randomNum = Math.random() * totalProb;
          for (let item of REWARD_LIST) {
            randomNum -= item.prob;
            if (randomNum <= 0) return item;
          }
          return REWARD_LIST[0]; // fallback
        };
        
        const arr = [];
        for (let i = 0; i < 3; i++) {
          arr.push(weightedRandom());
        }
        return arr;
      };
      setCardChoices(pick3());
      setShowCardModal(true);
      setCardResult(null);
      setCardEffect(false);
      // 로컬스토리지에 먼저 기록 (즉시 적용)
      setLocalLevelRewardDrawn(student.level);
      // Firestore에도 기록 (비동기)
      markLevelRewardAsDrawn(student.level)
      // .then(() => console.log('[디버그] Firestore에 레벨업 보상 기록 완료:', student.level))
      // .catch(err => console.error('[디버그] Firestore 업데이트 실패:', err));
      .catch(() => {});
  }, [student?.level, studentLoaded]);

  // 쿠폰함 탭 상태 추가
  const [couponTab, setCouponTab] = useState('unused'); // 'unused' or 'used'

  // 카드뽑기 모달 닫기 함수 (상태 초기화)
  const handleCloseCardModal = () => {
    setShowCardModal(false);
    setCardChoices([]);
    setCardResult(null);
    setCardEffect(false);
    setSelectedCardIndex(null);
  };

  // 카드 선택 처리 함수 추가
  const handleCardSelect = async (selectedCard, cardIndex) => {
    try {
      // 선택된 카드 인덱스 저장 (카드 뒤집기 효과)
      setSelectedCardIndex(cardIndex);
      
      // 0.5초 후 카드 공개 및 쿠폰 추가
      setTimeout(async () => {
        const newCoupon = {
          key: selectedCard.key,
          label: selectedCard.label,
          img: selectedCard.img,
          used: false,
          ts: Date.now()
        };
        
        await updateDoc(doc(db, 'students', studentId), {
          coupons: arrayUnion(newCoupon)
        });
        
        // 카드 선택 효과 표시
        setCardResult(selectedCard);
        setCardEffect(true);
        
        // 2초 후 모달 닫기
        setTimeout(() => {
          handleCloseCardModal();
        }, 2000);
      }, 500);
      
    } catch (error) {
      console.error('카드 선택 처리 실패:', error);
      alert('카드 선택에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 알림 모달 탭 상태 추가
  const [notificationTab, setNotificationTab] = useState('메시지');

  // 알람 리스트 map 내부에서 onClick 등으로 아래 코드 추가
  // localStorage에 ts 저장
  const markStudentAlarmAsSeen = (ts) => {
    try {
      const seen = JSON.parse(localStorage.getItem('seenStudentAlarms') || '[]');
      if (!seen.includes(ts)) {
        localStorage.setItem('seenStudentAlarms', JSON.stringify([...seen, ts]));
      }
    } catch {}
  };
  // 알람 클릭 시 markStudentAlarmAsSeen(a.ts) 호출
  // ... existing code ...

  // ... feverTime 상태 useState ...
  const [feverActive, setFeverActive] = useState(false);
  // Firestore feverTime 구독 useEffect ...
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'feverTime'), (snap) => {
      const data = snap.data();
      setFeverActive(!!(data && data.active === true));
    });
    return () => unsub();
  }, []);
  // ... candy rain 애니메이션 컴포넌트 ...
  function CandyRain() {
    const [candies, setCandies] = useState([]);
    const requestRef = useRef();
    // 팡팡 효과 확률 증가
    const POP_PROB = 0.45; // 확률 더 상향 조정
    // 캔디 생성
    useEffect(() => {
      let running = true;
      function addCandy() {
        if (!running || !feverActive) return;
        setCandies(candies => [
          ...candies,
          {
            id: Math.random().toString(36).slice(2),
            img: candyRainImages[Math.floor(Math.random()*candyRainImages.length)],
            left: Math.random()*85+5, // 화면 가장자리 제외
            top: Math.random()*70+15, // 15~85vh 사이에서 랜덤하게 생성
            size: Math.random()*50+20, // 20~70px로 더 다양하게
            angle: (Math.random() - 0.5) * 360, // 360도 회전
            pop: true, // 모든 캔디가 팡팡 효과
            fade: false
          }
        ]);
        if (running && feverActive) {
          setTimeout(addCandy, Math.random()*200+100); // 100~300ms로 더 빠르게 생성
        }
      }
      if (feverActive) addCandy();
      return () => { running = false; };
    }, [feverActive]);
    // 캔디 애니메이션 및 제거
    useEffect(() => {
      if (!feverActive) {
        setCandies(candies => candies.map(c => ({ ...c, fade: true })));
        const timeout = setTimeout(() => setCandies([]), 1400);
        return () => clearTimeout(timeout);
      }
    }, [feverActive]);
  return (
      <div style={{ pointerEvents:'none', position:'fixed', top:0, left:0, width:'100vw', height:'100vh', zIndex:9999 }}>
        {candies.map(candy => (
          <img key={candy.id} src={candy.img} alt="candy" style={{
            position:'absolute',
            left: `${candy.left}vw`,
            top: `${candy.top}vh`,
            width: candy.size,
            height: candy.size,
            opacity: candy.fade ? 0 : 0.92,
            pointerEvents:'none',
            filter: 'drop-shadow(0 0 16px #ffd600)',
            animation: 'popCandy 0.7s forwards',
            transform: `rotate(${candy.angle}deg)`,
            transition: 'opacity 1.1s'
          }} />
        ))}
          <style>{`
          @keyframes popCandy {
            0% { transform: scale(0.2) rotate(0deg); opacity: 0; }
            20% { transform: scale(1.8) rotate(-15deg); opacity: 1; }
            40% { transform: scale(1.2) rotate(10deg); opacity: 0.9; }
            60% { transform: scale(1.5) rotate(-10deg); opacity: 0.8; }
            80% { transform: scale(1.1) rotate(5deg); opacity: 0.6; }
            100% { transform: scale(0.2) rotate(20deg); opacity: 0; }
            }
          `}</style>
        </div>
    );
  }
  // ... existing code ...
  {feverActive && <CandyRain />}
  // ... 발표 경험치 지급 로직에서 feverActive 체크하여 2배 지급 ...

  // 1. feverActive 안내 모달 상태 추가
  const [showFeverModal, setShowFeverModal] = useState(false);
  useEffect(() => {
    if (feverActive) {
      setShowFeverModal(true);
      const t = setTimeout(() => setShowFeverModal(false), 5000);
      return () => clearTimeout(t);
    } else {
      setShowFeverModal(false);
    }
  }, [feverActive]);

  // StudentPage 컴포넌트 내 useState/useEffect 아래에 추가
  const feverBgImages = [
    '/fv1.png','/fv2.png','/fv3.png','/fv4.png','/fv5.png','/fv6.png','/fv7.png','/fv8.png'
  ];
  const [feverBgIdx, setFeverBgIdx] = useState(0);
  const [feverBgActive, setFeverBgActive] = useState(false);

  useEffect(() => {
    let interval;
    if (feverActive) {
      setFeverBgActive(true);
      // 피버타임 시작 시 바로 랜덤 이미지로 배경 설정
      setFeverBgIdx(Math.floor(Math.random() * feverBgImages.length));
      interval = setInterval(() => {
        setFeverBgIdx(idx => (idx + 1) % feverBgImages.length);
      }, Math.random() * 200 + 300); // 0.3~0.5초 간격
    } else {
      setFeverBgActive(false);
      setFeverBgIdx(0);
    }
    return () => interval && clearInterval(interval);
  }, [feverActive]);

  // 감정 이모티콘 상태 추가
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [showEmotionModal, setShowEmotionModal] = useState(false);

  // Firestore에서 emotionIcon 불러오기
  useEffect(() => {
    if (student && student.emotionIcon) {
      setSelectedEmotion(student.emotionIcon);
    }
  }, [student]);

  // 감정 이모티콘 저장 함수
  const handleSelectEmotion = async (icon) => {
    setSelectedEmotion(icon);
    setShowEmotionModal(false);
    await updateDoc(doc(db, 'students', studentId), { emotionIcon: icon });
  };

  const EMOTION_ICONS = Array.from({ length: 16 }, (_, i) => `/em${i + 1}.png`);

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [replyToMessage, setReplyToMessage] = useState(null);

  const handleReplyMessage = (message) => {
    setReplyToMessage(message);
    setShowMessageModal(true);
  };

  const [showQuestModal, setShowQuestModal] = useState(false);
  const [hasSeenQuestModal, setHasSeenQuestModal] = useState(false);

  // 퀘스트 모달 확인 여부 체크 함수
  const checkQuestModalSeen = () => {
    try {
      const seen = localStorage.getItem('questModalSeen');
      return seen === 'true';
    } catch {
      return false;
    }
  };

  // 퀘스트 모달을 본 것으로 표시
  const markQuestModalAsSeen = () => {
    try {
      localStorage.setItem('questModalSeen', 'true');
      setHasSeenQuestModal(true);
    } catch {}
  };

  // 퀘스트 모달 표시 여부 확인
  useEffect(() => {
    if (student && !checkQuestModalSeen()) {
      setShowQuestModal(true);
    }
  }, [student]);

  // 퀘스트 모달 컴포넌트
  const QuestModal = () => (
    <Modal
      open={showQuestModal}
      onClose={() => {
        setShowQuestModal(false);
        markQuestModalAsSeen();
      }}
      aria-labelledby="quest-modal-title"
    >
            <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        borderRadius: 2,
      }}>
        <Typography id="quest-modal-title" variant="h6" component="h2" gutterBottom>
          환영합니다! 🎉
        </Typography>
        <Typography variant="body1" paragraph>
          캔디샵에 오신 것을 환영합니다! 여기서는 다음과 같은 활동을 할 수 있어요:
        </Typography>
        <ul>
          <li>선생님과 메시지를 주고받을 수 있어요</li>
          <li>칭찬을 받고 경험치를 얻을 수 있어요</li>
          <li>레벨업하면 보상을 받을 수 있어요</li>
          <li>상점에서 다양한 아이템을 구매할 수 있어요</li>
        </ul>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={() => {
            setShowQuestModal(false);
            markQuestModalAsSeen();
          }}
          sx={{ mt: 2 }}
        >
          시작하기
        </Button>
            </Box>
    </Modal>
  );

  // 정보(i) 아이콘 클릭 시 모달 상태
  const [showInfoModal, setShowInfoModal] = useState(false);

  // InfoModal: i 아이콘 클릭 시 안내 모달 (실제 존재하는 이미지만 사용)
  {showInfoModal && (
    <Modal
      open={showInfoModal}
      onClose={() => setShowInfoModal(false)}
      aria-labelledby="info-modal-title"
    >
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        borderRadius: 2,
      }}>
        <Typography id="info-modal-title" variant="h6" component="h2" gutterBottom>
          캔디샵 안내 📝
        </Typography>
        <Typography variant="body1" paragraph>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>캔디샵은 학생들의 성장과 소통을 위한 공간입니다.</li>
            <li>친구를 칭찬하거나, 선생님과 메시지를 주고받을 수 있습니다.</li>
            <li>경험치를 쌓아 레벨업하고, 다양한 보상을 받을 수 있습니다.</li>
            <li>상점에서 아이템을 구입하거나, 퀘스트에 도전할 수 있습니다.</li>
            <li>학습일지 버튼을 통해 나만의 일지를 작성할 수 있습니다.</li>
          </ul>
        </Typography>
                        <Button
                          variant="contained"
          color="primary"
          fullWidth
          onClick={() => setShowInfoModal(false)}
          sx={{ mt: 2 }}
        >
          닫기
                        </Button>
                </Box>
    </Modal>
  )}

  // 모달 오픈 여부(배경 깜빡임 방지)
  const isModalOpen = showQuestModal || showInfoModal;

  // 교사 트리거 쿠폰 이벤트 감지(useEffect)
  useEffect(() => {
    if (!student || !studentId) return;
    if (student.triggerCouponEvent && student.triggerCouponEvent.active) {
      // 카드뽑기 모달 활성화 (확률 기반 pick3 로직)
      const pick3 = () => {
        const weightedRandom = () => {
          const totalProb = REWARD_LIST.reduce((sum, item) => sum + item.prob, 0);
          let randomNum = Math.random() * totalProb;
          for (let item of REWARD_LIST) {
            randomNum -= item.prob;
            if (randomNum <= 0) return item;
          }
          return REWARD_LIST[0]; // fallback
        };
        
        const arr = [];
        for (let i = 0; i < 3; i++) {
          arr.push(weightedRandom());
        }
        return arr;
      };
      setCardChoices(pick3());
      setShowCardModal(true);
      setCardResult(null);
      setCardEffect(false);
      // 트리거 플래그 제거(한 번만 실행)
      const clearTrigger = async () => {
        try {
          await updateDoc(doc(db, 'students', studentId), {
            triggerCouponEvent: { active: false, ts: Date.now() }
          });
        } catch (error) {
          console.error('[쿠폰이벤트] 트리거 플래그 제거 실패:', error);
        }
      };
      clearTrigger();
    }
  }, [student, studentId]);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [currentLink, setCurrentLink] = useState(null);
  const [linkCategory, setLinkCategory] = useState('all');
  const [showLinkHistoryModal, setShowLinkHistoryModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  // 업데이트 정보 모달 상태
  const [showUpdateInfoModal, setShowUpdateInfoModal] = useState(false);

  // 링크 방문 추적 함수
  const handleLinkVisit = async (link) => {
    try {
      const studentRef = doc(db, 'students', studentId);
      const updatedLinks = (student.links || []).map(l => {
        if (l.url === link.url && l.ts === link.ts) {
          return {
            ...l,
            visits: [...(l.visits || []), { ts: Date.now() }]
          };
        }
        return l;
      });
      await updateDoc(studentRef, { links: updatedLinks });
      console.log('Link visit tracked successfully:', link.title || link.url);
    } catch (error) {
      console.error('Error tracking link visit:', error);
    }
  };

  // 새 링크 확인
  useEffect(() => {
    if (!student) return;
    const links = student.links || [];
    const unreadLinks = links.filter(link => {
      const lastVisit = Math.max(...(link.visits || []).map(v => v.ts));
      return !lastVisit;
    });
    if (unreadLinks.length > 0) {
      const latestLink = unreadLinks.sort((a, b) => b.ts - a.ts)[0];
      setCurrentLink(latestLink);
      setShowLinkModal(true);
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      } catch (e) {
        // 진동 기능이 차단되어도 무시
      }
    }
  }, [student]);

  const [user, authLoading] = useAuthState(auth);

  const [showDiaryModal, setShowDiaryModal] = useState(false);

  if (authLoading) return <div>로딩 중...</div>;

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h2>로그인이 필요합니다</h2>
        <button
          onClick={async () => {
            try {
              await signInWithPopup(auth, googleProvider);
            } catch (e) {
              alert('로그인 실패: ' + e.message);
            }
          }}
          style={{
            padding: '12px 32px',
            fontSize: 18,
            borderRadius: 8,
            background: '#4285F4',
            color: '#fff',
            border: 'none',
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: 16
          }}
        >
          구글 계정으로 로그인
        </button>
      </div>
    );
  }
  if (!student) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 22, color: '#d72660' }}>
        학생 정보를 불러오는 중입니다...
      </div>
    );
  }

  // 로그인한 경우: 로그아웃 버튼 + 기존 학생 페이지 내용
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #ffe4ec 0%, #f8bbd0 100%)', 
      backgroundImage: feverBgActive 
        ? `url(${feverBgImages[feverBgIdx]}), linear-gradient(135deg, #ffe4ec 0%, #f8bbd0 100%)`
        : 'url(/ST_bg.png), linear-gradient(135deg, #ffe4ec 0%, #f8bbd0 100%)', 
      backgroundBlendMode: feverBgActive ? 'multiply, soft-light' : 'soft-light', 
      backgroundRepeat: 'no-repeat', 
      backgroundSize: 'cover', 
      backgroundPosition: 'center', 
      paddingBottom: 80,
      transition: feverBgActive ? 'none' : 'background-image 0.3s ease'
    }}>
      <div style={{ position: 'fixed', top: 24, right: 32, zIndex: 2000, display: 'flex', flexDirection: 'row', gap: 18, alignItems: 'center' }}>
        {/* 피버타임 상태 표시 아이콘 */}
        {feverActive && (
          <div style={{
            background: 'linear-gradient(45deg, #FF6B35 30%, #FFD700 90%)',
            border: '3px solid #FFD700',
            borderRadius: 24,
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 16px rgba(255, 107, 53, 0.6)',
            animation: 'feverPulse 2s infinite',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          title="피버타임 진행 중 - 경험치 2배!"
          >
            <div style={{ fontSize: 28, animation: 'feverSpin 3s linear infinite' }}>🔥</div>
            <div style={{ 
              color: '#FFF', 
              fontWeight: 900, 
              fontSize: 16,
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
              letterSpacing: '-0.5px'
            }}>
              피버타임!
            </div>
          </div>
        )}
        {/* 유리병 아이콘 버튼 */}
        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }} title="학급 캔디 유리병" onClick={() => setShowJarModal(true)}>
          <img src="/jar2.png" alt="유리병" style={{ width: 32, height: 32, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px #b2ebf2a0)' }} />
        </div>
        {/* 학습일지 버튼 */}
        <button onClick={() => window.open('https://script.google.com/a/macros/jammanbo.kr/s/AKfycbzJe87NO0gfiGJ58h19F5r3zebgkkek3NSqMKAfFexDc_9bzN3NBFhwbPgv1hNLkT9s/exec', '_blank')} style={{ background: '#fffde7', border: 'none', borderRadius: 999, padding: '8px 18px', boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, color: '#1976d2', fontSize: 28, lineHeight: '1', display: 'flex', alignItems: 'center' }} role="img" aria-label="notebook">📒</span>
          <span style={{ fontWeight: 700, color: '#1976d2', fontSize: 16, marginLeft: 2 }}>학습일지</span>
        </button>
        {/* 캔디숍 버튼 (StorefrontIcon + 텍스트) */}
        <button onClick={() => setShowShopModal(true)} style={{ background: '#fffde7', border: 'none', borderRadius: 999, padding: '8px 18px', boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <StorefrontIcon style={{ color: '#d72660', fontSize: 28 }} />
          <span style={{ fontWeight: 700, color: '#d72660', fontSize: 16 }}>캔디숍</span>
        </button>
        {/* 쿠폰함 버튼 (SVG 티켓 아이콘 + 텍스트) */}
        <button onClick={() => setCouponBoxOpen(true)} style={{ background: '#fffde7', border: 'none', borderRadius: 999, padding: '8px 18px', boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 4 }}>
            <rect x="3" y="8" width="26" height="12" rx="4" fill="#FFD700" stroke="#B8860B" strokeWidth="2"/>
            <rect x="7" y="12" width="18" height="4" rx="2" fill="#FFF8DC" />
            <circle cx="8.5" cy="14" r="1.5" fill="#B8860B" />
            <circle cx="23.5" cy="14" r="1.5" fill="#B8860B" />
            <path d="M3 12 Q1 14 3 16" stroke="#B8860B" strokeWidth="2" fill="none"/>
            <path d="M29 12 Q31 14 29 16" stroke="#B8860B" strokeWidth="2" fill="none"/>
          </svg>
          <span style={{ fontWeight: 700, color: '#d72660', fontSize: 16 }}>쿠폰함</span>
        </button>

        
        {/* 단소급수미션 버튼 */}
        <button onClick={() => {setShowRecorderModal(true); fetchRecorderMissions();}} style={{ background: '#f3e5f5', border: 'none', borderRadius: 999, padding: '8px 18px', boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MusicNoteIcon style={{ color: '#7b1fa2', fontSize: 28 }} />
          <span style={{ fontWeight: 700, color: '#7b1fa2', fontSize: 16 }}>단소급수미션</span>
        </button>
        
        {/* 심화 단소급수미션 버튼 (7단계 완료 시 표시) */}
        {isAdvancedUnlocked() && (
          <button onClick={() => {setShowRecorderAdvancedModal(true); fetchRecorderMissionsAdvanced();}} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', borderRadius: 999, padding: '8px 18px', boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MusicNoteIcon style={{ color: '#fff', fontSize: 28 }} />
            <span style={{ fontWeight: 700, color: '#fff', fontSize: 16 }}>단소급수미션(심화)</span>
          </button>
        )}
        
        {/* 현재 통과 단계 버튼 */}
        {getHighestCompletedLevel() !== null && !isAdvancedUnlocked() && (
          <button onClick={handleCelebrationClick} style={{ background: '#e8f5e8', border: 'none', borderRadius: 999, padding: '8px 18px', boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>🏆</span>
            <span style={{ fontWeight: 700, color: '#43a047', fontSize: 16 }}>{getHighestCompletedLevel()}단계 통과!</span>
          </button>
        )}
        
        {/* 심화 도전 버튼 (7단계 완료 시 무지개색 테두리) */}
        {isAdvancedUnlocked() && (
          <button onClick={handleAdvancedCelebrationClick} style={{ 
            background: 'linear-gradient(45deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff)', 
            border: 'none', 
            borderRadius: 999, 
            padding: '3px', 
            boxShadow: '0 4px 20px rgba(255, 107, 107, 0.4)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center' 
          }}>
            <div style={{ 
              background: '#fff', 
              borderRadius: 999, 
              padding: '8px 18px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8 
            }}>
              <span style={{ fontSize: 24 }}>🌈</span>
              <span style={{ fontWeight: 700, color: '#ff6b6b', fontSize: 16 }}>심화 도전!</span>
            </div>
          </button>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 32, marginTop: 8 }}>
        <img src="/candyshop_banner.png" alt="JAMMANBO CANDY SHOP 배너" style={{ maxWidth: 480, width: '90vw', height: 'auto', borderRadius: 18, boxShadow: '0 4px 24px #b2ebf240', display: 'block' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <button onClick={() => setShowBoardModal(true)} style={{ fontWeight: 700, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '10px 32px', fontSize: 17, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>게시판 입장</button>
      </div>
      <div>
        <Card sx={{
          maxWidth: 480,
          width: 'min(95vw, 480px)',
          minHeight: 340,
          mx: 'auto',
          my: 4,
          borderRadius: 6,
          border: '3px solid #a7d7c5',
          boxShadow: '0 2px 16px #a7d7c540',
          background: '#fff',
          position: 'relative',
          p: 0,
          overflow: 'visible',
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', width: '100%', p: 0 }}>
            <Box sx={{
              width: 140, minWidth: 120, maxWidth: 160, background: '#e3f2fd', borderRadius: '18px 0 0 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', py: 4, px: 2, boxShadow: '2px 0 12px #b2ebf220',
            }}>
              <img src={levelImages[student.level] || levelImages[0]} alt={LEVELS[student.level] || '사탕'} style={{ width: 115, height: 115, objectFit: 'contain', display: 'block', marginBottom: 16 }} />
              <span style={{ color: '#1976d2', fontWeight: 700, fontSize: 22, letterSpacing: '-1px', marginTop: 4 }}>{LEVELS[student.level] || LEVELS[0]}</span>
            </Box>
            <Box sx={{ flex: 1, p: '24px 18px 18px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180 }}>
              <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" sx={{ fontSize: '1.35rem', mb: 0.5 }}>{student.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'nowrap' }}>
                    <span style={{ color: '#1976d2', fontWeight: 600, fontSize: 16, whiteSpace: 'nowrap' }}>Lv.{student.level}</span>
                    <span style={{ fontSize: 13, color: '#bbb', margin: '0 4px' }}>|</span>
                    <span style={{ color: '#43a047', fontWeight: 600, fontSize: 16, whiteSpace: 'nowrap' }}>XP {student.exp}</span>
                    <>
                      <span style={{ fontSize: 13, color: '#bbb', margin: '0 4px' }}>|</span>
                      <span 
                        style={{ 
                          color: '#FF9800', 
                          fontWeight: 600, 
                          fontSize: 16, 
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          textDecorationStyle: 'dotted',
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => setShowTransactionModal(true)}
                        title="클릭하여 거래 내역 보기"
                      >
                        💰 {student.balance || 0}원
                      </span>
                    </>
                  </Box>
                </Box>
                {/* 이모티콘 선택 버튼 */}
                <IconButton 
                  onClick={() => setShowEmotionModal(true)}
                  sx={{ 
                    mt: 0.5,
                    border: '2px solid #ffe4ec',
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    '&:hover': { background: '#ffd6e0' }
                  }}
                >
                  {selectedEmotion ? (
                    <img src={selectedEmotion} alt="감정" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: 18 }}>😊</span>
                  )}
                </IconButton>
                <Badge badgeContent={unreadCount} color="error">
                  <IconButton color="primary" onClick={handleAlarmClick} sx={{ mt: 0.5 }}>
                    <NotificationsActiveIcon fontSize="medium" />
                  </IconButton>
                </Badge>
              </Box>
              {/* 이모티콘 선택 모달 */}
              {showEmotionModal && (
                <Modal
                  open={showEmotionModal}
                  onClose={() => setShowEmotionModal(false)}
                  aria-labelledby="emotion-modal-title"
                >
                  <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 400,
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    borderRadius: 3,
                    border: '3px solid #ffd6e0'
                  }}>
                    <Typography id="emotion-modal-title" variant="h6" component="h2" gutterBottom sx={{ textAlign: 'center', color: '#d72660', fontWeight: 700 }}>
                      기분을 선택해주세요 😊
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mt: 3 }}>
                      {EMOTION_ICONS.map((icon, idx) => (
                        <button
                          key={icon}
                          onClick={() => handleSelectEmotion(icon)}
                          style={{
                            border: selectedEmotion === icon ? '3px solid #d72660' : '2px solid #eee',
                            borderRadius: '50%',
                            padding: 8,
                            background: selectedEmotion === icon ? '#ffd6e0' : '#fff',
                            cursor: 'pointer',
                            width: 60,
                            height: 60,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: selectedEmotion === icon ? '0 4px 12px #ffd6e0a0' : '0 2px 6px #eee',
                            transition: 'all 0.2s',
                            transform: selectedEmotion === icon ? 'scale(1.1)' : 'scale(1)',
                          }}
                          onMouseOver={e => {
                            if (selectedEmotion !== icon) {
                              e.currentTarget.style.transform = 'scale(1.05)';
                              e.currentTarget.style.boxShadow = '0 4px 12px #d7d7d7';
                            }
                          }}
                          onMouseOut={e => {
                            if (selectedEmotion !== icon) {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = '0 2px 6px #eee';
                            }
                          }}
                        >
                          <img src={icon} alt={`감정${idx + 1}`} style={{ width: 36, height: 36, objectFit: 'contain' }} />
                        </button>
                      ))}
                    </Box>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => setShowEmotionModal(false)}
                      sx={{ 
                        mt: 3, 
                        backgroundColor: '#d72660', 
                        '&:hover': { backgroundColor: '#c2185b' },
                        borderRadius: 999,
                        fontWeight: 700
                      }}
                    >
                      닫기
                    </Button>
                  </Box>
                </Modal>
              )}
              <Box sx={{ width: '100%', mb: 1.5 }}>
                <div style={{ width: '100%', height: 16, background: '#e3f2fd', borderRadius: 10, position: 'relative', overflow: 'hidden', boxShadow: '0 1px 4px #b2ebf240' }}>
                  <div style={{ width: `${Math.min(100, Math.round((student.exp / getRequiredExp(student.level)) * 100))}%`, height: '100%', background: '#90caf9', borderRadius: 10, transition: 'width 0.4s' }} />
                  <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, color: '#1976d2', letterSpacing: '-0.5px' }}>
                    XP {student.exp} / {getRequiredExp(student.level)}
                  </div>
                </div>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip label={`오늘 발표: ${todayPresentations}`} color="info" size="small" />
                <Chip label={`누적 발표: ${totalPresentations}`} color="success" size="small" />
              </Box>
              {Array.isArray(student.quests) && student.quests.filter(q => q.status === 'ongoing').length > 0 && (
                <Box mb={2} textAlign="center">
                  {student.quests.filter(q => q.status === 'ongoing').map((quest, idx) => (
                    <div key={idx} style={{ 
                      background: '#fff8e1', 
                      borderRadius: 16, 
                      padding: '16px 20px', 
                      marginBottom: 12,
                      border: '2px solid #ffd54f',
                      boxShadow: '0 2px 8px #ffd54f40'
                    }}>
                      <div style={{ 
                        fontWeight: 700, 
                        color: '#ff9800', 
                        fontSize: 16,
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}>
                        <span role="img" aria-label="quest">🎯</span> 퀘스트
                      </div>
                      <div style={{ 
                        color: '#222', 
                        fontWeight: 600, 
                        fontSize: 15, 
                        marginBottom: 8,
                        lineHeight: 1.4
                      }}>
                        {quest.text}
                      </div>
                      <div style={{ 
                        color: '#1976d2', 
                        fontWeight: 600, 
                        fontSize: 15, 
                        marginBottom: 12
                      }}>
                        보상: <span style={{ color: '#43a047' }}>{quest.exp}xp</span>
                      </div>
                      {quest.requestPending ? (
                        <div style={{ 
                          color: '#1976d2', 
                          fontWeight: 600, 
                          fontSize: 14,
                          background: '#e3f2fd',
                          padding: '8px 16px',
                          borderRadius: 999,
                          display: 'inline-block'
                        }}>
                          승인 요청 대기 중...
                        </div>
                      ) : (
                        <Button
                          variant="contained"
                          sx={{ 
                            background: '#e0f7fa', 
                            color: '#1976d2', 
                            borderRadius: 999, 
                            fontWeight: 600, 
                            boxShadow: '0 2px 8px #b2ebf240',
                            '&:hover': { background: '#b2ebf2' },
                            padding: '8px 24px'
                          }}
                          onClick={async () => {
                            const newQuests = (student.quests || []).map(q => q.ts === quest.ts ? { ...q, requestPending: true } : q);
                            await updateDoc(doc(db, 'students', studentId), { quests: newQuests });
                          }}
                        >
                          퀘스트 승인 요청하기
                        </Button>
                      )}
                    </div>
                  ))}
                </Box>
              )}
              <Box mt={1.5}>
                <Button fullWidth sx={{ mb: 1, borderRadius: 999, fontWeight: 'bold', background: '#ffe4ec', border: '2px solid #ffb6b9', color: '#d72660', boxShadow: '0 2px 8px #f8bbd0a0', fontSize: 16, letterSpacing: '-0.5px', py: 1.2, '&:hover': { background: '#ffd6e0' } }} onClick={() => { console.log('메시지 버튼 클릭'); setShowMsgModal(true); }} startIcon={<EmojiEventsIcon />}>메시지 보내기</Button>
                <Button fullWidth sx={{ mb: 1, borderRadius: 999, fontWeight: 'bold', background: '#ffe4ec', border: '2px solid #ffb6b9', color: '#d72660', boxShadow: '0 2px 8px #f8bbd0a0', fontSize: 16, letterSpacing: '-0.5px', py: 1.2, '&:hover': { background: '#ffd6e0' } }} onClick={() => { console.log('친구 칭찬 버튼 클릭'); setShowPraiseModal(true); }} startIcon={<CelebrationIcon />}>친구 칭찬하기</Button>
                <Button fullWidth sx={{ borderRadius: 999, fontWeight: 'bold', background: '#ffe4ec', border: '2px solid #ffb6b9', color: '#d72660', boxShadow: '0 2px 8px #f8bbd0a0', fontSize: 16, letterSpacing: '-0.5px', py: 1.2, '&:hover': { background: '#ffd6e0' } }} onClick={() => { console.log('나 칭찬 버튼 클릭'); setShowSelfPraiseModal(true); }} startIcon={<CelebrationIcon />}>나 칭찬하기</Button>
              </Box>
            </Box>
          </Box>
        </Card>
      </div>
      {notices.length > 0 && (
        <div style={{ ...tickerStyle, top: 0, position: 'fixed', left: 0, width: '100vw', zIndex: 5000 }}>
          <span style={{ fontSize: 24, marginRight: 18 }} role="img" aria-label="siren">📣</span>
          <div style={tickerTextStyle}>
            {notices.map((n, i) => (
              <span key={n.id} style={{ marginRight: 48 }}>{n.content}</span>
            ))}
          </div>
          <style>{`@keyframes ticker { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100vw); } }`}</style>
        </div>
      )}
      {feverActive && <CandyRain />}
      {showFeverModal && <Modal
        open={showFeverModal}
        onClose={() => setShowFeverModal(false)}
        aria-labelledby="fever-modal-title"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 480,
          bgcolor: 'background.paper',
          boxShadow: '0 8px 48px rgba(255, 193, 7, 0.4)',
          p: 5,
          borderRadius: 4,
          border: '4px solid #FFD700',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #fff3e0 0%, #fff8e1 100%)'
        }}>
          <div style={{
            fontSize: 48,
            marginBottom: 16,
            animation: 'pulse 1.5s infinite'
          }}>
            🔥✨🎉
          </div>
          <Typography 
            id="fever-modal-title" 
            variant="h4" 
            component="h2" 
            gutterBottom
            sx={{ 
              fontWeight: 900, 
              color: '#FF6B35',
              fontSize: '2.2rem',
              letterSpacing: '-1px',
              textShadow: '2px 2px 4px rgba(255, 107, 53, 0.3)'
            }}
          >
            🔥 피버타임 시작! 🔥
          </Typography>
          <Typography 
            variant="h6" 
            paragraph
            sx={{ 
              color: '#E65100',
              fontWeight: 700,
              fontSize: '1.3rem',
              lineHeight: 1.5,
              mb: 3
            }}
          >
            경험치를 <span style={{ color: '#FF6B35', fontSize: '1.5rem' }}>2배</span>로 받을 수 있어요!<br/>
            지금이 발표할 기회입니다! 🚀
          </Typography>
          <Button
            variant="contained"
            fullWidth
            onClick={() => setShowFeverModal(false)}
            sx={{ 
              mt: 2,
              py: 2,
              fontSize: '1.2rem',
              fontWeight: 800,
              background: 'linear-gradient(45deg, #FF6B35 30%, #FFD700 90%)',
              boxShadow: '0 4px 16px rgba(255, 107, 53, 0.4)',
              borderRadius: 999,
              '&:hover': {
                background: 'linear-gradient(45deg, #E65100 30%, #FFC107 90%)',
              }
            }}
          >
            시작하기! 💪
          </Button>
          <style jsx>{`
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
          `}</style>
        </Box>
      </Modal>}
      {showMsgModal && (
        <div style={{ position: 'fixed', top: 60, left: 0, width: '100vw', height: 'calc(100vh - 60px)', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, paddingTop: 40 }}>
          <div style={{ background: '#fff', padding: '36px 32px 28px 32px', borderRadius: 24, minWidth: 340, maxWidth: 400, boxShadow: '0 4px 32px #b2ebf240', width: '90vw', marginTop: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '1.18rem', marginBottom: 18, color: '#1976d2', letterSpacing: '-0.5px', textAlign: 'center' }}>선생님께 메시지 보내기</div>
            <textarea value={messageText} onChange={e => setMessageText(e.target.value)} style={{ width: '100%', minHeight: 80, borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 10, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box' }} placeholder="메시지 내용을 입력하세요" />
            <div style={{ marginTop: 0, textAlign: 'right', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowMsgModal(false); setMessageText(''); }} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
              <button onClick={handleSendMessage} disabled={!messageText.trim()} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', opacity: messageText.trim() ? 1 : 0.5, cursor: messageText.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>보내기</button>
            </div>
          </div>
        </div>
      )}
      {showPraiseModal && (
        <div style={{ position: 'fixed', top: 60, left: 0, width: '100vw', height: 'calc(100vh - 60px)', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, paddingTop: 40 }}>
          <div style={{ background: '#fff', padding: '36px 32px 28px 32px', borderRadius: 24, minWidth: 340, maxWidth: 400, boxShadow: '0 4px 32px #b2ebf240', width: '90vw', marginTop: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '1.18rem', marginBottom: 18, color: '#1976d2', letterSpacing: '-0.5px', textAlign: 'center' }}>친구 칭찬하기</div>
            <input value={praiseText} onChange={e => setPraiseText(e.target.value)} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 10, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box' }} placeholder="칭찬 내용을 입력하세요" />
            <input type="number" value={praiseExp} onChange={e => setPraiseExp(Number(e.target.value))} min={1} max={100} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 14, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box' }} placeholder="희망 경험치" />
            {/* 친구 선택 UI 추가 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: '#1976d2' }}>칭찬할 친구 선택</div>
              {studentsSnapshot && studentsSnapshot.docs.map(doc => {
                const friend = doc.data();
                const friendId = friend.id ? friend.id : doc.id;
                if (friendId === studentId) return null; // 자기 자신 제외
                return (
                  <FormControlLabel
                    key={friendId}
                    control={
                      <Checkbox
                        checked={selectedFriends.includes(friendId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFriends([...selectedFriends, friendId]);
                          } else {
                            setSelectedFriends(selectedFriends.filter(id => id !== friendId));
                          }
                        }}
                      />
                    }
                    label={friend.name}
                  />
                );
              })}
            </div>
            <div style={{ marginTop: 0, textAlign: 'right', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPraiseModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
              <button onClick={handleSendPraise} disabled={!praiseText || selectedFriends.length === 0} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', opacity: praiseText && selectedFriends.length ? 1 : 0.5, cursor: praiseText && selectedFriends.length ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>보내기</button>
            </div>
          </div>
        </div>
      )}
      {showSelfPraiseModal && (
        <div style={{ position: 'fixed', top: 60, left: 0, width: '100vw', height: 'calc(100vh - 60px)', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, paddingTop: 40 }}>
          <div style={{ background: '#fff', padding: '36px 32px 28px 32px', borderRadius: 24, minWidth: 340, maxWidth: 400, boxShadow: '0 4px 32px #b2ebf240', width: '90vw', marginTop: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '1.18rem', marginBottom: 18, color: '#1976d2', letterSpacing: '-0.5px', textAlign: 'center' }}>나 칭찬하기</div>
            <input value={selfPraiseText} onChange={e => setSelfPraiseText(e.target.value)} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 10, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box' }} placeholder="칭찬 내용을 입력하세요" />
            <input type="number" value={selfPraiseExp} onChange={e => setSelfPraiseExp(Number(e.target.value))} min={1} max={100} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 14, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box' }} placeholder="희망 경험치" />
            <div style={{ marginTop: 0, textAlign: 'right', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSelfPraiseModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
              <button onClick={handleSendSelfPraise} disabled={!selfPraiseText} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', opacity: selfPraiseText ? 1 : 0.5, cursor: selfPraiseText ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>보내기</button>
            </div>
          </div>
        </div>
      )}
      {/* 유리병 모달 */}
      {showJarModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 48, minWidth: 340, boxShadow: '0 4px 32px #b2ebf240', maxWidth: '90vw', position: 'relative', border: '6px solid #b2ebf2' }}>
            <div style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: 18, color: '#1976d2', letterSpacing: '-0.5px', textAlign: 'center' }}>학급 캔디 유리병</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12 }}>
              {/* 사탕 그리드형 배치 */}
              {(() => {
                const allCandies = [];
                candyCounts.forEach((count, idx) => {
                  for (let i = 0; i < count; i++) {
                    allCandies.push({ img: candyImages[idx], idx });
                  }
                });
                const perRow = 10;
                const numRows = Math.ceil(allCandies.length / perRow);
                return (
                  <div style={{ width: 320, height: 380, marginBottom: 8, display: 'flex', flexDirection: 'column-reverse', justifyContent: 'flex-start', alignItems: 'center', gap: 4 }}>
                    {Array.from({ length: numRows }).map((_, rowIdx) => (
                      <div key={rowIdx} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 4, minHeight: 36 }}>
                        {Array.from({ length: perRow }).map((_, colIdx) => {
                          const candy = allCandies[rowIdx * perRow + colIdx];
                          return candy ? (
                            <img key={colIdx} src={candy.img} alt={`candy${candy.idx+1}`} style={{ width: 32, height: 32, filter: 'drop-shadow(0 2px 6px #b2ebf2a0)' }} />
                          ) : <div key={colIdx} style={{ width: 32, height: 32 }} />;
                        })}
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                {candyCounts.map((count, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: '#1976d2', fontSize: 15 }}>
                    <img src={candyImages[idx]} alt={`candy${idx+1}`} style={{ width: 22, height: 22, marginRight: 2 }} />
                    x{count}
                  </div>
                ))}
              </div>
              <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>학생들이 레벨업할 때마다 사탕이 유리병에 쌓여요!</div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 18 }}>
              <button onClick={() => setShowJarModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>닫기</button>
            </div>
          </div>
        </div>
      )}
      {/* 게시판 입장 모달 */}
      {showBoardModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 20, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 18, color: '#1976d2' }}>게시판 코드 입력</div>
            <input value={boardCodeInput} onChange={e => setBoardCodeInput(e.target.value)} maxLength={8} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 18, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', textAlign: 'center', letterSpacing: 2, fontWeight: 600 }} placeholder="코드를 입력하세요" />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              <button onClick={() => setShowBoardModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
              <button onClick={handleEnterBoard} disabled={!boardCodeInput.trim()} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', opacity: boardCodeInput.trim() ? 1 : 0.5, cursor: boardCodeInput.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>입장</button>
            </div>
          </div>
        </div>
      )}
      {/* 캔디숍 모달 */}
      {showShopModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div style={{ background: '#fff', padding: 40, borderRadius: 32, minWidth: 420, maxWidth: 520, boxShadow: '0 8px 48px #b2ebf240', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setShowShopModal(false)} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#bbb', cursor: 'pointer', fontWeight: 700 }}>×</button>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 18 }}>
              <button onClick={() => setShopTab('deposit')} style={{ fontWeight: 700, fontSize: 18, color: shopTab==='deposit' ? '#d72660' : '#888', background: 'none', border: 'none', borderBottom: shopTab==='deposit' ? '3px solid #d72660' : '3px solid #eee', padding: '8px 24px', cursor: 'pointer', transition: 'all 0.2s' }}>입금</button>
              <button onClick={() => setShopTab('buy')} style={{ fontWeight: 700, fontSize: 18, color: shopTab==='buy' ? '#d72660' : '#888', background: 'none', border: 'none', borderBottom: shopTab==='buy' ? '3px solid #d72660' : '3px solid #eee', padding: '8px 24px', cursor: 'pointer', transition: 'all 0.2s' }}>구입</button>
            </div>
            {/* 내 잔액 표시 */}
            <div style={{ fontWeight: 800, fontSize: 22, color: '#1976d2', marginBottom: 18, letterSpacing: '-1px' }}>
              내 잔액: {student?.balance ?? 0}원
            </div>
            {shopTab === 'deposit' && (
              <div style={{ minHeight: 180, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 20, color: '#1976d2', marginBottom: 18 }}>입금</div>
                <input type="text" value={depositReason} onChange={e => setDepositReason(e.target.value)} placeholder="입금 사유" style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 12, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', textAlign: 'center', fontWeight: 600 }} />
                <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="금액" style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 8, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', textAlign: 'center', fontWeight: 600 }} />
                {depositError && <div style={{ color: '#d72660', fontWeight: 700, marginTop: 4 }}>{depositError}</div>}
                <button onClick={async () => {
                  if (!depositReason.trim()) {
                    setDepositError('입금 사유를 입력하세요.');
                    return;
                  }
                  if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) return;
                  await updateDoc(doc(db, 'students', studentId), {
                    balance: (student.balance || 0) + Number(depositAmount),
                    transactions: arrayUnion({
                      type: 'deposit',
                      reason: depositReason,
                      amount: Number(depositAmount),
                      ts: Date.now()
                    })
                  });
                  setDepositSuccess(true);
                  setTimeout(() => setDepositSuccess(false), 1200);
                  setDepositReason('');
                  setDepositAmount('');
                  setDepositError('');
                }} disabled={!depositReason.trim() || !depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '10px 32px', fontSize: 17, boxShadow: '0 2px 8px #b2ebf240', cursor: (!depositReason.trim() || !depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) ? 'not-allowed' : 'pointer', opacity: (!depositReason.trim() || !depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) ? 0.5 : 1, marginTop: 8 }}>입금 완료</button>
                {depositSuccess && <div style={{ color: '#43a047', fontWeight: 700, marginTop: 16 }}>입금이 완료되었습니다!</div>}
              </div>
            )}
            {shopTab === 'buy' && (
              <div style={{ minHeight: 180, maxHeight: 540, padding: 0, display: 'flex', flexDirection: 'column', height: '60vh', minWidth: 320 }}>
                <div style={{ fontWeight: 700, fontSize: 20, color: '#1976d2', margin: '18px 0 12px 0', textAlign: 'center' }}>상품 구입</div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px', marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'center' }}>
                  {itemsSnapshot && itemsSnapshot.docs.map(doc => {
                    const item = doc.data();
                    const qty = buyQuantities[item.name] || 0;
                    const canBuy = (student?.balance ?? 0) >= item.price;
                    return (
                      <div key={item.name} style={{
                        border: `2px solid ${canBuy ? '#90caf9' : '#ffb6b9'}`,
                        borderRadius: 18,
                        background: canBuy ? '#f7faf7' : '#fff0f0',
                        minWidth: 120,
                        maxWidth: 150,
                        padding: 18,
                        textAlign: 'center',
                        boxShadow: canBuy ? '0 2px 8px #b2ebf240' : '0 2px 8px #ffb6b930',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 18, color: canBuy ? '#1976d2' : '#d72660', marginBottom: 6 }}>{item.name}</div>
                        <div style={{ color: canBuy ? '#43a047' : '#d72660', fontWeight: 600, fontSize: 16, marginBottom: 10 }}>{item.price}원</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <button onClick={() => setBuyQuantities(q => ({ ...q, [item.name]: Math.max(0, (q[item.name]||0)-1) }))} style={{ borderRadius: 999, background: canBuy ? '#e0f7fa' : '#ffe4ec', color: canBuy ? '#1976d2' : '#d72660', border: 'none', width: 28, height: 28, fontWeight: 700, fontSize: 18, cursor: 'pointer' }}>-</button>
                          <span style={{ fontWeight: 700, fontSize: 17, minWidth: 18, display: 'inline-block', textAlign: 'center' }}>{qty}</span>
                          <button onClick={() => setBuyQuantities(q => ({ ...q, [item.name]: (q[item.name]||0)+1 }))} style={{ borderRadius: 999, background: canBuy ? '#e0f7fa' : '#ffe4ec', color: canBuy ? '#1976d2' : '#d72660', border: 'none', width: 28, height: 28, fontWeight: 700, fontSize: 18, cursor: 'pointer' }}>+</button>
                        </div>
                        <div style={{ color: canBuy ? '#888' : '#d72660', fontSize: 14, marginBottom: 8 }}>합계: {item.price * qty}원</div>
                      </div>
                    );
                  })}
                  {/* 직접입력 카드 */}
                  <div style={{ border: '2px solid #ffe4ec', borderRadius: 18, background: '#fffde7', minWidth: 120, maxWidth: 150, padding: 18, textAlign: 'center', boxShadow: '0 2px 8px #f8bbd0a0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140 }}>
                    <div style={{ fontWeight: 700, fontSize: 18, color: '#d72660', marginBottom: 10 }}>직접 입력</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1 }}>
                      <input type="number" value={buyCustomAmount} onChange={e => setBuyCustomAmount(e.target.value)} placeholder="금액" style={{ width: 60, borderRadius: 10, border: '1.5px solid #e0f7fa', padding: '6px 10px', fontSize: 15, background: '#fff', color: '#222', textAlign: 'center', fontWeight: 600 }} />
                      <span style={{ color: '#888', fontSize: 15, fontWeight: 600 }}>원</span>
                    </div>
                  </div>
                </div>
                {/* 총합/구입 버튼 - 하단 고정 */}
                <div style={{ position: 'sticky', bottom: 0, left: 0, right: 0, background: '#fff', padding: '18px 0 10px 0', borderTop: '1.5px solid #e0f7fa', zIndex: 10, boxShadow: '0 -2px 8px #b2ebf220', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, color: '#1976d2', fontSize: 17, marginBottom: 6 }}>
                    총합: {
                      (() => {
                        let sum = 0;
                        if (itemsSnapshot) itemsSnapshot.docs.forEach(doc => {
                          const item = doc.data();
                          sum += (buyQuantities[item.name]||0) * item.price;
                        });
                        sum += Number(buyCustomAmount)||0;
                        return sum;
                      })()
                    } 원
                  </div>
                  <button onClick={async () => {
                    let sum = 0;
                    let itemsObj = {};
                    if (itemsSnapshot) itemsSnapshot.docs.forEach(doc => {
                      const item = doc.data();
                      const qty = buyQuantities[item.name]||0;
                      sum += qty * item.price;
                      if (qty > 0) itemsObj[item.name] = qty;
                    });
                    const custom = Number(buyCustomAmount)||0;
                    sum += custom;
                    if (sum <= 0) {
                      setBuyError('구입할 상품을 선택하세요.');
                      setBuySuccess('');
                      return;
                    }
                    if ((student.balance||0) < sum) {
                      setBuyError('잔액이 부족합니다.');
                      setBuySuccess('');
                      return;
                    }
                    await updateDoc(doc(db, 'students', studentId), {
                      balance: (student.balance||0) - sum,
                      transactions: arrayUnion({
                        type: 'spend',
                        items: itemsObj,
                        customAmount: custom,
                        amount: sum,
                        ts: Date.now()
                      })
                    });
                    setBuyError('');
                    setBuySuccess('구입이 완료되었습니다!');
                    setBuyQuantities({});
                    setBuyCustomAmount('');
                    setTimeout(() => setBuySuccess(''), 1500);
                  }} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '10px 32px', fontSize: 17, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', marginTop: 4 }}>구입</button>
                  {buyError && <div style={{ color: '#d72660', fontWeight: 700, marginTop: 10 }}>{buyError}</div>}
                  {buySuccess && <div style={{ color: '#43a047', fontWeight: 700, marginTop: 10 }}>{buySuccess}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 알림 모달 */}
      {showNotificationModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6000 }}>
          <div style={{ background: '#fff', borderRadius: 32, padding: 36, minWidth: 340, maxWidth: 420, boxShadow: '0 12px 64px #1976d220', textAlign: 'center', opacity: 0.99, border: '4px solid #1976d2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 28, color: '#1976d2', marginBottom: 18, fontWeight: 900, letterSpacing: '-1.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span role="img" aria-label="bell">🔔</span> 알림함
            </div>
            {/* 탭 UI */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['메시지', '퀘스트 승인여부', '알람'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setNotificationTab(tab)}
                  style={{
                    fontWeight: notificationTab === tab ? 700 : 500,
                    borderRadius: 999,
                    background: notificationTab === tab ? '#e0f7fa' : '#f7faf7',
                    color: '#1976d2',
                    border: 'none',
                    padding: '7px 22px',
                    fontSize: 15,
                    boxShadow: '0 2px 8px #b2ebf240',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* 알림 리스트 필터링 */}
            <div style={{ maxHeight: 320, overflowY: 'auto', width: '100%' }}>
              {(() => {
                if (notificationTab === '메시지') {
                  // 오직 선생님이 보낸 일반 메시지만 (퀘스트/칭찬 등 시스템 메시지 제외)
                  const messageList = (student?.messages||[])
                    .filter(m => m.from === 'teacher' && !m.text?.startsWith('퀘스트 실패') && !m.text?.startsWith('퀘스트 성공'))
                    .sort((a, b) => b.ts - a.ts);
                  if (messageList.length === 0) return <div style={{ color: '#888', fontSize: 16, margin: '32px 0' }}>새로운 메시지가 없습니다.</div>;
                  return messageList.map((m, i) => (
                    <div key={i} style={{ background: '#fffde7', borderRadius: 12, padding: '10px 14px', marginBottom: 8, color: '#ff9800', fontWeight: 600, textAlign: 'left', fontSize: 15 }}>{m.text}</div>
                  ));
                } else if (notificationTab === '퀘스트 승인여부') {
                  // 다양한 성공/실패 status를 모두 포함
                  const questList = (student?.quests||[])
                    .filter(q => ['success','done','fail','failed','rejected','reject'].includes((q.status||'').toLowerCase()))
                    .sort((a, b) => b.ts - a.ts);
                  if (questList.length === 0) return <div style={{ color: '#888', fontSize: 16, margin: '32px 0' }}>완료된 퀘스트 내역이 없습니다.</div>;
                  return questList.map((q, i) => {
                    const isSuccess = ['success','done'].includes((q.status||'').toLowerCase());
                    const isFail = ['fail','failed','rejected','reject'].includes((q.status||'').toLowerCase());
                    return (
                      <div key={i} style={{ background: isSuccess ? '#e0f7fa' : '#ffe4ec', borderRadius: 12, padding: '10px 14px', marginBottom: 8, color: isSuccess ? '#1976d2' : '#d72660', fontWeight: 600, textAlign: 'left', fontSize: 15 }}>
                        {isSuccess ? (
                          <>퀘스트 성공! <span style={{ color: '#43a047', fontWeight: 700 }}>+{q.exp}xp</span></>
                        ) : (
                          <>퀘스트 실패: <span style={{ color: '#d72660', fontWeight: 700 }}>{q.failReason || q.reason || '사유 미입력'}</span></>
                        )}
                      </div>
                    );
                  });
                } else if (notificationTab === '알람') {
                  // announce, notifications, 친구 칭찬(praise), 칭찬 경험치(expEvents) 모두 합침
                  const praiseAlarms = (student?.praise||[])
                    .filter(p => p.checked && p.result === 'approved' && p.from && p.fromName)
                    .map(p => ({
                      ts: p.ts,
                      text: `💖 ${p.fromName}님이 나를 칭찬했어요! (${p.text || '칭찬'}) +${p.exp||p.amount||0}xp 💖`
                    }));
                  const expEventsPraise = (student?.expEvents||[])
                    .filter(e => e.type === 'friendPraise' && e.from && e.result === 'approved')
                    .map(e => ({
                      ts: e.ts,
                      text: `💖 ${e.fromName||e.from||'친구'}님이 나를 칭찬했어요! (${e.text||'칭찬'}) +${e.exp||e.amount||0}xp 💖`
                    }));
                  const alarms = [
                    ...(student?.announce||[]),
                    ...(student?.notifications||[]),
                    ...praiseAlarms,
                    ...expEventsPraise
                  ].sort((a, b) => (b.ts||0) - (a.ts||0));
                  if (!alarms || alarms.length === 0) return <div style={{ color: '#888', fontSize: 16, margin: '32px 0' }}>알람 내역이 없습니다.</div>;
                  return alarms.map((a, i) => (
                    <div key={i} style={{ background: '#e3f2fd', borderRadius: 12, padding: '10px 14px', marginBottom: 8, color: '#1976d2', fontWeight: 600, textAlign: 'left', fontSize: 15 }}>{a.text || a.message}</div>
                  ));
                }
                return null;
              })()}
            </div>
            <button onClick={() => setShowNotificationModal(false)} style={{ fontWeight: 700, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '10px 32px', fontSize: 17, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', marginTop: 18 }}>닫기</button>
          </div>
        </div>
      )}
      {/* 카드 선택 모달 */}
      {showCardModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: '#fff', borderRadius: 32, padding: 44, minWidth: 340, maxWidth: 480, boxShadow: '0 12px 64px #f57f1720', textAlign: 'center', border: '4px solid #FFD700', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 26, color: '#FFD700', marginBottom: 18, fontWeight: 900, letterSpacing: '-1.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              카드를 선택하세요!
            </div>
            {!cardResult ? (
              <>
                <div style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {cardChoices.map((card, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectedCardIndex === null && handleCardSelect(card, idx)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        background: '#f7faf7',
                        borderRadius: 16,
                        padding: '16px 12px',
                        cursor: selectedCardIndex === null ? 'pointer' : 'default',
                        boxShadow: '0 4px 12px #b2ebf240',
                        transition: 'transform 0.3s, box-shadow 0.3s, opacity 0.3s',
                        border: selectedCardIndex === idx ? '3px solid #FFD700' : '2px solid #e0e0e0',
                        minWidth: 100,
                        maxWidth: 120,
                        opacity: selectedCardIndex !== null && selectedCardIndex !== idx ? 0.3 : 1,
                        transform: selectedCardIndex === idx ? 'scale(1.1)' : 'scale(1)'
                      }}
                      onMouseOver={e => {
                        if (selectedCardIndex === null) {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 8px 24px #b2ebf260';
                          e.currentTarget.style.borderColor = '#FFD700';
                        }
                      }}
                      onMouseOut={e => {
                        if (selectedCardIndex === null) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px #b2ebf240';
                          e.currentTarget.style.borderColor = '#e0e0e0';
                        }
                      }}
                    >
                      {selectedCardIndex === idx && cardResult ? (
                        // 선택된 카드: 실제 이미지와 라벨 표시
                        <>
                          <img src={card.img} alt={card.label} style={{ width: 48, height: 48, marginBottom: 8 }} />
                          <span style={{ fontWeight: 700, color: '#FFD700', fontSize: 14, textAlign: 'center', lineHeight: '1.2' }}>
                            {card.label}
                          </span>
                        </>
                      ) : (
                        // 선택되지 않았거나 아직 공개되지 않은 카드: 카드백 이미지
                        <>
                          <img src={CARD_BACK_IMAGE} alt="카드 뒷면" style={{ width: 48, height: 48, marginBottom: 8 }} />
                          <span style={{ fontWeight: 700, color: '#888', fontSize: 14, textAlign: 'center', lineHeight: '1.2' }}>
                            ???
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ color: '#888', fontSize: 14, marginBottom: 18 }}>
                  원하는 카드를 클릭해서 쿠폰을 받으세요!
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 20, color: '#43a047', fontWeight: 700, marginBottom: 16 }}>
                  🎉 카드 선택 완료! 🎉
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#e8f5e8', borderRadius: 16, padding: 24, border: '2px solid #43a047' }}>
                  <img src={cardResult.img} alt={cardResult.label} style={{ width: 64, height: 64, marginBottom: 12 }} />
                  <span style={{ fontWeight: 700, color: '#43a047', fontSize: 18 }}>
                    {cardResult.label}
                  </span>
                  <div style={{ color: '#43a047', fontSize: 14, marginTop: 8 }}>
                    쿠폰함에 추가되었습니다!
                  </div>
                </div>
              </div>
            )}
            {!cardResult && (
              <button onClick={handleCloseCardModal} style={{ fontWeight: 700, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '10px 32px', fontSize: 17, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer' }}>
                나중에
              </button>
            )}
          </div>
        </div>
      )}
      {/* 쿠폰함 모달 */}
      {couponBoxOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000 }}>
          <div style={{ background: '#fff', borderRadius: 32, padding: 44, minWidth: 340, maxWidth: 480, boxShadow: '0 12px 64px #f57f1720', textAlign: 'center', opacity: 0.99, border: '4px solid #d72660', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 26, color: '#d72660', marginBottom: 18, fontWeight: 900, letterSpacing: '-1.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span role="img" aria-label="coupon">🎟️</span> 내 쿠폰함
            </div>
            {/* 탭 UI */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
              <button onClick={() => setCouponTab('unused')} style={{ fontWeight: couponTab === 'unused' ? 700 : 500, borderRadius: 999, background: couponTab === 'unused' ? '#e0f7fa' : '#f7faf7', color: '#1976d2', border: 'none', padding: '7px 22px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>사용 전</button>
              <button onClick={() => setCouponTab('used')} style={{ fontWeight: couponTab === 'used' ? 700 : 500, borderRadius: 999, background: couponTab === 'used' ? '#e0f7fa' : '#f7faf7', color: '#1976d2', border: 'none', padding: '7px 22px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>사용완료</button>
            </div>
            {/* 쿠폰 리스트 */}
            {coupons.filter(c => couponTab === 'unused' ? !c.used : c.used).length === 0 ? (
              <div style={{ color: '#888', fontSize: 16, margin: '32px 0' }}>해당 쿠폰이 없습니다.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxHeight: 320, overflowY: 'auto' }}>
                {coupons.filter(c => couponTab === 'unused' ? !c.used : c.used).sort((a, b) => (b.ts || 0) - (a.ts || 0)).map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#f7faf7', borderRadius: 12, padding: '10px 18px', boxShadow: '0 2px 8px #b2ebf240', justifyContent: 'space-between' }}>
                    <img src={c.img} alt={c.label} style={{ width: 38, height: 38 }} />
                    <div style={{ flex: 1, textAlign: 'left', fontWeight: 700, color: '#1976d2', fontSize: 16 }}>{c.label}</div>
                    <span style={{ fontWeight: 700, borderRadius: 999, padding: '6px 18px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', background: c.used ? '#eee' : '#e0f7fa', color: c.used ? '#888' : '#1976d2', border: 'none', display: 'inline-block' }}>{c.used ? '사용완료' : '미사용'}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setCouponBoxOpen(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', marginTop: 24 }}>닫기</button>
          </div>
        </div>
      )}
      {/* 우측 하단: 링크 히스토리 & 업데이트 정보 & 감정출석부 버튼 */}
      <div style={{ position: 'fixed', right: 32, bottom: 32, zIndex: 3000, display: 'flex', gap: 18 }}>


        {/* 감정출석부 버튼 - 제출 전까지 무지개색 테두리로 강조 */}
        {student && !hasSubmittedToday && (
          <button
            onClick={() => setShowEmotionAttendanceModal(true)}
            style={{
              border: '3px solid transparent',
              background: hasSubmittedToday 
                ? '#fff' 
                : 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080) border-box',
              color: '#3b5998',
              borderRadius: 999,
              padding: '12px 32px',
              fontWeight: 700,
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: hasSubmittedToday 
                ? '0 2px 12px #b2ebf240' 
                : '0 4px 20px rgba(255, 107, 53, 0.4), 0 0 20px rgba(255, 107, 53, 0.3)',
              cursor: 'pointer',
              letterSpacing: '-0.5px',
              transition: 'all 0.3s ease',
              animation: hasSubmittedToday ? 'none' : 'pulse 2s infinite',
            }}
            onMouseOver={e => {
              if (!hasSubmittedToday) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 25px rgba(255, 107, 53, 0.5), 0 0 25px rgba(255, 107, 53, 0.4)';
              }
            }}
            onMouseOut={e => {
              if (!hasSubmittedToday) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 107, 53, 0.4), 0 0 20px rgba(255, 107, 53, 0.3)';
              }
            }}
          >
            <span style={{ fontSize: '22px' }}>🌈</span>
            <span style={{ fontWeight: 700, fontSize: 17, color: '#3b5998' }}>감정출석부</span>
          </button>
        )}




        
        <button
          onClick={() => setShowLinkHistoryModal(true)}
          style={{
            border: '2.5px solid #1976d2',
            background: '#fff',
            color: '#1976d2',
            borderRadius: 999,
            padding: '12px 32px',
            fontWeight: 700,
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 2px 12px #b2ebf240',
            cursor: 'pointer',
            letterSpacing: '-0.5px',
            transition: 'background 0.18s, color 0.18s',
          }}
          onMouseOver={e => e.currentTarget.style.background = '#e3f2fd'}
          onMouseOut={e => e.currentTarget.style.background = '#fff'}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 1 7 7l-1.5 1.5a5 5 0 0 1-7-7"/><path d="M14 11a5 5 0 0 0-7-7L5.5 5.5a5 5 0 0 0 7 7"/></svg>
          <span style={{ fontWeight: 700, fontSize: 17, color: '#1976d2' }}>캔디 링크</span>
        </button>
        <button
          onClick={() => setShowUpdateInfoModal(true)}
          style={{
            border: '2.5px solid #1976d2',
            background: '#fff',
            color: '#1976d2',
            borderRadius: 999,
            padding: '12px 32px',
            fontWeight: 700,
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 2px 12px #b2ebf240',
            cursor: 'pointer',
            letterSpacing: '-0.5px',
            transition: 'background 0.18s, color 0.18s',
          }}
          onMouseOver={e => e.currentTarget.style.background = '#e3f2fd'}
          onMouseOut={e => e.currentTarget.style.background = '#fff'}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span style={{ fontWeight: 700, fontSize: 17, color: '#1976d2' }}>업데이트 정보</span>
        </button>
      </div>
      {/* 캔디 링크(구 링크 히스토리) 모달 */}
      {showLinkHistoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }}>
          <div style={{ background: '#fff', borderRadius: 28, padding: 36, minWidth: 340, maxWidth: 420, boxShadow: '0 12px 64px #1976d220', textAlign: 'center', border: '4px solid #1976d2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 24, color: '#1976d2', marginBottom: 18, fontWeight: 900, letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span role="img" aria-label="link">🔗</span> <span>캔디 링크</span>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', width: '100%', marginBottom: 18 }}>
              {Array.isArray(student?.links) && student.links.length > 0 ? (
                student.links.slice().sort((a, b) => (b.ts||0)-(a.ts||0)).map((link, i) => (
                  <div key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16, 
                    marginBottom: 12, 
                    background: '#f7faf7', 
                    borderRadius: 12, 
                    padding: '16px 20px', 
                    boxShadow: '0 4px 12px #b2ebf240',
                    border: '2px solid #e0f7fa'
                  }}>
                    {/* 제목 */}
                    <div style={{ 
                      color: '#1976d2', 
                      fontWeight: 700, 
                      fontSize: 16, 
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                      flex: 1
                    }}>
                      {link.title || link.label || '링크'}
                    </div>
                    {/* 이동 버튼 */}
                    <button 
                      onClick={() => {
                        handleLinkVisit(link);
                        window.open(link.url, '_blank');
                      }} 
                      style={{ 
                        background: '#e0f7fa', 
                        color: '#1976d2', 
                        border: '2px solid #b2ebf2',
                        borderRadius: 999, 
                        padding: '10px 24px', 
                        fontWeight: 700, 
                        fontSize: 14, 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 6px #b2ebf240',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.background = '#b2ebf2';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = '#e0f7fa';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      이동
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ color: '#888', fontSize: 16, margin: '32px 0' }}>등록된 링크가 없습니다.</div>
              )}
            </div>
            <button onClick={() => setShowLinkHistoryModal(false)} style={{ fontWeight: 700, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '10px 32px', fontSize: 17, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', marginTop: 8 }}>닫기</button>
          </div>
        </div>
      )}
      {/* 업데이트 정보 모달 */}
      {showUpdateInfoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }}>
          <div style={{ background: '#fff', borderRadius: 28, padding: 36, minWidth: 340, maxWidth: 420, boxShadow: '0 12px 64px #1976d220', textAlign: 'center', border: '4px solid #1976d2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 24, color: '#1976d2', marginBottom: 18, fontWeight: 900, letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span role="img" aria-label="info">ℹ️</span> 업데이트 정보
            </div>
            <div style={{ color: '#1976d2', fontWeight: 700, fontSize: 16, marginBottom: 10 }}>JAMMANBO CANDY SHOP</div>
            <div style={{ color: '#888', fontSize: 15, marginBottom: 18 }}>
              버전: 2024.06<br/>
              최근 주요 변경사항:<br/>
              - 학생 알림함/모달/쿠폰함/캔디숍 UI 완전 복구<br/>
              - 칭찬 알림, 경험치, 퀘스트 등 실시간 연동<br/>
              - 상단/하단 주요 버튼 및 기능 복원<br/>
              - Firestore 권한/에러 처리 개선<br/>
              - 기타 UI/UX 개선<br/>
            </div>
            <button onClick={() => setShowUpdateInfoModal(false)} style={{ fontWeight: 700, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '10px 32px', fontSize: 17, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', marginTop: 8 }}>닫기</button>
          </div>
        </div>
      )}
      {/* 예약 알람 모달 */}
      {activeAlarm && showAlarmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 32, padding: 44, minWidth: 340, maxWidth: 480, boxShadow: '0 12px 64px #ff570020', textAlign: 'center', border: '4px solid #ff5700', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 26, color: '#ff5700', marginBottom: 18, fontWeight: 900, letterSpacing: '-1.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span role="img" aria-label="alarm">⏰</span> 예약 알람
            </div>
            <div style={{ color: '#ff5700', fontWeight: 700, fontSize: 18, marginBottom: 24, lineHeight: 1.4 }}>
              {activeAlarm.content}
            </div>
            <button 
              onClick={async () => { 
                console.log('예약 알림 확인 버튼 클릭:', activeAlarm.id);
                stopAutoCloseTimer(); // 자동 닫힘 타이머 중단
                setShowAlarmModal(false); 
                await markAlarmAsSeen(activeAlarm.id); 
                if (activeAlarm.ts) {
                  markStudentAlarmAsSeen(activeAlarm.ts); 
                }
                setActiveAlarm(null);
                setCurrentDisplayedAlarmId(null);
                currentDisplayedAlarmIdRef.current = null; // ref도 함께 초기화
              }} 
              style={{ 
                fontWeight: 700, 
                borderRadius: 999, 
                background: '#ffe4ec', 
                color: '#d72660', 
                border: 'none', 
                padding: '12px 32px', 
                fontSize: 17, 
                boxShadow: '0 4px 16px #ff570020', 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = '#ffd6e0';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = '#ffe4ec';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 단소급수미션 모달 */}
      {showRecorderModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
          <div style={{ background: '#fff', padding: '32px 28px 24px 28px', borderRadius: 28, minWidth: 600, maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 4px 32px #b2ebf240' }}>
            <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 18, color: '#7b1fa2', letterSpacing: '-0.5px', textAlign: 'center' }}>🎵 단소급수미션</div>
            
            {/* 탭 메뉴 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button 
                onClick={() => setRecorderTab('progress')} 
                style={{ 
                  fontWeight: recorderTab === 'progress' ? 700 : 500, 
                  borderRadius: 999, 
                  background: recorderTab === 'progress' ? '#f3e5f5' : '#f7faf7', 
                  color: '#7b1fa2', 
                  border: 'none', 
                  padding: '7px 14px', 
                  fontSize: 14, 
                  boxShadow: '0 2px 8px #b2ebf240', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s' 
                }}
              >진행도</button>
              {RECORDER_STEPS.map(step => (
                <button 
                  key={step}
                  onClick={() => setRecorderTab(step)} 
                  style={{ 
                    fontWeight: recorderTab === step ? 700 : 500, 
                    borderRadius: 999, 
                    background: recorderTab === step ? '#f3e5f5' : '#f7faf7', 
                    color: '#7b1fa2', 
                    border: 'none', 
                    padding: '7px 14px', 
                    fontSize: 14, 
                    boxShadow: '0 2px 8px #b2ebf240', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s' 
                  }}
                >{RECORDER_STEP_NAMES[step]}</button>
              ))}
            </div>

            {/* 진행도 탭 */}
            {recorderTab === 'progress' && (
              <div style={{ minHeight: 300 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#7b1fa2', marginBottom: 16, textAlign: 'center' }}>내 진행 현황</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f7faf7', borderRadius: 16, overflow: 'hidden', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: '#f3e5f5', color: '#7b1fa2', fontWeight: 700 }}>
                        {RECORDER_STEPS.map(step => (
                          <th key={step} style={{ padding: '12px 6px', fontSize: 12, minWidth: 60 }}>{RECORDER_STEP_NAMES[step]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f3e5f5' }}>
                        {RECORDER_STEPS.map(step => (
                          <td key={step} style={{ padding: '12px 6px', textAlign: 'center' }}>
                            <span style={{
                              fontWeight: '900',
                              fontSize: '18px',
                              color: recorderMissions[studentId]?.[step] ? '#4caf50' : '#f44336'
                            }}>
                              {recorderMissions[studentId]?.[step] ? 'O' : 'X'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 각 단계 탭 */}
            {RECORDER_STEPS.includes(recorderTab) && (
              <div style={{ minHeight: 300 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#7b1fa2', marginBottom: 16, textAlign: 'center' }}>
                  {RECORDER_STEP_NAMES[recorderTab]} 연습곡
                </div>
                
                {/* 완료 상태 표시 */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  padding: '16px 20px', 
                  background: '#f7faf7', 
                  borderRadius: 16, 
                  border: '2px solid #f3e5f5',
                  boxShadow: '0 2px 8px #b2ebf240',
                  marginBottom: 20
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontWeight: '900',
                      fontSize: '16px',
                      color: recorderMissions[studentId]?.[recorderTab] ? '#4caf50' : '#f44336'
                    }}>
                      {recorderMissions[studentId]?.[recorderTab] ? 'O' : 'X'}
                    </span>
                    <span style={{ fontWeight: 600, color: '#7b1fa2', fontSize: 16 }}>
                      {recorderMissions[studentId]?.[recorderTab] ? '완료' : '미완료'}
                    </span>
                  </span>
                </div>

                {/* 악보 텍스트 */}
                <div style={{ 
                  padding: '20px', 
                  background: '#f7faf7', 
                  borderRadius: 12, 
                  border: '2px solid #f3e5f5',
                  boxShadow: '0 4px 16px #b2ebf240',
                  marginBottom: 20,
                  fontFamily: 'monospace',
                  fontSize: '16px',
                  lineHeight: '1.8',
                  color: '#7b1fa2',
                  whiteSpace: 'pre-line',
                  textAlign: 'left'
                }}>
                  {formatSheetMusic(SHEET_MUSIC[recorderTab])}
                </div>
              </div>
            )}

            {/* 닫기 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
              <button 
                onClick={() => setShowRecorderModal(false)} 
                style={{ 
                  fontWeight: 600, 
                  borderRadius: 999, 
                  background: '#f7faf7', 
                  color: '#888', 
                  border: 'none', 
                  padding: '12px 32px', 
                  fontSize: 16, 
                  boxShadow: '0 2px 8px #b2ebf240', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s' 
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 심화 단소급수미션 모달 */}
      {showRecorderAdvancedModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
          <div style={{ background: '#fff', borderRadius: 32, maxWidth: 600, width: '90vw', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 8px 48px rgba(102, 126, 234, 0.3)', border: '4px solid #667eea' }}>
            <div style={{ padding: '32px 24px 24px 24px' }}>
              <div style={{ fontWeight: 900, fontSize: 24, color: '#667eea', marginBottom: 24, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <span style={{ fontSize: 32 }}>🎵</span>
                단소급수미션 (심화)
              </div>

              {/* 탭 버튼들 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
                <button 
                  onClick={() => setRecorderAdvancedTab('progress')} 
                  style={{ 
                    fontWeight: 600, 
                    borderRadius: 999, 
                    background: recorderAdvancedTab === 'progress' ? '#667eea' : '#f0f4ff', 
                    color: recorderAdvancedTab === 'progress' ? '#fff' : '#667eea', 
                    border: 'none', 
                    padding: '7px 14px', 
                    fontSize: 14, 
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s' 
                  }}
                >진행도</button>
                {RECORDER_STEPS_ADVANCED.map(step => (
                  <button 
                    key={step} 
                    onClick={() => setRecorderAdvancedTab(step)} 
                    style={{ 
                      fontWeight: 600, 
                      borderRadius: 999, 
                      background: recorderAdvancedTab === step ? '#667eea' : '#f0f4ff', 
                      color: recorderAdvancedTab === step ? '#fff' : '#667eea', 
                      border: 'none', 
                      padding: '7px 14px', 
                      fontSize: 14, 
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)', 
                      cursor: 'pointer', 
                      transition: 'all 0.2s' 
                    }}
                  >{RECORDER_STEP_NAMES_ADVANCED[step]}</button>
                ))}
              </div>

              {/* 진행도 탭 */}
              {recorderAdvancedTab === 'progress' && (
                <div style={{ minHeight: 300 }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#667eea', marginBottom: 16, textAlign: 'center' }}>심화 진행 현황</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f0f4ff', borderRadius: 16, overflow: 'hidden', fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: '#667eea', color: '#fff', fontWeight: 700 }}>
                          {RECORDER_STEPS_ADVANCED.map(step => (
                            <th key={step} style={{ padding: '12px 6px', fontSize: 12, minWidth: 80 }}>{RECORDER_STEP_NAMES_ADVANCED[step]}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #667eea' }}>
                          {RECORDER_STEPS_ADVANCED.map(step => (
                            <td key={step} style={{ padding: '12px 6px', textAlign: 'center' }}>
                              <span style={{
                                fontWeight: '900',
                                fontSize: '18px',
                                color: recorderMissionsAdvanced[studentId]?.[step] ? '#4caf50' : '#f44336'
                              }}>
                                {recorderMissionsAdvanced[studentId]?.[step] ? 'O' : 'X'}
                              </span>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 각 단계 탭 */}
              {RECORDER_STEPS_ADVANCED.includes(recorderAdvancedTab) && (
                <div style={{ minHeight: 300 }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#667eea', marginBottom: 16, textAlign: 'center' }}>
                    {RECORDER_STEP_NAMES_ADVANCED[recorderAdvancedTab]} 연습곡
                  </div>
                  
                  {/* 완료 상태 표시 */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    padding: '16px 20px', 
                    background: '#f0f4ff', 
                    borderRadius: 16, 
                    border: '2px solid #667eea',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)',
                    marginBottom: 20
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontWeight: '900',
                        fontSize: '16px',
                        color: recorderMissionsAdvanced[studentId]?.[recorderAdvancedTab] ? '#4caf50' : '#f44336'
                      }}>
                        {recorderMissionsAdvanced[studentId]?.[recorderAdvancedTab] ? 'O' : 'X'}
                      </span>
                      <span style={{ fontWeight: 600, color: '#667eea', fontSize: 16 }}>
                        {recorderMissionsAdvanced[studentId]?.[recorderAdvancedTab] ? '완료' : '미완료'}
                      </span>
                    </span>
                  </div>

                  {/* 악보 텍스트 */}
                  <div style={{ 
                    padding: '20px', 
                    background: '#f0f4ff', 
                    borderRadius: 12, 
                    border: '2px solid #667eea',
                    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.2)',
                    marginBottom: 20,
                    fontFamily: 'monospace',
                    fontSize: '16px',
                    lineHeight: '1.8',
                    color: '#667eea',
                    whiteSpace: 'pre-line',
                    textAlign: 'left'
                  }}>
                    {formatSheetMusic(SHEET_MUSIC_ADVANCED[recorderAdvancedTab])}
                  </div>
                </div>
              )}

              {/* 닫기 버튼 */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                <button 
                  onClick={() => setShowRecorderAdvancedModal(false)} 
                  style={{ 
                    fontWeight: 600, 
                    borderRadius: 999, 
                    background: '#f0f4ff', 
                    color: '#888', 
                    border: 'none', 
                    padding: '12px 32px', 
                    fontSize: 16, 
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s' 
                  }}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 축하 모달 (폭죽 효과) */}
      {showCelebrationModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6000 }}>
          <div style={{ background: 'linear-gradient(45deg, #FFD700, #FFA500)', padding: '40px 32px', borderRadius: 28, minWidth: 400, textAlign: 'center', boxShadow: '0 8px 32px rgba(255, 215, 0, 0.4)', border: '4px solid #FFD700', position: 'relative', overflow: 'hidden' }}>
            {/* 폭죽 효과 */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              {Array.from({length: 20}).map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    width: '6px',
                    height: '6px',
                    background: ['#FFD700', '#FF6B35', '#4CAF50', '#2196F3', '#9C27B0'][i % 5],
                    borderRadius: '50%',
                    animation: `firework-${i % 3} 2s infinite`,
                    left: `${20 + (i % 6) * 10}%`,
                    top: `${20 + (i % 4) * 15}%`
                  }}
                />
              ))}
            </div>
            
            <div style={{ fontSize: 64, marginBottom: 16, animation: 'pulse 1s infinite' }}>🏆</div>
            <div style={{ fontWeight: 900, fontSize: 28, color: '#FFF', marginBottom: 12, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              축하합니다!
            </div>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#FFF', marginBottom: 20, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              {celebrationLevel}단계 통과! 🎉
            </div>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#FFF', marginBottom: 24, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              계속해서 더 높은 단계에 도전해보세요!<br/>
              여러분의 실력이 정말 대단해요! 💪
            </div>
            <button 
              onClick={handleCelebrationConfirm} 
              style={{ 
                fontWeight: 700, 
                borderRadius: 999, 
                background: '#FFF', 
                color: '#FFA500', 
                border: 'none', 
                padding: '12px 32px', 
                fontSize: 18, 
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)', 
                cursor: 'pointer', 
                transition: 'all 0.2s' 
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 심화 축하 모달 (무지개색 테두리) */}
      {showAdvancedCelebrationModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6000 }}>
          <div style={{ 
            background: 'linear-gradient(45deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff)', 
            padding: '4px', 
            borderRadius: 32, 
            minWidth: 400, 
            textAlign: 'center', 
            boxShadow: '0 8px 32px rgba(255, 107, 107, 0.4)', 
            position: 'relative', 
            overflow: 'hidden' 
          }}>
            <div style={{ 
              background: '#fff', 
              padding: '40px 32px', 
              borderRadius: 28, 
              position: 'relative', 
              overflow: 'hidden' 
            }}>
              {/* 무지개 파티클 효과 */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {Array.from({length: 25}).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      width: '8px',
                      height: '8px',
                      background: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3'][i % 7],
                      borderRadius: '50%',
                      animation: `rainbow-particle-${i % 4} 3s infinite`,
                      left: `${10 + (i % 8) * 10}%`,
                      top: `${10 + (i % 5) * 15}%`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
              
              <div style={{ fontSize: 64, marginBottom: 16, animation: 'rainbow-pulse 2s infinite' }}>🌈</div>
              <div style={{ fontWeight: 900, fontSize: 28, color: '#ff6b6b', marginBottom: 20, textShadow: '2px 2px 4px rgba(255, 107, 107, 0.3)' }}>
                심화 {advancedCelebrationLevel}단계 통과!
              </div>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#888', marginBottom: 24, lineHeight: 1.5 }}>
                정말 대단해요! 심화 과정을 완료하셨네요!<br/>
                더욱 발전된 실력을 보여주셨습니다! 🎵
              </div>
              <button 
                onClick={handleAdvancedCelebrationConfirm} 
                style={{ 
                  fontWeight: 700, 
                  borderRadius: 999, 
                  background: 'linear-gradient(45deg, #ff6b6b, #feca57)', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '12px 32px', 
                  fontSize: 18, 
                  boxShadow: '0 4px 16px rgba(255, 107, 107, 0.3)', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s' 
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 퀴즈 모달 */}
      {showQuizModal && currentQuiz && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(0,0,0,0.7)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 10000 
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowQuizModal(false);
              setCurrentQuiz(null);
              setQuizAnswer('');
              setSelectedQuizOption(-1);
            }
          }}
        >
                     <div 
             style={{ 
               background: '#f5f5f7', 
               borderRadius: 20, 
               width: '90%', 
               maxWidth: 600, 
               maxHeight: '80vh',
               overflow: 'auto',
               padding: 32, 
               boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
               border: '2px solid #e5e5e7',
               position: 'relative'
             }}
             onClick={(e) => e.stopPropagation()}
           >
            {/* 헤더 */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🍭</div>
              <h2 style={{ 
                fontSize: 28, 
                fontWeight: 800, 
                color: '#1d1d1f', 
                margin: 0, 
                marginBottom: 8 
              }}>
                캔디 퀴즈타임
              </h2>
              <p style={{ 
                fontSize: 16, 
                color: '#86868b', 
                margin: 0 
              }}>
                문제를 풀고 캔디를 획득하세요!
              </p>
            </div>

            {/* 퀴즈 내용 */}
            <div style={{ 
              background: 'white', 
              borderRadius: 16, 
              padding: 24, 
              marginBottom: 24,
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
            }}>
                             <h3 style={{ 
                 fontSize: 20, 
                 fontWeight: 700, 
                 color: '#1d1d1f', 
                 marginBottom: 8,
                 lineHeight: 1.4
               }}>
                 {currentQuiz.title}
               </h3>
               
               {currentQuiz.question && (
                 <p style={{
                   fontSize: 16,
                   color: '#424245',
                   marginBottom: 20,
                   lineHeight: 1.5,
                   whiteSpace: 'pre-wrap'
                 }}>
                   {currentQuiz.question}
                 </p>
               )}

              {currentQuiz.type === 'multiple' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {currentQuiz.options.map((option, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedQuizOption(index)}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: selectedQuizOption === index ? '2px solid #007aff' : '2px solid #e5e5e7',
                        background: selectedQuizOption === index ? '#f0f8ff' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}
                    >
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: selectedQuizOption === index ? '2px solid #007aff' : '2px solid #d1d1d6',
                        background: selectedQuizOption === index ? '#007aff' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {selectedQuizOption === index && (
                          <div style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: 'white'
                          }} />
                        )}
                      </div>
                      <span style={{ 
                        fontSize: 16, 
                        color: '#1d1d1f',
                        fontWeight: selectedQuizOption === index ? 600 : 400
                      }}>
                        {option}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <textarea
                  value={quizAnswer}
                  onChange={(e) => setQuizAnswer(e.target.value)}
                  placeholder="답안을 입력하세요..."
                  style={{
                    width: '100%',
                    minHeight: 120,
                    padding: 16,
                    borderRadius: 12,
                    border: '2px solid #e5e5e7',
                    fontSize: 16,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#007aff'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e5e7'}
                />
              )}
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setShowQuizModal(false);
                  setCurrentQuiz(null);
                  setQuizAnswer('');
                  setSelectedQuizOption(-1);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: 12,
                  border: 'none',
                  background: '#f2f2f7',
                  color: '#1d1d1f',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                취소
              </button>
              <button
                onClick={handleSubmitQuiz}
                disabled={
                  currentQuiz.type === 'multiple' 
                    ? selectedQuizOption === -1 
                    : !quizAnswer.trim()
                }
                style={{
                  padding: '12px 24px',
                  borderRadius: 12,
                  border: 'none',
                  background: (currentQuiz.type === 'multiple' ? selectedQuizOption !== -1 : quizAnswer.trim()) 
                    ? '#007aff' : '#d1d1d6',
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: (currentQuiz.type === 'multiple' ? selectedQuizOption !== -1 : quizAnswer.trim()) 
                    ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <img 
                  src="/chupa.png" 
                  alt="캔디" 
                  style={{ width: 16, height: 16 }}
                />
                답안 제출
              </button>
            </div>
          </div>
        </div>
              )}

      {/* 거래 내역 모달 */}
      {showTransactionModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(0,0,0,0.7)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 10001 
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTransactionModal(false);
            }
          }}
        >
          <div 
            style={{ 
              background: '#f5f5f7', 
              borderRadius: 20, 
              width: '90%', 
              maxWidth: 500, 
              maxHeight: '80vh',
              padding: 32, 
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              border: '2px solid #e5e5e7',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 24
            }}>
              <span style={{ fontSize: 28 }}>💰</span>
              <h2 style={{
                fontSize: 24,
                fontWeight: 800,
                margin: 0,
                color: '#1d1d1f'
              }}>
                거래 내역
              </h2>
            </div>

            <div style={{
              background: 'white',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              border: '1px solid #e5e5e7',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#FF9800' }}>
                현재 잔액: {(() => {
                  // 거래 내역이 있으면 최신 거래의 잔액을 사용, 없으면 student.balance 사용
                  if (student.transactionHistory && student.transactionHistory.length > 0) {
                    const latestTransaction = student.transactionHistory
                      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
                    return latestTransaction.balanceAfter || 0;
                  }
                  return student.balance || 0;
                })()}원
              </div>
            </div>

            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              marginBottom: 24
            }}>
              {student.transactionHistory && student.transactionHistory.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {student.transactionHistory
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, 5)
                    .map((transaction, index) => (
                    <div
                      key={index}
                      style={{
                        background: 'white',
                        borderRadius: 12,
                        padding: 16,
                        border: '1px solid #e5e5e7',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#1d1d1f',
                          marginBottom: 4
                        }}>
                          {transaction.description}
                        </div>
                        <div style={{
                          fontSize: 12,
                          color: '#86868b'
                        }}>
                          {new Date(transaction.timestamp).toLocaleString('ko-KR')}
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 4
                      }}>
                        <div style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: transaction.amount > 0 ? '#4CAF50' : '#f44336'
                        }}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}원
                        </div>
                        <div style={{
                          fontSize: 12,
                          color: '#86868b'
                        }}>
                          잔액: {transaction.balanceAfter}원
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: 40,
                  color: '#86868b',
                  fontSize: 16
                }}>
                  아직 거래 내역이 없습니다.
                </div>
              )}
            </div>

            <button
              onClick={() => setShowTransactionModal(false)}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: 12,
                border: 'none',
                background: '#1d1d1f',
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#424245';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#1d1d1f';
              }}
            >
              <img 
                src="/chupa.png" 
                alt="캔디" 
                style={{ width: 16, height: 16 }}
              />
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 퀴즈 결과 모달 */}
      {showQuizResultModal && quizResultData && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(0,0,0,0.7)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 10001 
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowQuizResultModal(false);
              setQuizResultData(null);
            }
          }}
        >
          <div 
            style={{ 
              background: '#f5f5f7', 
              borderRadius: 20, 
              width: '90%', 
              maxWidth: 400, 
              padding: 32, 
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              border: '2px solid #e5e5e7',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 결과 아이콘 */}
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              background: quizResultData.isCorrect === true 
                ? 'linear-gradient(135deg, #4CAF50, #45a049)' 
                : quizResultData.isCorrect === false 
                ? 'linear-gradient(135deg, #f44336, #d32f2f)'
                : 'linear-gradient(135deg, #2196F3, #1976D2)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 24px',
              boxShadow: quizResultData.isCorrect === true 
                ? '0 8px 24px rgba(76, 175, 80, 0.3)'
                : quizResultData.isCorrect === false
                ? '0 8px 24px rgba(244, 67, 54, 0.3)'
                : '0 8px 24px rgba(33, 150, 243, 0.3)'
            }}>
              <div style={{ fontSize: 36, color: 'white' }}>
                {quizResultData.isCorrect === true ? '✓' : 
                 quizResultData.isCorrect === false ? '✗' : 'ℹ'}
              </div>
            </div>

            <h2 style={{ 
              fontSize: 24, 
              fontWeight: 800, 
              color: '#1d1d1f', 
              margin: '0 0 16px 0' 
            }}>
              {quizResultData.isCorrect === true ? '정답!' :
               quizResultData.isCorrect === false ? '오답' : '제출 완료'}
            </h2>
            
            <p style={{ 
              fontSize: 16, 
              color: '#86868b', 
              margin: '0 0 24px 0',
              lineHeight: 1.5,
              whiteSpace: 'pre-line'
            }}>
              {quizResultData.message}
            </p>

            {/* 보상 정보 */}
            {(quizResultData.expGain > 0 || quizResultData.moneyGain > 0) && (
              <div style={{
                background: 'white',
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
                border: '1px solid #e5e5e7'
              }}>
                <h3 style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#1d1d1f',
                  margin: '0 0 12px 0'
                }}>
                  획득한 보상
                </h3>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                  {quizResultData.expGain > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>⭐</span>
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#4CAF50' }}>
                        +{quizResultData.expGain} 경험치
                      </span>
                    </div>
                  )}
                  
                  {quizResultData.moneyGain > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>💰</span>
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#FF9800' }}>
                        +{quizResultData.moneyGain}원
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setShowQuizResultModal(false);
                setQuizResultData(null);
              }}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: 12,
                border: 'none',
                background: quizResultData.isCorrect === true 
                  ? 'linear-gradient(135deg, #4CAF50, #45a049)'
                  : quizResultData.isCorrect === false
                  ? 'linear-gradient(135deg, #f44336, #d32f2f)'
                  : 'linear-gradient(135deg, #2196F3, #1976D2)',
                color: 'white',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: quizResultData.isCorrect === true 
                  ? '0 4px 16px rgba(76, 175, 80, 0.3)'
                  : quizResultData.isCorrect === false
                  ? '0 4px 16px rgba(244, 67, 54, 0.3)'
                  : '0 4px 16px rgba(33, 150, 243, 0.3)'
              }}
            >
              <img 
                src="/chupa.png" 
                alt="캔디" 
                style={{ width: 16, height: 16 }}
              />
              확인
            </button>
          </div>
        </div>
      )}

      {/* 감정출석부 모달 */}
      <EmotionAttendanceModal
        isOpen={showEmotionAttendanceModal}
        onClose={() => setShowEmotionAttendanceModal(false)}
        student={student}
        onSubmitSuccess={() => {
          // 감정출석부 제출 성공 시 즉시 상태 업데이트
          console.log('🎉 감정출석부 제출 성공! 상태를 즉시 업데이트합니다.');
          setHasSubmittedToday(true);
        }}
      />

      <style jsx>{`
        @keyframes firework-0 {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          50% { transform: translateY(-30px) scale(1.5); opacity: 0.8; }
          100% { transform: translateY(-60px) scale(0.5); opacity: 0; }
        }
        @keyframes firework-1 {
          0% { transform: translateX(0) scale(1); opacity: 1; }
          50% { transform: translateX(30px) scale(1.5); opacity: 0.8; }
          100% { transform: translateX(60px) scale(0.5); opacity: 0; }
        }
        @keyframes firework-2 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          50% { transform: translate(-30px, -30px) scale(1.5); opacity: 0.8; }
          100% { transform: translate(-60px, -60px) scale(0.5); opacity: 0; }
        }
        @keyframes rainbow-particle-0 {
          0% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
          50% { transform: translateY(-40px) scale(1.5) rotate(180deg); opacity: 0.8; }
          100% { transform: translateY(-80px) scale(0.5) rotate(360deg); opacity: 0; }
        }
        @keyframes rainbow-particle-1 {
          0% { transform: translateX(0) scale(1) rotate(0deg); opacity: 1; }
          50% { transform: translateX(40px) scale(1.5) rotate(180deg); opacity: 0.8; }
          100% { transform: translateX(80px) scale(0.5) rotate(360deg); opacity: 0; }
        }
        @keyframes rainbow-particle-2 {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
          50% { transform: translate(-40px, -40px) scale(1.5) rotate(180deg); opacity: 0.8; }
          100% { transform: translate(-80px, -80px) scale(0.5) rotate(360deg); opacity: 0; }
        }
        @keyframes rainbow-particle-3 {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
          50% { transform: translate(40px, -40px) scale(1.5) rotate(180deg); opacity: 0.8; }
          100% { transform: translate(80px, -80px) scale(0.5) rotate(360deg); opacity: 0; }
        }
        @keyframes rainbow-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default StudentPage; 