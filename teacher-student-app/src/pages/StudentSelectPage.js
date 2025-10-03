import React from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';

const levelImages = [
  '/lv1.png', // 알사탕
  '/lv2.png', // 새콤한 사탕
  '/lv3.png', // 막대사탕
  '/lv4.png', // 롤리팝
  '/lv5.png', // 수제 사탕
  '/lv6.png', // 사탕 마스터
  '/lv7.png', // 콜라맛, 딸기맛 막대사탕 세트
  '/lv8.png', // 신 맛 막대사탕 세트
  '/lv9.png', // SUPER 신 맛 막대사탕 세트
  '/lv10.png', // 탱글탱글 지구젤리
  '/lv11.png', // 반짝반짝 레인보우 세트
  '/lv12.png', // 잠만보 캔디 세트
];
const levelNames = [
  '알사탕',
  '새콤한 사탕',
  '막대사탕',
  '롤리팝',
  '수제 사탕',
  '사탕 마스터',
  '콜라맛, 딸기맛 막대사탕 세트',
  '신 맛 막대사탕 세트',
  'SUPER 신 맛 막대사탕 세트',
  '탱글탱글 지구젤리',
  '반짝반짝 레인보우 세트',
  '잠만보 캔디 세트',
];

const STUDENT_ORDER = [
  '김규민','김범준','김성준','김수겸','김주원','문기훈','박동하','백주원','백지원','손정환','이도윤','이예준','임재희','조은빈','조찬희','최서윤','최서현','한서우','황리아','하지수','테스트','이해원','김주하'
];

const StudentSelectPage = () => {
  const [user, authLoading] = useAuthState(auth);
  const [studentsSnapshot, loading, error] = useCollection(
    user ? collection(db, 'students') : null
  );
  const navigate = useNavigate();

  if (authLoading) return <div>로딩 중...</div>;
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h2>로그인이 필요합니다</h2>
        <button
          onClick={() => signInWithPopup(auth, googleProvider)}
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
      <div style={{ 
        marginTop: '40px', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        padding: '0 20px',
        maxWidth: '1400px',
        margin: '40px auto 0'
      }}>
        {loading && <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 18 }}>로딩 중...</div>}
        {error && <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 18, color: 'red' }}>에러 발생: {error.message}</div>}
        {studentsSnapshot && studentsSnapshot.docs
          .slice()
          .sort((a, b) => STUDENT_ORDER.indexOf(a.data().name) - STUDENT_ORDER.indexOf(b.data().name))
          .map(doc => {
            const student = doc.data();
            // 발표 횟수 계산 (expEvents의 type: 'exp'만 집계)
            let expEvents = Array.isArray(student.expEvents) ? student.expEvents : [];
            const expEventsExp = expEvents.filter(evt => evt.type === 'exp');
            const todayStr = new Date().toISOString().slice(0, 10);
            const todayPresentations = expEventsExp.filter(e => new Date(e.ts).toISOString().slice(0, 10) === todayStr).length;
            const totalPresentations = expEventsExp.length;
            return (
              <div
                key={doc.id}
                onClick={() => navigate(`/student/${doc.id}`)}
                style={{
                  border: '3px solid #1976d2',
                  borderRadius: 20,
                  padding: '24px',
                  aspectRatio: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  background: '#fff',
                  boxShadow: '0 8px 24px rgba(25, 118, 210, 0.15)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  animation: 'hoverUpDown 2s ease-in-out infinite',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 16px 32px rgba(25, 118, 210, 0.25)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(25, 118, 210, 0.15)';
                }}
              >
                <div style={{ marginBottom: '15px' }}>
                  <img 
                    src={levelImages[student.level] || levelImages[0]} 
                    alt={levelNames[student.level] || '사탕'} 
                    style={{ 
                      width: '75px', 
                      height: '75px', 
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                    }} 
                  />
                </div>
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '25px', 
                  marginBottom: '10px',
                  color: '#333'
                }}>
                  {student.name}
                </div>
                <div style={{ 
                  color: '#1976d2', 
                  fontWeight: 'bold', 
                  marginBottom: '10px',
                  fontSize: '20px'
                }}>
                  레벨 {student.level}
                </div>
                <div style={{ 
                  marginBottom: '15px',
                  color: '#666',
                  fontSize: '17px'
                }}>
                  경험치: {student.exp}
                </div>
                {/* 발표 Chip UI */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  gap: '8px',
                  width: '100%'
                }}>
                  <span style={{ 
                    background: '#e3f2fd', 
                    color: '#1976d2', 
                    borderRadius: '12px', 
                    fontWeight: 600, 
                    fontSize: '15px', 
                    padding: '5px 15px',
                    whiteSpace: 'nowrap',
                    flex: '1',
                    textAlign: 'center'
                  }}>
                    오늘 발표: {todayPresentations}
                  </span>
                  <span style={{ 
                    background: '#e8f5e9', 
                    color: '#43a047', 
                    borderRadius: '12px', 
                    fontWeight: 600, 
                    fontSize: '15px', 
                    padding: '5px 15px',
                    whiteSpace: 'nowrap',
                    flex: '1',
                    textAlign: 'center'
                  }}>
                    누적 발표: {totalPresentations}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
      <style>{`
        @keyframes hoverUpDown {
          0% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default StudentSelectPage; 