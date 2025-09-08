import React, { useState } from 'react';
import Checkbox from '@mui/material/Checkbox';

const levelImages = [
  '/lv1.png', // 알사탕
  '/lv2.png', // 새콤한 사탕
  '/lv3.png', // 막대사탕
  '/lv4.png', // 롤리팝
  '/lv5.png', // 수제 사탕
  '/lv6.png', // 사탕 마스터
];

const levelNames = [
  '알사탕',
  '새콤한 사탕',
  '막대사탕',
  '롤리팝',
  '수제 사탕',
  '사탕 마스터',
];

// 버튼 스타일 객체 및 컨테이너 스타일 (이전 스타일 복원)
const commonButtonStyle = {
  fontSize: '12px',
  fontWeight: '600',
  padding: '6px 12px',
  borderRadius: '8px',
  border: '1.5px solid #e3f2fd',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap',
  textAlign: 'center',
  minWidth: '70px',
  maxWidth: '80px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
  margin: '0 2px',
};
const buttonStyles = {
  exp: {
    ...commonButtonStyle,
    background: '#e3f2fd',
    color: '#1976d2',
    border: '1.5px solid #90caf9',
  },
  message: {
    ...commonButtonStyle,
    background: '#fce4ec',
    color: '#c2185b',
    border: '1.5px solid #f8bbd0',
  },
  quest: {
    ...commonButtonStyle,
    background: '#fff3e0',
    color: '#f57c00',
    border: '1.5px solid #ffe0b2',
  }
};
const buttonContainerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '6px',
  marginTop: '12px',
  padding: '0 4px',
  width: '100%',
  boxSizing: 'border-box',
};

// 반응형 스타일 (inline 적용)
const getResponsiveButtonStyle = () => {
  const width = window.innerWidth;
  if (width <= 480) {
    return { fontSize: '9px', padding: '4px 6px', minWidth: '50px', maxWidth: '60px' };
  } else if (width <= 768) {
    return { fontSize: '10px', padding: '5px 8px', minWidth: '60px', maxWidth: '70px' };
  }
  return {};
};

// 버튼 텍스트(줄임 예시)
const buttonTexts = {
  exp: '발표경험치',
  message: (<span>메시지<br/>보내기</span>),
  quest: '퀘스트 주기',
};

// 버튼 공통 스타일
const buttonStyle = {
  fontSize: '12px',
  fontWeight: '600',
  padding: '8px 0',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap',
  textAlign: 'center',
  margin: '0 2px',
  minHeight: '38px',
};

// 카드 하단 버튼 영역 (과거 스타일 복원 + 색상 통일)
const StudentCardButtons = ({ onOptionClick }) => (
  <div style={{
    display: 'flex',
    gap: 6,
    marginTop: 8
  }}>
    {/* 발표 경험치 버튼 */}
    <button
      onClick={e => { e.stopPropagation(); onOptionClick('exp'); }}
      style={{
        background: '#fce4ec',
        border: 'none',
        borderRadius: 8,
        padding: '8px 6px',
        fontSize: '0.7rem',
        fontWeight: 600,
        color: '#c2185b',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        flex: 1,
        minHeight: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        lineHeight: 1.2
      }}
    >
      발표<br/>경험치
    </button>
    {/* 메시지 보내기 버튼 */}
    <button
      onClick={e => { e.stopPropagation(); onOptionClick('message'); }}
      style={{
        background: '#fce4ec',
        border: 'none',
        borderRadius: 8,
        padding: '8px 6px',
        fontSize: '0.7rem',
        fontWeight: 600,
        color: '#c2185b',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        flex: 1,
        minHeight: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        lineHeight: 1.2
      }}
    >
      메시지<br/>보내기
    </button>
    {/* 퀘스트 주기 버튼 */}
    <button
      onClick={e => { e.stopPropagation(); onOptionClick('quest'); }}
      style={{
        background: '#fce4ec',
        border: 'none',
        borderRadius: 8,
        padding: '8px 6px',
        fontSize: '0.7rem',
        fontWeight: 600,
        color: '#c2185b',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        flex: 1,
        minHeight: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        lineHeight: 1.2
      }}
    >
      퀘스트<br/>주기
    </button>
  </div>
);

// 전문가 스타일 가이드 적용: 퀘스트 승인 대기 영역 스타일
const questPendingContainerStyle = {
  background: '#fff9e6',
  border: '1.5px solid #ffd54f',
  borderRadius: 8,
  padding: '6px 8px',
  margin: '4px 0 6px 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  boxShadow: '0 1px 4px #ffd54f20'
};
const questMessageStyle = {
  color: '#f57f17',
  fontWeight: 600,
  fontSize: 12,
  lineHeight: 1.2,
  margin: '0 8px 0 0',
  wordBreak: 'keep-all'
};
const questButtonBaseStyle = {
  fontSize: 11,
  minWidth: 40,
  padding: '3px 8px',
  whiteSpace: 'nowrap',
  borderRadius: 8,
  fontWeight: 'bold',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  transition: 'all 0.2s',
  cursor: 'pointer',
  border: 'none',
  margin: '0 2px'
};
const approveButtonStyle = {
  ...questButtonBaseStyle,
  background: '#e0f7fa',
  color: '#1976d2'
};
const failButtonStyle = {
  ...questButtonBaseStyle,
  background: '#ffe4ec',
  color: '#d72660'
};
const questButtonContainerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 4,
  marginTop: 2
};

// 기존 카드 버튼들 최적화 (발표경험치, 메시지보내기, 퀘스트 주기)
const cardActionButtonStyle = {
  fontSize: 11,
  minWidth: 50,
  padding: '4px 8px',
  whiteSpace: 'nowrap',
  borderRadius: 8,
  fontWeight: 'bold',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  transition: 'all 0.2s',
  cursor: 'pointer',
  border: 'none',
  margin: '0 2px'
};

const StudentCard = ({ student, selected, onSelect, onOptionClick, expEffect, levelUpEffect, renderCheckbox, onQuestClick, onQuestApprove, onQuestFail }) => {
  // 진행 중인 퀘스트 목록
  const ongoingQuests = Array.isArray(student.quests) ? student.quests.filter(q => q.status === 'ongoing') : [];
  const [showQuestModal, setShowQuestModal] = useState(false);

  // 레벨업 필요 경험치 계산 함수
  const getRequiredExp = (level) => 150 + (level || 0) * 20;

  const ongoingQuest = student.quests && student.quests.find(q => q.status === 'ongoing');

  return (
    <div
      className="card-candy"
      style={{
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 3px 18px rgba(0,0,0,0.08)',
        border: 'none',
        width: '100%',
        aspectRatio: '1 / 1',
        margin: 0,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '17px 9px 13px 9px',
        transition: 'box-shadow 0.3s',
        position: 'relative',
        overflow: 'hidden',
        transform: 'none',
      }}
      onClick={onSelect}
    >
      {/* 체크박스 */}
      {renderCheckbox ? renderCheckbox() : (
        <Checkbox
          checked={selected}
          onChange={onSelect}
          sx={{ position: 'absolute', top: 14, left: 14, width: 28, height: 28, color: '#90caf9', '&.Mui-checked': { color: '#1976d2' } }}
        />
      )}
      <div style={{ width: '100%', marginTop: 6 }}>
        <div style={{ marginBottom: 10 }}>
          <img
            src={levelImages[student.level] || levelImages[0]}
            alt={levelNames[student.level] || '사탕'}
            style={{ width: 110, height: 110, objectFit: 'contain', display: 'inline-block' }}
          />
        </div>
        <div style={{ fontWeight: 700, fontSize: 'clamp(1.33rem, 2.8vw, 1.5rem)', marginBottom: 17, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.name}</div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, marginBottom: 7 }}>
          <span style={{ color: '#1976d2', fontWeight: 600, fontSize: 'clamp(1.19rem, 2.5vw, 1.37rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.levelName}</span>
          <span style={{ fontSize: 17, color: '#bbb' }}>|</span>
          <span style={{ fontSize: 'clamp(1.19rem, 2.5vw, 1.37rem)', color: '#1976d2', fontWeight: 600 }}>Lv.{student.level || 0}</span>
          <span style={{ fontSize: 17, color: '#bbb' }}>|</span>
          <span style={{ fontSize: 'clamp(1.19rem, 2.5vw, 1.37rem)', color: '#43a047', fontWeight: 600 }}>XP {student.exp || 0}</span>
        </div>
        <div style={{ height: 14 }} />
        <div style={{ width: '92%', margin: '11px auto 0 auto', height: 22, background: '#e3f2fd', borderRadius: 13, position: 'relative', overflow: 'hidden', boxShadow: '0 2px 5px #b2ebf240' }}>
          <div style={{ width: `${Math.min(100, Math.round(((student.exp || 0) / getRequiredExp(student.level || 0)) * 100))}%`, height: '100%', background: '#90caf9', borderRadius: 13, transition: 'width 0.4s' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 17, color: '#1976d2', letterSpacing: '-0.5px' }}>
            XP {student.exp || 0} / {getRequiredExp(student.level || 0)}
          </div>
        </div>
        <div style={{ height: 3 }} />
        {ongoingQuests.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); setShowQuestModal(true); }}
            className="candy-btn"
            style={{ width: '96%', background: '#fffde7', color: '#ff9800', fontWeight: 700, fontSize: 'clamp(17px, 2.3vw, 19px)', borderRadius: 15, border: 'none', boxShadow: '0 2px 5px #ffe08260', padding: '10px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '0 auto 3px auto' }}
          >
            현재 퀘스트 진행중입니다
          </button>
        )}
      </div>
      {/* 버튼 영역: 항상 하단에 고정, 사라지지 않도록 minHeight와 flex-shrink: 0 적용 */}
      <div style={{ marginTop: 7, width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', gap: 10, minHeight: 50, flexShrink: 0, marginBottom: 14 }}>
        <button onClick={e => { e.stopPropagation(); onOptionClick('exp'); }} disabled={!selected} className="candy-btn" style={{
          fontSize: 'clamp(17px, 2.3vw, 19px)', fontWeight: 600, borderRadius: 999, boxShadow: '0 2px 10px #b2ebf240', padding: '10px 0', border: 'none', background: selected ? '#e0f7fa' : '#f7faf7', color: '#1976d2', cursor: selected ? 'pointer' : 'not-allowed', opacity: selected ? 1 : 0.6, transition: 'all 0.2s', width: '33.3%', minWidth: 0, whiteSpace: 'nowrap', overflow: 'visible', textOverflow: 'clip', letterSpacing: '-0.5px'
        }}>발표 경험치</button>
        <button onClick={e => { e.stopPropagation(); onOptionClick('message'); }} disabled={!selected} className="candy-btn" style={{
          fontSize: 'clamp(17px, 2.3vw, 19px)', fontWeight: 600, borderRadius: 999, boxShadow: '0 2px 10px #b2ebf240', padding: '10px 0', border: 'none', background: selected ? '#e0f7fa' : '#f7faf7', color: '#1976d2', cursor: selected ? 'pointer' : 'not-allowed', opacity: selected ? 1 : 0.6, transition: 'all 0.2s', width: '33.3%', minWidth: 0, whiteSpace: 'nowrap', overflow: 'visible', textOverflow: 'clip', letterSpacing: '-0.5px'
        }}>메세지 보내기</button>
        <button onClick={e => { e.stopPropagation(); onOptionClick('quest'); }} disabled={!selected} className="candy-btn" style={{
          fontSize: 'clamp(17px, 2.3vw, 19px)', fontWeight: 600, borderRadius: 999, boxShadow: '0 2px 10px #b2ebf240', padding: '10px 0', border: 'none', background: selected ? '#e0f7fa' : '#f7faf7', color: '#1976d2', cursor: selected ? 'pointer' : 'not-allowed', opacity: selected ? 1 : 0.6, transition: 'all 0.2s', width: '33.3%', minWidth: 0, whiteSpace: 'nowrap', overflow: 'visible', textOverflow: 'clip', letterSpacing: '-0.5px'
        }}>퀘스트 주기</button>
      </div>
      {/* 퀘스트 상세 모달 */}
      {showQuestModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 20, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 18, color: '#1976d2' }}>진행중인 퀘스트</div>
            {ongoingQuests.map((quest, idx) => (
              <div key={idx} style={{ background: '#fffde7', color: '#ff9800', border: '2px solid #ffe082', borderRadius: 12, padding: '12px 10px', marginBottom: 12, fontWeight: 600, fontSize: 15, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ marginBottom: 6 }}>퀘스트: {quest.text} <span style={{ fontWeight: 400 }}>({quest.exp}xp)</span></div>
                {quest.requestPending ? (
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 6 }}>
                    <button onClick={async (e) => { e.stopPropagation(); if(onQuestApprove) await onQuestApprove(quest); setShowQuestModal(false); }} style={{ background: '#43a047', color: '#fff', fontWeight: 'bold', borderRadius: 8, padding: '6px 18px', border: 'none', cursor: 'pointer' }}>승인</button>
                    <button onClick={async (e) => { e.stopPropagation(); if(onQuestFail) await onQuestFail(quest); /* setShowQuestModal(false)는 TeacherPage에서 모달이 뜬 뒤에 닫히도록 */ }} style={{ background: '#ff1744', color: '#fff', fontWeight: 'bold', borderRadius: 8, padding: '6px 18px', border: 'none', cursor: 'pointer' }}>실패</button>
                  </div>
                ) : (
                  <div style={{ color: '#888', fontSize: 14, marginTop: 6 }}>학생이 승인 요청을 하지 않았습니다.</div>
                )}
              </div>
            ))}
            <button onClick={() => setShowQuestModal(false)} style={{ marginTop: 8, fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>닫기</button>
          </div>
        </div>
      )}
      {levelUpEffect && <div style={{position:'absolute',top:8,right:8,color:'#ffd700',fontWeight:'bold',fontSize:18,animation:'pop 1.2s'}}>레벨업!</div>}
      {/* 감정 이모티콘: 카드 오른쪽 상단 */}
      {student.emotionIcon && (
                <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 66,
          height: 66,
          borderRadius: '50%',
          background: '#fff',
          border: '3px solid #ffd6e0',
          boxShadow: '0 3px 12px #f8bbd0a0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}>
          <img src={student.emotionIcon} alt="감정" style={{ width: 48, height: 48, objectFit: 'contain' }} />
        </div>
      )}
      <style>{`
        @keyframes pop {
          0% { transform: scale(0.5); opacity: 0; }
          40% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default StudentCard; 