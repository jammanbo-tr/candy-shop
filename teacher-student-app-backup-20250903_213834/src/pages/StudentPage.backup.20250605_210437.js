import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocument, useCollection } from 'react-firebase-hooks/firestore';
import { doc, updateDoc, arrayUnion, collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
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
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';

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
  const student = studentDoc?.data();
  const navigate = useNavigate();

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

  // 공지사항 상태 추가
  const [notices, setNotices] = useState([]);
  const [broadcastNotice, setBroadcastNotice] = useState(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const broadcastTimeoutRef = React.useRef(null);

  // 예약 알람 모달 상태
  const [activeAlarm, setActiveAlarm] = useState(null);

  // 알림 모달 상태
  const [showNotificationModal, setShowNotificationModal] = useState(false);

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
  // 예약 알람 확인 여부 체크 함수 (예약 알람용)
  const hasSeenAlarm = (alarmId) => {
    try {
      const seen = JSON.parse(localStorage.getItem('seenAlarms') || '[]');
      return seen.includes(alarmId);
    } catch {
      return false;
    }
  };
  const markAlarmAsSeen = (alarmId) => {
    try {
      const seen = JSON.parse(localStorage.getItem('seenAlarms') || '[]');
      if (!seen.includes(alarmId)) {
        localStorage.setItem('seenAlarms', JSON.stringify([...seen, alarmId]));
      }
    } catch {}
  };

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
    // 모든 알람을 합쳐서 중복 제거
    const allAlarms = [...alarms, ...praiseApproved, ...expEventsPraise];
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

  // 예약 알람 모달 효과음/진동 useEffect
  // useEffect(() => {
  //   if (activeAlarm && showAlarmModal) {
  //     (() => { playAlertSound(); if (window.navigator.vibrate) window.navigator.vibrate([120,80,120]); })();
  //   }
  // }, [activeAlarm, showAlarmModal]);

  // 광고(브로드캐스트) 모달 효과음/진동 useEffect
  // useEffect(() => {
  //   if (broadcastNotice && showBroadcastModal) {
  //     playAlertSound();
  //     if (window.navigator.vibrate) window.navigator.vibrate([120, 80, 120]);
  //   }
  // }, [broadcastNotice, showBroadcastModal]);

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
      if (window.navigator.vibrate) window.navigator.vibrate(pattern);
      // 다음 반복까지 대기시간: 0.7~1.7초 랜덤
      const next = Math.floor(Math.random() * 1000) + 700;
      vibrateTimeout = setTimeout(randomVibrateLoop, next);
    }
    if (activeAlarm && showAlarmModal) {
      randomVibrateLoop();
    }
    return () => {
      if (vibrateTimeout) clearTimeout(vibrateTimeout);
      if (window.navigator.vibrate) window.navigator.vibrate(0);
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

  // 카드뽑기 모달 트리거 useEffect (단일)
  useEffect(() => {
    if (!studentLoaded || !student) return;
    // 디버깅 로그 추가
    console.log('[디버그] 레벨업 보상 체크:', {
      studentId,
      studentLevel: student.level,
      firestore보상받음: hasDrawnLevelReward(student.level),
      로컬스토리지키: `levelRewardDrawn_${studentId}`,
      로컬스토리지보상받음: getLocalLevelRewardDrawn(student.level),
      종합보상받음: hasDrawnLevelRewardAll(student.level),
      showCardModal: showCardModal
    });
    if (!hasDrawnLevelRewardAll(student.level)) {
      console.log('[디버그] 카드 모달 트리거됨! - 레벨:', student.level);
      // 카드 3장 보상 후보 생성
      const pick3 = () => {
        const arr = [];
        for (let i = 0; i < 3; i++) {
          arr.push(REWARD_LIST[Math.floor(Math.random() * REWARD_LIST.length)]);
        }
        return arr;
      };
      setCardChoices(pick3());
      setShowCardModal(true);
      setCardResult(null);
      setCardEffect(false);
      // 로컬스토리지에 먼저 기록 (즉시 적용)
      setLocalLevelRewardDrawn(student.level);
      console.log('[디버그] 로컬스토리지에 레벨업 보상 기록됨:', student.level);
      // Firestore에도 기록 (비동기)
      markLevelRewardAsDrawn(student.level)
        .then(() => console.log('[디버그] Firestore에 레벨업 보상 기록 완료:', student.level))
        .catch(err => console.error('[디버그] Firestore 업데이트 실패:', err));
    }
  }, [student, studentLoaded]);

  // 쿠폰함 탭 상태 추가
  const [couponTab, setCouponTab] = useState('unused'); // 'unused' or 'used'

  // 카드뽑기 모달 닫기 함수 (상태 초기화)
  const handleCloseCardModal = () => {
    setShowCardModal(false);
    setCardChoices([]);
    setCardResult(null);
    setCardEffect(false);
  };

  // Firestore와 localStorage 보상 상태 자동 동기화 useEffect
  useEffect(() => {
    if (!studentLoaded || !student) return;
    const local = getLocalLevelRewardDrawn(student.level);
    const remote = hasDrawnLevelReward(student.level);
    if (local && !remote) {
      // Firestore에 true로 맞춤
      markLevelRewardAsDrawn(student.level);
    } else if (!local && remote) {
      // localStorage에 true로 맞춤
      setLocalLevelRewardDrawn(student.level);
    }
  }, [student, studentLoaded]);

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
  const [isSelectingEmotion, setIsSelectingEmotion] = useState(false);

  // Firestore에서 emotionIcon 불러오기
  useEffect(() => {
    if (student && student.emotionIcon) {
      setSelectedEmotion(student.emotionIcon);
    }
  }, [student]);

  // 감정 이모티콘 저장 함수
  const handleSelectEmotion = async (icon) => {
    setSelectedEmotion(icon);
    setIsSelectingEmotion(false);
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
      // 카드뽑기 모달 활성화 (기존 pick3 로직 활용)
      const pick3 = () => {
        const arr = [];
        for (let i = 0; i < 3; i++) {
          arr.push(REWARD_LIST[Math.floor(Math.random() * REWARD_LIST.length)]);
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

  // 링크 방문 추적 함수
  const handleLinkVisit = async (link) => {
    try {
      const studentRef = doc(db, 'students', studentId);
      const student = studentDoc.data();
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
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ffe4ec 0%, #f8bbd0 100%)', backgroundImage: 'url(/ST_bg.png), linear-gradient(135deg, #ffe4ec 0%, #f8bbd0 100%)', backgroundBlendMode: 'soft-light', backgroundRepeat: 'no-repeat', backgroundSize: 'cover', backgroundPosition: 'center', paddingBottom: 80 }}>
      <div style={{ position: 'fixed', top: 24, right: 32, zIndex: 2000, display: 'flex', flexDirection: 'row', gap: 18, alignItems: 'center' }}>
        {/* 유리병 아이콘 버튼 */}
        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }} title="학급 캔디 유리병" onClick={() => setShowJarModal(true)}>
          <img src="/jar2.png" alt="유리병" style={{ width: 32, height: 32, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px #b2ebf2a0)' }} />
        </div>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <span style={{ color: '#1976d2', fontWeight: 600, fontSize: 16 }}>Lv.{student.level}</span>
                    <span style={{ fontSize: 13, color: '#bbb', margin: '0 4px' }}>|</span>
                    <span style={{ color: '#43a047', fontWeight: 600, fontSize: 16 }}>XP {student.exp}</span>
                  </Box>
                </Box>
                <Badge badgeContent={unreadCount} color="error">
                  <IconButton color="primary" onClick={handleAlarmClick} sx={{ mt: 0.5 }}>
                    <NotificationsActiveIcon fontSize="medium" />
                  </IconButton>
                </Badge>
              </Box>
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
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
        }}>
          <Typography id="fever-modal-title" variant="h6" component="h2" gutterBottom>
            피버타임 안내
          </Typography>
          <Typography variant="body1" paragraph>
            피버타임이 시작되었습니다! 이 시간동안 경험치를 2배로 받을 수 있어요.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => setShowFeverModal(false)}
            sx={{ mt: 2 }}
          >
            확인
          </Button>
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
                {coupons.filter(c => couponTab === 'unused' ? !c.used : c.used).map((c, i) => (
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
    </div>
  );
};

export default StudentPage; 