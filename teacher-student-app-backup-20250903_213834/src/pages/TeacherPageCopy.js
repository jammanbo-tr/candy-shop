import React, { useState, useEffect, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, doc, updateDoc, arrayUnion, setDoc, getDocs, query, orderBy, deleteDoc, getDoc, addDoc, limit, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

import StudentCard from '../components/StudentCardCopy';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import Checkbox from '@mui/material/Checkbox';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useNavigate } from 'react-router-dom';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import CampaignIcon from '@mui/icons-material/Campaign';
import TextField from '@mui/material/TextField';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CardDrawModal from '../components/CardDrawModal';
import { useAuth } from '../hooks/useAuth';
import Button from '@mui/material/Button';
import LinkIcon from '@mui/icons-material/Link';
import BarChartIcon from '@mui/icons-material/BarChart';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import HistoryIcon from '@mui/icons-material/History';
import AIAnalysisModal from '../components/AIAnalysisModal';
import QuizSystem from "../components/QuizSystem";
import EmotionDashboardModalCopy from '../components/EmotionDashboardModalCopy';
import { addNewStudents } from '../addNewStudents';

const LEVELS = [
  '알사탕',
  '새콤한 사탕',
  '막대사탕',
  '롤리팝',
  '수제 사탕',
  '사탕 마스터',
];

// copy 데이터 초기화 버전 (버전이 바뀔 때만 초기화)
const COPY_INIT_VERSION = '20250814-2';

const STUDENT_ORDER = [
  '강은우','권아영','김서준','문소희','박민준','서건우','송성민','오유진','윤도영','임시우','장수아','정서연','조예은','최지우','안채원','유다은','이하윤','한지희','황주원','홍현우','이해원','김주하'
];

const REACTION_COLORS = [
  { name: '빨강', code: '#e53935' },
  { name: '주황', code: '#fb8c00' },
  { name: '노랑', code: '#fbc02d' },
  { name: '초록', code: '#43a047' },
  { name: '파랑', code: '#1e88e5' },
  { name: '남색', code: '#3949ab' },
  { name: '보라', code: '#8e24aa' },
];

// 버튼 스타일 공통 객체
const buttonStyle = {
  fontSize: 13,
  minWidth: 72,
  padding: '7px 14px',
  whiteSpace: 'nowrap',
  borderRadius: 12,
  fontWeight: 'bold',
  boxShadow: '0 2px 8px #b2ebf240',
  transition: 'all 0.2s',
  cursor: 'pointer',
};

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

const TeacherPageCopy = () => {
  // 1. 모든 useState, useEffect 등 Hook 선언 (최상단)
  const [studentsSnapshot, loading, firestoreError] = useCollection(collection(db, 'copy_students'));
  const [selectedIds, setSelectedIds] = useState([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showQuestModal, setShowQuestModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [questText, setQuestText] = useState('');
  const [expEffectIds, setExpEffectIds] = useState([]);
  const [levelUpEffectIds, setLevelUpEffectIds] = useState([]);
  const [showTeacherAlarm, setShowTeacherAlarm] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [alarmTab, setAlarmTab] = useState('message');
  const [questExp, setQuestExp] = useState(10);
  const [questActionStudent, setQuestActionStudent] = useState(null);
  const [questActionQuest, setQuestActionQuest] = useState(null);
  const [questResultEffect, setQuestResultEffect] = useState('');
  const [showJarModal, setShowJarModal] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [showBoardChoiceModal, setShowBoardChoiceModal] = useState(false);
  const [showBoardCodeModal, setShowBoardCodeModal] = useState(false);
  const [boardCodeInput, setBoardCodeInput] = useState('');
  const [showBoardListModal, setShowBoardListModal] = useState(false);
  const [boardList, setBoardList] = useState([]);
  const [boardListLoading, setBoardListLoading] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankTab, setBankTab] = useState('balance');
  const [bankBalances, setBankBalances] = useState({});
  const [bankSelectedIds, setBankSelectedIds] = useState([]);
  const [showBankAmountModal, setShowBankAmountModal] = useState(false);
  const [bankAmountType, setBankAmountType] = useState('deposit');
  const [bankAmountValue, setBankAmountValue] = useState(0);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankNames, setBankNames] = useState({});
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentBalance, setNewStudentBalance] = useState(0);
  const [items, setItems] = useState([]);
  const [itemNames, setItemNames] = useState({});
  const [itemPrices, setItemPrices] = useState({});
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [itemSaving, setItemSaving] = useState(false);
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [amountType, setAmountType] = useState('deposit');
  const [amountValue, setAmountValue] = useState(0);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [gameStep, setGameStep] = useState('select'); // select | reaction
  const [targetColor, setTargetColor] = useState(null);
  const [currentColor, setCurrentColor] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [reactionTime, setReactionTime] = useState(null);
  const [gameError, setGameError] = useState('');
  const [topRecords, setTopRecords] = useState([]);
  const [isClickable, setIsClickable] = useState(false);
  const [studentName, setStudentName] = useState('');
  // 공지사항 상태 추가
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [notices, setNotices] = useState([]);
  const [currentNotice, setCurrentNotice] = useState({ id: '', content: '', isActive: true });
  const [noticeError, setNoticeError] = useState('');
  const [alarmContent, setAlarmContent] = useState('');
  const [alarmTime, setAlarmTime] = useState('');
  const [alarmSaving, setAlarmSaving] = useState(false);
  // 공지사항 모달 관련 상태
  const [alarms, setAlarms] = useState([]);
  // 공지/예약 탭 상태 추가
  const [noticeTab, setNoticeTab] = useState('notice'); // 'notice' | 'alarm'
  const [alertMsg, setAlertMsg] = useState('');
  const [showAIAnalysisModal, setShowAIAnalysisModal] = useState(false);
  // 정렬 상태 추가
  const [spendSort, setSpendSort] = useState({ key: 'ts', order: 'desc' }); // key: 'name'|'copy_items'|'amount'|'ts', order: 'asc'|'desc'
  const [auth, setAuth] = useState(true);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState('');
  // 학생별 쿠폰함 관리용 상태 및 함수 추가
  const [couponBoxOpen, setCouponBoxOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentCoupons, setStudentCoupons] = useState([]);
  const [hasDrawnCard, setHasDrawnCard] = useState(false);
  const { user } = useAuth();
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [showEventExpModal, setShowEventExpModal] = useState(false);
  const [eventExpInputs, setEventExpInputs] = useState({});
  const [eventExpSaving, setEventExpSaving] = useState(false);
  const [eventExpBulkChecked, setEventExpBulkChecked] = useState(false);
  const [eventExpBulkValue, setEventExpBulkValue] = useState(0);
  const [feverActive, setFeverActive] = useState(false);
  const [feverRemain, setFeverRemain] = useState(180);
  const [feverEnd, setFeverEnd] = useState(null);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showLinkStatsModal, setShowLinkStatsModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  const [linkCategory, setLinkCategory] = useState('general');
  const [selectedStudentsForLink, setSelectedStudentsForLink] = useState([]);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');
  const [linkAnalytics, setLinkAnalytics] = useState([]);
  
  // 단소급수미션 관련 상태
  const [showRecorderModal, setShowRecorderModal] = useState(false);
  const [recorderTab, setRecorderTab] = useState('progress');
  const [recorderMissions, setRecorderMissions] = useState({});
  
  // 심화 단소급수미션 관련 상태
  const [showRecorderAdvancedModal, setShowRecorderAdvancedModal] = useState(false);
  const [recorderAdvancedTab, setRecorderAdvancedTab] = useState('progress');
  const [recorderMissionsAdvanced, setRecorderMissionsAdvanced] = useState({});

  // 감정출석부 대시보드 상태
  const [showEmotionDashboardModal, setShowEmotionDashboardModal] = useState(false);

  const LINK_CATEGORIES = [
    { key: 'general', label: '일반', color: '#757575' },
    { key: 'video', label: '📹 동영상', color: '#ff5722' },
    { key: 'document', label: '📄 문서', color: '#2196f3' },
    { key: 'quiz', label: '📝 퀴즈', color: '#9c27b0' },
    { key: 'game', label: '🎮 게임', color: '#4caf50' },
    { key: 'reference', label: '📚 참고자료', color: '#ff9800' }
  ];

  // 학생 초기 데이터 (요청에 따른 20명, 오름차순 배열)
  const initialStudents = [
    { name: '강은우', balance: 0 },
    { name: '권아영', balance: 0 },
    { name: '김서준', balance: 0 },
    { name: '문소희', balance: 0 },
    { name: '박민준', balance: 0 },
    { name: '서건우', balance: 0 },
    { name: '송성민', balance: 0 },
    { name: '오유진', balance: 0 },
    { name: '윤도영', balance: 0 },
    { name: '임시우', balance: 0 },
    { name: '장수아', balance: 0 },
    { name: '정서연', balance: 0 },
    { name: '조예은', balance: 0 },
    { name: '최지우', balance: 0 },
    { name: '안채원', balance: 0 },
    { name: '유다은', balance: 0 },
    { name: '이하윤', balance: 0 },
    { name: '한지희', balance: 0 },
    { name: '황주원', balance: 0 },
    { name: '홍현우', balance: 0 }
  ];

  // 품목 초기 데이터 (제시된 값)
  const initialItems = [
    { name: '마이쮸', price: 3 },
    { name: '하리보', price: 8 },
    { name: '새콤달콤', price: 4 },
    { name: '츄파춥스', price: 8 },
    { name: '사워바이츠', price: 12 },
    { name: '음악듣기', price: 4 },
    { name: '음악2곡듣기', price: 7 },
    { name: '고래밥', price: 18 },
    { name: '자리구입', price: 135 }
  ];

  // feverTime 관련 useEffect를 copy_settings에서 가져오도록 수정
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'copy_settings', 'feverTime'), 
      (snap) => {
        try {
          const data = snap.data();
          if (data && data.active === true) {
            setFeverActive(true);
          } else {
            setFeverActive(false);
            setFeverRemain(180);
          }
        } catch (error) {
          // 조용히 오류 처리
        }
      },
      (error) => {
        // Firestore 리스너 오류 처리 (네트워크 오류 등)
        // 콘솔에 로그하지 않고 조용히 처리
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!feverActive || !feverEnd) {
      return;
    }
    const interval = setInterval(() => {
      const remain = Math.max(0, Math.floor((feverEnd - Date.now()) / 1000));
      setFeverRemain(remain);
      if (remain <= 0) setFeverActive(false);
    }, 1000);
    return () => clearInterval(interval);
  }, [feverActive, feverEnd]);

  // Firestore에 동기화(최초 1회만, studentsSnapshot이 비어있을 때만)
  useEffect(() => {
    const checkAndInit = async () => {
      // 버전 마커 확인 후 필요한 경우에만 초기화
      const markerRef = doc(db, 'meta', 'copy_init');
      const markerSnap = await getDoc(markerRef);
      const needInit = !markerSnap.exists() || markerSnap.data()?.version !== COPY_INIT_VERSION;

      if (!needInit) return;

      // 기존 데이터 정리
      const q = query(collection(db, 'copy_students'));
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(db, 'copy_students', docSnap.id));
      }
      // 초기 데이터 주입
      for (const s of initialStudents) {
        await setDoc(doc(db, 'copy_students', s.name), { name: s.name, balance: s.balance }, { merge: true });
      }
      // 버전 마커 갱신
      await setDoc(markerRef, { version: COPY_INIT_VERSION, ts: Date.now() });
    };
    checkAndInit();
  }, []); // 최초 1회만 실행

  // 품목 Firestore 동기화 (최초 1회만, items 컬렉션이 비어있을 때만)
  useEffect(() => {
    const syncInitialItems = async () => {
      const q = query(collection(db, 'copy_items'));
      const snap = await getDocs(q);
      if (snap.empty) {
        // 기존 문서가 남아 있을 수 있으니 모두 삭제
        for (const docSnap of snap.docs) {
          await deleteDoc(doc(db, 'copy_items', docSnap.id));
        }
        // 초기 품목 데이터 입력
        for (const item of initialItems) {
          await setDoc(doc(db, 'copy_items', item.name), { name: item.name, price: item.price }, { merge: true });
        }
      }
    };
    syncInitialItems();
  }, []);

  // 학생 잔액 초기화 (studentsSnapshot 변경 시)
  useEffect(() => {
    if (!studentsSnapshot) return;
    const balances = {};
    studentsSnapshot.docs.forEach(doc => {
      const s = doc.data();
      balances[doc.id] = typeof s.balance === 'number' ? s.balance : 0;
    });
    setBankBalances(balances);
  }, [studentsSnapshot]);

  // 품목 불러오기
  useEffect(() => {
    const fetchItems = async () => {
      const q = query(collection(db, 'copy_items'));
      const snap = await getDocs(q);
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      const names = {}, prices = {};
      snap.docs.forEach(d => {
        names[d.id] = d.data().name;
        prices[d.id] = d.data().price;
      });
      setItemNames(names);
      setItemPrices(prices);
    };
    fetchItems();
  }, []);

  // Firestore 오류 처리 (조용히)
  useEffect(() => {
    if (firestoreError) {
      // Firestore 연결 오류를 조용히 처리
      // 네트워크 오류나 권한 문제 등을 콘솔에 로그하지 않음
    }
  }, [firestoreError]);

  // 공지사항 목록 불러오기
  useEffect(() => { fetchNotices(); }, []);

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
    'advanced1', 'advanced2', 'advanced3', 'advanced4'
  ];

  const RECORDER_STEP_NAMES_ADVANCED = {
    'advanced1': '심화 1단계',
    'advanced2': '심화 2단계',
    'advanced3': '심화 3단계',
    'advanced4': '심화 4단계'
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

  const handleRecorderMissionComplete = async (studentId, step) => {
    try {
      const newMissions = {
        ...recorderMissions,
        [studentId]: {
          ...recorderMissions[studentId],
          [step]: true
        }
      };
      setRecorderMissions(newMissions);
      await setDoc(doc(db, 'settings', 'recorderMissions'), newMissions);
      
      // 학생에게 알림 전송
      const student = studentRows.find(s => s.id === studentId);
      if (student) {
        await updateDoc(doc(db, 'copy_students', studentId), {
          notifications: arrayUnion({
            type: 'recorderMission',
            text: `${RECORDER_STEP_NAMES[step]} 미션을 완료했습니다! 🎵`,
            ts: Date.now()
          })
        });
      }
    } catch (error) {
      console.error('단소급수미션 완료 처리 실패:', error);
    }
  };

  // 심화 단소급수미션 완료 처리
  const handleRecorderMissionAdvancedComplete = async (studentId, step) => {
    try {
      const newMissions = {
        ...recorderMissionsAdvanced,
        [studentId]: {
          ...recorderMissionsAdvanced[studentId],
          [step]: true
        }
      };
      setRecorderMissionsAdvanced(newMissions);
      await setDoc(doc(db, 'settings', 'recorderMissionsAdvanced'), newMissions);
      
      // 학생에게 알림 전송
      const student = studentRows.find(s => s.id === studentId);
      if (student) {
        await updateDoc(doc(db, 'copy_students', studentId), {
          notifications: arrayUnion({
            type: 'recorderMissionAdvanced',
            text: `${RECORDER_STEP_NAMES_ADVANCED[step]} 미션을 완료했습니다! ✨`,
            ts: Date.now()
          })
        });
      }
    } catch (error) {
      console.error('심화 단소급수미션 완료 처리 실패:', error);
    }
  };

  // 단소급수미션 데이터 로드
  useEffect(() => {
    fetchRecorderMissions();
    fetchRecorderMissionsAdvanced();
  }, []);

  useEffect(() => {
    const checkCardDrawStatus = async () => {
      if (!user) return;

      try {
        // localStorage 체크
        const localHasDrawn = localStorage.getItem('hasDrawnCard_' + user.uid) === 'true';
        if (localHasDrawn) {
          setHasDrawnCard(true);
          return;
        }

        // Firestore 체크
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists() && docSnap.data().hasDrawnCard) {
          setHasDrawnCard(true);
          localStorage.setItem('hasDrawnCard_' + user.uid, 'true');
        }
      } catch (error) {
        console.error('카드 뽑기 상태 확인 중 오류:', error);
      }
    };

    checkCardDrawStatus();
  }, [user]);

  useEffect(() => {
    if (!studentsSnapshot) return;
    let requests = [];
    studentsSnapshot.docs.forEach(docSnap => {
      const student = docSnap.data();
      // 메시지
      (student.messages || []).filter(m => m.from === 'student' && !m.checked).forEach(m => {
        requests.push({ type: 'message', studentId: docSnap.id, studentName: student.name, ...m });
      });
      // 칭찬 데이터 처리 (type이 없거나, 기존 데이터도 포함)
      (student.praise || []).filter(p => !p.checked).forEach(p => {
        if ((p.type === 'friendPraise' && p.from) || (!p.type && p.from && !p.self && p.from !== 'student')) {
          // type이 없지만 from이 있고 self가 아니면 친구 칭찬으로 간주
          // fromName이 없으면 from(studentId)으로 학생 이름 찾기
          let praisedByName = p.fromName;
          if (!praisedByName && p.from && studentsSnapshot) {
            const fromStudent = studentsSnapshot.docs.find(d => d.id === p.from);
            praisedByName = fromStudent ? fromStudent.data().name : '알 수 없음';
          }
          requests.push({
            type: 'friendPraise',
            studentId: docSnap.id,
            studentName: student.name,
            praisedBy: praisedByName || '알 수 없음',
            praisedById: p.from,
            ...p
          });
        } else if (p.self || (!p.type && p.from === 'student')) {
          // 자기 칭찬
          requests.push({
            type: 'selfPraise',
            studentId: docSnap.id,
            studentName: student.name,
            ...p
          });
        }
      });
      // 퀘스트 승인 요청
      (student.quests || []).filter(q => q.status === 'ongoing' && q.requestPending).forEach(q => {
        requests.push({ type: 'quest', studentId: docSnap.id, studentName: student.name, ...q });
      });
    });
    setPendingRequests(requests.sort((a,b)=>b.ts-a.ts));
  }, [studentsSnapshot]);

  // --- 학급 캔디 유리병 집계 ---
  // 사탕 이미지 경로
  const candyImages = [
    '/lv1.png', '/lv2.png', '/lv3.png', '/lv4.png', '/lv5.png', '/lv6.png'
  ];
  // 사탕별 누적 개수 집계 (레벨업 시점마다 이전 레벨 사탕 +1)
  const candyCounts = [0,0,0,0,0,0];
  if (studentsSnapshot) {
    studentsSnapshot.docs.forEach(doc => {
      const student = doc.data();
      const currentLevel = student.level || 0;
      for (let i = 0; i < currentLevel && i < 6; i++) {
        candyCounts[i]++;
      }
    });
  }

  // 공지사항 목록 불러오기
  const fetchNotices = async () => {
    try {
      const noticesRef = collection(db, 'copy_notices');
      const noticesSnapshot = await getDocs(noticesRef);
      const noticesData = noticesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotices(noticesData);
    } catch (error) {
      setNoticeError('공지사항을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 공지사항 저장
  const saveNotice = async () => {
    try {
      if (!currentNotice.content.trim()) {
        setNoticeError('공지사항 내용을 입력해주세요.');
        return;
      }
      if (currentNotice.id) {
        await updateDoc(doc(db, 'copy_notices', currentNotice.id), {
          content: currentNotice.content,
          isActive: currentNotice.isActive,
          updatedAt: Date.now()
        });
      } else {
        await addDoc(collection(db, 'copy_notices'), {
          content: currentNotice.content,
          isActive: currentNotice.isActive,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      setCurrentNotice({ id: '', content: '', isActive: true });
      setNoticeError('');
      fetchNotices();
    } catch (error) {
      setNoticeError('공지사항 저장 중 오류가 발생했습니다.');
    }
  };

  // 공지사항 삭제
  const deleteNotice = async (noticeId) => {
    try {
      await deleteDoc(doc(db, 'copy_notices', noticeId));
      fetchNotices();
    } catch (error) {
      setNoticeError('공지사항 삭제 중 오류가 발생했습니다.');
    }
  };

  // 공지사항 광고하기 (모달)
  const broadcastNotice = async (noticeId) => {
    try {
      const noticeRef = doc(db, 'copy_notices', noticeId);
      // broadcast를 false로 바꿨다가 true+broadcastTime 갱신
      await updateDoc(noticeRef, { broadcast: false });
      setTimeout(async () => {
        await updateDoc(noticeRef, {
          broadcast: true,
          broadcastTime: Date.now()
        });
        fetchNotices();
      }, 200);
    } catch (error) {
      setNoticeError('공지사항 광고 중 오류가 발생했습니다.');
    }
  };

  // 공지사항 광고 멈추기 함수 추가
  const stopBroadcastNotice = async (noticeId) => {
    try {
      const noticeRef = doc(db, 'copy_notices', noticeId);
      await updateDoc(noticeRef, { broadcast: false });
      fetchNotices();
    } catch (error) {
      setNoticeError('광고 멈추기 중 오류가 발생했습니다.');
    }
  };

  // 공지사항 수정
  const editNotice = (notice) => {
    setCurrentNotice({ id: notice.id, content: notice.content, isActive: notice.isActive });
  };

  // 마운트 시 공지사항 불러오기
  useEffect(() => { fetchNotices(); }, []);

  // 유리병 사탕 집계 (현재 레벨 기반)
  const jarCandies = useMemo(() => {
    if (!studentsSnapshot) return 0;
    let totalCandies = 0;
    studentsSnapshot.docs.forEach(doc => {
      const student = doc.data();
      const currentLevel = student.level || 0;
      for (let i = 0; i < currentLevel && i < 6; i++) {
        totalCandies++;
      }
    });
    return totalCandies;
  }, [studentsSnapshot]);

  // 2. 조건부 렌더링을 위한 상태 확인
  const shouldShowLogin = false;
  const shouldShowLoading = loading || syncing;
  const shouldShowError = firestoreError;
  const shouldShowNoData = !studentsSnapshot || studentsSnapshot.empty;

  // 3. 나머지 함수/로직/JSX
  // ... (이하 기존 함수/로직/JSX) ...

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (!studentsSnapshot) return;
    if (selectedIds.length === studentsSnapshot.docs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(studentsSnapshot.docs.map(doc => doc.id));
    }
  };

  // 개별 선택
  const handleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id];
  
      return next;
    });
  };

  // 랜덤 2명 선택
  const handleSelectRandomTwo = () => {
    if (!studentsSnapshot) return;
    const docs = studentsSnapshot.docs;
    if (docs.length <= 2) {
      setSelectedIds(docs.map(doc => doc.id));
    } else {
      const shuffled = docs.map(doc => doc.id).sort(() => Math.random() - 0.5);
      setSelectedIds([shuffled[0], shuffled[1]]);
    }
  };

  // 경험치/레벨업 이펙트
  const triggerExpEffect = (id) => {
    setExpEffectIds((prev) => [...prev, id]);
    setTimeout(() => setExpEffectIds((prev) => prev.filter(eid => eid !== id)), 1200);
  };
  const triggerLevelUpEffect = (id) => {
    setLevelUpEffectIds((prev) => [...prev, id]);
    setTimeout(() => setLevelUpEffectIds((prev) => prev.filter(eid => eid !== id)), 1500);
  };

  // 레벨업 필요 경험치 계산 함수
  const getRequiredExp = (level) => 150 + level * 20;

  // 발표 경험치 부여
  const handleGiveExp = async () => {
    if (!studentsSnapshot) return;
    const expAmount = feverActive ? 20 : 10;
    for (const docSnap of studentsSnapshot.docs) {
      if (selectedIds.includes(docSnap.id)) {
        const student = docSnap.data();
        let exp = (typeof student.exp === 'number' && !isNaN(student.exp) ? student.exp : 0) + expAmount;
        let level = typeof student.level === 'number' && !isNaN(student.level) ? student.level : 0;
        let required = getRequiredExp(level);
        let levelUps = [];
        const originalLevel = level;
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
        const expEvents = [
          { type: 'exp', amount: expAmount, reason: '발표', ts: Date.now() },
          ...levelUps
        ];
        await updateDoc(doc(db, 'copy_students', docSnap.id), {
          exp: exp,
          level: level,
          expEvents: arrayUnion(...expEvents)
        });
        triggerExpEffect(docSnap.id);
        if (levelUps.length > 0) triggerLevelUpEffect(docSnap.id);
      }
    }
  };

  // 메시지 모달
  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    const studentRef = doc(db, 'copy_students', selectedStudent.id);
    const newMessages = [...(selectedStudent.messages || []), { 
      from: 'teacher', 
      text: messageText, 
      ts: Date.now(),
      replyTo: replyToMessage?.ts || null 
    }];
    
    await updateDoc(studentRef, { messages: newMessages });
    setShowMessageModal(false);
    setMessageText('');
    setReplyToMessage(null);
  };

  const handleReplyMessage = (message, studentId) => {
    const studentDoc = studentsSnapshot.docs.find(doc => doc.id === studentId);
    if (studentDoc) {
      setSelectedStudent({ id: studentDoc.id, ...studentDoc.data() });
      setReplyToMessage(message);
      setShowTeacherAlarm(false); // 알림 모달 닫기
      setShowMessageModal(true); // 메시지 모달 열기
    }
  };

  const handlePraiseResponse = async (req, response) => {
    const studentRef = doc(db, 'copy_students', req.studentId);
    const student = (await getDoc(studentRef)).data();
    
    if (req.type === 'friendPraise') {
      // 칭찬 받은 학생의 경험치 증가
      let exp = (typeof student.exp === 'number' && !isNaN(student.exp) ? student.exp : 0) + req.exp;
      let level = student.level || 0;
      let required = getRequiredExp(level);
      
      while (exp >= required) {
        exp -= required;
        level++;
        required = getRequiredExp(level);
      }
      
      // 칭찬한 학생에게 5xp 보상 (응답이 'yes'인 경우)
      if (response === 'yes') {
        const praiseStudentRef = doc(db, 'copy_students', req.from);
        const praiseStudent = (await getDoc(praiseStudentRef)).data();
        let praiseExp = (typeof praiseStudent.exp === 'number' && !isNaN(praiseStudent.exp) ? praiseStudent.exp : 0) + 5;
        let praiseLevel = praiseStudent.level || 0;
        let praiseRequired = getRequiredExp(praiseLevel);
        
        while (praiseExp >= praiseRequired) {
          praiseExp -= praiseRequired;
          praiseLevel++;
          praiseRequired = getRequiredExp(praiseLevel);
        }
        
        await updateDoc(praiseStudentRef, {
          exp: praiseExp,
          level: praiseLevel,
          expEvents: arrayUnion({ 
            type: 'praiseResponse', 
            amount: 5, 
            ts: Date.now(), 
            text: `${student.name}님이 칭찬에 감사합니다!`, 
            result: 'approved' 
          })
        });
      }
      
      await updateDoc(studentRef, {
        exp: exp,
        level: level,
        expEvents: arrayUnion({ 
          type: 'friendPraise', 
          amount: req.exp, 
          ts: req.ts, // ✅ 원본 칭찬 ts 사용
          text: req.text, 
          from: req.studentName, 
          result: 'approved',
          response: response 
        })
      });
      
      let praiseArr = (student.praise || []).map(p => p.ts === req.ts ? { ...p, checked: true, result: 'approved', response } : p);
      await updateDoc(studentRef, { praise: praiseArr });
    }
    // ... existing code ...
  };

  // 퀘스트 모달
  const handleSendQuest = async () => {
    if (!studentsSnapshot) return;
    for (const docSnap of studentsSnapshot.docs) {
      if (selectedIds.includes(docSnap.id)) {
        const student = docSnap.data();
        const newQuests = [...(student.quests || []), { from: 'teacher', text: questText, ts: Date.now(), exp: questExp, status: 'ongoing' }];
        await updateDoc(doc(db, 'copy_students', docSnap.id), {
          quests: newQuests
        });
      }
    }
    setShowQuestModal(false);
    setQuestText('');
    setQuestExp(10);
  };

  // 승인 처리
  const handleApprove = async (req) => {
    if (req.type === 'friendPraise') {
      // 칭찬받은 학생에게 경험치 지급 + 알림 기록
      const studentRef = doc(db, 'copy_students', req.studentId);
      const studentSnap = studentsSnapshot.docs.find(d => d.id === req.studentId);
      let student = studentSnap.data();
      let exp = (typeof student.exp === 'number' && !isNaN(student.exp) ? student.exp : 0) + req.exp;
      let level = typeof student.level === 'number' && !isNaN(student.level) ? student.level : 0;
        let required = getRequiredExp(level);
        let levelUp = false;
        while (exp >= required) {
          exp -= required;
          level += 1;
          levelUp = true;
          required = getRequiredExp(level);
        }
      // 칭찬받은 학생의 데이터 업데이트
      let praiseArr = (student.praise || []).map(p => p.ts === req.ts ? { ...p, checked: true, result: 'approved' } : p);
      await updateDoc(studentRef, {
          exp: exp,
          level: level,
        praise: praiseArr,
        expEvents: arrayUnion({ 
          type: 'friendPraise', 
          amount: req.exp, 
          ts: req.ts, // ✅ 원본 칭찬 ts 사용
          text: req.text, 
          from: req.fromName || '친구', 
          result: 'approved' 
        }),
        notifications: arrayUnion({
          text: `${req.fromName || '친구'}가 "${req.text}" 라고 칭찬해서 +${req.exp}xp를 받았습니다.`,
          ts: req.ts, // ✅ 원본 칭찬 ts 사용
          type: 'praise'
        })
      });
    } else if (req.type === 'selfPraise') {

      // 자기 칭찬: 본인에게 경험치 지급
      const studentRef = doc(db, 'copy_students', req.studentId);
      const studentSnap = studentsSnapshot.docs.find(d => d.id === req.studentId);
      let student = studentSnap.data();
      let exp = (typeof student.exp === 'number' && !isNaN(student.exp) ? student.exp : 0) + req.exp;
      let level = typeof student.level === 'number' && !isNaN(student.level) ? student.level : 0;
      let required = getRequiredExp(level);
      let levelUp = false;
      while (exp >= required) {
        exp -= required;
        level += 1;
        levelUp = true;
        required = getRequiredExp(level);
      }
      let praiseArr = (student.praise || []).map(p => p.ts === req.ts ? { ...p, checked: true, result: 'approved' } : p);
      await updateDoc(studentRef, {
        exp: exp,
        level: level,
        praise: praiseArr,
        expEvents: arrayUnion({ type: 'selfPraise', amount: req.exp, ts: Date.now(), text: req.text, result: 'approved' })
      });
    } else if (req.type === 'message') {

      // 메시지 checked 처리
      const studentRef = doc(db, 'copy_students', req.studentId);
      const studentSnap = studentsSnapshot.docs.find(d => d.id === req.studentId);
      let student = studentSnap.data();
      let msgArr = (student.messages || []).map(m => m.ts === req.ts ? { ...m, checked: true } : m);
      await updateDoc(studentRef, { messages: msgArr });
    } else if (req.type === 'quest') {
      // 퀘스트 승인 처리
      const studentRef = doc(db, 'copy_students', req.studentId);
      const studentSnap = studentsSnapshot.docs.find(d => d.id === req.studentId);
      let student = studentSnap.data();
      // 해당 퀘스트 완료 처리
      let newQuests = (student.quests || []).map(q =>
        q.ts === req.ts ? { ...q, status: 'done', completedAt: Date.now(), requestPending: false } : q
      );
      // 경험치 지급 및 레벨업
      let exp = (typeof student.exp === 'number' && !isNaN(student.exp) ? student.exp : 0) + req.exp;
      let level = typeof student.level === 'number' && !isNaN(student.level) ? student.level : 0;
      let required = getRequiredExp(level);
      let levelUp = false;
      while (exp >= required) {
        exp -= required;
        level += 1;
        levelUp = true;
        required = getRequiredExp(level);
      }
      await updateDoc(studentRef, {
        quests: newQuests,
        exp: exp,
        level: level,
        expEvents: arrayUnion({ type: 'quest', amount: req.exp, ts: Date.now(), text: req.text, result: 'approved' })
      });
    } else {

    }
    setSelectedRequest(null);
  };
  // 거절 처리
  const handleReject = async (req) => {
    if (!rejectReason) return;
    try {
    const studentRef = doc(db, 'copy_students', req.studentId);
    const studentSnap = studentsSnapshot.docs.find(d => d.id === req.studentId);
    let student = studentSnap.data();
    if (req.type === 'friendPraise' || req.type === 'selfPraise') {
      let praiseArr = (student.praise || []).map(p => p.ts === req.ts ? { ...p, checked: true, result: 'rejected', reason: rejectReason } : p);
      await updateDoc(studentRef, {
        praise: praiseArr,
        expEvents: arrayUnion({ type: req.type, amount: 0, ts: Date.now(), text: req.text, result: 'rejected', reason: rejectReason })
      });
    } else if (req.type === 'quest') {
      // 퀘스트 실패 처리
      let newQuests = (student.quests || []).map(q =>
        q.ts === req.ts ? { ...q, status: 'failed', failedAt: Date.now(), reason: rejectReason, requestPending: false } : q
      );
      await updateDoc(studentRef, {
        quests: newQuests,
        expEvents: arrayUnion({ type: 'quest', amount: 0, ts: Date.now(), text: req.text, result: 'rejected', reason: rejectReason })
      });
    }
    } catch (error) {
      console.error('거절 처리 중 오류:', error);
    } finally {
    setRejectReason('');
    setSelectedRequest(null);
    }
  };

  // 퀘스트 성공/실패 처리
  const handleQuestResult = async (studentId, quest, result) => {
    const studentDoc = studentsSnapshot.docs.find(d => d.id === studentId);
    if (!studentDoc) return;
    const student = studentDoc.data();
    let newQuests = (student.quests || []).map(q =>
      q.ts === quest.ts ? { ...q, status: result } : q
    );
    let updates = { quests: newQuests };
    if (result === 'success') {
      // 경험치 지급 및 레벨업 처리
      let exp = (typeof student.exp === 'number' && !isNaN(student.exp) ? student.exp : 0) + quest.exp;
      let level = typeof student.level === 'number' && !isNaN(student.level) ? student.level : 0;
      let required = getRequiredExp(level);
      let levelUp = false;
      while (exp >= required) {
        exp -= required;
        level += 1;
        levelUp = true;
        required = getRequiredExp(level);
      }
      updates.exp = exp;
      updates.level = level;
      updates.expEvents = arrayUnion({ type: 'quest', amount: quest.exp, ts: Date.now(), text: quest.text });
      triggerExpEffect(studentDoc.id);
      if (levelUp) triggerLevelUpEffect(studentDoc.id);
      setQuestResultEffect('퀘스트 성공! 경험치 지급 🎉');
      setTimeout(() => setQuestResultEffect(''), 1500);
    } else {
      setQuestResultEffect('퀘스트 실패 😢');
      setTimeout(() => setQuestResultEffect(''), 1500);
    }
    await updateDoc(doc(db, 'copy_students', studentDoc.id), updates);
    setQuestActionStudent(null);
    setQuestActionQuest(null);
  };

  // 개별 알람 읽음 처리
  const handleMarkAsRead = async (req) => {
    const studentRef = doc(db, 'copy_students', req.studentId);
    const studentSnap = studentsSnapshot.docs.find(d => d.id === req.studentId);
    let student = studentSnap.data();
    if (req.type === 'message') {
      let msgArr = (student.messages || []).map(m => m.ts === req.ts ? { ...m, checked: true } : m);
      await updateDoc(studentRef, { messages: msgArr });
    } else if (req.type === 'friendPraise' || req.type === 'selfPraise') {
      let praiseArr = (student.praise || []).map(p => p.ts === req.ts ? { ...p, checked: true } : p);
      await updateDoc(studentRef, { praise: praiseArr });
    }
  };
  // 모두 읽음 처리
  const handleMarkAllAsRead = async (type) => {
    const filtered = pendingRequests.filter(r => (type === 'message' ? r.type === 'message' : (r.type === 'friendPraise' || r.type === 'selfPraise')));
    for (const req of filtered) {
      await handleMarkAsRead(req);
    }
  };

  function generateBoardCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) return;
    const code = generateBoardCode();
    await setDoc(doc(db, 'copy_boards', code), {
      code,
      createdAt: new Date(),
      columns: [],
      title: newBoardTitle.trim(),
    });
    setShowCreateBoardModal(false);
    setShowBoardModal(false);
    setNewBoardTitle('');
    navigate(`/board/${code}`);
  };

  // 게시판 목록 불러오기
  const fetchBoardList = async () => {
    setBoardListLoading(true);
    const q = query(collection(db, 'copy_boards'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setBoardList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setBoardListLoading(false);
  };

  // 학생 목록 렌더링용 studentRows (테스트 학생은 항상 마지막)
  const studentRows = (studentsSnapshot && !studentsSnapshot.empty)
    ? (() => {
        const arr = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const testIdx = arr.findIndex(s => s.name === '테스트');
        if (testIdx !== -1) {
          const [testStudent] = arr.splice(testIdx, 1);
          arr.push(testStudent);
        }
        return arr;
      })()
    : (() => {
        const arr = initialStudents.map(s => ({ id: s.name, ...s }));
        const testIdx = arr.findIndex(s => s.name === '테스트');
        if (testIdx !== -1) {
          const [testStudent] = arr.splice(testIdx, 1);
          arr.push(testStudent);
        }
        return arr;
      })();

  const order = initialStudents.map(s => s.name);

  const handleAmount = async () => {
    if (!studentsSnapshot || bankSelectedIds.length === 0 || amountValue <= 0) return;
    try {
      const batch = writeBatch(db);
      const now = Date.now();
      const txBase = {
        ts: now,
        amount: amountValue,
        reason: amountType === 'deposit' ? '일괄 입금' : '일괄 출금',
      };

      for (const id of bankSelectedIds) {
        const docSnap = studentsSnapshot.docs.find(d => d.id === id);
        if (!docSnap) continue;
        const student = docSnap.data();
        const current = typeof student.balance === 'number' ? student.balance : 0;
        const newBalance = amountType === 'deposit' ? current + amountValue : current - amountValue;

        const studentRef = doc(db, 'copy_students', id);
        // 잔액 갱신
        batch.update(studentRef, { balance: newBalance });
        // 내역 기록 (교사 일괄 처리)
        const tx = amountType === 'deposit'
          ? { ...txBase, type: 'deposit' }
          : { ...txBase, type: 'spend', customAmount: amountValue };
        batch.update(studentRef, { transactions: arrayUnion(tx) });
      }

      await batch.commit();
    } catch (e) {
      console.error('일괄 금액 처리 실패:', e);
      alert('처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setShowAmountModal(false);
      setAmountValue(0);
      setBankSelectedIds([]);
    }
  };

  // 게임 기록 불러오기
  const fetchTopRecords = async () => {
    const q = query(collection(db, 'reactionGameRecords'), orderBy('ms', 'asc'), limit(5));
    const snap = await getDocs(q);
    setTopRecords(snap.docs.map(d => d.data()));
  };

  // 알람 목록 불러오기
  const fetchAlarms = async () => {
    const q = query(collection(db, 'copy_alarms'), orderBy('targetTime', 'desc'));
    const snap = await getDocs(q);
    setAlarms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // 알람 저장
  const handleSaveAlarm = async () => {
    if (!alarmContent.trim() || !alarmTime) return;
    setAlarmSaving(true);
    try {
      await addDoc(collection(db, 'copy_alarms'), {
        content: alarmContent,
        targetTime: new Date(alarmTime).getTime(),
        isActive: true,
        createdAt: Date.now(),
      });
      setAlarmContent('');
      setAlarmTime('');
      fetchAlarms();
    } finally {
      setAlarmSaving(false);
    }
  };

  // 알람 삭제
  const handleDeleteAlarm = async (alarmId) => {
    await deleteDoc(doc(db, 'copy_alarms', alarmId));
    fetchAlarms();
  };

  // 학생 쿠폰 불러오기
  const handleOpenCouponBox = async (student) => {
    setSelectedStudent(student);
    setCouponBoxOpen(true);
    // Firestore에서 쿠폰 내역 불러오기
    const docSnap = await getDoc(doc(db, 'copy_students', student.id));
    const data = docSnap.data();
    setStudentCoupons(data.coupons || []);
  };

  // 쿠폰 사용 처리 (UI 즉시 반영, 5원/10원 쿠폰은 입금)
  const handleUseCoupon = async (coupon) => {
    try {
      if (coupon.used) return;
      const studentRef = doc(db, 'copy_students', coupon.studentId || selectedStudent.id);
      const studentDoc = await getDoc(studentRef);
      if (!studentDoc.exists()) {
        alert('학생 정보를 찾을 수 없습니다.');
        return;
      }
      const studentData = studentDoc.data();
      // 쿠폰 사용 처리
      const updatedCoupons = (studentData.coupons || []).map(c =>
        (c.ts && coupon.ts && c.ts === coupon.ts) ||
        (c.id && coupon.id && c.id === coupon.id) ||
        (c.receivedAt && coupon.receivedAt && c.receivedAt === coupon.receivedAt)
          ? { ...c, used: true, usedAt: Date.now() }
          : c
      );
      // 5원/10원 쿠폰이면 입금
      let newBalance = studentData.balance || 0;
      if (coupon.label === '5원') newBalance += 5;
      if (coupon.label === '10원') newBalance += 10;
      await updateDoc(studentRef, { coupons: updatedCoupons, balance: newBalance });
      setStudentCoupons(updatedCoupons);
    } catch (error) {
      console.error('쿠폰 사용 중 오류:', error);
      alert('쿠폰 사용 중 오류가 발생했습니다.');
    }
  };
  window.handleUseCoupon = handleUseCoupon;

  // ====== 테스트문구 ======
  

  // feverTime 토글 함수 (사본용 copy_settings 사용)
  const handleFeverTime = async () => {
    const feverRef = doc(db, 'copy_settings', 'feverTime');
    if (!feverActive) {
      await setDoc(feverRef, { active: true, startTs: Date.now() });
    } else {
      await setDoc(feverRef, { active: false });
    }
  };

  // 레벨업 이력 마이그레이션 함수 (1개씩 안전하게 추가)
  const handleLevelUpMigration = async () => {
    if (!window.confirm('모든 학생의 과거 레벨업 이력을 분석해 levelUp 이벤트를 추가합니다. 진행할까요?')) return;
    if (!studentsSnapshot) return;
    let updatedCount = 0;
    for (const docSnap of studentsSnapshot.docs) {
      const student = docSnap.data();
      const expEvents = Array.isArray(student.expEvents) ? [...student.expEvents] : [];
      const existingLevelUpTs = new Set(expEvents.filter(e => e.type === 'levelUp').map(e => e.ts));
      const sortedEvents = expEvents
        .filter(e => e.type === 'exp' || e.type === 'friendPraise' || e.type === 'selfPraise' || e.type === 'quest')
        .sort((a, b) => a.ts - b.ts);
      let currentExp = 0;
      let currentLevel = 0;
      const newLevelUps = [];
      sortedEvents.forEach(event => {
        currentExp += event.amount || 0;
        while (currentExp >= (150 + currentLevel * 10)) {
          currentExp -= (150 + currentLevel * 10);
          const levelUpTs = event.ts;
          if (!existingLevelUpTs.has(levelUpTs)) {
            newLevelUps.push({
              type: 'levelUp',
              fromLevel: currentLevel,
              toLevel: currentLevel + 1,
              ts: levelUpTs
            });
          }
          currentLevel++;
        }
      });
      // 한 번에 1개씩 추가
      for (const levelUp of newLevelUps) {
        try {
          await updateDoc(doc(db, 'copy_students', docSnap.id), {
            expEvents: arrayUnion(levelUp)
          });
          updatedCount++;
        } catch (e) {
          alert(`학생 ${student.name}의 levelUp 이벤트 추가 중 오류: ${e.message}`);
        }
      }
    }
    alert(`마이그레이션 완료! levelUp 이벤트가 추가된 총 개수: ${updatedCount}`);
  };



  // 쿠폰 이벤트 트리거 함수
  const handleTriggerCouponEvent = async (studentId) => {
    try {
      await updateDoc(doc(db, 'copy_students', studentId), {
        triggerCouponEvent: {
          active: true,
          ts: Date.now()
        }
      });
      setAlertMsg('쿠폰 이벤트가 활성화되었습니다!');
      setTimeout(() => setAlertMsg(''), 2000);
    } catch (error) {
      console.error('쿠폰 이벤트 트리거 실패:', error);
      setAlertMsg('쿠폰 이벤트 활성화에 실패했습니다.');
      setTimeout(() => setAlertMsg(''), 2000);
    }
  };

  // URL 유효성 검사 함수
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // URL 프로토콜 추가 함수
  const addProtocol = (url) => {
    if (!url.match(/^https?:\/\//i)) {
      return `https://${url}`;
    }
    return url;
  };

  // 링크 전송 함수
  const handleSendLink = async () => {
    if (!linkUrl.trim()) {
      setLinkError('URL을 입력해주세요.');
        return;
      }
      
    const formattedUrl = addProtocol(linkUrl);
    if (!isValidUrl(formattedUrl)) {
      setLinkError('올바른 URL 형식이 아닙니다.');
      return;
    }

    const linkData = {
      url: formattedUrl,
      title: linkTitle.trim() || formattedUrl,
      description: linkDescription.trim(),
      category: linkCategory,
      from: 'teacher',
      ts: Date.now(),
      visits: []
    };

    try {
      const batch = writeBatch(db);
      const targetStudents = selectedStudentsForLink.length > 0 
        ? selectedStudentsForLink 
        : studentsSnapshot.docs.map(doc => doc.id);

      targetStudents.forEach(studentId => {
        const studentRef = doc(db, 'copy_students', studentId);
        batch.update(studentRef, {
          links: arrayUnion(linkData)
        });
      });

      await batch.commit();
      setLinkSuccess('링크가 성공적으로 전송되었습니다.');
      setShowLinkModal(false);
      setLinkUrl('');
      setLinkTitle('');
      setLinkDescription('');
      setLinkCategory('general');
      setSelectedStudentsForLink([]);
    } catch (error) {
      setLinkError('링크 전송 중 오류가 발생했습니다.');
      console.error('Error sending link:', error);
    }
  };

  // 링크 통계 가져오기
  const fetchLinkAnalytics = async () => {
    try {
      const analytics = [];
      for (const studentDoc of studentsSnapshot.docs) {
        const student = studentDoc.data();
        const studentLinks = student.links || [];
        studentLinks.forEach(link => {
          const existingAnalytics = analytics.find(a => a.url === link.url && a.ts === link.ts);
          if (existingAnalytics) {
            existingAnalytics.visits += link.visits?.length || 0;
            if (!existingAnalytics.students.includes(studentDoc.id)) {
              existingAnalytics.students.push(studentDoc.id);
            }
          } else {
            analytics.push({
              url: link.url,
              title: link.title,
              category: link.category,
              visits: link.visits?.length || 0,
              students: [studentDoc.id],
              ts: link.ts
            });
          }
        });
      }
      setLinkAnalytics(analytics.sort((a, b) => b.ts - a.ts));
      console.log('Manual link analytics fetch completed:', analytics.length, 'links found');
    } catch (error) {
      console.error('Error fetching link analytics:', error);
    }
  };

  // 실시간 링크 통계 업데이트
  useEffect(() => {
    if (studentsSnapshot && studentsSnapshot.docs) {
      const updateLinkAnalytics = async () => {
        try {
          const analytics = [];
          for (const studentDoc of studentsSnapshot.docs) {
            const student = studentDoc.data();
            const studentLinks = student.links || [];
            studentLinks.forEach(link => {
              const existingAnalytics = analytics.find(a => a.url === link.url && a.ts === link.ts);
              if (existingAnalytics) {
                existingAnalytics.visits += link.visits?.length || 0;
                if (!existingAnalytics.students.includes(studentDoc.id)) {
                  existingAnalytics.students.push(studentDoc.id);
                }
              } else {
                analytics.push({
                  url: link.url,
                  title: link.title,
                  category: link.category,
                  visits: link.visits?.length || 0,
                  students: [studentDoc.id],
                  ts: link.ts
                });
              }
            });
          }
          setLinkAnalytics(analytics.sort((a, b) => b.ts - a.ts));
          console.log('Link analytics updated:', analytics.length, 'links found');
        } catch (error) {
          console.error('Error fetching link analytics:', error);
        }
      };
      updateLinkAnalytics();
    }
  }, [studentsSnapshot]);

  // 링크 삭제 함수 수정
  const handleDeleteLink = async (link) => {
    if (!window.confirm('정말 이 링크를 모든 학생의 히스토리에서 삭제하시겠습니까?')) return;
    // 1. UI에서 즉시 삭제
    setLinkAnalytics(prev => prev.filter(l => !(l.url === link.url && l.ts === link.ts)));
    try {
      // 2. Firestore에서 삭제
      const studentsSnap = await getDocs(collection(db, 'copy_students'));
      const batch = writeBatch(db);
      studentsSnap.forEach(docSnap => {
        const studentLinks = docSnap.data().links || [];
        const filteredLinks = studentLinks.filter(l => !(l.url === link.url && l.ts === link.ts));
        if (filteredLinks.length !== studentLinks.length) {
          batch.update(docSnap.ref, { links: filteredLinks });
        }
      });
      await batch.commit();
      // (선택) fetchLinkAnalytics(); // 필요시 재동기화
    } catch (e) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 조건부 렌더링
  if (shouldShowLogin) {
    return null;
  }

  if (shouldShowLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, rgba(224,247,250,0.6) 0%, rgba(227,242,253,0.6) 100%), url(/TR_bg.png) center/cover no-repeat' }}>
        <div style={{ background: '#fff', padding: '32px', borderRadius: 28, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 16, color: '#1976d2' }}>로딩중...</div>
          <div style={{ color: '#666' }}>잠시만 기다려주세요.</div>
        </div>
      </div>
    );
  }

  if (shouldShowError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, rgba(224,247,250,0.6) 0%, rgba(227,242,253,0.6) 100%), url(/TR_bg.png) center/cover no-repeat' }}>
        <div style={{ background: '#fff', padding: '32px', borderRadius: 28, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 16, color: '#d72660' }}>오류 발생</div>
          <div style={{ color: '#666' }}>{firestoreError.message}</div>
        </div>
      </div>
    );
  }

  if (shouldShowNoData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, rgba(224,247,250,0.6) 0%, rgba(227,242,253,0.6) 100%), url(/TR_bg.png) center/cover no-repeat' }}>
        <div style={{ background: '#fff', padding: '40px', borderRadius: 28, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center', maxWidth: 500 }}>
          <div style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: 20, color: '#1976d2' }}>🍭 사본 데이터가 없습니다</div>
          <div style={{ color: '#666', fontSize: '1.1rem', lineHeight: 1.5, marginBottom: 24 }}>
            사본 데이터베이스에 학생 데이터가 없습니다.<br/>
            아래 버튼을 눌러 68명의 학생을 추가해보세요!
          </div>
          <button 
            onClick={addNewStudents}
            style={{ 
              background: 'linear-gradient(135deg, #4caf50, #8bc34a)', 
              border: 'none', 
              borderRadius: 20, 
              padding: '12px 32px', 
              boxShadow: '0 4px 16px rgba(76, 175, 80, 0.4)', 
              cursor: 'pointer', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 8, 
              fontWeight: 700, 
              color: '#fff', 
              fontSize: 16,
              transition: 'all 0.2s',
              animation: 'pulse 2s infinite'
            }}
          >
            <span>학생 명단 동기화</span>
          </button>
        </div>
        
        {/* CSS 애니메이션 추가 */}
        <style>
          {`
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.05); }
              100% { transform: scale(1); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <React.Fragment>
      
      {/* 승인/거절 모달: selectedRequest가 있으면 항상 최상위에서 렌더 */}
      {selectedRequest && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
          <div style={{ background: '#fff', padding: '32px 28px 24px 28px', borderRadius: 28, minWidth: 340, maxWidth: 400, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center', position: 'relative' }}>
            <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 18, color: '#1976d2', letterSpacing: '-0.5px' }}>요청 처리</div>
            <div style={{ marginBottom: 12, color: '#222', fontWeight: 600 }}>{selectedRequest.text}</div>
            {(selectedRequest.type === 'friendPraise' || selectedRequest.type === 'selfPraise') && <div style={{ color: '#888', marginBottom: 8 }}>희망 경험치: {selectedRequest.exp}</div>}
            {(selectedRequest.type === 'quest') && <div style={{ color: '#888', marginBottom: 8 }}>보상 경험치: {selectedRequest.exp}</div>}
            <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
              <button onClick={() => handleApprove(selectedRequest)} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 22px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>승인</button>
              <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="거절/실패 사유" style={{ borderRadius: 999, border: '1.5px solid #ffe4ec', padding: '8px 16px', fontSize: 15, outline: 'none', background: '#f7faf7', color: '#d72660', minWidth: 0, flex: 1 }} />
              <button onClick={async () => {
                if (!rejectReason) return;
                try {
                  await handleReject(selectedRequest);
                } finally {
                  setSelectedRequest(null);
                  setRejectReason('');
                }
              }} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '6px 14px', fontSize: 14, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer' }}>거절</button>
            </div>
            <button onClick={() => setSelectedRequest(null)} style={{ marginTop: 18, fontWeight: 600, borderRadius: 999, background: '#f7faf7', color: '#888', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>닫기</button>
          </div>
        </div>
      )}
      {/* 기존 화면 전체 */}
      <div style={{ minHeight: '100vh', width: '100vw', padding: '32px',
        background: 'linear-gradient(135deg, rgba(224,247,250,0.6) 0%, rgba(227,242,253,0.6) 100%), url(/TR_bg.png) center/cover no-repeat',
        overflowX: 'hidden', position: 'relative' }}>
        {/* 배너 이미지 */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 32, marginTop: 8 }}>
          <img src="/candyshop_banner.png" alt="JAMMANBO CANDY SHOP 배너" style={{ maxWidth: 480, width: '90vw', height: 'auto', borderRadius: 18, boxShadow: '0 4px 24px #b2ebf240', display: 'block' }} />
        </div>
        {/* 상단 버튼 그룹 */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            onClick={handleSelectAll}
            style={{
              background: '#fffefb', border: '2px solid #a7d7c5', color: '#1976d2', fontWeight: 'bold', borderRadius: 12, boxShadow: '0 2px 8px #a7d7c540', padding: '8px 18px', fontSize: 14, minWidth: 70, transition: 'all 0.2s', cursor: 'pointer'
            }}
          >전체 선택/해제</button>

          <button
            onClick={() => setShowEventExpModal(true)}
            style={{
              background: '#e0f7fa',
              border: '2px solid #1976d2',
              color: '#1976d2', fontWeight: 'bold', borderRadius: 12, boxShadow: '0 2px 8px #b2ebf240', padding: '8px 18px', fontSize: 14, minWidth: 70, transition: 'all 0.2s', cursor: 'pointer', marginLeft: 0
            }}
          >이벤트 경험치 지급</button>
          <button
            onClick={() => {
              if (selectedIds.length === 0) {
                setAlertMsg('학생을 한 명 이상 선택하세요!');
                return;
              }
              selectedIds.forEach(id => handleTriggerCouponEvent(id));
            }}
            disabled={selectedIds.length === 0}
            style={{
              background: '#e0f7fa',
              border: '2px solid #1976d2',
              color: '#1976d2',
              fontWeight: 'bold',
              borderRadius: 12,
              boxShadow: '0 2px 8px #b2ebf240',
              padding: '8px 18px',
              fontSize: 14,
              minWidth: 70,
              transition: 'all 0.2s',
              cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
              opacity: selectedIds.length === 0 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginLeft: 0
            }}
            title="선택한 학생에게 레벨업 카드뽑기(쿠폰) 이벤트를 다시 보여줍니다"
          >
            <span style={{ fontSize: 18, marginRight: 4 }}>🎁</span>
            쿠폰 이벤트
          </button>
          <button
            onClick={handleGiveExp}
            style={{
              background: '#ffe4ec',
              border: '2px solid #ffb6b9',
              color: '#d72660', fontWeight: 'bold', borderRadius: 12, boxShadow: '0 2px 8px #f8bbd0a0', padding: '8px 18px', fontSize: 14, minWidth: 70, transition: 'all 0.2s', cursor: 'pointer', opacity: 1
            }}
          >발표 경험치</button>
          <button
            onClick={() => {
          
              if (selectedIds.length === 0) {
                setAlertMsg('학생을 한 명 이상 선택하세요!');
                return;
              }
              setShowMessageModal(true);
            }}
            style={{
              background: '#ffe4ec',
              border: '2px solid #ffb6b9',
              color: '#d72660', fontWeight: 'bold', borderRadius: 12, boxShadow: '0 2px 8px #f8bbd0a0', padding: '8px 18px', fontSize: 14, minWidth: 70, transition: 'all 0.2s', cursor: 'pointer', opacity: 1
            }}
          >메세지 보내기</button>
          <button
            onClick={() => {
          
              if (selectedIds.length === 0) {
                setAlertMsg('학생을 한 명 이상 선택하세요!');
                return;
              }
              setShowQuestModal(true);
            }}
            style={{
              background: '#ffe4ec',
              border: '2px solid #ffb6b9',
              color: '#d72660', fontWeight: 'bold', borderRadius: 12, boxShadow: '0 2px 8px #f8bbd0a0', padding: '8px 18px', fontSize: 14, minWidth: 70, transition: 'all 0.2s', cursor: 'pointer', opacity: 1
            }}
          >퀘스트 주기</button>
          <button
            onClick={() => setShowBoardChoiceModal(true)}
            style={{
              background: '#e0f7fa', border: '2px solid #1976d2', color: '#1976d2', fontWeight: 'bold', borderRadius: 12, boxShadow: '0 2px 8px #b2ebf240', padding: '8px 18px', fontSize: 14, minWidth: 70, transition: 'all 0.2s', cursor: 'pointer', marginLeft: 0
            }}
          >게시판 개설</button>
          <button
            onClick={() => setShowLinkModal(true)}
            style={{
              background: '#e0f7fa',
              border: '2px solid #1976d2',
              color: '#1976d2',
              fontWeight: 'bold',
              borderRadius: 12,
              boxShadow: '0 2px 8px #b2ebf240',
              padding: '8px 18px',
              fontSize: 14,
              minWidth: 70,
              transition: 'all 0.2s',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: 1
            }}
          >
            <LinkIcon style={{ fontSize: 20 }} />
            링크 제공
          </button>
          <button
            onClick={() => {
              fetchLinkAnalytics();
              setShowLinkStatsModal(true);
            }}
            style={{
              background: '#fffde7',
              border: '2px solid #ff9800',
              color: '#ff9800',
              fontWeight: 'bold',
              borderRadius: 12,
              boxShadow: '0 2px 8px #ffd54f30',
              padding: '8px 18px',
              fontSize: 14,
              minWidth: 70,
              transition: 'all 0.2s',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: 1
            }}
          >
            <BarChartIcon style={{ fontSize: 20 }} />
            링크 통계
          </button>
        </div>
        {alertMsg && (
          <div style={{position:'fixed',top:24,left:'50%',transform:'translateX(-50%)',background:'#ffebee',color:'#c62828',padding:'12px 32px',borderRadius:12,fontWeight:600,fontSize:16,zIndex:9999,boxShadow:'0 2px 8px #c6282820'}}
            onClick={()=>setAlertMsg('')}
          >{alertMsg}</div>
        )}
        {/* 학생 카드 목록 */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          margin: '0 auto',
          width: '100%',
          maxWidth: 1600,
          justifyContent: 'center',
        }}>
          {studentRows.map((student, idx) => (
            <div
              key={student.id}
              style={{
                width: 350, // 135%로 확대
                margin: 16, // 상하좌우 16px
                aspectRatio: '1 / 1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
              }}
            >
              <StudentCard
                student={{
                  ...student,
                  levelName: student.levelName || (typeof student.level === 'number' ? (['알사탕','새콤한 사탕','막대사탕','롤리팝','수제 사탕','사탕 마스터'][student.level] || '알사탕') : '알사탕'),
                  emotionIcon: student.emotionIcon || null,
                }}
              selected={selectedIds.includes(student.id)}
              onSelect={() => handleSelect(student.id)}
              onOptionClick={(type) => {
                if (type === 'exp') handleGiveExp();
                  else if (type === 'message') {
                    setSelectedStudent(student);
                    setShowMessageModal(true);
                  }
                else if (type === 'quest') setShowQuestModal(true);
                  else if (type === 'couponEvent') handleTriggerCouponEvent(student.id);
              }}
              expEffect={expEffectIds && expEffectIds.includes(student.id)}
              levelUpEffect={levelUpEffectIds && levelUpEffectIds.includes(student.id)}
              onQuestClick={null}
              onQuestApprove={quest => handleApprove({ ...quest, type: 'quest', studentId: student.id, studentName: student.name })}
                onQuestFail={quest => { setSelectedRequest({ ...quest, type: 'quest', studentId: student.id, studentName: student.name }); setRejectReason(''); }}
            />
            </div>
          ))}
        </div>
        {/* 상단 고정 동작 버튼 (TeacherPage와 동일 스타일) */}
        <div style={{ position: 'fixed', top: 24, right: 32, zIndex: 2000, display: 'flex', flexDirection: 'row', gap: 18, alignItems: 'center' }}>
          {/* AI 분석 아이콘 버튼 */}
          <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }} title="AI 학습일지 분석" onClick={() => setShowAIAnalysisModal(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9ZM19 21H5V3H13V9H19V21Z" fill="#667eea"/>
              <path d="M7 12H17V14H7V12ZM7 16H13V18H7V16Z" fill="#667eea"/>
            </svg>
          </div>

          {/* 유리병 아이콘 버튼 */}
          <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }} title="학급 캔디 유리병" onClick={() => setShowJarModal(true)}>
            <img src="/jar2.png" alt="유리병" style={{ width: 32, height: 32, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px #b2ebf2a0)' }} />
          </div>

          {/* 종(알림) 버튼 */}
          <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }} title="학생 요청 알림" onClick={() => setShowTeacherAlarm(true)}>
            <NotificationsActiveIcon fontSize="large" color="primary" />
            {pendingRequests.length > 0 && (
              <span style={{ position: 'absolute', top: 2, right: 2, background: '#ff1744', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 'bold', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
                {pendingRequests.length}
              </span>
            )}
          </div>
          {/* 단소급수미션 버튼 */}
          <button onClick={() => {setShowRecorderModal(true); fetchRecorderMissions();}} style={{ background: '#f3e5f5', border: 'none', borderRadius: 999, padding: '8px 18px', boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#7b1fa2', fontSize: 16 }} title="단소급수미션">
            <MusicNoteIcon style={{ color: '#7b1fa2', fontSize: 28 }} />
            <span style={{ fontWeight: 700, color: '#7b1fa2', fontSize: 16 }}>단소급수미션</span>
          </button>
          
          {/* 심화 단소급수미션 버튼 */}
          <button onClick={() => {setShowRecorderAdvancedModal(true); fetchRecorderMissionsAdvanced();}} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', borderRadius: 999, padding: '8px 18px', boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#fff', fontSize: 16 }} title="단소급수미션(심화)">
            <MusicNoteIcon style={{ color: '#fff', fontSize: 28 }} />
            <span style={{ fontWeight: 700, color: '#fff', fontSize: 16 }}>단소급수미션(심화)</span>
          </button>
          {/* 공지사항(사이렌) 버튼 */}
          <button onClick={() => {setShowNoticeModal(true); fetchAlarms();}} style={{ background: '#fffde7', border: 'none', borderRadius: 999, padding: '8px 18px', boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#f57f17', fontSize: 16 }} title="공지&예약 관리">
            <CampaignIcon style={{ color: '#f57f17', fontSize: 28 }} />
            <span style={{ fontWeight: 700, color: '#f57f17', fontSize: 16 }}>공지&예약</span>
          </button>
          <button onClick={()=>setShowBankModal(true)} style={{ background: '#fffde7', border: 'none', borderRadius: 999, padding: '8px 18px', boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <StorefrontIcon style={{ color: '#d72660', fontSize: 28 }} />
            <span style={{ fontWeight: 700, color: '#d72660', fontSize: 16 }}>캔디숍</span>
          </button>
          {/* 역사학습 버튼 제거 (요청) */}
        </div>
        
        {/* CSS 애니메이션 추가 */}
        <style>
          {`
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.05); }
              100% { transform: scale(1); }
            }
          `}
        </style>
        {/* 알림 모달 UI */}
        {showTeacherAlarm && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
            <div style={{ background: '#fff', padding: '32px 28px 24px 28px', borderRadius: 28, minWidth: 420, maxHeight: 600, overflowY: 'auto', boxShadow: '0 4px 32px #b2ebf240', maxWidth: '90vw' }}>
              <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 18, color: '#1976d2', letterSpacing: '-0.5px' }}>학생 요청 알림</div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <button onClick={() => setAlarmTab('message')} style={{ fontWeight: alarmTab==='message'?700:500, borderRadius: 999, background: alarmTab==='message' ? '#e0f7fa' : '#f7faf7', color: '#1976d2', border: 'none', padding: '7px 18px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>메시지</button>
                <button onClick={() => setAlarmTab('praise')} style={{ fontWeight: alarmTab==='praise'?700:500, borderRadius: 999, background: alarmTab==='praise' ? '#e0f7fa' : '#f7faf7', color: '#1976d2', border: 'none', padding: '7px 18px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>칭찬 요청</button>
                <button onClick={() => setAlarmTab('quest')} style={{ fontWeight: alarmTab==='quest'?700:500, borderRadius: 999, background: alarmTab==='quest' ? '#e0f7fa' : '#f7faf7', color: '#1976d2', border: 'none', padding: '7px 18px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>퀘스트 요청</button>
                <button onClick={() => setAlarmTab('historyMessage')} style={{ fontWeight: alarmTab==='historyMessage'?700:500, borderRadius: 999, background: alarmTab==='historyMessage' ? '#e0f7fa' : '#f7faf7', color: '#1976d2', border: 'none', padding: '7px 18px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>과거 메시지</button>
                <button onClick={() => setAlarmTab('historyPraise')} style={{ fontWeight: alarmTab==='historyPraise'?700:500, borderRadius: 999, background: alarmTab==='historyPraise' ? '#e0f7fa' : '#f7faf7', color: '#1976d2', border: 'none', padding: '7px 18px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>과거 칭찬</button>
              </div>
              {alarmTab === 'message' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0 }}>새로운 메시지</h3>
                    <button onClick={() => handleMarkAllAsRead('message')} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '6px 18px', fontSize: 14, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>모두 읽음으로 표시</button>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {pendingRequests.filter(r => r.type === 'message').length === 0 && <li style={{ color: '#888', padding: '18px 0', textAlign: 'center' }}>새로운 메시지가 없습니다.</li>}
                    {pendingRequests.filter(r => r.type === 'message').map((req, idx) => (
                      <li key={idx} style={{ padding: '12px 16px', background: '#fff', borderRadius: 12, marginBottom: 8, boxShadow: '0 2px 8px #e0e0e0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{req.studentName}</div>
                            <div style={{ color: '#666', marginBottom: 8 }}>{req.text}</div>
                            {req.replyTo && <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>↳ 원본 메시지에 대한 답장</div>}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleReplyMessage(req, req.studentId)} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '6px 12px', fontSize: 13, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>답장</button>
                            <button onClick={() => handleMarkAsRead(req)} style={{ fontWeight: 600, borderRadius: 999, background: '#f5f5f5', color: '#666', border: 'none', padding: '6px 12px', fontSize: 13, boxShadow: '0 2px 8px #e0e0e0', cursor: 'pointer', transition: 'all 0.2s' }}>읽음</button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {alarmTab === 'praise' && (
                <>
                  <div style={{ textAlign: 'right', marginBottom: 8 }}>
                    <button onClick={() => handleMarkAllAsRead('praise')} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '6px 18px', fontSize: 14, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>모두 읽음</button>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {pendingRequests.filter(r => r.type === 'friendPraise' || r.type === 'selfPraise').length === 0 && <li style={{ color: '#888', padding: '18px 0', textAlign: 'center' }}>새로운 칭찬 요청이 없습니다.</li>}
                    {pendingRequests.filter(r => r.type === 'friendPraise' || r.type === 'selfPraise').map((req, idx) => {
                      let targetText = '';
                      if (req.type === 'selfPraise') {
                        targetText = `${req.studentName} (나 칭찬)`;
                      } else if (req.type === 'friendPraise') {
                        // 칭찬한 사람 → 칭찬받은 사람 형태로 표시
                        targetText = `${req.praisedBy} → ${req.studentName} (친구 칭찬)`;
                      }
                      return (
                        <li key={idx} style={{ marginBottom: 16, borderBottom: '1px solid #e0f7fa', paddingBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 4, color: '#1976d2' }}>{targetText}</div>
                            <div style={{ marginBottom: 4, color: '#222' }}>{req.text}</div>
                            <div style={{ color: '#90caf9', fontSize: 13 }}>{new Date(req.ts).toLocaleString()}</div>
                            <div>희망 경험치: {req.exp}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <button onClick={() => handleApprove(req)} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '6px 14px', fontSize: 14, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', marginBottom: 4 }}>승인</button>
                            <button onClick={() => { setSelectedRequest(req); setRejectReason(''); }} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '6px 14px', fontSize: 14, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer' }}>거절</button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              {alarmTab === 'quest' && (
                <>
                  <div style={{ textAlign: 'right', marginBottom: 8 }}>
                    <button onClick={() => handleMarkAllAsRead('quest')} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '6px 18px', fontSize: 14, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>모두 읽음</button>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {pendingRequests.filter(r => r.type === 'quest').length === 0 && <li style={{ color: '#888', padding: '18px 0', textAlign: 'center' }}>새로운 퀘스트 요청이 없습니다.</li>}
                    {pendingRequests.filter(r => r.type === 'quest').map((req, idx) => (
                      <li key={'quest-'+idx} style={{ marginBottom: 16, borderBottom: '1px solid #e0f7fa', paddingBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 4, color: '#d72660' }}>{req.studentName} (퀘스트)</div>
                          <div style={{ marginBottom: 4, color: '#222' }}>{req.text}</div>
                          <div style={{ color: '#90caf9', fontSize: 13 }}>{new Date(req.ts).toLocaleString()}</div>
                          <div>보상 경험치: {req.exp}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <button onClick={() => handleApprove(req)} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '6px 14px', fontSize: 14, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', marginBottom: 4 }}>승인</button>
                          <button onClick={() => { setSelectedRequest(req); setRejectReason(''); }} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '6px 14px', fontSize: 14, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer' }}>실패</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {alarmTab === 'historyMessage' && (
                <>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#1976d2', textAlign: 'center' }}>모든 학생의 메시지 내역</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 350, overflowY: 'auto' }}>
                    {studentsSnapshot && studentsSnapshot.docs.flatMap(doc => {
                      const student = doc.data();
                      return (student.messages || []).map((msg, idx) => ({
                        studentName: student.name,
                        text: msg.text,
                        ts: msg.ts,
                        checked: msg.checked,
                      }));
                    }).sort((a, b) => b.ts - a.ts).map((msg, idx) => (
                      <li key={idx} style={{ marginBottom: 12, borderBottom: '1px solid #e0f7fa', paddingBottom: 6 }}>
                        <div style={{ fontWeight: 600, color: '#1976d2' }}>{msg.studentName}</div>
                        <div style={{ color: '#222', marginBottom: 2 }}>{msg.text}</div>
                        <div style={{ color: '#90caf9', fontSize: 13 }}>{new Date(msg.ts).toLocaleString()}</div>
                        <div style={{ color: msg.checked ? '#43a047' : '#ff9800', fontSize: 13 }}>{msg.checked ? '읽음' : '미확인'}</div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {alarmTab === 'historyPraise' && (
                <>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#1976d2', textAlign: 'center' }}>모든 학생의 칭찬 내역</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 350, overflowY: 'auto' }}>
                    {studentsSnapshot && studentsSnapshot.docs.flatMap(doc => {
                      const student = doc.data();
                      return (student.praise || []).map((p, idx) => {
                        const praiseData = {
                          studentId: doc.id,
                          studentName: student.name,
                          text: p.text,
                          ts: p.ts,
                          checked: p.checked,
                          result: p.result,
                          reason: p.reason,
                          self: p.self,
                          friends: p.friends,
                          type: p.type,
                          fromName: p.fromName,
                        };
                        // 디버깅: 칭찬 데이터 구조 출력
                        console.log('🔍 칭찬 데이터:', {
                          studentName: student.name,
                          text: p.text,
                          self: p.self,
                          friends: p.friends,
                          type: p.type,
                          fromName: p.fromName,
                          hasType: !!p.type,
                          hasFromName: !!p.fromName,
                          hasFriends: Array.isArray(p.friends),
                          friendsLength: Array.isArray(p.friends) ? p.friends.length : 0
                        });
                        return praiseData;
                      });
                    }).sort((a, b) => b.ts - a.ts).map((p, idx) => {
                      return (
                        <li key={idx} style={{ 
                          marginBottom: 16, 
                          borderBottom: '1px solid #e0f7fa', 
                          paddingBottom: 12,
                          background: '#f8fffe',
                          borderRadius: 8,
                          padding: 12
                        }}>
                          {/* 칭찬 관계 표시 */}
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            marginBottom: 8,
                            fontSize: 14,
                            fontWeight: 600
                          }}>
                            {(() => {
                              // 디버깅: 표시 로직 분기 출력
                              console.log('🎯 표시 로직 분기:', {
                                studentName: p.studentName,
                                text: p.text,
                                self: p.self,
                                hasFriends: Array.isArray(p.friends) && p.friends.length > 0,
                                friends: p.friends,
                                type: p.type,
                                condition: p.self ? 'SELF' : 
                                          (Array.isArray(p.friends) && p.friends.length > 0) ? 'HAS_FRIENDS' :
                                          (p.type === 'friendPraise') ? 'OLD_FRIEND_PRAISE' : 'OTHER'
                              });
                              return null;
                            })()}
                            {p.self ? (
                              <>
                                <span style={{ 
                                  background: '#e3f2fd', 
                                  color: '#1976d2', 
                                  padding: '4px 8px', 
                                  borderRadius: 12,
                                  fontSize: 12,
                                  marginRight: 8
                                }}>
                                  자기 칭찬
                                </span>
                                <span style={{ color: '#1976d2' }}>{p.studentName}</span>
                              </>
                            ) : p.type === 'friendPraise' && p.fromName ? (
                              <>
                                <span style={{ color: '#1976d2' }}>{p.fromName}</span>
                                <span style={{ 
                                  margin: '0 8px', 
                                  color: '#ff9800',
                                  fontSize: 16
                                }}>→</span>
                                <span style={{ 
                                  background: '#fff3e0', 
                                  color: '#f57c00', 
                                  padding: '4px 8px', 
                                  borderRadius: 12,
                                  fontSize: 12,
                                  border: '1px solid #ffcc02'
                                }}>
                                  {p.studentName}
                                </span>
                              </>
                            ) : Array.isArray(p.friends) && p.friends.length > 0 && studentsSnapshot ? (
                              <>
                                <span style={{ color: '#1976d2' }}>{p.studentName}</span>
                                <span style={{ 
                                  margin: '0 8px', 
                                  color: '#ff9800',
                                  fontSize: 16
                                }}>→</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {p.friends.map(fid => {
                                    const fdoc = studentsSnapshot.docs.find(d => d.id === fid);
                                    const friendName = fdoc ? fdoc.data().name : 'unknown';
                                    return (
                                      <span key={fid} style={{ 
                                        background: '#fff3e0', 
                                        color: '#f57c00', 
                                        padding: '4px 8px', 
                                        borderRadius: 12,
                                        fontSize: 12,
                                        border: '1px solid #ffcc02'
                                      }}>
                                        {friendName}
                                      </span>
                                    );
                                  })}
                                </div>
                              </>
                            ) : p.type === 'friendPraiseReceived' ? (
                              <>
                                <span style={{ 
                                  background: '#ffebee', 
                                  color: '#d32f2f', 
                                  padding: '4px 8px', 
                                  borderRadius: 12,
                                  fontSize: 12,
                                  marginRight: 8
                                }}>
                                  과거 친구 칭찬
                                </span>
                                <span style={{ color: '#1976d2' }}>{p.studentName}</span>
                              </>
                            ) : p.type === 'friendPraise' ? (
                              <>
                                <span style={{ color: '#1976d2' }}>{p.studentName}</span>
                                <span style={{ 
                                  margin: '0 8px', 
                                  color: '#ff9800',
                                  fontSize: 16
                                }}>→</span>
                                <span style={{ 
                                  background: '#ffebee', 
                                  color: '#d32f2f', 
                                  padding: '4px 8px', 
                                  borderRadius: 12,
                                  fontSize: 12
                                }}>
                                  과거 데이터 (관계 불명)
                                </span>
                              </>
                            ) : (
                              <>
                                <span style={{ color: '#1976d2' }}>{p.studentName}</span>
                                <span style={{ 
                                  background: '#ffebee', 
                                  color: '#d32f2f', 
                                  padding: '4px 8px', 
                                  borderRadius: 12,
                                  fontSize: 12,
                                  marginLeft: 8
                                }}>
                                  관계 불명
                                </span>
                              </>
                            )}
                          </div>
                          
                          {/* 칭찬 내용 */}
                          <div style={{ 
                            color: '#222', 
                            marginBottom: 8,
                            fontSize: 15,
                            lineHeight: 1.4,
                            background: 'white',
                            padding: 8,
                            borderRadius: 6,
                            border: '1px solid #e5e5e5'
                          }}>
                            "{p.text}"
                          </div>
                          
                          {/* 시간과 상태 */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            fontSize: 13
                          }}>
                            <span style={{ color: '#90caf9' }}>
                              {new Date(p.ts).toLocaleString()}
                            </span>
                            <span style={{ 
                              color: p.checked ? (p.result === 'approved' ? '#43a047' : '#ff1744') : '#ff9800',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 8,
                              background: p.checked ? (p.result === 'approved' ? '#e8f5e8' : '#ffebee') : '#fff3e0'
                            }}>
                              {p.checked ? (p.result === 'approved' ? '✓ 승인' : (p.result === 'rejected' ? `✗ 거절 (${p.reason||''})` : '처리됨')) : '⏳ 미확인'}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <button onClick={() => setShowTeacherAlarm(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 22px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>닫기</button>
              </div>
            </div>
          </div>
      )}
      {/* 퀘스트 성공/실패 모달 */}
      {questActionStudent && questActionQuest && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 16, minWidth: 320 }}>
            <h3>퀘스트 결과</h3>
            <div style={{ marginBottom: 12 }}><b>{questActionStudent.name}</b>의 퀘스트: <b>{questActionQuest.text}</b></div>
            <div style={{ marginBottom: 12 }}>보상: {questActionQuest.exp}xp</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
              <button onClick={() => handleQuestResult(questActionStudent.id, questActionQuest, 'success')} style={{ background: '#43a047', color: '#fff', fontWeight: 'bold', borderRadius: 8, padding: '8px 24px' }}>성공</button>
              <button onClick={() => handleQuestResult(questActionStudent.id, questActionQuest, 'fail')} style={{ background: '#ff1744', color: '#fff', fontWeight: 'bold', borderRadius: 8, padding: '8px 24px' }}>실패</button>
              <button onClick={() => { setQuestActionStudent(null); setQuestActionQuest(null); }} style={{ marginLeft: 8 }}>취소</button>
            </div>
          </div>
        </div>
      )}
      {/* 퀘스트 결과 이펙트 */}
      {questResultEffect && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, pointerEvents: 'none' }}>
          <div style={{ fontSize: 32, color: '#43a047', background: 'rgba(255,255,255,0.95)', borderRadius: 24, padding: '32px 48px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', animation: 'pop 1.5s' }}>
            {questResultEffect}
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
                // 모든 사탕을 한 배열로 합침
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
      {/* 게시판 선택(1차) 모달 */}
      {showBoardChoiceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 24, minWidth: 340, maxWidth: 420, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 18, color: '#1976d2' }}>게시판을 선택하세요</div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 18 }}>
              <button onClick={() => { setShowBoardChoiceModal(false); setShowBoardListModal(true); fetchBoardList(); }} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '12px 32px', fontSize: 16, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>기존 게시판 불러오기</button>
              <button onClick={() => { setShowBoardChoiceModal(false); setShowCreateBoardModal(true); }} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '12px 32px', fontSize: 16, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>새 게시판 만들기</button>
            </div>
            <button onClick={() => setShowBoardChoiceModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#f7faf7', color: '#888', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
          </div>
        </div>
      )}
      {/* 게시판 목록 모달 */}
      {showBoardListModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 24, minWidth: 340, maxWidth: 480, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 18, color: '#1976d2' }}>게시판 목록</div>
            {boardListLoading ? (
              <div style={{ color: '#888', margin: '24px 0' }}>불러오는 중...</div>
            ) : (
              boardList.length === 0 ? (
                <div style={{ color: '#aaa', margin: '24px 0' }}>아직 생성된 게시판이 없습니다.</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 320, overflowY: 'auto' }}>
                  {boardList.map(board => (
                    <li key={board.id} style={{ marginBottom: 18, borderBottom: '1.5px dashed #e0f7fa', paddingBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 600, fontSize: 18, color: '#1976d2' }}>{board.title ? board.title : `게시판 #${board.code}`}</div>
                          <div style={{ fontSize: 14, color: '#888', marginTop: 2 }}>코드: <span style={{fontWeight:600}}>{board.code}</span></div>
                          <div style={{ fontSize: 13, color: '#bbb', marginTop: 2 }}>{board.createdAt && board.createdAt.toDate ? board.createdAt.toDate().toLocaleString() : ''}</div>
                        </div>
                        <button onClick={() => { setShowBoardListModal(false); navigate(`/board/${board.code}`); }} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 22px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>입장</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}
            <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => { setShowBoardListModal(false); setShowBoardCodeModal(true); }} style={{ fontWeight: 600, borderRadius: 999, background: '#f7faf7', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>코드로 직접 입장</button>
              <button onClick={() => setShowBoardListModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>닫기</button>
            </div>
          </div>
        </div>
      )}
      {/* 게시판 코드 입력 모달 */}
      {showBoardCodeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 24, minWidth: 340, maxWidth: 420, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 18, color: '#1976d2' }}>게시판 코드 입력</div>
            <input value={boardCodeInput} onChange={e => setBoardCodeInput(e.target.value)} maxLength={8} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 18, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', textAlign: 'center', letterSpacing: 2, fontWeight: 600 }} placeholder="코드를 입력하세요" />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              <button onClick={() => { setShowBoardCodeModal(false); setBoardCodeInput(''); }} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
              <button onClick={() => { if(boardCodeInput.trim()){ setShowBoardCodeModal(false); setBoardCodeInput(''); navigate(`/board/${boardCodeInput.trim().toUpperCase()}`); }}} disabled={!boardCodeInput.trim()} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', opacity: boardCodeInput.trim() ? 1 : 0.5, cursor: boardCodeInput.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>입장</button>
            </div>
          </div>
        </div>
      )}
      {/* 게시판 개설 모달 */}
      {showCreateBoardModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 24, minWidth: 340, maxWidth: 420, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 18, color: '#1976d2' }}>게시판 제목 입력</div>
            <input value={newBoardTitle} onChange={e => setNewBoardTitle(e.target.value)} maxLength={30} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 18, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', textAlign: 'center', fontWeight: 600 }} placeholder="예: 오늘의 아이디어" />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              <button onClick={() => setShowCreateBoardModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
              <button onClick={handleCreateBoard} disabled={!newBoardTitle.trim()} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', opacity: newBoardTitle.trim() ? 1 : 0.5, cursor: newBoardTitle.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>개설</button>
            </div>
          </div>
        </div>
      )}
      {/* 캔디숍(학급 은행) 모달 */}
      {showBankModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
            <div style={{ background: '#fff', padding: 40, borderRadius: 32, minWidth: 520, maxWidth: 720, boxShadow: '0 8px 48px #b2ebf240', textAlign: 'center', position: 'relative' }}>
            <button onClick={()=>setShowBankModal(false)} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#bbb', cursor: 'pointer', fontWeight: 700 }}>×</button>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 32 }}>
                <button onClick={()=>setBankTab('balance')} style={{ fontWeight: 700, fontSize: 18, color: bankTab==='balance' ? '#d72660' : '#888', background: 'none', border: 'none', borderBottom: bankTab==='balance' ? '3px solid #d72660' : '3px solid #eee', padding: '8px 24px', cursor: 'pointer', transition: 'all 0.2s' }}>학생 캔디숍 재산상황</button>
                <button onClick={()=>setBankTab('copy_items')} style={{ fontWeight: 700, fontSize: 18, color: bankTab==='copy_items' ? '#d72660' : '#888', background: 'none', border: 'none', borderBottom: bankTab==='copy_items' ? '3px solid #d72660' : '3px solid #eee', padding: '8px 24px', cursor: 'pointer', transition: 'all 0.2s' }}>품목명</button>
                <button onClick={()=>setBankTab('deposit')} style={{ fontWeight: 700, fontSize: 18, color: bankTab==='deposit' ? '#d72660' : '#888', background: 'none', border: 'none', borderBottom: bankTab==='deposit' ? '3px solid #d72660' : '3px solid #eee', padding: '8px 24px', cursor: 'pointer', transition: 'all 0.2s' }}>입금내역</button>
                <button onClick={()=>setBankTab('withdraw')} style={{ fontWeight: 700, fontSize: 18, color: bankTab==='withdraw' ? '#d72660' : '#888', background: 'none', border: 'none', borderBottom: bankTab==='withdraw' ? '3px solid #d72660' : '3px solid #eee', padding: '8px 24px', cursor: 'pointer', transition: 'all 0.2s' }}>지출내역</button>
                <button onClick={()=>setBankTab('coupon')} style={{ fontWeight: 700, fontSize: 18, color: bankTab==='coupon' ? '#d72660' : '#888', background: 'none', border: 'none', borderBottom: bankTab==='coupon' ? '3px solid #d72660' : '3px solid #eee', padding: '8px 24px', cursor: 'pointer', transition: 'all 0.2s' }}>쿠폰함</button>
              </div>
            {/* 탭별 내용 - 1차는 빈 화면 */}
            {bankTab==='balance' && (
              <div style={{ minHeight: 220, padding: 10, display: 'flex', justifyContent: 'center' }}>
                <div style={{ background: '#f7faf7', borderRadius: 18, boxShadow: '0 2px 12px #b2ebf220', padding: 24, maxWidth: 480, width: '100%', overflowX: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div style={{ fontWeight: 700, fontSize: 20, color: '#1976d2' }}>학생별 잔액</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => {
                        if (bankSelectedIds.length === studentsSnapshot.docs.length) setBankSelectedIds([]);
                        else setBankSelectedIds(studentsSnapshot.docs.map(doc=>doc.id));
                      }} style={{ borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '6px 18px', fontWeight: 600, fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer' }}>{bankSelectedIds.length === studentsSnapshot.docs.length ? '전체 해제' : '전체 선택'}</button>
                      <button
                        onClick={() => {
                          setAmountType('deposit');
                          setShowAmountModal(true);
                        }}
                        disabled={bankSelectedIds.length === 0}
                        style={{ ...buttonStyle, background: '#e0f7fa', color: '#43a047', border: 'none', opacity: bankSelectedIds.length === 0 ? 0.5 : 1 }}
                      >입금</button>
                      <button
                        onClick={() => {
                          setAmountType('withdraw');
                          setShowAmountModal(true);
                        }}
                        disabled={bankSelectedIds.length === 0}
                        style={{ ...buttonStyle, background: '#ffe4ec', color: '#d72660', border: 'none', opacity: bankSelectedIds.length === 0 ? 0.5 : 1 }}
                      >출금</button>
                      <button onClick={()=>setShowAddStudentModal(true)} style={{ borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '6px 18px', fontWeight: 600, fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer' }}>학생 추가</button>
                    </div>
                  </div>
                  <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f7faf7', borderRadius: 16, overflow: 'hidden', fontSize: 16 }}>
                      <thead>
                        <tr style={{ background: '#e0f7fa', color: '#1976d2', fontWeight: 700 }}>
                          <th style={{ padding: 8 }}>선택</th>
                          <th style={{ padding: 8 }}>이름</th>
                          <th style={{ padding: 8 }}>잔액</th>
                          <th style={{ padding: 8 }}>삭제</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentRows.map(row => (
                          <tr key={row.id} style={{ borderBottom: '1px solid #e0f7fa' }}>
                            <td style={{ textAlign: 'center' }}>
                              <input type="checkbox" checked={bankSelectedIds.includes(row.id)} onChange={() => {
                                setBankSelectedIds(ids => ids.includes(row.id) ? ids.filter(i => i !== row.id) : [...ids, row.id]);
                              }} />
                            </td>
                            <td style={{ fontWeight: 600, color: '#1976d2', padding: 8 }}>
                              <input type="text" value={bankNames[row.id] ?? row.name ?? ''} onChange={e => {
                                setBankNames(n => ({ ...n, [row.id]: e.target.value }));
                              }} style={{ width: 90, borderRadius: 8, border: '1.5px solid #e0f7fa', padding: '6px 10px', fontSize: 16, background: '#fff', color: '#222', fontWeight: 600 }} />
                            </td>
                            <td style={{ padding: 8 }}>
                              <input type="number" value={bankBalances[row.id] ?? row.balance ?? 0} onChange={e => {
                                const v = parseInt(e.target.value) || 0;
                                setBankBalances(b => ({ ...b, [row.id]: v }));
                              }} style={{ width: 80, borderRadius: 8, border: '1.5px solid #e0f7fa', padding: '6px 10px', fontSize: 16, background: '#fff', color: '#222', textAlign: 'right', fontWeight: 600 }} />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button onClick={async () => {
                                if (window.confirm('정말 삭제하시겠습니까?')) {
                                  await deleteDoc(doc(db, 'copy_students', row.id));
                                }
                              }} style={{ background: '#ffe4ec', color: '#d72660', border: 'none', borderRadius: 8, padding: '4px 14px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>삭제</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* 학생 추가 모달 */}
                  {showAddStudentModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
                      <div style={{ background: '#fff', padding: 32, borderRadius: 24, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 18, color: '#1976d2' }}>학생 추가</div>
                        <input type="text" value={newStudentName} onChange={e=>setNewStudentName(e.target.value)} placeholder="이름" style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 12, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', textAlign: 'center', fontWeight: 600 }} />
                        <input type="number" value={newStudentBalance} onChange={e=>setNewStudentBalance(Number(e.target.value)||0)} placeholder="잔액" style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 18, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', textAlign: 'center', fontWeight: 600 }} />
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
                          <button onClick={()=>setShowAddStudentModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
                          <button onClick={async()=>{
                            if(!newStudentName.trim()) return;
                            await setDoc(doc(db, 'copy_students', newStudentName), { name: newStudentName.trim(), balance: newStudentBalance });
                            setShowAddStudentModal(false);
                            setNewStudentName('');
                            setNewStudentBalance(0);
                          }} disabled={!newStudentName.trim()} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', opacity: newStudentName.trim() ? 1 : 0.5, cursor: newStudentName.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>추가</button>
                        </div>
            </div>
          </div>
        )}
                </div>
              </div>
            )}
            {bankTab==='copy_items' && (
              <div style={{ minHeight: 220, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 20, color: '#1976d2' }}>품목명/가격</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={async()=>{
                      setItemSaving(true);
                      for(const id of Object.keys(itemNames)){
                        await setDoc(doc(db, 'copy_items', id), { name: itemNames[id], price: itemPrices[id] });
                      }
                      setItemSaving(false);
                      alert('저장 완료!');
                    }} style={{ borderRadius: 999, background: '#fffde7', color: '#1976d2', border: 'none', padding: '6px 18px', fontWeight: 600, fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', opacity: itemSaving?0.5:1 }}>{itemSaving?'저장중...':'저장'}</button>
                    <button onClick={()=>setShowAddItemModal(true)} style={{ borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '6px 18px', fontWeight: 600, fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer' }}>품목 추가</button>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f7faf7', borderRadius: 16, overflow: 'hidden', fontSize: 16 }}>
                  <thead>
                    <tr style={{ background: '#e0f7fa', color: '#1976d2', fontWeight: 700 }}>
                      <th style={{ padding: 8 }}>품목명</th>
                      <th style={{ padding: 8 }}>가격</th>
                      <th style={{ padding: 8 }}>삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e0f7fa' }}>
                        <td style={{ fontWeight: 600, color: '#1976d2', padding: 8 }}>
                          <input type="text" value={itemNames[item.id]??''} onChange={e=>{
                            setItemNames(n=>({...n, [item.id]:e.target.value}));
                          }} style={{ width: 120, borderRadius: 8, border: '1.5px solid #e0f7fa', padding: '6px 10px', fontSize: 16, background: '#fff', color: '#222', fontWeight: 600 }} />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input type="number" value={itemPrices[item.id]??0} onChange={e=>{
                            const v = parseInt(e.target.value)||0;
                            setItemPrices(p=>({...p, [item.id]:v}));
                          }} style={{ width: 80, borderRadius: 8, border: '1.5px solid #e0f7fa', padding: '6px 10px', fontSize: 16, background: '#fff', color: '#222', textAlign: 'right', fontWeight: 600 }} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button onClick={async()=>{
                            if(window.confirm('정말 삭제하시겠습니까?')){
                              await deleteDoc(doc(db, 'copy_items', item.id));
                              setItems(items=>items.filter(i=>i.id!==item.id));
                            }
                          }} style={{ background:'#ffe4ec', color:'#d72660', border:'none', borderRadius:8, padding:'4px 14px', fontWeight:600, fontSize:14, cursor:'pointer' }}>삭제</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* 품목 추가 모달 */}
                {showAddItemModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
                    <div style={{ background: '#fff', padding: 32, borderRadius: 24, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 18, color: '#1976d2' }}>품목 추가</div>
                      <input type="text" value={newItemName} onChange={e=>setNewItemName(e.target.value)} placeholder="품목명" style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 12, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', textAlign: 'center', fontWeight: 600 }} />
                      <input type="number" value={newItemPrice} onChange={e=>setNewItemPrice(Number(e.target.value)||0)} placeholder="가격" style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 18, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', textAlign: 'center', fontWeight: 600 }} />
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
                        <button onClick={()=>setShowAddItemModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
                        <button onClick={async()=>{
                          if(!newItemName.trim()) return;
                          await setDoc(doc(db, 'copy_items', newItemName), { name: newItemName.trim(), price: newItemPrice });
                          setShowAddItemModal(false);
                          setNewItemName('');
                          setNewItemPrice(0);
                          setItems(items=>[...items, { id: newItemName, name: newItemName.trim(), price: newItemPrice }]);
                        }} disabled={!newItemName.trim()} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', opacity: newItemName.trim() ? 1 : 0.5, cursor: newItemName.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>추가</button>
                  </div>
                          </div>
                            </div>
                          )}
                        </div>
            )}
            {bankTab==='deposit' && (
              <div style={{ minHeight: 220, padding: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 20, color: '#1976d2', marginBottom: 18 }}>입금내역</div>
                <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f7faf7', borderRadius: 16, overflow: 'hidden', fontSize: 16 }}>
                    <thead>
                      <tr style={{ background: '#e0f7fa', color: '#1976d2', fontWeight: 700 }}>
                        <th style={{ padding: 8 }}>학생명</th>
                        <th style={{ padding: 8 }}>사유</th>
                        <th style={{ padding: 8 }}>금액</th>
                        <th style={{ padding: 8 }}>날짜</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsSnapshot && studentsSnapshot.docs.flatMap(doc => {
                        const student = doc.data();
                        return (student.transactions || [])
                          .filter(t => t.type === 'deposit')
                          .sort((a, b) => b.ts - a.ts)
                          .map((t, idx) => (
                            <tr key={doc.id + '-' + t.ts + '-' + idx} style={{ borderBottom: '1px solid #e0f7fa' }}>
                              <td style={{ padding: 8, fontWeight: 600, color: '#1976d2' }}>{student.name}</td>
                              <td style={{ padding: 8 }}>{t.reason}</td>
                              <td style={{ padding: 8, color: '#43a047', fontWeight: 700 }}>{t.amount}원</td>
                              <td style={{ padding: 8, color: '#888', fontSize: 14 }}>{new Date(t.ts).toLocaleString('ko-KR')}</td>
                            </tr>
                          ));
                      })}
                    </tbody>
                  </table>
                  {/* 내역 없을 때 안내 */}
                  {studentsSnapshot && studentsSnapshot.docs.every(doc => !(doc.data().transactions||[]).some(t => t.type==='deposit')) && (
                    <div style={{ color: '#bbb', fontSize: 18, padding: 40, textAlign: 'center' }}>입금 내역이 없습니다.</div>
                  )}
                </div>
              </div>
            )}
            {bankTab==='withdraw' && (
              <div style={{ minHeight: 220, padding: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 20, color: '#d72660', marginBottom: 18 }}>지출내역</div>
                <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f7faf7', borderRadius: 16, overflow: 'hidden', fontSize: 16 }}>
                    <thead>
                      <tr style={{ background: '#ffe4ec', color: '#d72660', fontWeight: 700 }}>
                        <th style={{ padding: 8, cursor: 'pointer' }} onClick={() => setSpendSort(s => ({ key: 'name', order: s.key==='name' && s.order==='asc' ? 'desc' : 'asc' }))}>
                          학생명 {spendSort.key==='name' ? (spendSort.order==='asc' ? '▲' : '▼') : ''}
                        </th>
                        <th style={{ padding: 8, cursor: 'pointer' }} onClick={() => setSpendSort(s => ({ key: 'copy_items', order: s.key==='copy_items' && s.order==='asc' ? 'desc' : 'asc' }))}>
                          구입내역 {spendSort.key==='copy_items' ? (spendSort.order==='asc' ? '▲' : '▼') : ''}
                        </th>
                        <th style={{ padding: 8, cursor: 'pointer' }} onClick={() => setSpendSort(s => ({ key: 'amount', order: s.key==='amount' && s.order==='asc' ? 'desc' : 'asc' }))}>
                          금액 {spendSort.key==='amount' ? (spendSort.order==='asc' ? '▲' : '▼') : ''}
                        </th>
                        <th style={{ padding: 8, cursor: 'pointer' }} onClick={() => setSpendSort(s => ({ key: 'ts', order: s.key==='ts' && s.order==='asc' ? 'desc' : 'asc' }))}>
                          날짜 {spendSort.key==='ts' ? (spendSort.order==='asc' ? '▲' : '▼') : ''}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsSnapshot && studentsSnapshot.docs.flatMap(doc => {
                        const student = doc.data();
                        // 정렬을 위해 배열을 먼저 모아서 한 번에 정렬
                        let spends = (student.transactions || [])
                          .filter(t => t.type === 'spend')
                          .map(t => ({ ...t, _studentName: student.name }));
                        return spends;
                      })
                      // 모든 학생의 spend 내역을 한 배열로 합침
                      .sort((a, b) => {
                        const { key, order } = spendSort;
                        let va, vb;
                        if (key === 'name') {
                          va = a._studentName;
                          vb = b._studentName;
                        } else if (key === 'copy_items') {
                          va = a.items ? Object.entries(a.items).map(([item, qty]) => `${item}x${qty}`).join(', ') : (a.customAmount ? `직접입력: ${a.customAmount}원` : '-');
                          vb = b.items ? Object.entries(b.items).map(([item, qty]) => `${item}x${qty}`).join(', ') : (b.customAmount ? `직접입력: ${b.customAmount}원` : '-');
                        } else if (key === 'amount') {
                          va = a.amount;
                          vb = b.amount;
                        } else if (key === 'ts') {
                          va = a.ts;
                          vb = b.ts;
                        }
                        if (va < vb) return order === 'asc' ? -1 : 1;
                        if (va > vb) return order === 'asc' ? 1 : -1;
                        return 0;
                      })
                      .map((t, idx) => (
                        <tr key={t._studentName + '-' + t.ts + '-' + idx} style={{ borderBottom: '1px solid #ffe4ec' }}>
                          <td style={{ padding: 8, fontWeight: 600, color: '#d72660' }}>{t._studentName}</td>
                          <td style={{ padding: 8 }}>
                            {t.items && Object.keys(t.items).length > 0 ? (
                              Object.entries(t.items).map(([item, qty]) => `${item}x${qty}`).join(', ')
                            ) : t.customAmount ? `직접입력: ${t.customAmount}원` : '-'}
                          </td>
                          <td style={{ padding: 8, color: '#d72660', fontWeight: 700 }}>{t.amount}원</td>
                          <td style={{ padding: 8, color: '#888', fontSize: 14 }}>{new Date(t.ts).toLocaleString('ko-KR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* 내역 없을 때 안내 */}
                  {studentsSnapshot && studentsSnapshot.docs.every(doc => !(doc.data().transactions||[]).some(t => t.type==='spend')) && (
                    <div style={{ color: '#bbb', fontSize: 18, padding: 40, textAlign: 'center' }}>지출 내역이 없습니다.</div>
                  )}
                </div>
              </div>
            )}
            {bankTab==='coupon' && (
              <div style={{ minHeight: 220, padding: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 20, color: '#1976d2', marginBottom: 18 }}>학생별 쿠폰함</div>
                <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f7faf7', borderRadius: 16, overflow: 'hidden', fontSize: 16 }}>
                    <thead>
                      <tr style={{ background: '#e0f7fa', color: '#1976d2', fontWeight: 700 }}>
                        <th style={{ padding: 8 }}>이름</th>
                        <th style={{ padding: 8 }}>쿠폰명</th>
                        <th style={{ padding: 8 }}>상태</th>
                        <th style={{ padding: 8 }}>사용</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsSnapshot && studentsSnapshot.docs.flatMap(doc => {
                        const student = doc.data();
                        return (student.coupons || []).map((coupon, idx) => (
                          <tr key={doc.id + '-' + coupon.ts + '-' + idx} style={{ borderBottom: '1px solid #e0f7fa' }}>
                            <td style={{ padding: 8, fontWeight: 600, color: '#1976d2' }}>{student.name}</td>
                            <td style={{ padding: 8 }}>{coupon.label}</td>
                            <td style={{ padding: 8, color: coupon.used ? '#888' : '#43a047', fontWeight: 700 }}>{coupon.used ? '사용완료' : '미사용'}</td>
                            <td style={{ textAlign: 'center' }}>
                    <button 
                                disabled={coupon.used}
                                onClick={() => handleUseCoupon({ ...coupon, studentId: doc.id })}
                                style={{ background: coupon.used ? '#eee' : '#ffe4ec', color: coupon.used ? '#888' : '#d72660', border: 'none', borderRadius: 8, padding: '4px 14px', fontWeight: 600, fontSize: 14, cursor: coupon.used ? 'default' : 'pointer' }}>
                                {coupon.used ? '사용완료' : '사용'}
                    </button>
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                  </div>
              </div>
                        )}
                      </div>
        </div>
      )}
      {showAmountModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 24, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 18, color: '#1976d2' }}>{amountType === 'deposit' ? '입금' : '출금'} 금액 입력</div>
            <input type="number" value={amountValue} onChange={e => setAmountValue(Number(e.target.value) || 0)} placeholder="금액" style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 18, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', textAlign: 'center', fontWeight: 600 }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              <button onClick={() => setShowAmountModal(false)} style={{ ...buttonStyle, background: '#ffe4ec', color: '#d72660' }}>취소</button>
              <button onClick={handleAmount} disabled={amountValue <= 0} style={{ ...buttonStyle, background: '#e0f7fa', color: '#1976d2', opacity: amountValue > 0 ? 1 : 0.5 }}>완료</button>
            </div>
                  </div>
                </div>
              )}
      {/* 캔디 퀴즈타임 */}
      {showQuizModal && <QuizSystem isTeacher={true} currentUser={{name: "Teacher"}} collectionPrefix="copy_" />} (
      {/* 선택된 학생 하단 바 */}
      {selectedIds.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100vw',
          background: 'rgba(25, 118, 210, 0.18)',
          borderTop: '2px solid #e3f2fd',
          boxShadow: '0 -2px 12px #b2ebf220',
          zIndex: 3000,
          padding: '14px 0',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 18
        }}>
          <span style={{ fontWeight: 700, color: '#1976d2', fontSize: 16, marginRight: 12 }}>선택된 학생:</span>
          {selectedIds.map(id => {
            const student = studentRows.find(s => s.id === id);
            return student ? (
              <span key={id} style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#e0f7fa',
                color: '#1976d2',
                borderRadius: 999,
                padding: '6px 16px',
                fontWeight: 600,
                fontSize: 15,
                marginRight: 8,
                boxShadow: '0 2px 8px #b2ebf240',
                gap: 8
              }}>
                {student.name}
                          <button 
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedIds(ids => ids.filter(sid => sid !== id));
                  }}
                            style={{
                    marginLeft: 8,
                              background: '#ffe4ec',
                              color: '#d72660',
                              border: 'none',
                    borderRadius: 999,
                    padding: '2px 10px',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer', 
                    boxShadow: '0 1px 4px #f8bbd0a0',
                    transition: 'all 0.2s' 
                  }}
                >선택 해제</button>
              </span>
            ) : null;
          })}
          {/* 전체 해제 버튼 */}
                <button 
            onClick={() => setSelectedIds([])}
                  style={{ 
              marginLeft: 24,
              background: '#fff',
              color: '#1976d2',
                    border: 'none', 
              borderRadius: 999,
              padding: '8px 22px',
              fontWeight: 700,
                    fontSize: 15, 
              cursor: 'pointer',
              boxShadow: '0 2px 8px #b2ebf240',
                    transition: 'all 0.2s' 
                  }}
          >전체 해제</button>
              </div>
        )}
      {showEventExpModal && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.3)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:5000}}>
          <div style={{background:'#fff',padding:32,borderRadius:24,minWidth:340,maxWidth:480,boxShadow:'0 4px 32px #b2ebf240',textAlign:'center'}}>
            <h3 style={{marginBottom:18,color:'#1976d2'}}>이벤트 경험치 지급</h3>
            <div style={{maxHeight:320,overflowY:'auto',marginBottom:18}}>
              {studentRows.map(student => (
                <div key={student.id} style={{display:'flex',alignItems:'center',gap:12,marginBottom:8,justifyContent:'space-between'}}>
                  <span style={{fontWeight:600,color:'#1976d2',minWidth:70}}>{student.name}</span>
                  <input
                    type="number"
                    min={0}
                    value={eventExpInputs[student.id] ?? 0}
                    onChange={e => setEventExpInputs(inputs => ({...inputs, [student.id]: Number(e.target.value)||0}))}
                    style={{width:70,borderRadius:8,border:'1.5px solid #e0f7fa',padding:'6px 10px',fontSize:16,textAlign:'right'}}
                  />
                  <span style={{color:'#888',fontSize:15}}>xp</span>
            </div>
              ))}
          </div>
            <div style={{display:'flex',gap:10,justifyContent:'center',marginTop:8}}>
              <button onClick={()=>setShowEventExpModal(false)} style={{fontWeight:600,borderRadius:999,background:'#ffe4ec',color:'#d72660',border:'none',padding:'8px 32px',fontSize:15,boxShadow:'0 2px 8px #f8bbd0a0',cursor:'pointer',transition:'all 0.2s'}}>취소</button>
              <button onClick={async()=>{
                setEventExpSaving(true);
                for(const student of studentRows){
                  const addExp = eventExpInputs[student.id] ?? 0;
                  if(addExp > 0){
                    const docRef = doc(db, 'copy_students', student.id);
                    const docSnap = studentsSnapshot.docs.find(d=>d.id===student.id);
                    if(docSnap){
                      let s = docSnap.data();
                      let exp = (typeof s.exp === 'number' && !isNaN(s.exp) ? s.exp : 0) + addExp;
                      let level = typeof s.level === 'number' && !isNaN(s.level) ? s.level : 0;
                      let required = 150 + level * 10;
                      let levelUp = false;
                      while(exp >= required){
                        exp -= required;
                        level++;
                        levelUp = true;
                        required = 150 + level * 10;
                      }
                      await updateDoc(docRef, {
                        exp,
                        level,
                        expEvents: arrayUnion({ type: 'event', amount: addExp, ts: Date.now(), reason: '이벤트 지급' }),
                        notifications: arrayUnion({ type: 'event', text: `이벤트 경험치 +${addExp}xp`, ts: Date.now() })
                      });
                    }
                  }
                }
                setEventExpSaving(false);
                setShowEventExpModal(false);
                setEventExpInputs({});
              }} disabled={eventExpSaving} style={{fontWeight:600,borderRadius:999,background:'#e0f7fa',color:'#1976d2',border:'none',padding:'8px 32px',fontSize:15,boxShadow:'0 2px 8px #b2ebf240',opacity:eventExpSaving?0.5:1,cursor:eventExpSaving?'not-allowed':'pointer',transition:'all 0.2s'}}>{eventExpSaving?'저장중...':'저장'}</button>
          </div>
            </div>
          </div>
        )}
      {/* 캔디 퀴즈타임 + 캔디피버타임 + 감정출석부 버튼 그룹 (오른쪽 하단, 수평 정렬) */}
      <div style={{ position: 'fixed', right: 32, bottom: 32, zIndex: 3000, display: 'flex', flexDirection: 'row', gap: 20 }}>
        <button 
          onClick={() => setShowEmotionDashboardModal(true)} 
          style={{ 
            background: '#f3e5f5', 
            border: 'none', 
            borderRadius: 999, 
            padding: '12px 18px', 
            boxShadow: '0 2px 8px rgba(123, 31, 162, 0.2)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            minWidth: 160,
            transition: 'all 0.2s'
          }}
        >
          <AssessmentIcon style={{ color: '#7b1fa2', fontSize: 28 }} />
          <span style={{ fontWeight: 700, color: '#7b1fa2', fontSize: 17 }}>감정출석부</span>
        </button>
        <button
          onClick={handleFeverTime}
          style={{
            background: feverActive ? '#ffd600' : '#fffde7',
            color: feverActive ? '#d72660' : '#1976d2',
            fontWeight: 700,
            borderRadius: 999,
            boxShadow: '0 2px 8px #b2ebf240',
            padding: '12px 18px',
            minWidth: 160,
            fontSize: 17,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <AccessTimeIcon style={{ color: feverActive ? '#d72660' : '#1976d2', fontSize: 28 }} />
          <span style={{ fontWeight: 700, fontSize: 17 }}>
            {feverActive ? '캔디피버타임 종료' : '캔디피버타임 시작'}
          </span>
                          </button>
        <button onClick={() => setShowQuizModal(true)} style={{ background: '#fffde7', border: 'none', borderRadius: 999, padding: '12px 18px', boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <SportsEsportsIcon style={{ color: '#1976d2', fontSize: 32 }} />
          <span style={{ fontWeight: 700, color: '#1976d2', fontSize: 17 }}>캔디 퀴즈타임</span>
          </button>
        </div>
        {/* 메시지 보내기 모달 */}
        {showMessageModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 24, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
            <h3 style={{ marginBottom: 18, color: '#d72660' }}>{replyToMessage ? '메시지 답장' : '새 메시지'}</h3>
            {replyToMessage && (
              <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 8, marginBottom: 16, textAlign: 'left' }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>원본 메시지:</div>
                <div>{replyToMessage.text}</div>
              </div>
            )}
            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder="메시지를 입력하세요..."
              style={{ width: '100%', minHeight: 80, borderRadius: 10, border: '1.5px solid #ffe4ec', padding: 12, fontSize: 16, marginBottom: 12, resize: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              <button onClick={() => { setShowMessageModal(false); setMessageText(''); setReplyToMessage(null); }} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer' }}>취소</button>
              <button onClick={handleSendMessage} disabled={!messageText.trim()} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', opacity: messageText.trim() ? 1 : 0.5, cursor: messageText.trim() ? 'pointer' : 'not-allowed' }}>보내기</button>
                      </div>
                  </div>
                </div>
              )}
        {/* 퀘스트 주기 모달 */}
        {showQuestModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 24, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
            <h3 style={{ marginBottom: 18, color: '#d72660' }}>퀘스트 주기</h3>
            <textarea
              value={questText}
              onChange={e => setQuestText(e.target.value)}
              placeholder="퀘스트 내용을 입력하세요"
              style={{ width: '100%', minHeight: 80, borderRadius: 10, border: '1.5px solid #ffe4ec', padding: 12, fontSize: 16, marginBottom: 12 }}
            />
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600, color: '#1976d2', marginRight: 8 }}>경험치</label>
              <input type="number" value={questExp} min={1} max={100} onChange={e => setQuestExp(Number(e.target.value) || 1)} style={{ width: 60, borderRadius: 8, border: '1.5px solid #e0f7fa', padding: '6px 10px', fontSize: 16, textAlign: 'right' }} />
              <span style={{ marginLeft: 4, color: '#888', fontSize: 15 }}>xp</span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              <button onClick={() => setShowQuestModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer' }}>취소</button>
              <button onClick={handleSendQuest} disabled={!questText.trim()} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', opacity: questText.trim() ? 1 : 0.5, cursor: questText.trim() ? 'pointer' : 'not-allowed' }}>보내기</button>
              </div>
            </div>
          </div>
        )}
      {showNoticeModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 24, minWidth: 420, maxWidth: 540, boxShadow: '0 8px 48px rgba(0,0,0,0.2)', position: 'relative', maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button onClick={() => {
              setShowNoticeModal(false);
              setCurrentNotice({ id: '', content: '', isActive: true });
              setNoticeError('');
              setNoticeTab('notice');
            }} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#bbb', cursor: 'pointer', fontWeight: 700 }}>×</button>
            <div style={{ fontWeight: 700, fontSize: 22, color: '#1976d2', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CampaignIcon style={{ color: '#f57f17', fontSize: 28 }} />
              공지&예약 관리
            </div>
            {/* 탭 버튼 */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              <button onClick={()=>setNoticeTab('notice')} style={{ fontWeight: noticeTab==='notice'?700:500, borderRadius: 999, background: noticeTab==='notice' ? '#e0f7fa' : '#f7faf7', color: '#1976d2', border: 'none', padding: '7px 22px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>공지사항</button>
              <button onClick={()=>setNoticeTab('alarm')} style={{ fontWeight: noticeTab==='alarm'?700:500, borderRadius: 999, background: noticeTab==='alarm' ? '#e0f7fa' : '#f7faf7', color: '#1976d2', border: 'none', padding: '7px 22px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>예약 알람</button>
            </div>
            {/* 공지사항 탭 */}
            {noticeTab === 'notice' && (
              <>
                {noticeError && (
                  <div style={{ padding: '10px 14px', background: '#ffebee', color: '#c62828', borderRadius: 8, marginBottom: 12, width: '100%', maxWidth: 420, textAlign: 'center' }}>
                    {noticeError}
                  </div>
                )}
                <div style={{ marginBottom: 18, width: '100%', maxWidth: 420 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: '#555' }}>공지사항 내용</div>
                  <textarea value={currentNotice.content} onChange={(e) => setCurrentNotice({...currentNotice, content: e.target.value})} style={{ width: '100%', minHeight: 90, padding: 10, borderRadius: 8, border: '1px solid #ddd', fontSize: 15, resize: 'vertical', boxSizing: 'border-box' }} placeholder="공지사항 내용을 입력하세요..." />
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                    <input type="checkbox" id="noticeActive" checked={currentNotice.isActive} onChange={(e) => setCurrentNotice({...currentNotice, isActive: e.target.checked})} style={{ marginRight: 8 }} />
                    <label htmlFor="noticeActive" style={{ fontSize: 13, color: '#555' }}>활성화</label>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button onClick={saveNotice} style={{ padding: '8px 20px', background: '#1976d2', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
                      {currentNotice.id ? '수정하기' : '추가하기'}
                    </button>
                    {currentNotice.id && (
                      <button onClick={() => setCurrentNotice({ id: '', content: '', isActive: true })} style={{ padding: '8px 20px', background: '#f5f5f5', color: '#555', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
                        취소
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: 12, width: '100%', maxWidth: 420 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 10, color: '#333' }}>공지사항 목록</div>
                  {notices.length === 0 ? (
                    <div style={{ padding: '18px 0', textAlign: 'center', color: '#888' }}>
                      등록된 공지사항이 없습니다.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {notices.map(notice => (
                        <div key={notice.id} style={{ padding: 14, borderRadius: 10, border: '1px solid #e0e0e0', background: notice.isActive ? '#fff' : '#f5f5f5', position: 'relative', fontSize: 15, marginBottom: 2 }}>
                          <div style={{ marginBottom: 6, wordBreak: 'break-word', fontSize: 15, lineHeight: 1.6 }}>{notice.content}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <div style={{ fontSize: 11, color: '#888' }}>
                              {notice.updatedAt ? `최종 수정: ${new Date(notice.updatedAt).toLocaleString()}` : notice.createdAt ? `작성: ${new Date(notice.createdAt).toLocaleString()}` : ''}
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                              <button onClick={() => editNotice(notice)} style={{ padding: '4px 12px', background: '#e3f2fd', color: '#1976d2', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>수정</button>
                              <button onClick={() => deleteNotice(notice.id)} style={{ padding: '4px 12px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>삭제</button>
                              <button onClick={() => broadcastNotice(notice.id)} style={{ padding: '4px 12px', background: '#fff9c4', color: '#f57f17', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: 16 }}>📣</span>
                                광고하기
                              </button>
                            </div>
                          </div>
                          {notice.broadcast && (
                            <div style={{ marginTop: 10, background: '#f57f17', color: 'white', borderRadius: 8, padding: '6px 12px', fontSize: 14, fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                              <div style={{ marginBottom: 2 }}>📣 광고중</div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => broadcastNotice(notice.id)} style={{ background: '#fff', color: '#f57f17', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '3px 14px', boxShadow: '0 1px 4px #f57f1720' }}>다시 광고</button>
                                <button onClick={() => stopBroadcastNotice(notice.id)} style={{ background: '#eee', color: '#555', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '3px 14px', boxShadow: '0 1px 4px #8882' }}>광고 멈추기</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            {/* 예약 알람 탭 */}
            {noticeTab === 'alarm' && (
              <div style={{ width: '100%', maxWidth: 420 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: '#555' }}>예약 알람 내용</div>
                <textarea value={alarmContent} onChange={e => setAlarmContent(e.target.value)} style={{ width: '100%', minHeight: 60, padding: 10, borderRadius: 8, border: '1px solid #ddd', fontSize: 15, resize: 'vertical', boxSizing: 'border-box' }} placeholder="예약 알람 내용을 입력하세요..." />
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, gap: 8 }}>
                  <input type="datetime-local" value={alarmTime} onChange={e => setAlarmTime(e.target.value)} style={{ borderRadius: 8, border: '1px solid #ddd', padding: '6px 10px', fontSize: 15 }} />
                  <button onClick={handleSaveAlarm} disabled={alarmSaving || !alarmContent.trim() || !alarmTime} style={{ padding: '8px 18px', background: '#1976d2', color: 'white', border: 'none', borderRadius: 8, cursor: alarmSaving || !alarmContent.trim() || !alarmTime ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 15, opacity: alarmSaving || !alarmContent.trim() || !alarmTime ? 0.5 : 1 }}>추가</button>
                </div>
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 10, color: '#333' }}>예약 알람 목록</div>
                  {alarms.length === 0 ? (
                    <div style={{ padding: '18px 0', textAlign: 'center', color: '#888' }}>등록된 예약 알람이 없습니다.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {alarms.sort((a,b)=>b.targetTime-a.targetTime).map(alarm => (
                        <div key={alarm.id} style={{ padding: 14, borderRadius: 10, border: '1px solid #e0e0e0', background: alarm.isActive ? '#fff' : '#f5f5f5', position: 'relative', fontSize: 15, marginBottom: 2 }}>
                          <div style={{ marginBottom: 6, wordBreak: 'break-word', fontSize: 15, lineHeight: 1.6 }}>{alarm.content}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <div style={{ fontSize: 11, color: '#888' }}>예약 시간: {alarm.targetTime ? new Date(alarm.targetTime).toLocaleString() : ''}</div>
                            <button onClick={()=>handleDeleteAlarm(alarm.id)} style={{ padding: '4px 12px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>삭제</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
      {/* 링크 제공 모달 */}
      {showLinkModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000
        }}>
          <div style={{
            background: '#fff',
            padding: '36px 32px 28px 32px',
            borderRadius: 24,
            minWidth: 340,
            maxWidth: 420,
            boxShadow: '0 4px 32px #b2ebf240',
            width: '90vw',
            marginTop: 0
          }}>
            <div style={{ fontWeight: 700, fontSize: '1.18rem', marginBottom: 18, color: '#1976d2', letterSpacing: '-0.5px', textAlign: 'center' }}>링크 제공</div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, color: '#666', fontWeight: 600 }}>URL</label>
              <input 
                type="text"
                value={linkUrl}
                onChange={e => {
                  setLinkUrl(e.target.value);
                  setLinkError('');
                }}
                placeholder="https://example.com"
                style={{ 
                  width: '100%', 
                  padding: 12,
                  borderRadius: 14, 
                  border: '2px solid #e0f7fa', 
                  fontSize: 16, 
                  outline: 'none', 
                  background: '#f7faf7', 
                  color: '#222', 
                  transition: 'border 0.2s', 
                  boxSizing: 'border-box',
                  fontWeight: 600
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, color: '#666', fontWeight: 600 }}>제목</label>
              <input 
                type="text"
                value={linkTitle}
                onChange={e => setLinkTitle(e.target.value)}
                placeholder="링크 제목 (선택사항)"
                style={{ 
                  width: '100%', 
                  padding: 12,
                  borderRadius: 14, 
                  border: '2px solid #e0f7fa', 
                  fontSize: 16,
                  outline: 'none',
                  background: '#f7faf7',
                  color: '#222',
                  transition: 'border 0.2s',
                  boxSizing: 'border-box',
                  fontWeight: 600
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, color: '#666', fontWeight: 600 }}>설명</label>
              <textarea
                value={linkDescription}
                onChange={e => setLinkDescription(e.target.value)}
                placeholder="링크 설명 (선택사항)"
                style={{
                  width: '100%',
                  height: 100,
                  padding: 12, 
                  borderRadius: 14,
                  border: '2px solid #e0f7fa',
                  fontSize: 16, 
                  outline: 'none', 
                  background: '#f7faf7', 
                  color: '#222', 
                  transition: 'border 0.2s', 
                  boxSizing: 'border-box',
                  fontWeight: 600,
                  resize: 'none'
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, color: '#666', fontWeight: 600 }}>카테고리</label>
              <select
                value={linkCategory}
                onChange={e => setLinkCategory(e.target.value)}
                  style={{ 
                  width: '100%',
                  padding: 12,
                  borderRadius: 14,
                  border: '2px solid #e0f7fa',
                  fontSize: 16,
                  background: '#fff',
                  color: '#222',
                    fontWeight: 600, 
                  outline: 'none',
                  transition: 'border 0.2s',
                  boxSizing: 'border-box'
                }}
              >
                {LINK_CATEGORIES.map(category => (
                  <option key={category.key} value={category.key}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, color: '#666', fontWeight: 600 }}>받는 학생</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <button
                  onClick={() => {
                    if (selectedStudentsForLink.length === studentsSnapshot.docs.length) {
                      setSelectedStudentsForLink([]);
                    } else {
                      setSelectedStudentsForLink(studentsSnapshot.docs.map(doc => doc.id));
                    }
                  }}
                  style={{
                    fontWeight: 700,
                    borderRadius: 999, 
                    background: '#e0f7fa',
                    color: '#1976d2',
                    border: 'none', 
                    padding: '6px 18px',
                    fontSize: 15, 
                    boxShadow: '0 2px 8px #b2ebf240',
                    cursor: 'pointer', 
                    transition: 'all 0.2s',
                  }}
                >
                  {selectedStudentsForLink.length === studentsSnapshot.docs.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e0f7fa', borderRadius: 12, padding: '8px 12px', background: '#fafffe' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {studentsSnapshot.docs.map(doc => {
                    const student = doc.data();
                    const isSelected = selectedStudentsForLink.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => {
                          setSelectedStudentsForLink(prev =>
                            isSelected
                              ? prev.filter(id => id !== doc.id)
                              : [...prev, doc.id]
                          );
                        }}
                    style={{ 
                          padding: '8px 16px',
                      borderRadius: 999, 
                          background: isSelected ? '#e3f2fd' : '#f5f5f5',
                          color: isSelected ? '#1976d2' : '#666',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          border: '1.5px solid',
                          borderColor: isSelected ? '#90caf9' : '#eee',
                          fontWeight: 600,
                          fontSize: 15
                        }}
                      >
                        {student.name}
                </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginTop: 8, color: '#666', fontSize: 14 }}>
                {selectedStudentsForLink.length === 0
                  ? '선택하지 않으면 모든 학생에게 전송됩니다.'
                  : `${selectedStudentsForLink.length}명의 학생에게 전송됩니다.`}
          </div>
            </div>
            {linkError && (
              <div style={{ color: '#d32f2f', marginBottom: 16 }}>{linkError}</div>
            )}
            <div style={{ marginTop: 18, textAlign: 'right', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkUrl('');
                  setLinkTitle('');
                  setLinkDescription('');
                  setLinkCategory('general');
                  setSelectedStudentsForLink([]);
                  setLinkError('');
                }}
                style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}
              >취소</button>
              <button
                onClick={handleSendLink}
                style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}
              >전송</button>
          </div>
        </div>
              </div>
      )}

            {/* 링크 통계 모달 */}
      {showLinkStatsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.32)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 32,
            padding: 44,
            width: '90%',
            maxWidth: 900,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 12px 64px #1976d220',
            border: '4px solid #1976d2'
          }}>
            <div style={{
              fontSize: 26,
              color: '#1976d2',
              marginBottom: 24,
              fontWeight: 900,
              letterSpacing: '-1.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10
            }}>
              <span role="img" aria-label="link">🔗</span> 링크 통계
            </div>
            
            <div style={{ display: 'grid', gap: 20 }}>
              {linkAnalytics.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#888',
                  fontSize: 16,
                  padding: '60px 20px'
                }}>
                  등록된 링크가 없습니다.
                </div>
              ) : (
                linkAnalytics.map(link => {
                  const category = LINK_CATEGORIES.find(c => c.key === link.category);
                  return (
                    <div
                      key={link.url}
                      style={{
                        padding: 24,
                        borderRadius: 20,
                        background: '#f7faf7',
                        border: '2px solid #e0f7fa',
                        boxShadow: '0 4px 16px #b2ebf240',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto',
                        gap: 16,
                        alignItems: 'start'
                      }}>
                        {/* 링크 정보 */}
                        <div style={{ minWidth: 0 }}>
                          <h3 style={{
                            margin: '0 0 8px 0',
                            color: '#1976d2',
                            fontSize: 18,
                            fontWeight: 700,
                            wordBreak: 'break-word'
                          }}>
                            {link.title}
                          </h3>
                          <div style={{
                            color: '#666',
                            fontSize: 14,
                            marginBottom: 12,
                            wordBreak: 'break-all',
                            lineHeight: 1.4,
                            background: '#fff',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid #eee'
                          }}>
                            {link.url}
                          </div>
                          <div style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'center',
                            flexWrap: 'wrap'
                          }}>
                            <span style={{
                              padding: '6px 12px',
                              borderRadius: 999,
                              background: category?.color + '20',
                              color: category?.color,
                              fontSize: 13,
                              fontWeight: 700,
                              border: `2px solid ${category?.color}40`
                            }}>
                              {category?.label}
                            </span>
                            <span style={{
                              color: '#888',
                              fontSize: 13,
                              fontWeight: 600
                            }}>
                              {formatTimeAgo(link.ts)}
                            </span>
                            <span style={{
                              color: '#43a047',
                              fontSize: 13,
                              fontWeight: 600
                            }}>
                              {link.students.length}명이 받음
                            </span>
                          </div>
                        </div>
                        
                        {/* 방문 통계 */}
                        <div style={{
                          textAlign: 'center',
                          background: '#fff',
                          padding: '16px 20px',
                          borderRadius: 16,
                          border: '2px solid #e3f2fd',
                          minWidth: 80
                        }}>
                          <div style={{
                            fontSize: 28,
                            fontWeight: 900,
                            color: '#1976d2',
                            marginBottom: 4
                          }}>
                            {link.visits}
                          </div>
                          <div style={{
                            color: '#666',
                            fontSize: 13,
                            fontWeight: 600
                          }}>
                            방문
                          </div>
                        </div>
                        
                        {/* 삭제 버튼 */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <button
                            onClick={() => handleDeleteLink(link)}
                            style={{
                              fontWeight: 700,
                              borderRadius: 999,
                              background: '#ffe4ec',
                              color: '#d72660',
                              border: '2px solid #ffb6b9',
                              padding: '12px 20px',
                              fontSize: 15,
                              boxShadow: '0 4px 12px #f8bbd0a0',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              minWidth: 80,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4
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
                            🗑️ 삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 32
            }}>
              <button
                onClick={() => setShowLinkStatsModal(false)}
                style={{
                  fontWeight: 700,
                  borderRadius: 999,
                  background: '#e0f7fa',
                  color: '#1976d2',
                  border: '2px solid #b2ebf2',
                  padding: '12px 40px',
                  fontSize: 17,
                  boxShadow: '0 4px 12px #b2ebf240',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = '#b2ebf2';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = '#e0f7fa';
                  e.currentTarget.style.transform = 'translateY(0)';
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
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
          <div style={{ background: '#fff', padding: '32px 28px 24px 28px', borderRadius: 28, minWidth: 600, maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 48px rgba(102, 126, 234, 0.3)', border: '4px solid #667eea' }}>
            <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 18, color: '#667eea', letterSpacing: '-0.5px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span style={{ fontSize: 32 }}>🎵</span>
              단소급수미션 (심화)
              <span style={{ fontSize: 32 }}>✨</span>
            </div>
            
            {/* 탭 메뉴 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button 
                onClick={() => setRecorderAdvancedTab('progress')} 
                style={{ 
                  fontWeight: recorderAdvancedTab === 'progress' ? 700 : 500, 
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
                    fontWeight: recorderAdvancedTab === step ? 700 : 500, 
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
                        <th style={{ padding: '12px 8px', minWidth: 80, textAlign: 'center' }}>학생명</th>
                        {RECORDER_STEPS_ADVANCED.map(step => (
                          <th key={step} style={{ padding: '12px 6px', fontSize: 12, minWidth: 80 }}>{RECORDER_STEP_NAMES_ADVANCED[step]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {studentRows.map(student => (
                        <tr key={student.id} style={{ borderBottom: '1px solid #667eea' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 600, color: '#667eea', textAlign: 'center' }}>{student.name}</td>
                          {RECORDER_STEPS_ADVANCED.map(step => (
                            <td key={step} style={{ padding: '12px 6px', textAlign: 'center' }}>
                              <span style={{
                                fontWeight: '900',
                                fontSize: '18px',
                                color: recorderMissionsAdvanced[student.id]?.[step] ? '#4caf50' : '#f44336'
                              }}>
                                {recorderMissionsAdvanced[student.id]?.[step] ? 'O' : 'X'}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 각 단계 탭 */}
            {RECORDER_STEPS_ADVANCED.includes(recorderAdvancedTab) && (
              <div style={{ minHeight: 300 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#667eea', marginBottom: 16, textAlign: 'center' }}>
                  {RECORDER_STEP_NAMES_ADVANCED[recorderAdvancedTab]} 미션
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {studentRows.map(student => (
                    <div key={student.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '16px 20px', 
                      background: '#f0f4ff', 
                      borderRadius: 16, 
                      border: '2px solid #667eea',
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 600, color: '#667eea', fontSize: 16 }}>{student.name}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontWeight: '900',
                            fontSize: '16px',
                            color: recorderMissionsAdvanced[student.id]?.[recorderAdvancedTab] ? '#4caf50' : '#f44336'
                          }}>
                            {recorderMissionsAdvanced[student.id]?.[recorderAdvancedTab] ? 'O' : 'X'}
                          </span>
                          <span style={{ fontWeight: 600, color: '#667eea', fontSize: 16 }}>
                            {recorderMissionsAdvanced[student.id]?.[recorderAdvancedTab] ? '완료' : '미완료'}
                          </span>
                        </span>
                      </div>
                      <button 
                        onClick={() => handleRecorderMissionAdvancedComplete(student.id, recorderAdvancedTab)}
                        disabled={recorderMissionsAdvanced[student.id]?.[recorderAdvancedTab]}
                        style={{ 
                          fontWeight: 600, 
                          borderRadius: 999, 
                          background: recorderMissionsAdvanced[student.id]?.[recorderAdvancedTab] ? '#e8f5e8' : '#667eea', 
                          color: recorderMissionsAdvanced[student.id]?.[recorderAdvancedTab] ? '#43a047' : '#fff', 
                          border: 'none', 
                          padding: '8px 20px', 
                          fontSize: 14, 
                          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)', 
                          cursor: recorderMissionsAdvanced[student.id]?.[recorderAdvancedTab] ? 'not-allowed' : 'pointer', 
                          opacity: recorderMissionsAdvanced[student.id]?.[recorderAdvancedTab] ? 0.7 : 1,
                          transition: 'all 0.2s' 
                        }}
                      >
                        {recorderMissionsAdvanced[student.id]?.[recorderAdvancedTab] ? '완료됨' : '미션성공'}
                      </button>
                    </div>
                  ))}
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
      )}

      {/* 캔디 퀴즈타임 모달 */}
      {showQuizModal && (
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000
              }}
              onClick={(e) => {
                // 배경 클릭 시에만 모달 닫기
                if (e.target === e.currentTarget) {
                  setShowQuizModal(false);
                }
              }}
            >
              <div 
                style={{
                  position: 'relative',
                  width: '95%',
                  height: '95%',
                  maxWidth: '1200px',
                  maxHeight: '800px',
                  borderRadius: 16,
                  overflow: 'hidden'
                }}
                onClick={(e) => {
                  // 모달 내부 클릭 시 이벤트 전파 차단
                  e.stopPropagation();
                }}
              >
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowQuizModal(false);
                  }}
                  style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    fontSize: 24,
                    color: '#666',
                    cursor: 'pointer',
                    zIndex: 10001,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  ×
                </button>
                <QuizSystem isTeacher={true} currentUser={{name: "Teacher"}} studentsSnapshot={studentsSnapshot} collectionPrefix="copy_" />
              </div>
            </div>
          )}

      {/* 감정출석부 대시보드 모달 */}
      <EmotionDashboardModalCopy
        isOpen={showEmotionDashboardModal}
        onClose={() => setShowEmotionDashboardModal(false)}
        students={studentRows}
      />

      {/* AI 학습일지 분석 모달 */}
      <AIAnalysisModal
        isOpen={showAIAnalysisModal}
        onClose={() => setShowAIAnalysisModal(false)}
        students={studentRows}
        gasUrl="https://script.google.com/macros/s/AKfycbxBNUQJc0i-M0XlQICGsQAypKPlYjegjQ3GbTVzouKtxwCHadIUnJyuqshwFKOxWRIt/exec?page=board"
      />

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
                <div style={{ fontWeight: 700, fontSize: 18, color: '#7b1fa2', marginBottom: 16, textAlign: 'center' }}>전체 진행 현황</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f7faf7', borderRadius: 16, overflow: 'hidden', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: '#f3e5f5', color: '#7b1fa2', fontWeight: 700 }}>
                                                      <th style={{ padding: '12px 8px', minWidth: 80, textAlign: 'center' }}>학생명</th>
                        {RECORDER_STEPS.map(step => (
                          <th key={step} style={{ padding: '12px 6px', fontSize: 12, minWidth: 60 }}>{RECORDER_STEP_NAMES[step]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {studentRows.map(student => (
                        <tr key={student.id} style={{ borderBottom: '1px solid #f3e5f5' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 600, color: '#7b1fa2', textAlign: 'center' }}>{student.name}</td>
                          {RECORDER_STEPS.map(step => (
                            <td key={step} style={{ padding: '12px 6px', textAlign: 'center' }}>
                              <span style={{ 
                                fontSize: 18, 
                                color: recorderMissions[student.id]?.[step] ? '#43a047' : '#bbb',
                                fontWeight: 'bold'
                              }}>
                                <span style={{
                          fontWeight: '900',
                          fontSize: '18px',
                          color: recorderMissions[student.id]?.[step] ? '#4caf50' : '#f44336'
                        }}>
                          {recorderMissions[student.id]?.[step] ? 'O' : 'X'}
                        </span>
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 각 단계 탭 */}
            {RECORDER_STEPS.includes(recorderTab) && (
              <div style={{ minHeight: 300 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#7b1fa2', marginBottom: 16, textAlign: 'center' }}>
                  {RECORDER_STEP_NAMES[recorderTab]} 미션
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {studentRows.map(student => (
                    <div key={student.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '16px 20px', 
                      background: '#f7faf7', 
                      borderRadius: 16, 
                      border: '2px solid #f3e5f5',
                      boxShadow: '0 2px 8px #b2ebf240'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 600, color: '#7b1fa2', fontSize: 16 }}>{student.name}</span>
                        <span style={{ 
                          fontSize: 16, 
                          color: recorderMissions[student.id]?.[recorderTab] ? '#43a047' : '#bbb'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontWeight: '900',
                            fontSize: '16px',
                            color: recorderMissions[student.id]?.[recorderTab] ? '#4caf50' : '#f44336'
                          }}>
                            {recorderMissions[student.id]?.[recorderTab] ? 'O' : 'X'}
                          </span>
                          {recorderMissions[student.id]?.[recorderTab] ? '완료' : '미완료'}
                        </span>
                        </span>
                      </div>
                      <button 
                        onClick={() => handleRecorderMissionComplete(student.id, recorderTab)}
                        disabled={recorderMissions[student.id]?.[recorderTab]}
                        style={{ 
                          fontWeight: 600, 
                          borderRadius: 999, 
                          background: recorderMissions[student.id]?.[recorderTab] ? '#e8f5e8' : '#f3e5f5', 
                          color: recorderMissions[student.id]?.[recorderTab] ? '#43a047' : '#7b1fa2', 
                          border: 'none', 
                          padding: '8px 20px', 
                          fontSize: 14, 
                          boxShadow: '0 2px 8px #b2ebf240', 
                          cursor: recorderMissions[student.id]?.[recorderTab] ? 'not-allowed' : 'pointer', 
                          opacity: recorderMissions[student.id]?.[recorderTab] ? 0.7 : 1,
                          transition: 'all 0.2s' 
                        }}
                      >
                        {recorderMissions[student.id]?.[recorderTab] ? '완료됨' : '미션성공'}
                      </button>
                    </div>
                  ))}
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
    </React.Fragment>
  );
}


export default TeacherPageCopy;