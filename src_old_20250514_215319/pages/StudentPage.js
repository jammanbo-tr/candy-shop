import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

function StudentPage() {
  const [activeNotices, setActiveNotices] = useState([]);
  const [broadcastNotice, setBroadcastNotice] = useState(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [marqueePosition, setMarqueePosition] = useState(0);

  useEffect(() => {
    console.log('StudentPage mounted');
    // 모든 기존 favicon link 제거
    document.querySelectorAll("link[rel='icon']").forEach(el => el.parentNode.removeChild(el));
    // 새 favicon link 추가
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/png';
    favicon.href = '/st_pavicon.png';
    document.head.appendChild(favicon);

    // 공지사항 불러오기
    const fetchNotices = async () => {
      const noticesRef = collection(db, 'notices');
      const activeNoticesQuery = query(noticesRef, where('isActive', '==', true));
      const noticesSnapshot = await getDocs(activeNoticesQuery);
      const noticesData = noticesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveNotices(noticesData);
    };

    // 실시간 브로드캐스트 공지사항 감시
    const unsubscribe = onSnapshot(
      query(collection(db, 'notices'), where('broadcast', '==', true), where('isActive', '==', true)),
      (snapshot) => {
        const broadcastNotices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (broadcastNotices.length > 0) {
          // 가장 최근에 브로드캐스트된 공지사항을 표시
          const latestBroadcast = broadcastNotices.sort((a, b) => b.broadcastTime - a.broadcastTime)[0];
          setBroadcastNotice(latestBroadcast);
          setShowBroadcastModal(true);
        } else {
          setBroadcastNotice(null);
          setShowBroadcastModal(false);
        }
      }
    );

    fetchNotices();

    // 전광판 애니메이션
    const marqueeInterval = setInterval(() => {
      setMarqueePosition(prev => {
        // 화면 너비보다 더 왼쪽으로 이동하면 다시 오른쪽에서 시작
        if (prev < -2000) {
          return window.innerWidth;
        }
        return prev - 2; // 왼쪽으로 2px씩 이동
      });
    }, 30);

    return () => {
      console.log('StudentPage unmounted');
      // 복구: 다시 기본 favicon.ico로
      document.querySelectorAll("link[rel='icon']").forEach(el => el.parentNode.removeChild(el));
      const defaultFavicon = document.createElement('link');
      defaultFavicon.rel = 'icon';
      defaultFavicon.type = 'image/x-icon';
      defaultFavicon.href = '/favicon.ico';
      document.head.appendChild(defaultFavicon);
      
      // 리스너 해제
      unsubscribe();
      clearInterval(marqueeInterval);
    };
  }, []);

  // 모든 활성화된 공지사항 내용을 하나의 문자열로 합침
  const allNoticesContent = activeNotices.length > 0 
    ? activeNotices.map(notice => notice.content).join(' 📢 ')
    : '현재 공지사항이 없습니다.';

  const noticeText = `JAMMANBO CANDY SHOP 고객여러분, 더 나은 CANDY SHOP이 되기 위해 몇 가지 공지사항이 있습니다. 📢 ${allNoticesContent}`;

  return (
    <div>
      {/* 상단 전광판 공지사항 */}
      {activeNotices.length > 0 && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          background: '#1976d2', 
          color: 'white', 
          padding: '10px 0', 
          overflow: 'hidden',
          zIndex: 1000
        }}>
          <div style={{ 
            position: 'relative',
            whiteSpace: 'nowrap',
            transform: `translateX(${marqueePosition}px)`,
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 600, marginRight: 12 }}>📢</span>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{noticeText}</span>
            </div>
          </div>
        </div>
      )}

      {/* 브로드캐스트 모달 */}
      {showBroadcastModal && broadcastNotice && (
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
          zIndex: 2000
        }}>
          <div style={{ 
            background: 'white', 
            borderRadius: 16, 
            padding: 24, 
            maxWidth: 500,
            width: '90%',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
            position: 'relative',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <button 
              onClick={() => setShowBroadcastModal(false)}
              style={{ 
                position: 'absolute', 
                top: 12, 
                right: 12, 
                background: 'none', 
                border: 'none', 
                fontSize: 24, 
                color: '#bbb', 
                cursor: 'pointer' 
              }}
            >
              ×
            </button>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: 16, 
              borderBottom: '1px solid #eee', 
              paddingBottom: 12 
            }}>
              <span style={{ fontSize: 28, marginRight: 12 }}>📣</span>
              <h2 style={{ margin: 0, color: '#1976d2', fontSize: 22 }}>중요 공지사항</h2>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 16, color: '#555', margin: 0, marginBottom: 16 }}>
                JAMMANBO CANDY SHOP 고객여러분, 더 나은 CANDY SHOP이 되기 위해 몇 가지 공지사항이 있습니다.
              </p>
              <p style={{ fontSize: 18, fontWeight: 500, color: '#333' }}>
                {broadcastNotice.content}
              </p>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <button 
                onClick={() => setShowBroadcastModal(false)}
                style={{ 
                  padding: '8px 24px', 
                  background: '#1976d2', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 8, 
                  cursor: 'pointer', 
                  fontSize: 16 
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: activeNotices.length > 0 ? 60 : 0 }}>Student Page</div>
      
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
}

export default StudentPage; 