import React, { useEffect, useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, doc, updateDoc, arrayUnion, setDoc, getDocs, query, orderBy, deleteDoc, getDoc, addDoc, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CardDrawModal from '../components/CardDrawModal';
import { useAuth } from '../hooks/useAuth';
import StudentCard from '../components/StudentCard';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import Checkbox from '@mui/material/Checkbox';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import CampaignIcon from '@mui/icons-material/Campaign';
import TextField from '@mui/material/TextField';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import QuizSystem from '../components/QuizSystem';

// 학생 관리 컴포넌트
const StudentManagement = ({ students, onUpdateStudent }) => {
  // ... existing code ...
};

// 경험치 관리 컴포넌트
const ExperienceManagement = ({ students, onUpdateStudent }) => {
  // ... existing code ...
};

// 알림 관리 컴포넌트
const NotificationManagement = ({ notifications, onUpdateNotification }) => {
  // ... existing code ...
};

// 메인 TeacherPage 컴포넌트
const TeacherPage = () => {
  console.log('🏫 TeacherPage 컴포넌트가 렌더링됩니다');
  
  // 모든 useState, useEffect 등 Hook 선언 (최상단)
  const [auth, setAuth] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState('');
  const [studentsSnapshot, studentsLoading, studentsError] = useCollection(collection(db, 'students'));
  const [notificationsSnapshot, notificationsLoading, notificationsError] = useCollection(collection(db, 'notifications'));
  const navigate = useNavigate();

  // 캔디숍 관련 상태
  const [items, setItems] = useState([]);
  const [itemNames, setItemNames] = useState({});
  const [itemPrices, setItemPrices] = useState({});
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [itemSaving, setItemSaving] = useState(false);

  // 쿠폰함 관련 상태
  const [couponBoxOpen, setCouponBoxOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentCoupons, setStudentCoupons] = useState([]);
  const [hasDrawnCard, setHasDrawnCard] = useState(false);

  // 공지&예약 관련 상태 추가
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [notices, setNotices] = useState([]);
  const [currentNotice, setCurrentNotice] = useState({ id: '', content: '', isActive: true });
  const [noticeError, setNoticeError] = useState('');

  // 예약 알람 관련 상태 추가
  const [alarmTab, setAlarmTab] = useState('notice'); // 'notice' | 'alarm'
  const [alarms, setAlarms] = useState([]);
  const [alarmContent, setAlarmContent] = useState('');
  const [alarmTime, setAlarmTime] = useState('');
  const [alarmSaving, setAlarmSaving] = useState(false);

  // 상태 변수들 중 게임 관련 제거하고 퀴즈만 남기기
  const [showQuizModal, setShowQuizModal] = useState(false);
  
  console.log('📊 TeacherPage 상태 초기화 완료 - showQuizModal:', showQuizModal);

  // 학생 데이터 변환
  const students = studentsSnapshot?.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) || [];

  // 알림 데이터 변환
  const notifications = notificationsSnapshot?.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) || [];

  // 학생 정보 업데이트 핸들러
  const handleUpdateStudent = async (studentId, updates) => {
    try {
      const studentRef = doc(db, 'students', studentId);
      await updateDoc(studentRef, updates);
    } catch (error) {
      console.error('Error updating student:', error);
    }
  };

  // 알림 업데이트 핸들러
  const handleUpdateNotification = async (notificationId, updates) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, updates);
    } catch (error) {
      console.error('Error updating notification:', error);
    }
  };

  // 공지사항 목록 불러오기
  const fetchNotices = async () => {
    try {
      const noticesRef = collection(db, 'notices');
      const noticesSnapshot = await getDocs(noticesRef);
      const noticesData = noticesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotices(noticesData);
    } catch (error) {
      setNoticeError('공지사항을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 공지사항 저장/수정
  const saveNotice = async () => {
    if (!currentNotice.content.trim()) {
      setNoticeError('공지사항 내용을 입력해주세요.');
      return;
    }
    if (currentNotice.id) {
      await updateDoc(doc(db, 'notices', currentNotice.id), {
        content: currentNotice.content,
        isActive: currentNotice.isActive,
        updatedAt: Date.now()
      });
    } else {
      await addDoc(collection(db, 'notices'), {
        content: currentNotice.content,
        isActive: currentNotice.isActive,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    setCurrentNotice({ id: '', content: '', isActive: true });
    setNoticeError('');
    fetchNotices();
  };

  // 공지사항 삭제
  const deleteNotice = async (noticeId) => {
    await deleteDoc(doc(db, 'notices', noticeId));
    fetchNotices();
  };

  // 공지사항 수정 선택
  const editNotice = (notice) => {
    setCurrentNotice({
      id: notice.id,
      content: notice.content,
      isActive: notice.isActive
    });
  };

  // 공지사항 광고(브로드캐스트)
  const broadcastNotice = async (noticeId) => {
    const noticeRef = doc(db, 'notices', noticeId);
    const noticeDoc = await getDoc(noticeRef);
    if (noticeDoc.exists()) {
      await updateDoc(noticeRef, { broadcast: true });
    }
    fetchNotices();
  };

  // 예약 알람 목록 불러오기
  const fetchAlarms = async () => {
    try {
      const q = query(collection(db, 'alarms'), orderBy('targetTime', 'desc'));
      const snap = await getDocs(q);
      setAlarms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      // 에러 핸들링 필요시 추가
    }
  };

  // 예약 알람 추가
  const handleSaveAlarm = async () => {
    if (!alarmContent.trim() || !alarmTime) return;
    setAlarmSaving(true);
    try {
      await addDoc(collection(db, 'alarms'), {
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

  // 예약 알람 삭제
  const handleDeleteAlarm = async (alarmId) => {
    await deleteDoc(doc(db, 'alarms', alarmId));
    fetchAlarms();
  };

  // 공지&예약 모달 탭 전환 및 데이터 fetch
  useEffect(() => {
    if (showNoticeModal) {
      fetchNotices();
      fetchAlarms();
    }
    // eslint-disable-next-line
  }, [showNoticeModal]);

  useEffect(() => { fetchNotices(); }, []);

  // 조건부 리턴은 Hook 선언 이후에만 위치
  if (!auth) {
    return (
      <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.25)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:99999}}>
        <div style={{background:'#fff',padding:36,borderRadius:18,minWidth:320,boxShadow:'0 4px 32px #b2ebf240',textAlign:'center'}}>
          <h2 style={{color:'#1976d2',marginBottom:18}}>교사용 비밀번호 입력</h2>
          <input type="password" value={pwInput} onChange={e=>setPwInput(e.target.value)} placeholder="비밀번호" style={{width:'80%',borderRadius:10,border:'1.5px solid #e0f7fa',padding:'12px 16px',fontSize:18,marginBottom:12,textAlign:'center'}} autoFocus />
          <div style={{color:'#d72660',fontWeight:600,minHeight:24}}>{pwError}</div>
          <button onClick={()=>{
            if(pwInput==='1536') { setAuth(true); setPwError(''); } else { setPwError('비밀번호가 올바르지 않습니다.'); }
          }} style={{marginTop:8,padding:'10px 32px',background:'#1976d2',color:'#fff',border:'none',borderRadius:8,fontWeight:700,fontSize:17,cursor:'pointer'}}>확인</button>
        </div>
      </div>
    );
  }

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

  // 쿠폰함 열기
  const handleOpenCouponBox = async (student) => {
    setSelectedStudent(student);
    setCouponBoxOpen(true);
    const studentRef = doc(db, 'students', student.id);
    const studentSnap = await getDoc(studentRef);
    if (studentSnap.exists()) {
      setStudentCoupons(studentSnap.data().coupons || []);
    }
  };

  // 쿠폰 사용
  const handleUseCoupon = async (coupon) => {
    if (!selectedStudent) return;
    
    const studentRef = doc(db, 'students', selectedStudent.id);
    const studentSnap = await getDoc(studentRef);
    if (!studentSnap.exists()) return;

    const studentData = studentSnap.data();
    const updatedCoupons = studentData.coupons.filter(c => c.id !== coupon.id);
    
    await updateDoc(studentRef, {
      coupons: updatedCoupons
    });

    setStudentCoupons(updatedCoupons);
  };

  return (
    <div>
      {studentsLoading ? (
        <div>로딩 중...</div>
      ) : studentsError ? (
        <div>에러가 발생했습니다: {studentsError.message}</div>
      ) : (
        <>
          <StudentManagement students={students} onUpdateStudent={handleUpdateStudent} />
          <ExperienceManagement students={students} onUpdateStudent={handleUpdateStudent} />
          <NotificationManagement notifications={notifications} onUpdateNotification={handleUpdateNotification} />

          {/* 테스트 문구 (배포 확인용) */}
          <div style={{ position: 'fixed', top: 10, left: 10, zIndex: 9999, background: 'red', color: 'white', fontWeight: 700, fontSize: 14, borderRadius: 8, padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            🔥 DEBUG: showQuizModal = {showQuizModal ? 'TRUE' : 'FALSE'}
          </div>
          <div style={{ position: 'fixed', top: 32, right: 32, zIndex: 3000, background: '#fffde7', color: '#d72660', fontWeight: 700, fontSize: 16, borderRadius: 8, padding: '6px 18px', boxShadow: '0 2px 8px #fbc02d40' }}>
            테스트문구: 공지&예약 버튼 배포 확인용
          </div>

          {/* 우측 상단 버튼 그룹 내에 공지&예약 버튼 포함 */}
          <div style={{ position: 'fixed', top: 60, right: 32, zIndex: 2000, display: 'flex', flexDirection: 'row', gap: 18, alignItems: 'center' }}>
            {/* 유리병 아이콘 버튼 */}
            <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }} title="학급 캔디 유리병" onClick={() => setShowJarModal(true)}>
              <img src="/jar2.png" alt="유리병" style={{ width: 32, height: 32, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px #b2ebf2a0)' }} />
            </div>
          {/* 캔디숍 버튼 */}
            <button onClick={() => setShowAddItemModal(true)} style={{ background: '#fffde7', border: 'none', borderRadius: 999, padding: '8px 18px', boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <StorefrontIcon style={{ color: '#d72660', fontSize: 28 }} />
              <span style={{ fontWeight: 700, color: '#d72660', fontSize: 16 }}>캔디숍</span>
            </button>
            {/* 쿠폰함 버튼 */}
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
            {/* 공지&예약 버튼 */}
          <button
              onClick={() => setShowNoticeModal(true)}
              style={{ background: '#fffde7', border: 'none', borderRadius: 999, padding: '8px 18px', boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#f57f17', fontSize: 16 }}
            >
              <CampaignIcon style={{ color: '#f57f17', fontSize: 28 }} />
              <span style={{ fontWeight: 700, color: '#f57f17', fontSize: 16 }}>공지&예약</span>
          </button>
          </div>

          {/* 캔디숍 모달 */}
          {showAddItemModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: '#fff',
                padding: 24,
                borderRadius: 12,
                width: '90%',
                maxWidth: 500
              }}>
                <h2>캔디숍 관리</h2>
                <div style={{ marginTop: 16 }}>
                  {items.map(item => (
                    <div key={item.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: '1px solid #eee'
                    }}>
                      <span>{item.name}</span>
                      <span>{item.price} 캔디</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowAddItemModal(false)}
                  style={{
                    marginTop: 16,
                    padding: '8px 16px',
                    background: '#1976d2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  닫기
                </button>
              </div>
            </div>
          )}

          {/* 쿠폰함 모달 */}
          {couponBoxOpen && selectedStudent && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: '#fff',
                padding: 24,
                borderRadius: 12,
                width: '90%',
                maxWidth: 500
              }}>
                <h2>{selectedStudent.name}의 쿠폰함</h2>
                <div style={{ marginTop: 16 }}>
                  {studentCoupons.length === 0 ? (
                    <p>보유한 쿠폰이 없습니다.</p>
                  ) : (
                    studentCoupons.map(coupon => (
                      <div key={coupon.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: '1px solid #eee'
                      }}>
                        <span>{coupon.name}</span>
                        <button
                          onClick={() => handleUseCoupon(coupon)}
                          style={{
                            padding: '4px 8px',
                            background: '#1976d2',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer'
                          }}
                        >
                          사용하기
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <button
                  onClick={() => setCouponBoxOpen(false)}
                  style={{
                    marginTop: 16,
                    padding: '8px 16px',
                    background: '#1976d2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  닫기
                </button>
              </div>
            </div>
          )}

          {/* 공지&예약 모달 UI */}
          {showNoticeModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
              <div style={{ background: '#fff', padding: 32, borderRadius: 24, minWidth: 340, maxWidth: 480, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center', position: 'relative' }}>
                <button onClick={() => setShowNoticeModal(false)} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#bbb', cursor: 'pointer', fontWeight: 700 }}>×</button>
                <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 18, color: '#1976d2', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                  <CampaignIcon style={{ color: '#f57f17', fontSize: 28 }} /> 공지&예약 관리
                </div>
                {/* 탭: 공지사항/예약 알람 */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 18 }}>
                  <button onClick={() => setAlarmTab('notice')} style={{ fontWeight: 700, borderRadius: 999, background: alarmTab==='notice' ? '#e0f7fa' : '#f7faf7', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer' }}>공지사항</button>
                  <button onClick={() => setAlarmTab('alarm')} style={{ fontWeight: 700, borderRadius: 999, background: alarmTab==='alarm' ? '#e0f7fa' : '#f7faf7', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer' }}>예약 알람</button>
                </div>
                {/* 공지사항 탭 */}
                {alarmTab === 'notice' && (
                  <div style={{ marginBottom: 12, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>공지사항 내용</div>
                    <textarea value={currentNotice.content} onChange={e => setCurrentNotice({ ...currentNotice, content: e.target.value })} placeholder="공지사항 내용을 입력하세요..." style={{ width: '100%', minHeight: 64, borderRadius: 10, border: '1.5px solid #e0f7fa', padding: 12, fontSize: 15, marginBottom: 8, resize: 'vertical' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <input type="checkbox" checked={currentNotice.isActive} onChange={e => setCurrentNotice({ ...currentNotice, isActive: e.target.checked })} id="noticeActive" />
                      <label htmlFor="noticeActive" style={{ fontWeight: 600, color: '#d72660', fontSize: 15 }}>활성화</label>
                    </div>
                    <button onClick={saveNotice} style={{ fontWeight: 700, borderRadius: 999, background: '#1976d2', color: '#fff', border: 'none', padding: '10px 32px', fontSize: 17, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer' }}>추가하기</button>
                    {noticeError && <div style={{ color: '#d72660', fontWeight: 600, marginTop: 8 }}>{noticeError}</div>}
                  </div>
                )}
                {/* 공지사항 목록 */}
                {alarmTab === 'notice' && (
                  <div style={{ textAlign: 'left', marginTop: 18 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>공지사항 목록</div>
                    {notices.length === 0 ? (
                      <div style={{ color: '#aaa', margin: '24px 0' }}>등록된 공지사항이 없습니다.</div>
                    ) : (
                      notices.map(notice => (
                        <div key={notice.id} style={{ background: '#f7faf7', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px #b2ebf220', border: '1.5px solid #e0f7fa' }}>
                          <div style={{ fontSize: 15, marginBottom: 6 }}>{notice.content}</div>
                          <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>최종 수정: {notice.updatedAt ? new Date(notice.updatedAt).toLocaleString() : ''}</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => editNotice(notice)} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '6px 18px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer' }}>수정</button>
                            <button onClick={() => deleteNotice(notice.id)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '6px 18px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer' }}>삭제</button>
                            <button onClick={() => broadcastNotice(notice.id)} style={{ fontWeight: 600, borderRadius: 999, background: '#fffde7', color: '#f57f17', border: 'none', padding: '6px 18px', fontSize: 15, boxShadow: '0 2px 8px #fbc02d40', cursor: 'pointer' }}>📢 광고하기</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {/* 예약 알람 탭 */}
                {alarmTab === 'alarm' && (
                  <div style={{ marginBottom: 12, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>예약 알람 내용</div>
                    <textarea value={alarmContent} onChange={e => setAlarmContent(e.target.value)} placeholder="예약 알람 내용을 입력하세요..." style={{ width: '100%', minHeight: 48, borderRadius: 10, border: '1.5px solid #e0f7fa', padding: 12, fontSize: 15, marginBottom: 8, resize: 'vertical' }} />
                    <input type="datetime-local" value={alarmTime} onChange={e => setAlarmTime(e.target.value)} style={{ width: '100%', borderRadius: 10, border: '1.5px solid #e0f7fa', padding: 10, fontSize: 15, marginBottom: 8 }} />
                    <button onClick={handleSaveAlarm} disabled={alarmSaving} style={{ fontWeight: 700, borderRadius: 999, background: '#1976d2', color: '#fff', border: 'none', padding: '10px 32px', fontSize: 17, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', opacity: alarmSaving ? 0.5 : 1 }}>추가</button>
                  </div>
                )}
                {/* 예약 알람 목록 */}
                {alarmTab === 'alarm' && (
                  <div style={{ textAlign: 'left', marginTop: 18 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>예약 알람 목록</div>
                    {alarms.length === 0 ? (
                      <div style={{ color: '#aaa', margin: '24px 0' }}>등록된 예약 알람이 없습니다.</div>
                    ) : (
                      alarms.map(alarm => (
                        <div key={alarm.id} style={{ background: '#f7faf7', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px #b2ebf220', border: '1.5px solid #e0f7fa' }}>
                          <div style={{ fontSize: 15, marginBottom: 6 }}>{alarm.content}</div>
                          <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>예약 시간: {alarm.targetTime ? new Date(alarm.targetTime).toLocaleString() : ''}</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleDeleteAlarm(alarm.id)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '6px 18px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer' }}>삭제</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </>
      )}

      {/* 캔디 퀴즈타임 버튼 (우측 하단 고정) - 항상 표시 */}
      <div style={{ position: 'fixed', right: 32, bottom: 32, zIndex: 3000 }}>
        <button onClick={() => {
          console.log('🎯 캔디 퀴즈타임 버튼 클릭됨!');
          console.log('현재 showQuizModal 상태:', showQuizModal);
          setShowQuizModal(true);
          console.log('setShowQuizModal(true) 호출 완료');
        }} style={{ background: '#fffde7', border: 'none', borderRadius: 999, padding: '12px 18px', boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <SportsEsportsIcon style={{ color: '#1976d2', fontSize: 32 }} />
          <span style={{ fontWeight: 700, color: '#1976d2', fontSize: 17 }}>🔥 캔디 퀴즈타임 DEBUG</span>
        </button>
      </div>

      {/* 캔디 퀴즈타임 모달 */}
      {(() => {
        console.log('🔍 모달 렌더링 체크 - showQuizModal:', showQuizModal);
        if (showQuizModal) {
          console.log('✅ 모달이 렌더링됩니다!');
          return (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 4000
            }}>
              <div style={{
                position: 'relative',
                width: '95%',
                height: '95%',
                maxWidth: '1200px',
                maxHeight: '800px',
                borderRadius: 16,
                overflow: 'hidden'
              }}>
                <button 
                  onClick={() => {
                    console.log('❌ 모달 닫기 버튼 클릭됨');
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
                    zIndex: 5000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  ×
                </button>
                <QuizSystem isTeacher={true} currentUser={{name: "Teacher"}} />
              </div>
            </div>
          );
        } else {
          console.log('❌ 모달이 렌더링되지 않습니다 (showQuizModal이 false)');
          return null;
        }
      })()}

      {/* 선택된 학생 하단 바 */}
    </div>
  );
};

export default TeacherPage; 