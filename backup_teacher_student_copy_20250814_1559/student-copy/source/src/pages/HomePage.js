import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Button, 
  Box, 
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar
} from '@mui/material';
import { 
  School, 
  Person, 
  Dashboard, 
  Assignment 
} from '@mui/icons-material';

function HomePage() {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h2" component="h1" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
          🎓 스마트 학습 관리 시스템
        </Typography>
        <Typography variant="h5" component="h2" color="text.secondary" sx={{ mb: 4 }}>
          선생님과 학생을 위한 통합 학습 플랫폼
        </Typography>
      </Box>

      <Grid container spacing={4} sx={{ mt: 2 }}>
        {/* 선생님 카드 */}
        <Grid item xs={12} md={6}>
          <Card 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: 6
              }
            }}
          >
            <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  bgcolor: '#1976d2', 
                  mx: 'auto', 
                  mb: 2 
                }}
              >
                <School sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h4" component="h3" gutterBottom sx={{ color: '#1976d2' }}>
                선생님
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                학생 관리, 수업 계획, 성적 관리 등 
                교육 활동을 효율적으로 관리하세요
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  • 학생 정보 관리<br/>
                  • 게시판 운영<br/>
                  • 실시간 소통<br/>
                  • 학습 진도 추적
                </Typography>
              </Box>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
              <Button 
                variant="contained" 
                size="large"
                onClick={() => handleNavigation('/teacher')}
                sx={{ 
                  px: 4, 
                  py: 1.5,
                  fontSize: '1.1rem',
                  borderRadius: 2
                }}
              >
                선생님 페이지로 이동
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* 학생 카드 */}
        <Grid item xs={12} md={6}>
          <Card 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: 6
              }
            }}
          >
            <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  bgcolor: '#388e3c', 
                  mx: 'auto', 
                  mb: 2 
                }}
              >
                <Person sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h4" component="h3" gutterBottom sx={{ color: '#388e3c' }}>
                학생
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                개인별 학습 현황을 확인하고
                선생님과 소통하며 학습하세요
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  • 개인 학습 현황<br/>
                  • 과제 및 알림<br/>
                  • 선생님과 소통<br/>
                  • 학습 자료 접근
                </Typography>
              </Box>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
              <Button 
                variant="contained" 
                color="success"
                size="large"
                onClick={() => handleNavigation('/student')}
                sx={{ 
                  px: 4, 
                  py: 1.5,
                  fontSize: '1.1rem',
                  borderRadius: 2
                }}
              >
                학생 페이지로 이동
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* 추가 기능 섹션 */}
      <Box sx={{ mt: 8 }}>
        <Typography variant="h4" component="h2" textAlign="center" gutterBottom sx={{ mb: 4 }}>
          추가 기능
        </Typography>
                  <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Paper 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  transition: 'transform 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleNavigation('/boards')}
              >
                <Dashboard sx={{ fontSize: 48, color: '#ff9800', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  게시판 목록
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  모든 게시판을 한눈에 확인하세요
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Paper 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  transition: 'transform 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleNavigation('/attendance')}
              >
                <Assignment sx={{ fontSize: 48, color: '#4caf50', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  출석 관리
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  출석 현황을 관리하고 확인하세요
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Paper 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  transition: 'transform 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => alert('새로운 기능이 곧 추가될 예정입니다!')}
              >
                <Assignment sx={{ fontSize: 48, color: '#9c27b0', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  성적 관리
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  곧 출시 예정입니다
                </Typography>
              </Paper>
            </Grid>
          </Grid>
      </Box>

      {/* 푸터 */}
      <Box sx={{ mt: 8, textAlign: 'center', py: 3, borderTop: '1px solid #e0e0e0' }}>
        <Typography variant="body2" color="text.secondary">
          © 2025 스마트 학습 관리 시스템. 모든 권리 보유.
        </Typography>
      </Box>
    </Container>
  );
}

export default HomePage; 