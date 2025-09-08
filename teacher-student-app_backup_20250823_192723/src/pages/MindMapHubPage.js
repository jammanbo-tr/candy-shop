import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Container, Paper, Grid, Card, CardContent, Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import SchoolIcon from '@mui/icons-material/School';
import AddIcon from '@mui/icons-material/Add';
// Removed icon imports for card buttons (using native button styling)
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';

const MindMapHubPage = () => {
  const [className, setClassName] = useState('');
  const [existingClasses, setExistingClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();

  // 기존 학급 목록 불러오기
  React.useEffect(() => {
    loadExistingClasses();
  }, []);

  const loadExistingClasses = async () => {
    try {
      const classesRef = collection(db, 'mindmap_classes');
      const querySnapshot = await getDocs(classesRef);
      const classes = [];
      querySnapshot.forEach((doc) => {
        classes.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setExistingClasses(classes);
    } catch (error) {
      console.error('학급 목록 불러오기 실패:', error);
    }
  };

  const handleCreateClass = async () => {
    if (!className.trim()) {
      alert('학급명을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 중복 학급명 확인
      const existingClass = existingClasses.find(c => c.name === className.trim());
      if (existingClass) {
        alert('이미 존재하는 학급명입니다.');
        setLoading(false);
        return;
      }

      // 새 학급 생성
      const classData = {
        name: className.trim(),
        createdAt: new Date(),
        studentCount: 0,
        responseCount: 0
      };

      const docRef = await addDoc(collection(db, 'mindmap_classes'), classData);
      
      // 생성된 학급으로 이동
      navigate(`/korean-history-mindmap/${docRef.id}`);
      
    } catch (error) {
      console.error('학급 생성 실패:', error);
      alert('학급 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = (classId) => {
    navigate(`/korean-history-mindmap/${classId}`);
  };

  // 링크 복사 함수
  const handleCopyLink = async (classId) => {
    const link = `${window.location.origin}/korean-history-mindmap/${classId}`;
    try {
      await navigator.clipboard.writeText(link);
      setSnackbar({
        open: true,
        message: '마인드맵 링크가 클립보드에 복사되었습니다!',
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
    const link = `${window.location.origin}/korean-history-mindmap/${classId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(link)}`;
    window.open(qrUrl, '_blank');
  };

  // URL 단축하기 (jamb.kr 연결)
  const handleShortenUrl = () => {
    window.open('https://jamb.kr', '_blank');
  };

  // 모든 학급의 기존 데이터를 단일 페이지에 백필
  const handleBackfillToSingle = async () => {
    if (!window.confirm('모든 학급의 기존 응답을 단일 페이지(/korean-history-mindmap)에도 누적할까요?')) return;
    try {
      const classesRef = collection(db, 'mindmap_classes');
      const classesSnap = await getDocs(classesRef);
      let merged = {};
      for (const cls of classesSnap.docs) {
        const respRef = doc(db, 'mindmap_classes', cls.id, 'responses', 'data');
        const respSnap = await getDoc(respRef);
        if (respSnap.exists()) {
          const data = respSnap.data() || {};
          Object.keys(data).forEach(topic => {
            const arr = Array.isArray(data[topic]) ? data[topic] : [];
            if (!merged[topic]) merged[topic] = [];
            merged[topic] = [...merged[topic], ...arr];
          });
        }
      }
      const singleRef = doc(db, 'koreanHistoryMindMap', 'responses');
      const singleSnap = await getDoc(singleRef);
      const current = singleSnap.exists() ? singleSnap.data() : {};
      Object.keys(merged).forEach(topic => {
        merged[topic] = [...(current[topic] || []), ...merged[topic]];
      });
      await setDoc(singleRef, merged, { merge: true });
      setSnackbar({ open: true, message: '단일 페이지에 기존 데이터 누적 완료', severity: 'success' });
    } catch (e) {
      console.error('백필 실패:', e);
      setSnackbar({ open: true, message: '백필 중 오류가 발생했습니다', severity: 'error' });
    }
  };

  // 스낵바 닫기
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // 학급 삭제 함수
  const handleDeleteClass = async (classId) => {
    if (window.confirm('해당 학급을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteDoc(doc(db, 'mindmap_classes', classId));
        setSnackbar({
          open: true,
          message: '학급이 삭제되었습니다.',
          severity: 'success'
        });
        loadExistingClasses(); // 목록 새로고침
      } catch (error) {
        console.error('학급 삭제 실패:', error);
        setSnackbar({
          open: true,
          message: '학급 삭제에 실패했습니다.',
          severity: 'error'
        });
      }
    }
  };

  // 테스트 학급들 일괄 삭제 함수
  const handleDeleteTestClasses = async () => {
    if (window.confirm('테스트 학급들(5-9, 잠만보반, 새우반)을 모두 삭제하시겠습니까?')) {
      try {
        const testClassNames = ['5-9', '잠만보반', '새우반'];
        const classesToDelete = existingClasses.filter(cls => 
          testClassNames.includes(cls.name)
        );
        
        for (const cls of classesToDelete) {
          await deleteDoc(doc(db, 'mindmap_classes', cls.id));
        }
        
        setSnackbar({
          open: true,
          message: `${classesToDelete.length}개의 테스트 학급이 삭제되었습니다.`,
          severity: 'success'
        });
        
        loadExistingClasses(); // 목록 새로고침
      } catch (error) {
        console.error('테스트 학급 삭제 실패:', error);
        setSnackbar({
          open: true,
          message: '테스트 학급 삭제에 실패했습니다.',
          severity: 'error'
        });
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ 
      py: 4,
      background: `
        linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(240, 248, 255, 0.3) 100%),
        url('/mindmap.png') center/cover no-repeat
      `,
      minHeight: '100vh',
      borderRadius: '0',
      position: 'relative'
    }}>
      <Box textAlign="center" mb={6}>
        <SchoolIcon sx={{ fontSize: 80, color: '#1976d2', mb: 2 }} />
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          한국사 마인드맵 허브
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          각 반별로 독립적인 한국사 마인드맵을 만들어보세요
        </Typography>
        
        {/* 테스트 학급 삭제 버튼 */}
        {existingClasses.some(cls => ['5-9', '잠만보반', '새우반'].includes(cls.name)) && (
          <Box sx={{ mb: 3 }}>
            <Button
              variant="outlined"
              color="warning"
              onClick={handleDeleteTestClasses}
              startIcon={<DeleteIcon />}
              sx={{ 
                borderRadius: '20px',
                borderColor: '#ff9800',
                color: '#ff9800',
                '&:hover': {
                  borderColor: '#f57c00',
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                }
              }}
            >
              테스트 학급들 삭제
            </Button>
          </Box>
        )}
      </Box>

      {/* 새 학급 생성 */}
      <Paper elevation={3} sx={{ p: 4, mb: 6, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ color: 'white', fontWeight: 'bold', mb: 3 }}>
          🆕 새 학급 마인드맵 생성
        </Typography>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="학급명 입력"
            variant="outlined"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="예: 3학년 1반, 6학년 2반"
            sx={{ 
              minWidth: 300,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                '&:hover fieldset': {
                  borderColor: 'white',
                },
              }
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateClass()}
          />
          <Button
            variant="contained"
            size="large"
            onClick={handleCreateClass}
            disabled={loading || !className.trim()}
            startIcon={<AddIcon />}
            sx={{ 
              backgroundColor: 'white', 
              color: '#667eea',
              '&:hover': {
                backgroundColor: '#f5f5f5',
              },
              px: 4,
              py: 1.5
            }}
          >
            {loading ? '생성 중...' : '학급 생성'}
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={handleShortenUrl}
            startIcon={<LinkIcon />}
            sx={{ 
              borderColor: 'rgba(255,255,255,0.5)',
              color: 'white',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255,255,255,0.1)',
              },
              px: 4,
              py: 1.5
            }}
          >
            URL단축하기
          </Button>
        </Box>
        <Typography variant="body2" sx={{ color: 'white', mt: 2, opacity: 0.9 }}>
          💡 학급명을 입력하고 생성하면 고유한 마인드맵 링크가 만들어집니다.
        </Typography>
      </Paper>

      {/* 기존 데이터 단일 페이지 백필 버튼 */}
      <Box sx={{ mt: 2, mb: 4 }}>
        <Button variant="outlined" onClick={handleBackfillToSingle} sx={{ borderRadius: '20px' }}>
          기존 학급 데이터 단일 페이지로 누적
        </Button>
      </Box>

      {/* 기존 학급 목록 */}
      <Box>
        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold', mb: 3, color: '#333' }}>
          📚 기존 학급 마인드맵
        </Typography>
        
        {existingClasses.length === 0 ? (
          <Paper elevation={1} sx={{ p: 4, textAlign: 'center', background: '#f8f9fa' }}>
            <Typography variant="h6" color="text.secondary">
              아직 생성된 학급이 없습니다.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              위에서 새 학급을 생성해보세요!
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {existingClasses.map((classItem) => (
              <Grid item xs={12} sm={6} md={4} key={classItem.id}>
                <Card elevation={3} sx={{ 
                  aspectRatio: '1/1',
                  borderRadius: '20px',
                  transition: 'all 0.3s ease',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 249, 250, 0.9) 100%)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  backdropFilter: 'blur(10px)',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                    border: '1px solid rgba(25, 118, 210, 0.3)',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 249, 250, 0.95) 100%)',
                  }
                }}>
                  <CardContent sx={{
                    pb: 2,
                    px: 3,
                    pt: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    gap: 1.5
                  }}>
                    <Box>
                      <Typography variant="h5" component="h3" gutterBottom sx={{ 
                        fontWeight: 'bold', 
                        color: '#1976d2',
                        mb: 2,
                        textAlign: 'center',
                        fontSize: '1.4rem'
                      }}>
                        {classItem.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        mb: 1,
                        textAlign: 'center',
                        opacity: 0.7,
                        fontSize: '0.9rem'
                      }}>
                        생성일: {classItem.createdAt?.toDate?.()?.toLocaleDateString() || '날짜 정보 없음'}
                      </Typography>
                    </Box>

                    {/* 버튼 영역 - 카드 내부 하단 정렬 */}
                    <div style={{ padding: '0 4px 0 4px', width: '100%' }}>
                      <button
                        onClick={() => handleJoinClass(classItem.id)}
                        style={{
                          width: '100%',
                          height: '48px',
                          marginTop: '0px',
                          marginBottom: '6px',
                          background: '#2259d6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '24px',
                          fontSize: '18px',
                          fontWeight: 700,
                          letterSpacing: '-0.3px',
                          boxShadow: '0 6px 16px rgba(34, 89, 214, 0.3)',
                          cursor: 'pointer'
                        }}
                      >
                        마인드맵 입장
                      </button>

                      <button
                        onClick={() => handleCopyLink(classItem.id)}
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
                          cursor: 'pointer'
                        }}
                      >
                        링크 복사
                      </button>

                      <button
                        onClick={() => handleOpenQr(classItem.id)}
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
                          cursor: 'pointer'
                        }}
                      >
                        QR 코드
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* 사용법 안내 */}
      <Paper elevation={2} sx={{ 
        p: 4, 
        mt: 6, 
        background: 'linear-gradient(135deg, rgba(248, 249, 250, 0.9) 0%, rgba(255, 255, 255, 0.9) 100%)',
        borderRadius: '20px',
        border: '1px solid rgba(0,0,0,0.05)',
        backdropFilter: 'blur(10px)'
      }}>
        <Typography variant="h5" component="h3" gutterBottom sx={{ 
          fontWeight: 'bold', 
          color: '#333', 
          mb: 4,
          textAlign: 'center',
          fontSize: '1.5rem'
        }}>
          📖 사용법
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          gap: 3, 
          justifyContent: 'space-between',
          alignItems: 'stretch'
        }}>
          <Box sx={{ 
            flex: 1, 
            textAlign: 'center', 
            p: 3,
            background: 'rgba(255,255,255,0.8)',
            borderRadius: '16px',
            border: '1px solid rgba(25, 118, 210, 0.15)',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(8px)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 24px rgba(25, 118, 210, 0.2)',
              border: '1px solid rgba(25, 118, 210, 0.25)',
              background: 'rgba(255,255,255,0.9)',
            }
          }}>
            <Typography variant="h2" sx={{ mb: 2, color: '#1976d2', fontSize: '2.5rem' }}>1️⃣</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#333', fontSize: '1.1rem' }}>
              학급명 입력
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, fontSize: '0.9rem' }}>
              고유한 학급명을 입력하여 새로운 마인드맵을 생성합니다.
            </Typography>
          </Box>
          <Box sx={{ 
            flex: 1, 
            textAlign: 'center', 
            p: 3,
            background: 'rgba(255,255,255,0.8)',
            borderRadius: '16px',
            border: '1px solid rgba(25, 118, 210, 0.15)',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(8px)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 24px rgba(25, 118, 210, 0.2)',
              border: '1px solid rgba(25, 118, 210, 0.25)',
              background: 'rgba(255,255,255,0.9)',
            }
          }}>
            <Typography variant="h2" sx={{ mb: 2, color: '#1976d2', fontSize: '2.5rem' }}>2️⃣</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#333', fontSize: '1.1rem' }}>
              마인드맵 생성
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, fontSize: '0.9rem' }}>
              각 반별로 독립적인 한국사 마인드맵이 자동으로 생성됩니다.
            </Typography>
          </Box>
          <Box sx={{ 
            flex: 1, 
            textAlign: 'center', 
            p: 3,
            background: 'rgba(255,255,255,0.8)',
            borderRadius: '16px',
            border: '1px solid rgba(25, 118, 210, 0.15)',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(8px)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 24px rgba(25, 118, 210, 0.2)',
              border: '1px solid rgba(25, 118, 210, 0.25)',
              background: 'rgba(255,255,255,0.9)',
            }
          }}>
            <Typography variant="h2" sx={{ mb: 2, color: '#1976d2', fontSize: '2.5rem' }}>3️⃣</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#333', fontSize: '1.1rem' }}>
              학습 진행
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, fontSize: '0.9rem' }}>
              학생들이 각자 반의 마인드맵에 응답하고 키워드를 추가합니다.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MindMapHubPage;
