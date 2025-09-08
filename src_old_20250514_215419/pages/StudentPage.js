import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocument, useCollection } from 'react-firebase-hooks/firestore';
import { doc, updateDoc, arrayUnion, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { Card, CardContent, Typography, Button, Box, Modal, Chip, Stack, Snackbar, Alert, Badge, IconButton } from '@mui/material';
import CelebrationIcon from '@mui/icons-material/Celebration';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import StorefrontIcon from '@mui/icons-material/Storefront';

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

const getRequiredExp = (level) => 150 + level * 10;

// 날짜 포맷 함수
const formatDate = ts => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const candyImages = [
  '/lv1.png', '/lv2.png', '/lv3.png', '/lv4.png', '/lv5.png', '/lv6.png'
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
  const [selectedEmotion, setSelectedEmotion] = useState(null);

  // 새로운 교사 메시지 개수 계산
  useEffect(() => {
    if (!student) return;
    const teacherMsgs = (student.messages || []).filter(m => m.from === 'teacher');
    const lastRead = student.lastTeacherMsgRead || 0;
    const unread = teacherMsgs.filter(m => m.ts > lastRead).length;
    setUnreadCount(unread);
  }, [student]);

  useEffect(() => {
    if (student && student.emotionIcon) {
      setSelectedEmotion(student.emotionIcon);
    }
  }, [student]);

  // 메시지 보내기
  const handleSendMessage = async () => {
    await updateDoc(doc(db, 'students', studentId), {
      messages: arrayUnion({ from: 'student', text: msgText, ts: Date.now() })
    });
    setShowMsgModal(false);
    setMsgText('');
  };

  // 친구 칭찬하기 (교사에게 요청)
  const handleSendPraise = async () => {
    if (selectedFriends.length === 0) return;
    await updateDoc(doc(db, 'students', studentId), {
      praise: arrayUnion({ from: 'student', text: praiseText, exp: praiseExp, ts: Date.now(), friends: selectedFriends })
    });
    setShowPraiseModal(false);
    setPraiseText('');
    setPraiseExp(10);
    setSelectedFriends([]);
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
    setShowAlarmModal(true);
    // 마지막 메시지 시간 기록
    if (student && (student.messages || []).some(m => m.from === 'teacher')) {
      const teacherMsgs = (student.messages || []).filter(m => m.from === 'teacher');
      const lastTs = teacherMsgs.length > 0 ? teacherMsgs[teacherMsgs.length - 1].ts : 0;
      await updateDoc(doc(db, 'students', studentId), { lastTeacherMsgRead: lastTs });
    }
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
    const questCount = Array.isArray(student.quests) ? student.quests.length : 0;
    if (questCount > prevQuestCount) {
      setQuestToast(true);
      setTimeout(() => setQuestToast(false), 1800);
    }
    setPrevQuestCount(questCount);
  }, [student?.quests]);

  // 진행 중인 퀘스트 찾기
  const ongoingQuest = student && Array.isArray(student.quests) ? student.quests.find(q => q.status === 'ongoing') : null;

  // 학급 사탕 집계
  const candyCounts = [0,0,0,0,0,0];
  if (studentsSnapshot) {
    studentsSnapshot.docs.forEach(doc => {
      const s = doc.data();
      let exp = 0;
      let level = 0;
      if (Array.isArray(s.expEvents)) {
        s.expEvents.forEach(evt => {
          if (evt.type === 'exp' || evt.type === 'friendPraise' || evt.type === 'selfPraise' || evt.type === 'quest') {
            exp += evt.amount || 0;
            let required = 150 + level * 10;
            while (exp >= required) {
              exp -= required;
              if (level < 6) candyCounts[level]++;
              level++;
              required = 150 + level * 10;
            }
          }
        });
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

  // 감정 이모티콘 저장 함수
  const handleSelectEmotion = async (icon) => {
    setSelectedEmotion(icon);
    await updateDoc(doc(db, 'students', studentId), { emotionIcon: icon });
  };

  const EMOTION_ICONS = Array.from({ length: 16 }, (_, i) => `/em${i + 1}.png`);

  return (
    <div style={{ 
      padding: '32px',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #ffe4ec 0%, #f8bbd0 100%)',
      backgroundImage: 'url(/ST_bg.png), linear-gradient(135deg, #ffe4ec 0%, #f8bbd0 100%)',
      backgroundBlendMode: 'soft-light',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      {/* 배너 이미지 */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 32, marginTop: 8 }}>
        <img src="/candyshop_banner.png" alt="JAMMANBO CANDY SHOP 배너" style={{ maxWidth: 480, width: '90vw', height: 'auto', borderRadius: 18, boxShadow: '0 4px 24px #b2ebf240', display: 'block' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <button onClick={() => setShowBoardModal(true)} style={{ fontWeight: 700, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '10px 32px', fontSize: 17, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>게시판 입장</button>
      </div>
      <div style={{ position: 'fixed', top: 24, right: 32, zIndex: 2000, display: 'flex', flexDirection: 'row', gap: 18, alignItems: 'center' }}>
        {/* 유리병 아이콘 버튼 */}
        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }} title="학급 캔디 유리병" onClick={() => setShowJarModal(true)}>
          <img src="/jar2.png" alt="유리병" style={{ width: 32, height: 32, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px #b2ebf2a0)' }} />
        </div>
        <button onClick={() => setShowShopModal(true)} style={{ background: '#fffde7', border: 'none', borderRadius: 999, padding: '8px 18px', boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <StorefrontIcon style={{ color: '#d72660', fontSize: 28 }} />
          <span style={{ fontWeight: 700, color: '#d72660', fontSize: 16 }}>캔디숍</span>
        </button>
      </div>
      {loading && <div>로딩 중...</div>}
      {error && <div>에러 발생: {error.message}</div>}
      {student && (
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
            {/* 왼쪽: 사탕 아이콘 */}
            <Box sx={{
              width: 140, minWidth: 120, maxWidth: 160, background: '#e3f2fd', borderRadius: '18px 0 0 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', py: 4, px: 2, boxShadow: '2px 0 12px #b2ebf220',
            }}>
              <img src={levelImages[student.level] || levelImages[0]} alt={LEVELS[student.level] || '사탕'} style={{ width: 115, height: 115, objectFit: 'contain', display: 'block', marginBottom: 16 }} />
              <span style={{ color: '#1976d2', fontWeight: 700, fontSize: 22, letterSpacing: '-1px', marginTop: 4 }}>{LEVELS[student.level] || LEVELS[0]}</span>
            </Box>
            {/* 오른쪽: 학생 정보 */}
            <Box sx={{ flex: 1, p: '24px 18px 18px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180 }}>
              {/* 감정 이모티콘 선택 UI */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1 }}>
                {/* 원형 감정 구역 */}
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  border: '2.5px solid #ffd6e0',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#fffde7',
                  boxShadow: '0 2px 8px #f8bbd0a0',
                  fontSize: 36,
                  overflow: 'hidden',
                }}>
                  {selectedEmotion ? (
                    <img src={selectedEmotion} alt="감정" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                  ) : (
                    <span style={{ color: '#bbb', fontSize: 32 }}>🙂</span>
                  )}
                </div>
                {/* 이모티콘 선택 바 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 260 }}>
                  {EMOTION_ICONS.map((icon, idx) => (
                    <button
                      key={icon}
                      onClick={() => handleSelectEmotion(icon)}
                      style={{
                        border: selectedEmotion === icon ? '2.5px solid #d72660' : '2px solid #eee',
                        borderRadius: '50%',
                        padding: 2,
                        background: '#fff',
                        cursor: 'pointer',
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: selectedEmotion === icon ? '0 2px 8px #ffd6e0a0' : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      <img src={icon} alt={`감정${idx + 1}`} style={{ width: 28, height: 28, objectFit: 'contain' }} />
                    </button>
                  ))}
                </div>
              </Box>
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
              {/* XP 바 */}
              <Box sx={{ width: '100%', mb: 1.5 }}>
                <div style={{ width: '100%', height: 16, background: '#e3f2fd', borderRadius: 10, position: 'relative', overflow: 'hidden', boxShadow: '0 1px 4px #b2ebf240' }}>
                  <div style={{ width: `${Math.min(100, Math.round((student.exp / getRequiredExp(student.level)) * 100))}%`, height: '100%', background: '#90caf9', borderRadius: 10, transition: 'width 0.4s' }} />
                  <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, color: '#1976d2', letterSpacing: '-0.5px' }}>
                    XP {student.exp} / {getRequiredExp(student.level)}
                  </div>
                </div>
              </Box>
              {/* 발표 Chip */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip label={`오늘 발표: ${todayPresentations}`} color="info" size="small" />
                <Chip label={`누적 발표: ${totalPresentations}`} color="success" size="small" />
              </Box>
              {/* 퀘스트 진행중 안내 */}
              {Array.isArray(student.quests) && student.quests.filter(q => q.status === 'ongoing').length > 0 && (
                <Box mb={2} textAlign="center">
                  {student.quests.filter(q => q.status === 'ongoing').map((quest, idx) => (
                    <div key={idx} style={{ fontWeight: 600, color: '#ff9800', marginBottom: 6 }}>
                      퀘스트: {quest.text} (보상: {quest.exp}xp)
                      <div style={{ color: '#1976d2', fontWeight: 500, fontSize: 15, marginTop: 2 }}>
                        {quest.requestPending ? '승인 요청 대기 중...' : '진행중'}
                      </div>
                    </div>
                  ))}
                  {student.quests.filter(q => q.status === 'ongoing' && !q.requestPending).map((quest, idx) => (
                    <Button
                      key={idx}
                      variant="contained"
                      sx={{ background: '#e0f7fa', color: '#1976d2', borderRadius: 999, fontWeight: 600, boxShadow: '0 2px 8px #b2ebf240', mt: 1, '&:hover': { background: '#b2ebf2' } }}
                      onClick={async () => {
                        const newQuests = (student.quests || []).map(q => q.ts === quest.ts ? { ...q, requestPending: true } : q);
                        await updateDoc(doc(db, 'students', studentId), { quests: newQuests });
                      }}
                    >퀘스트 승인 요청</Button>
                  ))}
                </Box>
              )}
              {/* 버튼 영역 */}
              <Box mt={1.5}>
                <Button fullWidth sx={{ mb: 1, borderRadius: 999, fontWeight: 'bold', background: '#ffe4ec', border: '2px solid #ffb6b9', color: '#d72660', boxShadow: '0 2px 8px #f8bbd0a0', fontSize: 16, letterSpacing: '-0.5px', py: 1.2, '&:hover': { background: '#ffd6e0' } }} onClick={() => setShowMsgModal(true)} startIcon={<EmojiEventsIcon />}>메시지 보내기</Button>
                <Button fullWidth sx={{ mb: 1, borderRadius: 999, fontWeight: 'bold', background: '#ffe4ec', border: '2px solid #ffb6b9', color: '#d72660', boxShadow: '0 2px 8px #f8bbd0a0', fontSize: 16, letterSpacing: '-0.5px', py: 1.2, '&:hover': { background: '#ffd6e0' } }} onClick={() => setShowPraiseModal(true)} startIcon={<CelebrationIcon />}>친구 칭찬하기</Button>
                <Button fullWidth sx={{ borderRadius: 999, fontWeight: 'bold', background: '#ffe4ec', border: '2px solid #ffb6b9', color: '#d72660', boxShadow: '0 2px 8px #f8bbd0a0', fontSize: 16, letterSpacing: '-0.5px', py: 1.2, '&:hover': { background: '#ffd6e0' } }} onClick={() => setShowSelfPraiseModal(true)} startIcon={<CelebrationIcon />}>나 칭찬하기</Button>
              </Box>
            </Box>
          </Box>
        </Card>
      )}
      {/* 메시지 모달 */}
      {showMsgModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 16, minWidth: 320 }}>
            <h3>선생님께 메시지 보내기</h3>
            <textarea value={msgText} onChange={e => setMsgText(e.target.value)} style={{ width: '100%', minHeight: 80 }} />
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button onClick={() => setShowMsgModal(false)} style={{ marginRight: 8, background: '#ffe4ec', border: '2px solid #ffb6b9', color: '#d72660', fontWeight: 'bold', borderRadius: 10, boxShadow: '0 2px 8px #f8bbd0a0', padding: '6px 18px', fontSize: 15, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSendMessage} disabled={!msgText} style={{ background: '#ffe4ec', border: '2px solid #ffb6b9', color: '#d72660', fontWeight: 'bold', borderRadius: 10, boxShadow: '0 2px 8px #f8bbd0a0', padding: '6px 18px', fontSize: 15, cursor: msgText ? 'pointer' : 'not-allowed', opacity: msgText ? 1 : 0.5 }}>보내기</button>
            </div>
          </div>
        </div>
      )}
      {/* 친구 칭찬 모달 */}
      {showPraiseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '36px 32px 28px 32px', borderRadius: 24, minWidth: 340, maxWidth: 400, boxShadow: '0 4px 32px #b2ebf240', width: '90vw' }}>
            <div style={{ fontWeight: 700, fontSize: '1.18rem', marginBottom: 18, color: '#1976d2', letterSpacing: '-0.5px', textAlign: 'center' }}>친구 칭찬하기</div>
            <input value={praiseText} onChange={e => setPraiseText(e.target.value)} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 10, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box' }} placeholder="칭찬 내용을 입력하세요" />
            <input type="number" value={praiseExp} onChange={e => setPraiseExp(Number(e.target.value))} min={1} max={100} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 14, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box' }} placeholder="희망 경험치" />
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#1976d2', fontSize: 15 }}>친구 선택 <span style={{ fontWeight: 400, color: '#888', fontSize: 14 }}>(다수 선택 가능)</span></div>
            <div style={{ maxHeight: 160, overflowY: 'auto', border: '1.5px solid #e0f7fa', borderRadius: 16, padding: 10, background: '#f7faf7', marginBottom: 18 }}>
              {studentsSnapshot && studentsSnapshot.docs.filter(doc => doc.id !== studentId).map(doc => (
                <FormControlLabel
                  key={doc.id}
                  control={
                    <Checkbox
                      checked={selectedFriends.includes(doc.id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedFriends(prev => [...prev, doc.id]);
                        else setSelectedFriends(prev => prev.filter(id => id !== doc.id));
                      }}
                      sx={{ color: '#90caf9', '&.Mui-checked': { color: '#1976d2' }, mr: 1 }}
                    />
                  }
                  label={<span style={{ fontSize: 16, color: '#222', fontWeight: 500 }}>{doc.data().name}</span>}
                  sx={{ display: 'block', mb: 0.5, ml: 0 }}
                />
              ))}
            </div>
            <div style={{ marginTop: 0, textAlign: 'right', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPraiseModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
              <button onClick={handleSendPraise} disabled={!praiseText || selectedFriends.length === 0} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', opacity: praiseText && selectedFriends.length ? 1 : 0.5, cursor: praiseText && selectedFriends.length ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>보내기</button>
            </div>
          </div>
        </div>
      )}
      {/* 나 칭찬 모달 */}
      {showSelfPraiseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 16, minWidth: 320 }}>
            <h3>나 칭찬하기</h3>
            <input value={selfPraiseText} onChange={e => setSelfPraiseText(e.target.value)} style={{ width: '100%' }} placeholder="칭찬 내용을 입력하세요" />
            <input type="number" value={selfPraiseExp} onChange={e => setSelfPraiseExp(Number(e.target.value))} min={1} max={100} style={{ width: '100%', marginTop: 8 }} placeholder="희망 경험치" />
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button onClick={() => setShowSelfPraiseModal(false)} style={{ marginRight: 8, background: '#ffe4ec', border: '2px solid #ffb6b9', color: '#d72660', fontWeight: 'bold', borderRadius: 10, boxShadow: '0 2px 8px #f8bbd0a0', padding: '6px 18px', fontSize: 15, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSendSelfPraise} disabled={!selfPraiseText} style={{ background: '#ffe4ec', border: '2px solid #ffb6b9', color: '#d72660', fontWeight: 'bold', borderRadius: 10, boxShadow: '0 2px 8px #f8bbd0a0', padding: '6px 18px', fontSize: 15, cursor: selfPraiseText ? 'pointer' : 'not-allowed', opacity: selfPraiseText ? 1 : 0.5 }}>보내기</button>
            </div>
          </div>
        </div>
      )}
      {/* 알람(종) 모달: 교사 메시지, 발표 경험치, 퀘스트, 내가 보낸 칭찬 결과 표시 */}
      {showAlarmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 16, minWidth: 340 }}>
            <h3>선생님의 알림</h3>
            <ul style={{ maxHeight: 300, overflowY: 'auto', padding: 0, listStyle: 'none' }}>
              {/* 교사 메시지 */}
              {(student.messages || []).filter(m => m.from === 'teacher').reverse().map((msg, idx) => (
                <li key={idx} style={{ marginBottom: 8, fontSize: 15 }}>
                  <span style={{ color: '#1976d2', fontWeight: 'bold' }}>[메시지]</span> {msg.text}
                  <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{formatDate(msg.ts)}</span>
                </li>
              ))}
              {/* 발표 경험치 */}
              {(student.expEvents || []).slice().reverse().map((evt, idx) => (
                <li key={"exp-"+idx} style={{ marginBottom: 8, fontSize: 15 }}>
                  <span style={{ color: '#43a047', fontWeight: 'bold' }}>[발표 경험치]</span> +{evt.amount} 경험치
                  <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{formatDate(evt.ts)}</span>
                </li>
              ))}
              {/* 퀘스트 */}
              {(student.quests || []).slice().reverse().map((q, idx) => (
                <li key={"quest-"+idx} style={{ marginBottom: 8, fontSize: 15 }}>
                  <span style={{ color: '#ff9800', fontWeight: 'bold' }}>[퀘스트]</span> {q.text} (+{q.exp} 경험치)
                  <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{formatDate(q.ts)}</span>
                </li>
              ))}
              {/* 내가 보낸 칭찬 결과 */}
              {(student.praise || []).filter(p => p.from === 'student' && p.checked && p.result).reverse().map((p, idx) => (
                <li key={"praise-"+idx} style={{ marginBottom: 8, fontSize: 15 }}>
                  <span style={{ color: p.result === 'approved' ? '#43a047' : '#ff1744', fontWeight: 'bold' }}>
                    [{p.self ? '나 칭찬' : '친구 칭찬'} {p.result === 'approved' ? '승인' : '거절'}]
                  </span> {p.text}
                  {p.result === 'rejected' && <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>사유: {p.reason}</span>}
                  <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{formatDate(p.ts)}</span>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button onClick={() => setShowAlarmModal(false)} style={{ background: '#ffe4ec', border: '2px solid #ffb6b9', color: '#d72660', fontWeight: 'bold', borderRadius: 10, boxShadow: '0 2px 8px #f8bbd0a0', padding: '6px 18px', fontSize: 15, cursor: 'pointer' }}>닫기</button>
            </div>
          </div>
        </div>
      )}
      {/* 축하 이펙트 */}
      {praiseResultEffect && praiseResultMsg && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, pointerEvents: 'none' }}>
          <div style={{ fontSize: 36, color: '#43a047', background: 'rgba(255,255,255,0.95)', borderRadius: 24, padding: '32px 48px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', animation: 'pop 1.5s' }}>
            {praiseResultMsg}
          </div>
        </div>
      )}
      {/* 퀘스트 도착 이펙트 */}
      {questToast && ongoingQuest && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100, pointerEvents: 'none' }}>
          <div style={{ fontSize: 28, color: '#ff9800', background: 'rgba(255,255,255,0.97)', borderRadius: 24, padding: '28px 44px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', animation: 'pop 1.5s', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>새 퀘스트가 도착했습니다! 🎯</div>
            <div style={{ color: '#222', fontWeight: 500, fontSize: 18 }}>
              {ongoingQuest.text} <span style={{ color: '#43a047', fontWeight: 700 }}>+{ongoingQuest.exp}xp</span>
            </div>
          </div>
        </div>
      )}
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
    </div>
  );
};

export default StudentPage; 