import React, { useState, useEffect } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, doc, updateDoc, arrayUnion, setDoc, getDocs, query, orderBy, deleteDoc, getDoc, addDoc, limit } from 'firebase/firestore';
import { db } from '../firebase';
import StudentCard from '../components/StudentCard';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import Checkbox from '@mui/material/Checkbox';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useNavigate } from 'react-router-dom';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';

const LEVELS = [
  '알사탕',
  '새콤한 사탕',
  '막대사탕',
  '롤리팝',
  '수제 사탕',
  '사탕 마스터',
];

const STUDENT_ORDER = [
  '김규민','김범준','김성준','김수겸','김주원','문기훈','박동하','백주원','백지원','손정환','이도윤','이예준','임재희','조은빈','조찬희','최서윤','최서현','한서우','황리아','하지수','테스트'
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

const TeacherPage = () => {
  // 모든 useState, useEffect 등 Hook 선언
  const [studentsSnapshot, loading, error] = useCollection(collection(db, 'students'));
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
  const [showGameModal, setShowGameModal] = useState(false);
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

  // 학생 초기 데이터 (제시된 값)
  const initialStudents = [
    { name: '김규민', balance: 177 },
    { name: '김범준', balance: 143 },
    { name: '김성준', balance: 44 },
    { name: '김수겸', balance: 0 },
    { name: '김주원', balance: 51 },
    { name: '문기훈', balance: 150 },
    { name: '박동하', balance: 0 },
    { name: '백주원', balance: 58 },
    { name: '백지원', balance: 4 },
    { name: '손정환', balance: 34 },
    { name: '이도윤', balance: 61 },
    { name: '이예준', balance: 143 },
    { name: '임재희', balance: 100 },
    { name: '조은빈', balance: 28 },
    { name: '조찬희', balance: 45 },
    { name: '최서윤', balance: 28 },
    { name: '최서현', balance: 1 },
    { name: '한서우', balance: 0 },
    { name: '황리아', balance: 120 },
    { name: '하지수', balance: 102 },
    { name: '테스트', balance: 100 }
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

  // Firestore에 동기화(최초 1회만, studentsSnapshot이 비어있을 때만)
  useEffect(() => {
    const checkAndInit = async () => {
      // 'init_done' 마커 문서 확인
      const markerRef = doc(db, 'meta', 'init_done');
      const markerSnap = await getDoc(markerRef);
      if (!markerSnap.exists()) {
        // 1. students 컬렉션 전체 삭제
        const q = query(collection(db, 'students'));
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
          await deleteDoc(doc(db, 'students', docSnap.id));
        }
        // 2. initialStudents 동기화
        for (const s of initialStudents) {
          await setDoc(doc(db, 'students', s.name), { name: s.name, balance: s.balance }, { merge: true });
        }
        // 3. 마커 문서 생성 (초기화 완료 표시)
        await setDoc(markerRef, { done: true, ts: Date.now() });
      }
    };
    checkAndInit();
  }, []); // 최초 1회만 실행

  // 품목 Firestore 동기화 (최초 1회만, items 컬렉션이 비어있을 때만)
  useEffect(() => {
    const syncInitialItems = async () => {
      const q = query(collection(db, 'items'));
      const snap = await getDocs(q);
      if (snap.empty) {
        // 기존 문서가 남아 있을 수 있으니 모두 삭제
        for (const docSnap of snap.docs) {
          await deleteDoc(doc(db, 'items', docSnap.id));
        }
        // 초기 품목 데이터 입력
        for (const item of initialItems) {
          await setDoc(doc(db, 'items', item.name), { name: item.name, price: item.price }, { merge: true });
        }
      }
    };
    syncInitialItems();
  }, []);

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
      let prevLevel = 0;
      let curLevel = student.level || 0;
      // expEvents에서 type: 'levelup'이 있으면 그걸, 없으면 레벨 변화 추정
      // 레벨업 이력 추정: expEvents에서 경험치로 레벨업 시점 계산
      let exp = 0;
      let level = 0;
      if (Array.isArray(student.expEvents)) {
        student.expEvents.forEach(evt => {
          if (evt.type === 'exp' || evt.type === 'friendPraise' || evt.type === 'selfPraise' || evt.type === 'quest') {
            exp += evt.amount || 0;
            let required = 150 + level * 10;
            while (exp >= required) {
              exp -= required;
              // 레벨업: 이전 레벨 사탕 +1
              if (level < 6) candyCounts[level]++;
              level++;
              required = 150 + level * 10;
            }
          }
        });
      }
    });
  }

  useEffect(() => {
    if (!studentsSnapshot) return;
    let requests = [];
    studentsSnapshot.docs.forEach(docSnap => {
      const student = docSnap.data();
      // 메시지
      (student.messages || []).filter(m => m.from === 'student' && !m.checked).forEach(m => {
        requests.push({ type: 'message', studentId: docSnap.id, studentName: student.name, ...m });
      });
      // 친구/자기 칭찬
      (student.praise || []).filter(p => !p.checked).forEach(p => {
        requests.push({ type: p.self ? 'selfPraise' : 'friendPraise', studentId: docSnap.id, studentName: student.name, ...p });
      });
    });
    setPendingRequests(requests.sort((a,b)=>b.ts-a.ts));
  }, [studentsSnapshot]);

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
      const q = query(collection(db, 'items'));
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

  // 조건부 렌더링
  if (loading || syncing) return <div style={{textAlign:'center',marginTop:40}}>로딩 중...</div>;
  if (error) return <div style={{color:'red',textAlign:'center',marginTop:40}}>에러 발생: {error.message}</div>;
  if (!studentsSnapshot || studentsSnapshot.empty) return <div style={{textAlign:'center',marginTop:40}}>학생 데이터가 없습니다.</div>;

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
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
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
  const getRequiredExp = (level) => 150 + level * 10;

  // 발표 경험치 부여
  const handleGiveExp = async () => {
    if (!studentsSnapshot) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    for (const docSnap of studentsSnapshot.docs) {
      if (selectedIds.includes(docSnap.id)) {
        const student = docSnap.data();
        let newExp = (typeof student.exp === 'number' && !isNaN(student.exp) ? student.exp : 0) + 10;
        let newLevel = typeof student.level === 'number' && !isNaN(student.level) ? student.level : 0;
        let levelUp = false;
        let requiredExp = getRequiredExp(newLevel);
        while (newExp >= requiredExp) {
          newExp -= requiredExp;
          newLevel += 1;
          levelUp = true;
          requiredExp = getRequiredExp(newLevel);
        }
        // 발표 기록 추가
        const presentations = Array.isArray(student.presentations) ? [...student.presentations] : [];
        presentations.push({ date: todayStr, ts: Date.now() });
        await updateDoc(doc(db, 'students', docSnap.id), {
          exp: newExp,
          level: newLevel,
          expEvents: arrayUnion({ type: 'exp', amount: 10, ts: Date.now() })
        });
        triggerExpEffect(docSnap.id);
        if (levelUp) triggerLevelUpEffect(docSnap.id);
      }
    }
  };

  // 메시지 모달
  const handleSendMessage = async () => {
    if (!studentsSnapshot) return;
    for (const docSnap of studentsSnapshot.docs) {
      if (selectedIds.includes(docSnap.id)) {
        const student = docSnap.data();
        const newMessages = [...(student.messages || []), { from: 'teacher', text: messageText, ts: Date.now() }];
        await updateDoc(doc(db, 'students', docSnap.id), {
          messages: newMessages,
        });
      }
    }
    setShowMessageModal(false);
    setMessageText('');
  };

  // 퀘스트 모달
  const handleSendQuest = async () => {
    if (!studentsSnapshot) return;
    for (const docSnap of studentsSnapshot.docs) {
      if (selectedIds.includes(docSnap.id)) {
        const student = docSnap.data();
        const newQuests = [...(student.quests || []), { from: 'teacher', text: questText, ts: Date.now(), exp: questExp, status: 'ongoing' }];
        await updateDoc(doc(db, 'students', docSnap.id), {
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
      // 친구들에게 경험치 지급
      for (const friendId of req.friends || []) {
        const friendRef = doc(db, 'students', friendId);
        const friendSnap = studentsSnapshot.docs.find(d => d.id === friendId);
        if (!friendSnap) continue;
        let friend = friendSnap.data();
        let newExp = friend.exp + req.exp;
        let newLevel = friend.level;
        let levelUp = false;
        let requiredExp = getRequiredExp(friend.level);
        while (newExp >= requiredExp) {
          newExp -= requiredExp;
          newLevel += 1;
          levelUp = true;
          requiredExp = getRequiredExp(newLevel);
        }
        await updateDoc(friendRef, {
          exp: newExp,
          level: newLevel,
          expEvents: arrayUnion({ type: 'friendPraise', amount: req.exp, ts: Date.now(), text: req.text, from: req.studentName, result: 'approved' })
        });
      }
      // 칭찬 요청자 칭찬 checked 처리
      const studentRef = doc(db, 'students', req.studentId);
      const studentSnap = studentsSnapshot.docs.find(d => d.id === req.studentId);
      let student = studentSnap.data();
      let praiseArr = (student.praise || []).map(p => p.ts === req.ts ? { ...p, checked: true, result: 'approved' } : p);
      await updateDoc(studentRef, { praise: praiseArr });
    } else if (req.type === 'selfPraise') {
      // 자기 칭찬: 본인에게 경험치 지급
      const studentRef = doc(db, 'students', req.studentId);
      const studentSnap = studentsSnapshot.docs.find(d => d.id === req.studentId);
      let student = studentSnap.data();
      let newExp = student.exp + req.exp;
      let newLevel = student.level;
      let levelUp = false;
      let requiredExp = getRequiredExp(student.level);
      while (newExp >= requiredExp) {
        newExp -= requiredExp;
        newLevel += 1;
        levelUp = true;
        requiredExp = getRequiredExp(newLevel);
      }
      let praiseArr = (student.praise || []).map(p => p.ts === req.ts ? { ...p, checked: true, result: 'approved' } : p);
      await updateDoc(studentRef, {
        exp: newExp,
        level: newLevel,
        praise: praiseArr,
        expEvents: arrayUnion({ type: 'selfPraise', amount: req.exp, ts: Date.now(), text: req.text, result: 'approved' })
      });
    } else if (req.type === 'message') {
      // 메시지 checked 처리
      const studentRef = doc(db, 'students', req.studentId);
      const studentSnap = studentsSnapshot.docs.find(d => d.id === req.studentId);
      let student = studentSnap.data();
      let msgArr = (student.messages || []).map(m => m.ts === req.ts ? { ...m, checked: true } : m);
      await updateDoc(studentRef, { messages: msgArr });
    }
    setSelectedRequest(null);
  };
  // 거절 처리
  const handleReject = async (req) => {
    if (!rejectReason) return;
    const studentRef = doc(db, 'students', req.studentId);
    const studentSnap = studentsSnapshot.docs.find(d => d.id === req.studentId);
    let student = studentSnap.data();
    if (req.type === 'friendPraise' || req.type === 'selfPraise') {
      let praiseArr = (student.praise || []).map(p => p.ts === req.ts ? { ...p, checked: true, result: 'rejected', reason: rejectReason } : p);
      await updateDoc(studentRef, {
        praise: praiseArr,
        expEvents: arrayUnion({ type: req.type, amount: 0, ts: Date.now(), text: req.text, result: 'rejected', reason: rejectReason })
      });
    }
    setRejectReason('');
    setSelectedRequest(null);
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
      let newExp = (typeof student.exp === 'number' && !isNaN(student.exp) ? student.exp : 0) + quest.exp;
      let newLevel = typeof student.level === 'number' && !isNaN(student.level) ? student.level : 0;
      let levelUp = false;
      let requiredExp = getRequiredExp(newLevel);
      while (newExp >= requiredExp) {
        newExp -= requiredExp;
        newLevel += 1;
        levelUp = true;
        requiredExp = getRequiredExp(newLevel);
      }
      updates.exp = newExp;
      updates.level = newLevel;
      updates.expEvents = arrayUnion({ type: 'quest', amount: quest.exp, ts: Date.now(), text: quest.text });
      triggerExpEffect(studentDoc.id);
      if (levelUp) triggerLevelUpEffect(studentDoc.id);
      setQuestResultEffect('퀘스트 성공! 경험치 지급 🎉');
      setTimeout(() => setQuestResultEffect(''), 1500);
    } else {
      setQuestResultEffect('퀘스트 실패 😢');
      setTimeout(() => setQuestResultEffect(''), 1500);
    }
    await updateDoc(doc(db, 'students', studentDoc.id), updates);
    setQuestActionStudent(null);
    setQuestActionQuest(null);
  };

  // 개별 알람 읽음 처리
  const handleMarkAsRead = async (req) => {
    const studentRef = doc(db, 'students', req.studentId);
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
    await setDoc(doc(db, 'boards', code), {
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
    const q = query(collection(db, 'boards'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setBoardList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setBoardListLoading(false);
  };

  // studentsSnapshot이 비어있으면 initialStudents를 화면에 직접 렌더링
  const studentRows = (studentsSnapshot && !studentsSnapshot.empty)
    ? studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    : initialStudents.map(s => ({ id: s.name, ...s }));

  const order = initialStudents.map(s => s.name);

  const handleAmount = async () => {
    if (!studentsSnapshot) return;
    for (const id of bankSelectedIds) {
      const docSnap = studentsSnapshot.docs.find(d => d.id === id);
      if (!docSnap) continue;
      const student = docSnap.data();
      let newBalance = student.balance || 0;
      if (amountType === 'deposit') newBalance += amountValue;
      else if (amountType === 'withdraw') newBalance -= amountValue;
      await updateDoc(doc(db, 'students', id), { balance: newBalance });
    }
    setShowAmountModal(false);
    setAmountValue(0);
  };

  // 게임 기록 불러오기
  const fetchTopRecords = async () => {
    const q = query(collection(db, 'reactionGameRecords'), orderBy('ms', 'asc'), limit(5));
    const snap = await getDocs(q);
    setTopRecords(snap.docs.map(d => d.data()));
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', padding: '32px',
      background: 'linear-gradient(135deg, rgba(224,247,250,0.6) 0%, rgba(227,242,253,0.6) 100%), url(/TR_bg.png) center/cover no-repeat',
      backgroundBlendMode: 'normal',
      boxSizing: 'border-box' }}>
      {/* 배너 이미지 */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 32, marginTop: 8 }}>
        <img src="/candyshop_banner.png" alt="JAMMANBO CANDY SHOP 배너" style={{ maxWidth: 480, width: '90vw', height: 'auto', borderRadius: 18, boxShadow: '0 4px 24px #b2ebf240', display: 'block' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
        <button
          onClick={handleSelectAll}
          style={{
            background: '#fffefb', border: '2px solid #a7d7c5', color: '#1976d2', fontWeight: 'bold', borderRadius: 12, boxShadow: '0 2px 8px #a7d7c540', padding: '8px 18px', fontSize: 14, minWidth: 70, transition: 'all 0.2s', cursor: 'pointer'
          }}
        >전체 선택/해제</button>
        <button
          onClick={handleSelectRandomTwo}
          style={{
            background: '#fffefb', border: '2px solid #a7d7c5', color: '#43a047', fontWeight: 'bold', borderRadius: 12, boxShadow: '0 2px 8px #a7d7c540', padding: '8px 18px', fontSize: 14, minWidth: 70, transition: 'all 0.2s', cursor: 'pointer'
          }}
        >랜덤 2명 선택</button>
        <button
          onClick={handleGiveExp}
          disabled={selectedIds.length === 0}
          style={{
            background: selectedIds.length ? '#ffe4ec' : '#f7faf7',
            border: selectedIds.length ? '2px solid #ffb6b9' : '2px solid #a7d7c5',
            color: '#d72660', fontWeight: 'bold', borderRadius: 12, boxShadow: '0 2px 8px #f8bbd0a0', padding: '8px 18px', fontSize: 14, minWidth: 70, transition: 'all 0.2s', cursor: selectedIds.length ? 'pointer' : 'not-allowed', opacity: selectedIds.length ? 1 : 0.5
          }}
        >발표 경험치</button>
        <button
          onClick={() => setShowMessageModal(true)}
          disabled={selectedIds.length === 0}
          style={{
            background: selectedIds.length ? '#ffe4ec' : '#f7faf7',
            border: selectedIds.length ? '2px solid #ffb6b9' : '2px solid #a7d7c5',
            color: '#d72660', fontWeight: 'bold', borderRadius: 12, boxShadow: '0 2px 8px #f8bbd0a0', padding: '8px 18px', fontSize: 14, minWidth: 70, transition: 'all 0.2s', cursor: selectedIds.length ? 'pointer' : 'not-allowed', opacity: selectedIds.length ? 1 : 0.5
          }}
        >메세지 보내기</button>
        <button
          onClick={() => setShowQuestModal(true)}
          disabled={selectedIds.length === 0}
          style={{
            background: selectedIds.length ? '#ffe4ec' : '#f7faf7',
            border: selectedIds.length ? '2px solid #ffb6b9' : '2px solid #a7d7c5',
            color: '#d72660', fontWeight: 'bold', borderRadius: 12, boxShadow: '0 2px 8px #f8bbd0a0', padding: '8px 18px', fontSize: 14, minWidth: 70, transition: 'all 0.2s', cursor: selectedIds.length ? 'pointer' : 'not-allowed', opacity: selectedIds.length ? 1 : 0.5
          }}
        >퀘스트 주기</button>
        <button
          onClick={() => setShowBoardChoiceModal(true)}
          style={{
            background: '#e0f7fa', border: '2px solid #1976d2', color: '#1976d2', fontWeight: 'bold', borderRadius: 12, boxShadow: '0 2px 8px #b2ebf240', padding: '8px 18px', fontSize: 14, minWidth: 70, transition: 'all 0.2s', cursor: 'pointer', marginLeft: 0
          }}
        >게시판 개설</button>
      </div>
      <div style={{ marginTop: '24px', display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center' }}>
        {studentsSnapshot && studentsSnapshot.docs
          .slice()
          .sort((a, b) => order.indexOf(a.data().name) - order.indexOf(b.data().name))
          .map(doc => {
            const student = doc.data();
            // level, exp 안전 처리
            const level = typeof student.level === 'number' && !isNaN(student.level) ? student.level : 0;
            const exp = typeof student.exp === 'number' && !isNaN(student.exp) ? student.exp : 0;
            const levelName = LEVELS[level] || LEVELS[0];
            return (
              <StudentCard
                key={doc.id}
                student={{ ...student, level, exp, levelName }}
                selected={selectedIds.includes(doc.id)}
                onSelect={() => handleSelect(doc.id)}
                onOptionClick={(option) => {
                  if (option === 'exp') handleGiveExp();
                  if (option === 'message') setShowMessageModal(true);
                  if (option === 'quest') setShowQuestModal(true);
                }}
                expEffect={expEffectIds.includes(doc.id)}
                levelUpEffect={levelUpEffectIds.includes(doc.id)}
                onQuestClick={(quest) => { setQuestActionStudent({ id: doc.id, name: student.name }); setQuestActionQuest(quest); }}
                onQuestApprove={(quest) => handleQuestResult(doc.id, quest, 'success')}
                onQuestFail={(quest) => handleQuestResult(doc.id, quest, 'fail')}
              />
            );
          })}
      </div>
      {/* 메시지 모달 */}
      {showMessageModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '32px 28px 24px 28px', borderRadius: 28, minWidth: 320, boxShadow: '0 4px 32px #b2ebf240', maxWidth: '90vw' }}>
            <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 18, color: '#1976d2', letterSpacing: '-0.5px' }}>메세지 보내기</div>
            <textarea value={messageText} onChange={e => setMessageText(e.target.value)} style={{ width: '100%', minHeight: 80, borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', resize: 'vertical', marginBottom: 18, boxSizing: 'border-box', background: '#f7faf7', color: '#222', transition: 'border 0.2s' }} />
            <div style={{ marginTop: 0, textAlign: 'right', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowMessageModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 22px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
              <button onClick={handleSendMessage} disabled={!messageText} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 22px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', opacity: messageText ? 1 : 0.5, cursor: messageText ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>보내기</button>
            </div>
          </div>
        </div>
      )}
      {/* 퀘스트 모달 */}
      {showQuestModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '32px 28px 24px 28px', borderRadius: 28, minWidth: 320, boxShadow: '0 4px 32px #b2ebf240', maxWidth: '90vw' }}>
            <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 18, color: '#1976d2', letterSpacing: '-0.5px' }}>퀘스트 주기</div>
            <input value={questText} onChange={e => setQuestText(e.target.value)} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 10, fontSize: 16, outline: 'none', marginBottom: 10, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box' }} placeholder="퀘스트명을 입력하세요" />
            <input type="number" value={questExp} onChange={e => setQuestExp(Number(e.target.value))} min={1} max={100} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 10, fontSize: 16, outline: 'none', marginBottom: 18, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box' }} placeholder="경험치" />
            <div style={{ marginTop: 0, textAlign: 'right', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowQuestModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 22px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
              <button onClick={handleSendQuest} disabled={!questText || !questExp} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 22px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', opacity: questText && questExp ? 1 : 0.5, cursor: questText && questExp ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>보내기</button>
            </div>
          </div>
        </div>
      )}
      {/* 종(알림) 버튼 UI */}
      <div style={{ position: 'fixed', top: 24, right: 32, zIndex: 2000, display: 'flex', flexDirection: 'row', gap: 18, alignItems: 'center' }}>
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
        <button onClick={()=>setShowBankModal(true)} style={{ background: '#fffde7', border: 'none', borderRadius: 999, padding: '8px 18px', boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <StorefrontIcon style={{ color: '#d72660', fontSize: 28 }} />
          <span style={{ fontWeight: 700, color: '#d72660', fontSize: 16 }}>캔디숍</span>
        </button>
      </div>
      {/* 알림 모달 UI */}
      {showTeacherAlarm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', padding: '32px 28px 24px 28px', borderRadius: 28, minWidth: 420, maxHeight: 600, overflowY: 'auto', boxShadow: '0 4px 32px #b2ebf240', maxWidth: '90vw' }}>
            <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 18, color: '#1976d2', letterSpacing: '-0.5px' }}>학생 요청 알림</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button onClick={() => setAlarmTab('message')} style={{ fontWeight: alarmTab==='message'?700:500, borderRadius: 999, background: alarmTab==='message' ? '#e0f7fa' : '#f7faf7', color: '#1976d2', border: 'none', padding: '7px 18px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>메시지</button>
              <button onClick={() => setAlarmTab('praise')} style={{ fontWeight: alarmTab==='praise'?700:500, borderRadius: 999, background: alarmTab==='praise' ? '#e0f7fa' : '#f7faf7', color: '#1976d2', border: 'none', padding: '7px 18px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>칭찬 요청</button>
              <button onClick={() => setAlarmTab('historyMessage')} style={{ fontWeight: alarmTab==='historyMessage'?700:500, borderRadius: 999, background: alarmTab==='historyMessage' ? '#e0f7fa' : '#f7faf7', color: '#1976d2', border: 'none', padding: '7px 18px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>과거 메시지</button>
              <button onClick={() => setAlarmTab('historyPraise')} style={{ fontWeight: alarmTab==='historyPraise'?700:500, borderRadius: 999, background: alarmTab==='historyPraise' ? '#e0f7fa' : '#f7faf7', color: '#1976d2', border: 'none', padding: '7px 18px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>과거 칭찬</button>
            </div>
            {alarmTab === 'message' && (
              <>
                <div style={{ textAlign: 'right', marginBottom: 8 }}>
                  <button onClick={() => handleMarkAllAsRead('message')} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '6px 18px', fontSize: 14, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>모두 읽음</button>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {pendingRequests.filter(r => r.type === 'message').length === 0 && <li style={{ color: '#888', padding: '18px 0', textAlign: 'center' }}>새로운 메시지가 없습니다.</li>}
                  {pendingRequests.filter(r => r.type === 'message').map((req, idx) => (
                    <li key={idx} style={{ marginBottom: 16, borderBottom: '1px solid #e0f7fa', paddingBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4, color: '#1976d2' }}>{req.studentName} (메시지)</div>
                        <div style={{ marginBottom: 4, color: '#222' }}>{req.text}</div>
                        <div style={{ color: '#90caf9', fontSize: 13 }}>{new Date(req.ts).toLocaleString()}</div>
                      </div>
                      <button onClick={() => handleMarkAsRead(req)} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '6px 14px', fontSize: 14, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>읽음</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {alarmTab === 'praise' && (
              <>
                <div style={{ textAlign: 'right', marginBottom: 8 }}>
                  <button onClick={() => handleMarkAllAsRead('praise')} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '6px 18px', fontSize: 14, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>모두 읽음</button>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {pendingRequests.filter(r => r.type === 'friendPraise' || r.type === 'selfPraise').length === 0 && <li style={{ color: '#888', padding: '18px 0', textAlign: 'center' }}>새로운 칭찬 요청이 없습니다.</li>}
                  {pendingRequests.filter(r => r.type === 'friendPraise' || r.type === 'selfPraise').map((req, idx) => (
                    <li key={idx} style={{ marginBottom: 16, borderBottom: '1px solid #e0f7fa', paddingBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4, color: '#1976d2' }}>{req.studentName} ({req.type === 'friendPraise' ? '친구 칭찬' : '나 칭찬'})</div>
                        <div style={{ marginBottom: 4, color: '#222' }}>{req.text}</div>
                        <div style={{ color: '#90caf9', fontSize: 13 }}>{new Date(req.ts).toLocaleString()}</div>
                        <div>희망 경험치: {req.exp}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button onClick={() => handleApprove(req)} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '6px 14px', fontSize: 14, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', marginBottom: 4 }}>승인</button>
                        <button onClick={() => { setSelectedRequest(req); }} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '6px 14px', fontSize: 14, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer' }}>거절</button>
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
                    return (student.praise || []).map((p, idx) => ({
                      studentName: student.name,
                      text: p.text,
                      ts: p.ts,
                      checked: p.checked,
                      result: p.result,
                      reason: p.reason,
                      self: p.self,
                      friends: p.friends,
                    }));
                  }).sort((a, b) => b.ts - a.ts).map((p, idx) => {
                    let targetText = '';
                    if (p.self) {
                      targetText = `${p.studentName} (나 칭찬)`;
                    } else if (Array.isArray(p.friends) && p.friends.length > 0 && studentsSnapshot) {
                      const friendNames = p.friends.map(fid => {
                        const fdoc = studentsSnapshot.docs.find(d => d.id === fid);
                        return fdoc ? fdoc.data().name : fid;
                      });
                      targetText = `${p.studentName} → ${friendNames.join(', ')}`;
                    } else {
                      targetText = p.studentName;
                    }
                    return (
                      <li key={idx} style={{ marginBottom: 12, borderBottom: '1px solid #e0f7fa', paddingBottom: 6 }}>
                        <div style={{ fontWeight: 600, color: '#1976d2' }}>{targetText}</div>
                        <div style={{ color: '#222', marginBottom: 2 }}>{p.text}</div>
                        <div style={{ color: '#90caf9', fontSize: 13 }}>{new Date(p.ts).toLocaleString()}</div>
                        <div style={{ color: p.checked ? (p.result === 'approved' ? '#43a047' : '#ff1744') : '#ff9800', fontSize: 13 }}>
                          {p.checked ? (p.result === 'approved' ? '승인' : (p.result === 'rejected' ? `거절 (${p.reason||''})` : '처리됨')) : '미확인'}
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
          {/* 승인/거절 모달 */}
          {selectedRequest && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
              <div style={{ background: '#fff', padding: 32, borderRadius: 16, minWidth: 320 }}>
                <h3>요청 처리</h3>
                <div style={{ marginBottom: 12 }}>{selectedRequest.text}</div>
                {(selectedRequest.type === 'friendPraise' || selectedRequest.type === 'selfPraise') && <div>희망 경험치: {selectedRequest.exp}</div>}
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <button onClick={() => handleApprove(selectedRequest)} style={{ marginRight: 8 }}>승인</button>
                  <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="거절 사유" style={{ marginRight: 8 }} />
                  <button onClick={() => handleReject(selectedRequest)} disabled={!rejectReason}>거절</button>
                  <button onClick={() => setSelectedRequest(null)} style={{ marginLeft: 8 }}>취소</button>
                </div>
              </div>
            </div>
          )}
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
              <button onClick={()=>setBankTab('items')} style={{ fontWeight: 700, fontSize: 18, color: bankTab==='items' ? '#d72660' : '#888', background: 'none', border: 'none', borderBottom: bankTab==='items' ? '3px solid #d72660' : '3px solid #eee', padding: '8px 24px', cursor: 'pointer', transition: 'all 0.2s' }}>품목명</button>
              <button onClick={()=>setBankTab('deposit')} style={{ fontWeight: 700, fontSize: 18, color: bankTab==='deposit' ? '#d72660' : '#888', background: 'none', border: 'none', borderBottom: bankTab==='deposit' ? '3px solid #d72660' : '3px solid #eee', padding: '8px 24px', cursor: 'pointer', transition: 'all 0.2s' }}>입금내역</button>
              <button onClick={()=>setBankTab('withdraw')} style={{ fontWeight: 700, fontSize: 18, color: bankTab==='withdraw' ? '#d72660' : '#888', background: 'none', border: 'none', borderBottom: bankTab==='withdraw' ? '3px solid #d72660' : '3px solid #eee', padding: '8px 24px', cursor: 'pointer', transition: 'all 0.2s' }}>지출내역</button>
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
                                  await deleteDoc(doc(db, 'students', row.id));
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
                            await setDoc(doc(db, 'students', newStudentName), { name: newStudentName.trim(), balance: newStudentBalance });
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
            {bankTab==='items' && (
              <div style={{ minHeight: 220, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 20, color: '#1976d2' }}>품목명/가격</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={async()=>{
                      setItemSaving(true);
                      for(const id of Object.keys(itemNames)){
                        await setDoc(doc(db, 'items', id), { name: itemNames[id], price: itemPrices[id] });
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
                              await deleteDoc(doc(db, 'items', item.id));
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
                          await setDoc(doc(db, 'items', newItemName), { name: newItemName.trim(), price: newItemPrice });
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
                        <th style={{ padding: 8 }}>학생명</th>
                        <th style={{ padding: 8 }}>구입내역</th>
                        <th style={{ padding: 8 }}>금액</th>
                        <th style={{ padding: 8 }}>날짜</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsSnapshot && studentsSnapshot.docs.flatMap(doc => {
                        const student = doc.data();
                        return (student.transactions || [])
                          .filter(t => t.type === 'spend')
                          .sort((a, b) => b.ts - a.ts)
                          .map((t, idx) => (
                            <tr key={doc.id + '-' + t.ts + '-' + idx} style={{ borderBottom: '1px solid #ffe4ec' }}>
                              <td style={{ padding: 8, fontWeight: 600, color: '#d72660' }}>{student.name}</td>
                              <td style={{ padding: 8 }}>
                                {t.items && Object.keys(t.items).length > 0 ? (
                                  Object.entries(t.items).map(([item, qty]) => `${item}x${qty}`).join(', ')
                                ) : t.customAmount ? `직접입력: ${t.customAmount}원` : '-'}
                              </td>
                              <td style={{ padding: 8, color: '#d72660', fontWeight: 700 }}>{t.amount}원</td>
                              <td style={{ padding: 8, color: '#888', fontSize: 14 }}>{new Date(t.ts).toLocaleString('ko-KR')}</td>
                            </tr>
                          ));
                      })}
                    </tbody>
                  </table>
                  {/* 내역 없을 때 안내 */}
                  {studentsSnapshot && studentsSnapshot.docs.every(doc => !(doc.data().transactions||[]).some(t => t.type==='spend')) && (
                    <div style={{ color: '#bbb', fontSize: 18, padding: 40, textAlign: 'center' }}>지출 내역이 없습니다.</div>
                  )}
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
      {/* 게임 모달 */}
      {showGameModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div style={{ 
            background: gameStep === 'reaction' && targetColor ? targetColor.code : '#fff', 
            padding: 36, 
            borderRadius: 32, 
            minWidth: 480, 
            maxWidth: 600, 
            boxShadow: '0 8px 48px #b2ebf240', 
            textAlign: 'center', 
            position: 'relative',
            transition: 'background 0.3s'
          }}>
            <button onClick={() => setShowGameModal(false)} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: gameStep === 'reaction' && targetColor ? '#fff' : '#bbb', cursor: 'pointer', fontWeight: 700 }}>×</button>
            {gameStep === 'select' && (
              <>
                <div style={{ fontWeight: 700, fontSize: 22, color: '#1976d2', marginBottom: 18 }}>게임 선택</div>
                <button onClick={() => {
                  setTargetColor(REACTION_COLORS[Math.floor(Math.random()*REACTION_COLORS.length)]);
                  setGameStep('reaction');
                  setReactionTime(null);
                  setGameError('');
                  setStudentName('');
                }} style={{ fontWeight: 700, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '14px 38px', fontSize: 18, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', marginBottom: 18 }}>순발력 게임</button>
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontWeight: 600, color: '#888', fontSize: 16, marginBottom: 8 }}>TOP 5 기록</div>
                  <ol style={{ textAlign: 'left', margin: '0 auto', maxWidth: 280 }}>
                    {topRecords.length === 0 && <li style={{ color: '#bbb' }}>기록 없음</li>}
                    {topRecords.map((r, i) => <li key={i} style={{ color: '#1976d2', fontWeight: 600 }}>{r.studentName||'익명'} - {r.ms}ms</li>)}
                  </ol>
                </div>
              </>
            )}
            {gameStep === 'reaction' && (
              <>
                <div style={{ fontWeight: 700, fontSize: 24, color: '#fff', marginBottom: 16, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>지정 색상: {targetColor?.name}</div>
                <div style={{ marginBottom: 16, color: '#fff', fontSize: 18, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>아래 배경이 {targetColor?.name}이 되면 최대한 빨리 클릭하세요!</div>
                {reactionTime === null ? (
                  <div style={{ 
                    width: 320, 
                    height: 240, 
                    margin: '0 auto 24px auto', 
                    borderRadius: 24, 
                    background: currentColor?.code || '#eee', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: isClickable ? 'pointer' : 'default', 
                    transition: 'background 0.2s',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
                  }}
                    onClick={async () => {
                      if (isClickable && currentColor?.code === targetColor?.code) {
                        const ms = Date.now() - startTime;
                        setReactionTime(ms);
                        setIsClickable(false);
                        if (!studentName) {
                          setGameError('이름을 입력하세요!');
                          return;
                        }
                        await addDoc(collection(db, 'reactionGameRecords'), { studentName, ms, ts: Date.now() });
                        fetchTopRecords();
                      }
                    }}>
                    {isClickable && currentColor?.code === targetColor?.code ? <span style={{ fontWeight: 700, fontSize: 28, color: '#fff', textShadow: '0 2px 8px #0008' }}>지금 클릭!</span> : ''}
                  </div>
                ) : (
                  <div style={{ fontWeight: 700, fontSize: 28, color: '#fff', margin: '24px 0', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>기록: {reactionTime}ms</div>
                )}
                <div style={{ margin: '16px 0' }}>
                  <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="이름(닉네임)" style={{ borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.3)', padding: '10px 16px', fontSize: 16, marginBottom: 8, width: 200, background: 'rgba(255,255,255,0.1)', color: '#fff' }} disabled={reactionTime !== null} />
                </div>
                {gameError && <div style={{ color: '#fff', fontWeight: 700, marginBottom: 8, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{gameError}</div>}
                {reactionTime === null ? (
                  <button onClick={() => {
                    setGameError('');
                    setReactionTime(null);
                    setIsClickable(false);
                    let colorInterval = null;
                    let colorChange = () => {
                      const idx = Math.floor(Math.random()*REACTION_COLORS.length);
                      setCurrentColor(REACTION_COLORS[idx]);
                      if (REACTION_COLORS[idx].code === targetColor.code) {
                        setIsClickable(true);
                        setStartTime(Date.now());
                        clearInterval(colorInterval);
                      }
                    };
                    setTimeout(() => {
                      colorInterval = setInterval(colorChange, 1000 + Math.random()*1000);
                    }, 1500 + Math.random()*1500);
                  }} disabled={gameStarted || isClickable} style={{ fontWeight: 700, borderRadius: 999, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '12px 36px', fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', marginTop: 8 }}>시작</button>
                ) : (
                  <button onClick={() => { setGameStep('select'); setReactionTime(null); setCurrentColor(null); setIsClickable(false); fetchTopRecords(); }} style={{ fontWeight: 700, borderRadius: 999, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '12px 36px', fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', marginTop: 8 }}>다시하기</button>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <div style={{ position: 'fixed', right: 32, bottom: 32, zIndex: 3000 }}>
        <button onClick={() => { setShowGameModal(true); setGameStep('select'); setReactionTime(null); setGameError(''); fetchTopRecords(); }} style={{ background: '#fffde7', border: 'none', borderRadius: 999, padding: '12px 18px', boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <SportsEsportsIcon style={{ color: '#1976d2', fontSize: 32 }} />
          <span style={{ fontWeight: 700, color: '#1976d2', fontSize: 17 }}>게임 활성화</span>
        </button>
      </div>
    </div>
  );
};

export default TeacherPage; // TEST_DIRECT_EDIT_456
