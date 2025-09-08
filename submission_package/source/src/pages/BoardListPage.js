import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

function BoardListPage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBoards = async () => {
      const q = query(collection(db, 'boards'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setBoards(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetchBoards();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f7faf7', padding: 24 }}>
      <div style={{ fontWeight: 700, fontSize: 24, color: '#1976d2', textAlign: 'center', marginBottom: 18 }}>게시판 목록</div>
      {loading ? <div style={{textAlign:'center',marginTop:40}}>로딩 중...</div> : (
        <div style={{ maxWidth: 600, margin: '0 auto', background: '#fff', borderRadius: 18, boxShadow: '0 2px 12px #b2ebf220', padding: 24 }}>
          {boards.length === 0 ? <div style={{textAlign:'center',color:'#aaa'}}>아직 생성된 게시판이 없습니다.</div> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {boards.map(board => (
                <li key={board.id} style={{ marginBottom: 18, borderBottom: '1.5px dashed #e0f7fa', paddingBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 18, color: '#1976d2' }}>{board.title ? board.title : `게시판 #${board.code}`}</div>
                      <div style={{ fontSize: 14, color: '#888', marginTop: 2 }}>코드: <span style={{fontWeight:600}}>{board.code}</span></div>
                      <div style={{ fontSize: 13, color: '#bbb', marginTop: 2 }}>{board.createdAt && board.createdAt.toDate ? board.createdAt.toDate().toLocaleString() : ''}</div>
                    </div>
                    <button onClick={()=>navigate(`/board/${board.code}`)} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 22px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>입장</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div style={{textAlign:'center',marginTop:24}}>
        <button onClick={()=>navigate(-1)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>뒤로가기</button>
      </div>
    </div>
  );
}

export default BoardListPage; 