import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, addDoc, onSnapshot, updateDoc, arrayUnion, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '../firebase';
import AddIcon from '@mui/icons-material/Add';
import { useCollection } from 'react-firebase-hooks/firestore';

const DEFAULT_COLUMNS = [
  { key: 'photo', title: '사진 올리기' },
  { key: 'draw', title: '그림 올리기' },
];

const firebaseApp = initializeApp(firebaseConfig);

function BoardPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState({ columns: [] });
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ column: DEFAULT_COLUMNS[0].key, text: '', image: null, imageUrl: '' });
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef();
  const [showPostModal, setShowPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [postImageUrl, setPostImageUrl] = useState('');
  const postFileInputRef = useRef();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const studentId = params.get('studentId');
  const studentName = params.get('studentName');
  const teacherMode = params.get('teacher') === '1';
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [selectedColumnKey, setSelectedColumnKey] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [studentsSnapshot] = useCollection(collection(db, 'students'));
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [commentInputs, setCommentInputs] = useState({});
  const [isTeacherAuthed, setIsTeacherAuthed] = useState(false);
  const [showTeacherAuthModal, setShowTeacherAuthModal] = useState(false);
  const [teacherAuthInput, setTeacherAuthInput] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editPostTitle, setEditPostTitle] = useState('');
  const [editPostContent, setEditPostContent] = useState('');
  const [editCommentText, setEditCommentText] = useState('');
  const [uploading, setUploading] = useState(false);

  // 게시판 정보 불러오기/생성
  useEffect(() => {
    const ref = doc(db, 'boards', code);
    getDoc(ref).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setBoard({ ...data, columns: Array.isArray(data.columns) ? data.columns : [] });
      } else {
        setDoc(ref, {
          code,
          createdAt: serverTimestamp(),
          columns: [],
          title: `게시판 #${code}`
        });
        setBoard({ code, columns: [], title: `게시판 #${code}` });
      }
      setLoading(false);
    });
  }, [code]);

  // 게시글 실시간 구독
  useEffect(() => {
    if (!code) return;
    const q = query(collection(db, 'boards', code, 'posts'), orderBy('createdAt'));
    const unsub = onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [code]);

  // 이미지 붙여넣기 핸들러
  useEffect(() => {
    if (!showPostModal) return;
    const handlePaste = (e) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = ev => setPostImageUrl(ev.target.result);
          reader.readAsDataURL(file);
          setPostImage(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showPostModal]);

  // 작성자 드롭다운 기본값을 학생이면 자동 선택
  useEffect(() => {
    if (!selectedAuthor && studentId && studentsSnapshot) {
      setSelectedAuthor(studentId);
    }
  }, [studentId, studentsSnapshot, selectedAuthor]);

  // 새 글 등록
  const handleAddPost = async () => {
    if (!newPost.text.trim() && !newPost.imageUrl) return;
    await addDoc(collection(db, 'boards', code, 'posts'), {
      ...newPost,
      createdAt: new Date(),
      likes: 0,
      comments: [],
    });
    setNewPost({ ...newPost, text: '', image: null, imageUrl: '' });
  };

  // 글쓰기 등록
  const handleAddPostModal = async () => {
    if (!postTitle.trim() && !postContent.trim()) return;
    setUploading(true);
    try {
      let authorId = selectedAuthor;
      let authorName = '';
      if (selectedAuthor === 'teacher') {
        authorName = '선생님';
      } else if (studentsSnapshot) {
        const doc = studentsSnapshot.docs.find(doc => doc.id === selectedAuthor);
        authorName = doc ? doc.data().name : '';
      }
      // 랜덤 사탕 번호
      const candyType = Math.floor(Math.random() * 6) + 1;
      await addDoc(collection(db, 'boards', code, 'posts'), {
        title: postTitle.trim(),
        text: postContent.trim(),
        column: selectedColumnKey,
        createdAt: new Date(),
        likes: 0,
        comments: [],
        authorId,
        authorName,
        candyType,
      });
      setShowPostModal(false);
      setPostTitle('');
      setPostContent('');
      setSelectedAuthor(studentId || '');
    } catch (err) {
      alert('글 등록 중 오류가 발생했습니다.\n' + (err.message || err));
    } finally {
      setUploading(false);
    }
  };

  // 파일 업로드 핸들러
  const handlePostImageChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPostImageUrl(ev.target.result);
    reader.readAsDataURL(file);
    setPostImage(file);
  };

  // 이미지 업로드 핸들러 (base64 임시)
  const handleImageChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setNewPost(prev => ({ ...prev, image: file, imageUrl: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // 좋아요
  const handleLike = async (postId) => {
    const ref = doc(db, 'boards', code, 'posts', postId);
    await updateDoc(ref, { likes: arrayUnion('1') }); // 실제로는 userId 필요
  };

  // 댓글 추가
  const handleAddComment = async (postId, comment) => {
    if (!comment.trim()) return;
    const ref = doc(db, 'boards', code, 'posts', postId);
    const postSnap = await getDoc(ref);
    const post = postSnap.data();
    await updateDoc(ref, { comments: arrayUnion({ text: comment, ts: Date.now() }) });
  };

  // 칼럼 추가
  const handleAddColumn = async () => {
    if (!newColumnTitle.trim()) return;
    const newCol = { key: Math.random().toString(36).slice(2,8), title: newColumnTitle.trim() };
    const newColumns = [...(board.columns||[]), newCol];
    await updateDoc(doc(db, 'boards', code), { columns: newColumns });
    setBoard(prev => ({ ...prev, columns: newColumns }));
    setShowColumnModal(false);
    setNewColumnTitle('');
  };

  // 칼럼 추가 버튼 클릭 시 비밀번호 모달
  const handleColumnAddClick = () => {
    setShowPasswordModal(true);
  };

  // 비밀번호 확인 후 칼럼 생성 모달 오픈
  const handlePasswordConfirm = () => {
    if (passwordInput === 'jam') {
      setShowPasswordModal(false);
      setPasswordInput('');
      setShowColumnModal(true);
    } else {
      alert('비밀번호가 틀렸습니다!');
      setPasswordInput('');
    }
  };

  // 칼럼별 게시글 그리드 레이아웃
  const getGridPosts = (postsArr) => {
    const grid = [];
    const perRow = 5;
    for (let i = 0; i < postsArr.length; i += perRow) {
      grid.push(postsArr.slice(i, i + perRow));
    }
    return grid;
  };

  // 칼럼이 없을 때 기본 칼럼 렌더링
  const renderColumns = board.columns && board.columns.length > 0 ? board.columns : [{ key: '', title: '' }];

  // 교사 인증 확인 함수
  const handleTeacherAuth = () => {
    if (teacherAuthInput === 'jam') {
      setIsTeacherAuthed(true);
      setShowTeacherAuthModal(false);
      setTeacherAuthInput('');
    } else {
      alert('비밀번호가 틀렸습니다!');
      setTeacherAuthInput('');
    }
  };

  // 게시글 수정 함수
  const handleEditPost = async (postId) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    setEditingPost(post);
    setEditPostTitle(post.title || '');
    setEditPostContent(post.text || '');
  };

  // 게시글 수정 완료 함수
  const handleEditPostSubmit = async () => {
    if (!editingPost) return;
    await updateDoc(doc(db, 'boards', code, 'posts', editingPost.id), {
      title: editPostTitle,
      text: editPostContent,
    });
    setEditingPost(null);
    setEditPostTitle('');
    setEditPostContent('');
  };

  // 게시글 삭제 함수
  const handleDeletePost = async (postId) => {
    await deleteDoc(doc(db, 'boards', code, 'posts', postId));
  };

  // 댓글 수정 함수
  const handleEditComment = (postId, comment) => {
    setEditingComment({ postId, comment });
    setEditCommentText(comment.text);
  };

  // 댓글 수정 완료 함수
  const handleEditCommentSubmit = async () => {
    if (!editingComment) return;
    const post = posts.find(p => p.id === editingComment.postId);
    if (!post) return;
    const updatedComments = post.comments.map(c => 
      c.ts === editingComment.comment.ts ? { ...c, text: editCommentText } : c
    );
    await updateDoc(doc(db, 'boards', code, 'posts', editingComment.postId), { comments: updatedComments });
    setEditingComment(null);
    setEditCommentText('');
  };

  // 댓글 삭제 함수
  const handleDeleteComment = async (postId, commentTs) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const updatedComments = post.comments.filter(c => c.ts !== commentTs);
    await updateDoc(doc(db, 'boards', code, 'posts', postId), { comments: updatedComments });
  };

  // 교사 인증 해제 함수
  const handleTeacherAuthToggle = () => {
    if (isTeacherAuthed) {
      setIsTeacherAuthed(false);
    } else {
      setShowTeacherAuthModal(true);
    }
  };

  if (loading) return <div style={{textAlign:'center',marginTop:40}}>로딩 중...</div>;
  if (!board) return <div style={{textAlign:'center',marginTop:40}}>게시판 정보를 불러올 수 없습니다.</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f7faf7', padding: 24, position: 'relative' }}>
      {/* 우측 상단 게시판 목록/교사인증 버튼 */}
      <div style={{ position: 'fixed', top: 24, right: 32, zIndex: 2000, display: 'flex', gap: 12 }}>
        <button onClick={()=>navigate('/boards')} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>게시판 목록</button>
        <button onClick={handleTeacherAuthToggle} style={{ fontWeight: 600, borderRadius: 999, background: isTeacherAuthed ? '#e0f7fa' : '#fffde7', color: isTeacherAuthed ? '#1976d2' : '#fbc02d', border: 'none', padding: '8px 24px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>{isTeacherAuthed ? '교사 인증됨' : '교사인증'}</button>
      </div>
      {/* 게시판 상단 */}
      <div style={{ fontWeight: 700, fontSize: 24, color: '#1976d2', textAlign: 'center', marginBottom: 18 }}>{board.title ? board.title : `게시판 #${code}`} <span style={{fontSize:16, color:'#bbb'}}>({code})</span></div>
      {/* 칼럼 추가 버튼(교사만, 비밀번호 필요) */}
      {teacherMode && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <button onClick={handleColumnAddClick} style={{ fontWeight: 700, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 28px', fontSize: 17, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>+ 칼럼 추가</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap', overflowX: 'auto', minWidth: 960, width: '100%', maxWidth: '100vw' }}>
        {renderColumns.map(col => {
          const colPosts = posts.filter(p=>(p.column===col.key||(col.key===''&&!p.column)));
          return (
            <div key={col.key} style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 12px #b2ebf220', minWidth: 240, maxWidth: 1200, width: '90vw', padding: 18, marginBottom: 12, overflow: 'hidden' }}>
              {col.title && <div style={{ fontWeight: 700, fontSize: 18, color: '#1976d2', marginBottom: 10 }}>{col.title}</div>}
              {/* 칼럼별 + 버튼 */}
              {board.columns && board.columns.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button onClick={()=>{setSelectedColumnKey(col.key);setShowPostModal(true);}} style={{ borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '4px 16px', fontWeight: 600, fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer' }}>+ 글쓰기</button>
                </div>
              )}
              {/* 게시글 그리드 (4열 고정, 균일, 최대 6줄) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 18,
                alignItems: 'stretch',
                justifyItems: 'stretch',
                minHeight: 180
              }}>
                {colPosts.map(post => {
                  // 사탕 이미지 랜덤 선택 및 위치 (카드 전체를 거의 채우는 크기)
                  let candyImg = null, candyStyle = {};
                  if (post.candyType) {
                    candyImg = `/lv${post.candyType}.png`;
                    candyStyle = {
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: '70%',
                      height: 'auto',
                      opacity: 0.15,
                      pointerEvents: 'none',
                      zIndex: 0,
                      transform: 'translate(-50%, -50%)',
                    };
                  }
                  return (
                    <div key={post.id} style={{ background: '#e3f2fd', borderRadius: 14, padding: 12, boxShadow: '0 1px 4px #b2ebf240', display: 'flex', flexDirection: 'column', minHeight: 220, position: 'relative', overflow: 'hidden' }}>
                      {/* 사탕 이미지 (카드 중앙) */}
                      {candyImg && <img src={candyImg} alt="candy" style={candyStyle} />}
                      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {/* 제목 → 내용 → 글쓴이 → 이미지 순서로 렌더링 */}
                        {post.title && <div style={{ fontWeight: 600, fontSize: 16, color: '#1976d2', marginBottom: 2 }}>{post.title}</div>}
                        <div style={{ fontSize: 15, color: '#222', marginBottom: 4 }}>{post.text}</div>
                        {post.authorName && <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>글쓴이: {post.authorName}</div>}
                        {/* 하단 이모티콘+댓글 입력창 영역 */}
                        <div style={{ marginTop: 'auto' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#888', marginBottom: 4 }}>
                            <span style={{ cursor: 'pointer', color: '#1976d2', fontWeight: 700, fontSize: 22, display: 'flex', alignItems: 'center', gap: 4 }} onClick={()=>handleLike(post.id)}>
                              <span role="img" aria-label="like">❤️</span>
                              <span style={{fontSize:18}}>{Array.isArray(post.likes)?post.likes.length:0}</span>
                            </span>
                            <span style={{ color: '#1976d2', fontWeight: 700, fontSize: 22, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span role="img" aria-label="comment">💬</span>
                              <span style={{fontSize:18}}>{Array.isArray(post.comments)?post.comments.length:0}</span>
                            </span>
                          </div>
                          {/* 댓글 */}
                          <div style={{ marginTop: 4 }}>
                            {Array.isArray(post.comments) && post.comments.map((c,i)=>(
                              <div key={i} style={{ fontSize: 13, color: '#1976d2', background:'#fff', borderRadius:8, padding:'3px 8px', marginBottom:2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{c.text}</span>
                                {isTeacherAuthed && (
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button onClick={() => handleEditComment(post.id, c)} style={{ background:'#e0f7fa', color:'#1976d2', border:'none', borderRadius:4, padding:'2px 8px', fontWeight:600, fontSize:12, cursor:'pointer' }}>수정</button>
                                    <button onClick={() => handleDeleteComment(post.id, c.ts)} style={{ background:'#ffe4ec', color:'#d72660', border:'none', borderRadius:4, padding:'2px 8px', fontWeight:600, fontSize:12, cursor:'pointer' }}>삭제</button>
                                  </div>
                                )}
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: 0, marginTop: 2, alignItems: 'center', background: '#e3f2fd', borderRadius: 8 }}>
                              <input type="text" placeholder="댓글 추가" style={{ flex: 1, borderRadius: '8px 0 0 8px', border: '1.5px solid #e0f7fa', borderRight: 'none', padding: '10px 12px', fontSize: 13, background: '#fff', height: 36, boxSizing: 'border-box' }} value={commentInputs[post.id]||''} onChange={e=>setCommentInputs(inputs=>({...inputs, [post.id]:e.target.value}))} />
                              <button onClick={()=>{if((commentInputs[post.id]||'').trim()){handleAddComment(post.id, commentInputs[post.id]); setCommentInputs(inputs=>({...inputs, [post.id]:''}));}}} style={{ background:'#1976d2', color:'#fff', border:'none', borderRadius:'0 8px 8px 0', padding:'0 12px', fontWeight:700, fontSize:12, cursor:'pointer', transition:'all 0.2s', height: 36, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>제출</button>
                            </div>
                          </div>
                        </div>
                        {/* 삭제 버튼: 본인 글만 노출 */}
                        {(isTeacherAuthed || (studentId && post.authorId === studentId)) && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            <button onClick={() => handleEditPost(post.id)} style={{ background:'#e0f7fa', color:'#1976d2', border:'none', borderRadius:8, padding:'4px 14px', fontWeight:600, fontSize:14, cursor:'pointer', boxShadow:'0 1px 4px #b2ebf240' }}>수정</button>
                            <button onClick={() => handleDeletePost(post.id)} style={{ background:'#ffe4ec', color:'#d72660', border:'none', borderRadius:8, padding:'4px 14px', fontWeight:600, fontSize:14, cursor:'pointer', boxShadow:'0 1px 4px #f8bbd0a0' }}>삭제</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* 빈 칸 채우기 (4열 기준) */}
                {colPosts.length % 4 !== 0 && Array.from({length: 4 - (colPosts.length % 4)}).map((_,i)=>(<div key={i} />))}
              </div>
            </div>
          );
        })}
      </div>
      {/* 하단 + 버튼: 칼럼 유무와 상관없이 항상 노출 */}
      <div style={{ position: 'fixed', left: '50%', bottom: 40, transform: 'translateX(-50%)', zIndex: 2000 }}>
        <button onClick={()=>{setSelectedColumnKey('');setShowPostModal(true);}} style={{ width: 64, height: 64, borderRadius: '50%', background: '#e0f7fa', color: '#1976d2', border: 'none', boxShadow: '0 4px 16px #b2ebf240', fontSize: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
          <AddIcon fontSize="inherit" />
        </button>
      </div>
      {/* 칼럼 선택 모달(글쓰기용) */}
      {showColumnModal==='select' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 20, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 18, color: '#1976d2' }}>어느 칼럼에 글을 쓸까요?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {board.columns.map(col => (
                <button key={col.key} onClick={()=>{setSelectedColumnKey(col.key);setShowPostModal(true);setShowColumnModal(false);}} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '10px 0', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>{col.title}</button>
              ))}
            </div>
            <div style={{ marginTop: 18 }}>
              <button onClick={()=>setShowColumnModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#f7faf7', color: '#888', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
            </div>
          </div>
        </div>
      )}
      {/* 글쓰기 모달 */}
      {showPostModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 24, minWidth: 340, maxWidth: 420, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 18, color: '#1976d2' }}>게시글 작성</div>
            <input value={postTitle} onChange={e => setPostTitle(e.target.value)} maxLength={30} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 10, fontSize: 16, outline: 'none', marginBottom: 12, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', fontWeight: 600 }} placeholder="제목을 입력하세요" />
            <textarea value={postContent} onChange={e => setPostContent(e.target.value)} rows={4} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 10, fontSize: 15, outline: 'none', marginBottom: 12, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', resize: 'vertical' }} placeholder="내용을 입력하세요" />
            <select 
              value={selectedAuthor} 
              onChange={(e) => setSelectedAuthor(e.target.value)}
              style={{ 
                width: '100%', 
                borderRadius: 14, 
                border: '2px solid #e0f7fa', 
                padding: 10, 
                fontSize: 16, 
                outline: 'none', 
                marginBottom: 12, 
                background: '#f7faf7', 
                color: '#222', 
                transition: 'border 0.2s', 
                boxSizing: 'border-box',
                fontWeight: 600 
              }}
            >
              <option value="">작성자 선택</option>
              <option value="teacher">선생님</option>
              {studentsSnapshot?.docs.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.data().name}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              <button onClick={()=>setShowPostModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
              <button 
                onClick={handleAddPostModal} 
                disabled={uploading || ((!postTitle.trim() && !postContent.trim()) || !selectedAuthor)} 
                style={{
                  fontWeight: 700,
                  borderRadius: 999,
                  background: (postTitle.trim()||postContent.trim()) && selectedAuthor && !uploading ? '#1976d2' : '#e0f7fa',
                  color: (postTitle.trim()||postContent.trim()) && selectedAuthor && !uploading ? '#fff' : '#90caf9',
                  border: (postTitle.trim()||postContent.trim()) && selectedAuthor && !uploading ? '2px solid #1976d2' : '2px solid #e0f7fa',
                  padding: '8px 32px',
                  fontSize: 15,
                  boxShadow: '0 2px 8px #b2ebf240',
                  opacity: (postTitle.trim()||postContent.trim()) && selectedAuthor && !uploading ? 1 : 0.5,
                  cursor: (postTitle.trim()||postContent.trim()) && selectedAuthor && !uploading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
              >
                {uploading ? '업로드 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 칼럼 생성 모달 */}
      {showColumnModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 20, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 18, color: '#1976d2' }}>칼럼 이름 입력</div>
            <input value={newColumnTitle} onChange={e => setNewColumnTitle(e.target.value)} maxLength={30} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 18, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', textAlign: 'center', fontWeight: 600 }} placeholder="예: 오늘의 감정" />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              <button onClick={() => setShowColumnModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
              <button onClick={handleAddColumn} disabled={!newColumnTitle.trim()} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', opacity: newColumnTitle.trim() ? 1 : 0.5, cursor: newColumnTitle.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>생성</button>
            </div>
          </div>
        </div>
      )}
      {/* 비밀번호 입력 모달 */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 20, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 18, color: '#1976d2' }}>비밀번호를 입력하세요</div>
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 18, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', textAlign: 'center', fontWeight: 600 }} placeholder="비밀번호" />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              <button onClick={() => setShowPasswordModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
              <button onClick={handlePasswordConfirm} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', transition: 'all 0.2s' }}>확인</button>
            </div>
          </div>
        </div>
      )}
      {/* 교사 인증 모달 */}
      {showTeacherAuthModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 20, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 18, color: '#1976d2' }}>교사 비밀번호 입력</div>
            <input type="password" value={teacherAuthInput} onChange={e => setTeacherAuthInput(e.target.value)} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 12, fontSize: 16, outline: 'none', marginBottom: 18, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', textAlign: 'center', fontWeight: 600 }} placeholder="비밀번호" />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              <button onClick={() => setShowTeacherAuthModal(false)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
              <button onClick={handleTeacherAuth} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', transition: 'all 0.2s' }}>확인</button>
            </div>
          </div>
        </div>
      )}
      {/* 게시글 수정 모달 */}
      {editingPost && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 24, minWidth: 340, maxWidth: 420, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 18, color: '#1976d2' }}>게시글 수정</div>
            <input value={editPostTitle} onChange={e => setEditPostTitle(e.target.value)} maxLength={30} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 10, fontSize: 16, outline: 'none', marginBottom: 12, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', fontWeight: 600 }} placeholder="제목을 입력하세요" />
            <textarea value={editPostContent} onChange={e => setEditPostContent(e.target.value)} rows={4} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 10, fontSize: 15, outline: 'none', marginBottom: 12, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', resize: 'vertical' }} placeholder="내용을 입력하세요" />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              <button onClick={() => setEditingPost(null)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
              <button onClick={handleEditPostSubmit} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', transition: 'all 0.2s' }}>수정</button>
            </div>
          </div>
        </div>
      )}
      {/* 댓글 수정 모달 */}
      {editingComment && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 24, minWidth: 340, maxWidth: 420, boxShadow: '0 4px 32px #b2ebf240', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 18, color: '#1976d2' }}>댓글 수정</div>
            <textarea value={editCommentText} onChange={e => setEditCommentText(e.target.value)} rows={2} style={{ width: '100%', borderRadius: 14, border: '2px solid #e0f7fa', padding: 10, fontSize: 15, outline: 'none', marginBottom: 12, background: '#f7faf7', color: '#222', transition: 'border 0.2s', boxSizing: 'border-box', resize: 'vertical' }} placeholder="댓글을 입력하세요" />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              <button onClick={() => setEditingComment(null)} style={{ fontWeight: 600, borderRadius: 999, background: '#ffe4ec', color: '#d72660', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #f8bbd0a0', cursor: 'pointer', transition: 'all 0.2s' }}>취소</button>
              <button onClick={handleEditCommentSubmit} style={{ fontWeight: 600, borderRadius: 999, background: '#e0f7fa', color: '#1976d2', border: 'none', padding: '8px 32px', fontSize: 15, boxShadow: '0 2px 8px #b2ebf240', transition: 'all 0.2s' }}>수정</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BoardPage; 