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

const StudentCard = ({ student, selected, onSelect, onOptionClick, expEffect, levelUpEffect, renderCheckbox, onQuestClick, onQuestApprove, onQuestFail }) => {
  // 진행 중인 퀘스트 목록
  const ongoingQuests = Array.isArray(student.quests) ? student.quests.filter(q => q.status === 'ongoing') : [];
  const [showQuestModal, setShowQuestModal] = useState(false);

  // 레벨업 필요 경험치 계산 함수
  const getRequiredExp = (level) => 150 + level * 10;

  return (
    <div
      className="card-candy"
      style={{
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: 'none',
        width: 'min(260px, 90vw)',
        height: 'min(260px, 90vw)',
        aspectRatio: '1/1',
        margin: '24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 12px 18px 12px',
        transition: 'box-shadow 0.3s',
        position: 'relative',
        minWidth: 160,
        minHeight: 220,
        maxWidth: 320,
        maxHeight: 360,
        overflow: 'hidden',
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
        <div style={{ marginBottom: 6 }}>
          <img
            src={levelImages[student.level] || levelImages[0]}
            alt={levelNames[student.level] || '사탕'}
            style={{ width: 72, height: 72, objectFit: 'contain', display: 'inline-block' }}
          />
        </div>
        <div style={{ fontWeight: 700, fontSize: 'clamp(1.05rem, 2.5vw, 1.18rem)', marginBottom: 14, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.name}</div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ color: '#1976d2', fontWeight: 600, fontSize: 'clamp(0.95rem, 2vw, 1.05rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.levelName}</span>
          <span style={{ fontSize: 13, color: '#bbb' }}>|</span>
          <span style={{ fontSize: 'clamp(0.95rem, 2vw, 1.05rem)', color: '#1976d2', fontWeight: 600 }}>Lv.{student.level}</span>
          <span style={{ fontSize: 13, color: '#bbb' }}>|</span>
          <span style={{ fontSize: 'clamp(0.95rem, 2vw, 1.05rem)', color: '#43a047', fontWeight: 600 }}>XP {student.exp}</span>
        </div>
        {/* 이름/레벨/경험치와 경험치바 사이에 간격 추가 */}
        <div style={{ height: 14 }} />
        {/* 경험치 바 */}
        <div style={{ width: '92%', margin: '10px auto 0 auto', height: 18, background: '#e3f2fd', borderRadius: 10, position: 'relative', overflow: 'hidden', boxShadow: '0 1px 4px #b2ebf240' }}>
          <div style={{ width: `${Math.min(100, Math.round((student.exp / getRequiredExp(student.level)) * 100))}%`, height: '100%', background: '#90caf9', borderRadius: 10, transition: 'width 0.4s' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, color: '#1976d2', letterSpacing: '-0.5px' }}>
            XP {student.exp} / {getRequiredExp(student.level)}
          </div>
        </div>
        {/* 경험치바와 버튼 영역 사이에 간격 추가 */}
        <div style={{ height: 2 }} />
        {/* 퀘스트가 있으면 '현재 퀘스트 진행중입니다' 버튼만 노출 */}
        {ongoingQuests.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); setShowQuestModal(true); }}
            className="candy-btn"
            style={{ width: '96%', background: '#fffde7', color: '#ff9800', fontWeight: 700, fontSize: 'clamp(13px, 2.5vw, 15px)', borderRadius: 12, border: 'none', boxShadow: '0 1px 4px #ffe08260', padding: '8px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '0 auto 2px auto' }}
          >
            현재 퀘스트 진행중입니다
          </button>
        )}
      </div>
      {/* 버튼 영역: 항상 하단에 고정, 사라지지 않도록 minHeight와 flex-shrink: 0 적용 */}
      <div style={{ marginTop: 6, width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', gap: 8, minHeight: 44, flexShrink: 0, marginBottom: 14 }}>
        <button onClick={e => { e.stopPropagation(); onOptionClick('exp'); }} disabled={!selected} className="candy-btn" style={{
          fontSize: 'clamp(13px, 2vw, 15px)', fontWeight: 600, borderRadius: 999, boxShadow: '0 2px 8px #b2ebf240', padding: '8px 0', border: 'none', background: selected ? '#e0f7fa' : '#f7faf7', color: '#1976d2', cursor: selected ? 'pointer' : 'not-allowed', opacity: selected ? 1 : 0.6, transition: 'all 0.2s', width: '33.3%', minWidth: 0, whiteSpace: 'nowrap', overflow: 'visible', textOverflow: 'clip', letterSpacing: '-0.5px'
        }}>발표 경험치</button>
        <button onClick={e => { e.stopPropagation(); onOptionClick('message'); }} disabled={!selected} className="candy-btn" style={{
          fontSize: 'clamp(13px, 2vw, 15px)', fontWeight: 600, borderRadius: 999, boxShadow: '0 2px 8px #b2ebf240', padding: '8px 0', border: 'none', background: selected ? '#e0f7fa' : '#f7faf7', color: '#1976d2', cursor: selected ? 'pointer' : 'not-allowed', opacity: selected ? 1 : 0.6, transition: 'all 0.2s', width: '33.3%', minWidth: 0, whiteSpace: 'nowrap', overflow: 'visible', textOverflow: 'clip', letterSpacing: '-0.5px'
        }}>메세지 보내기</button>
        <button onClick={e => { e.stopPropagation(); onOptionClick('quest'); }} disabled={!selected} className="candy-btn" style={{
          fontSize: 'clamp(13px, 2vw, 15px)', fontWeight: 600, borderRadius: 999, boxShadow: '0 2px 8px #b2ebf240', padding: '8px 0', border: 'none', background: selected ? '#e0f7fa' : '#f7faf7', color: '#1976d2', cursor: selected ? 'pointer' : 'not-allowed', opacity: selected ? 1 : 0.6, transition: 'all 0.2s', width: '33.3%', minWidth: 0, whiteSpace: 'nowrap', overflow: 'visible', textOverflow: 'clip', letterSpacing: '-0.5px'
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
                    <button onClick={() => { if(onQuestApprove) onQuestApprove(quest); setShowQuestModal(false); }} style={{ background: '#43a047', color: '#fff', fontWeight: 'bold', borderRadius: 8, padding: '6px 18px', border: 'none', cursor: 'pointer' }}>승인</button>
                    <button onClick={() => { if(onQuestFail) onQuestFail(quest); setShowQuestModal(false); }} style={{ background: '#ff1744', color: '#fff', fontWeight: 'bold', borderRadius: 8, padding: '6px 18px', border: 'none', cursor: 'pointer' }}>실패</button>
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