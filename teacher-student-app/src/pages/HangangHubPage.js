import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const HangangHubPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // 클래스 목록 실시간 로드
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'hangang-classes'), (snapshot) => {
      const classData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClasses(classData.sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => unsubscribe();
  }, []);

  // 스낵바 자동 닫기
  useEffect(() => {
    if (snackbar.open) {
      const timer = setTimeout(() => {
        handleCloseSnackbar();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [snackbar.open]);

  // 새 클래스 생성
  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'hangang-classes'), {
        name: newClassName.trim(),
        createdAt: Date.now(),
        createdBy: user?.email || 'anonymous'
      });
      
      setNewClassName('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('클래스 생성 오류:', error);
      alert('클래스 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 클래스 삭제
  const handleDeleteClass = async (classId) => {
    if (!window.confirm('정말로 이 클래스를 삭제하시겠습니까?')) return;
    
    try {
      await deleteDoc(doc(db, 'hangang-classes', classId));
    } catch (error) {
      console.error('클래스 삭제 오류:', error);
      alert('클래스 삭제 중 오류가 발생했습니다.');
    }
  };

  // 한강 탐구 입장 함수
  const handleJoinClass = (classId) => {
    navigate(`/hangang/${classId}`);
  };

  // 링크 복사 함수
  const handleCopyLink = async (classId) => {
    const link = `${window.location.origin}/hangang/${classId}`;
    try {
      await navigator.clipboard.writeText(link);
      setSnackbar({
        open: true,
        message: '한강 탐구 링크가 클립보드에 복사되었습니다!',
        severity: 'success'
      });
    } catch (error) {
      console.error('링크 복사 실패:', error);
      setSnackbar({
        open: true,
        message: '링크 복사에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // QR 코드 열기 (새 탭)
  const handleOpenQr = (classId) => {
    const link = `${window.location.origin}/hangang/${classId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(link)}`;
    window.open(qrUrl, '_blank');
  };

  // 스낵바 닫기
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `
        linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(240, 248, 255, 0.1) 100%),
        url('/hangang_BG.gif') center/cover no-repeat
      `,
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* 헤더 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '30px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
        }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            color: '#2c3e50',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '15px'
          }}>
            🏞️ 한강 가치 탐구 허브
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#64748b',
            margin: '0'
          }}>
            반별 한강 가치 탐구 활동을 관리하세요
          </p>
        </div>

        {/* 새 클래스 생성 버튼 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '25px',
          marginBottom: '30px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
        }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
              border: 'none',
              borderRadius: '15px',
              padding: '15px 30px',
              color: 'white',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(34, 197, 94, 0.4)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '0 auto'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 35px rgba(34, 197, 94, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 25px rgba(34, 197, 94, 0.4)';
            }}
          >
            ➕ 새 반 만들기
          </button>
        </div>

        {/* 클래스 목록 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '25px'
        }}>
          {classes.map((classData) => (
            <div
              key={classData.id}
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '20px',
                padding: '25px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                border: '2px solid transparent'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-5px)';
                e.target.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
                e.target.style.borderColor = '#667eea';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
                e.target.style.borderColor = 'transparent';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '15px'
              }}>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#2c3e50',
                  margin: '0',
                  flex: 1
                }}>
                  {classData.name}
                </h3>
{/* 삭제 기능 임시 비활성화
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClass(classData.id);
                  }}
                  style={{
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#dc2626';
                    e.target.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#ef4444';
                    e.target.style.transform = 'scale(1)';
                  }}
                  title="클래스 삭제"
                >
                  🗑️
                </button>
                */}
              </div>
              
              <div style={{
                fontSize: '14px',
                color: '#64748b',
                marginBottom: '20px'
              }}>
                생성일: {new Date(classData.createdAt).toLocaleDateString('ko-KR')}
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                borderRadius: '12px',
                padding: '15px',
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#0ea5e9',
                  marginBottom: '8px'
                }}>
                  🏞️ 한강 가치 탐구
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#64748b'
                }}>
                  과거와 현재의 한강 가치를 비교 분석
                </div>
              </div>

              {/* 기능 버튼들 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJoinClass(classData.id);
                  }}
                  style={{
                    width: '100%',
                    height: '48px',
                    marginBottom: '6px',
                    background: '#2259d6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '24px',
                    fontSize: '18px',
                    fontWeight: 700,
                    letterSpacing: '-0.3px',
                    boxShadow: '0 6px 16px rgba(34, 89, 214, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 20px rgba(34, 89, 214, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 6px 16px rgba(34, 89, 214, 0.3)';
                  }}
                >
                  한강 탐구 입장
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyLink(classData.id);
                  }}
                  style={{
                    width: '100%',
                    height: '48px',
                    marginBottom: '6px',
                    background: '#2259d6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '24px',
                    fontSize: '18px',
                    fontWeight: 700,
                    letterSpacing: '-0.3px',
                    boxShadow: '0 6px 16px rgba(34, 89, 214, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 20px rgba(34, 89, 214, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 6px 16px rgba(34, 89, 214, 0.3)';
                  }}
                >
                  링크 복사
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenQr(classData.id);
                  }}
                  style={{
                    width: '100%',
                    height: '48px',
                    background: '#2259d6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '24px',
                    fontSize: '18px',
                    fontWeight: 700,
                    letterSpacing: '-0.3px',
                    boxShadow: '0 6px 16px rgba(34, 89, 214, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 20px rgba(34, 89, 214, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 6px 16px rgba(34, 89, 214, 0.3)';
                  }}
                >
                  QR 코드
                </button>
              </div>
            </div>
          ))}
        </div>

        {classes.length === 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            padding: '60px',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏞️</div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#64748b',
              marginBottom: '10px'
            }}>
              아직 생성된 반이 없습니다
            </h3>
            <p style={{
              fontSize: '16px',
              color: '#94a3b8'
            }}>
              새 반을 만들어 한강 가치 탐구 활동을 시작해보세요!
            </p>
          </div>
        )}
      </div>

      {/* 새 클래스 생성 모달 */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            width: '400px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#2c3e50',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              새 반 만들기
            </h2>
            
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="반 이름을 입력하세요 (예: 5학년 1반)"
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '10px',
                border: '2px solid #e9ecef',
                fontSize: '16px',
                marginBottom: '20px',
                boxSizing: 'border-box'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateClass();
                }
              }}
            />
            
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewClassName('');
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: '2px solid #e9ecef',
                  background: 'white',
                  color: '#64748b',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleCreateClass}
                disabled={loading || !newClassName.trim()}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: loading || !newClassName.trim() 
                    ? '#94a3b8' 
                    : 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading || !newClassName.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '생성 중...' : '생성하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 스낵바 알림 */}
      {snackbar.open && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: snackbar.severity === 'success' ? '#4caf50' : '#f44336',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          maxWidth: '400px',
          wordWrap: 'break-word'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{snackbar.message}</span>
            <button 
              onClick={handleCloseSnackbar}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                marginLeft: '16px'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HangangHubPage;