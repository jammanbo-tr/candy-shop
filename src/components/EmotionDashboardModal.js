import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  TextField,
  Chip,
  IconButton,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  Assessment as AssessmentIcon,
  EmojiEmotions as EmotionIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Inbox as InboxIcon
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const EmotionDashboardModal = ({ isOpen, onClose, students }) => {
  const [emotionData, setEmotionData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [chartStartDate, setChartStartDate] = useState('');
  const [chartEndDate, setChartEndDate] = useState('');
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    totalStudents: 0,
    submissionRate: 0,
    emotions: {},
    causes: {},
    averageIntensity: 0
  });

  // 오늘 날짜로 초기화
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      
      // 차트용 날짜 범위 설정 (최근 2주)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 13);
      
      setChartEndDate(endDate.toISOString().split('T')[0]);
      setChartStartDate(startDate.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  // 선택된 날짜의 감정출석 데이터 로드
  useEffect(() => {
    if (isOpen && selectedDate) {
      loadEmotionData();
    }
  }, [isOpen, selectedDate]);

  // 차트 데이터 로드
  useEffect(() => {
    if (isOpen && chartStartDate && chartEndDate) {
      loadChartData();
    }
  }, [isOpen, chartStartDate, chartEndDate]);

  const loadEmotionData = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'emotionAttendance'),
        where('date', '==', selectedDate),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      setEmotionData(data);
      calculateStats(data);
    } catch (error) {
      console.error('감정출석 데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      const q = query(
        collection(db, 'emotionAttendance'),
        orderBy('date', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const allData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.date;
        if (date >= chartStartDate && date <= chartEndDate) {
          allData.push({ id: doc.id, ...data });
        }
      });
      
      processChartData(allData);
    } catch (error) {
      console.error('차트 데이터 로드 오류:', error);
    }
  };

  const processChartData = (data) => {
    const dateGroups = {};
    data.forEach(entry => {
      const date = entry.date;
      if (!dateGroups[date]) {
        dateGroups[date] = { positive: 0, negative: 0, neutral: 0, total: 0 };
      }
      
      const emotion = entry.emotion;
      const positiveEmotions = ['기쁨', '평온함', '기대감', 'happy', 'calm', 'excited'];
      const negativeEmotions = ['슬픔', '화남', '불안', 'sad', 'angry', 'anxious'];
      
      if (positiveEmotions.includes(emotion)) {
        dateGroups[date].positive++;
      } else if (negativeEmotions.includes(emotion)) {
        dateGroups[date].negative++;
      } else {
        dateGroups[date].neutral++;
      }
      dateGroups[date].total++;
    });

    const dates = [];
    const currentDate = new Date(chartStartDate);
    const endDate = new Date(chartEndDate);
    
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const chartLabels = dates.map(date => {
      const d = new Date(date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    const positiveData = dates.map(date => dateGroups[date]?.positive || 0);
    const negativeData = dates.map(date => dateGroups[date]?.negative || 0);
    const neutralData = dates.map(date => dateGroups[date]?.neutral || 0);

    setChartData({
      labels: chartLabels,
      datasets: [
        {
          label: '긍정적',
          data: positiveData,
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#4caf50',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          fill: true,
          tension: 0.3
        },
        {
          label: '부정적',
          data: negativeData,
          borderColor: '#f44336',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#f44336',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          fill: true,
          tension: 0.3
        },
        {
          label: '중립적',
          data: neutralData,
          borderColor: '#ff9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#ff9800',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          fill: true,
          tension: 0.3
        }
      ]
    });
  };

  const calculateStats = (data) => {
    const studentCount = students?.length || 0;
    
    const stats = {
      totalSubmissions: data.length,
      totalStudents: studentCount,
      submissionRate: studentCount > 0 ? Math.round((data.length / studentCount) * 100) : 0,
      emotions: {},
      causes: {},
      averageIntensity: 0
    };

    let totalIntensity = 0;
    data.forEach(entry => {
      if (entry.emotion) {
        stats.emotions[entry.emotion] = (stats.emotions[entry.emotion] || 0) + 1;
      }
      
      if (entry.cause) {
        stats.causes[entry.cause] = (stats.causes[entry.cause] || 0) + 1;
      }
      
      if (entry.intensity) {
        totalIntensity += entry.intensity;
      }
    });

    if (data.length > 0) {
      stats.averageIntensity = (totalIntensity / data.length).toFixed(1);
    }

    setStats(stats);
  };

  const getEmotionIcon = (emotion) => {
    if (!emotion) return '😐';
    
    const emotionIcons = {
      'happy': '😊', 'sad': '😢', 'angry': '😠', 'anxious': '😰',
      'calm': '😌', 'bored': '😴', 'excited': '🤩', 'confused': '😕',
      '기쁨': '😊', '슬픔': '😢', '화남': '😠', '불안': '😰',
      '평온함': '😌', '지루함': '😴', '기대감': '🤩', '혼란': '😕'
    };
    return emotionIcons[emotion] || '😐';
  };

  const getEmotionColor = (emotion) => {
    const positiveEmotions = ['기쁨', '평온함', '기대감', 'happy', 'calm', 'excited'];
    const negativeEmotions = ['슬픔', '화남', '불안', 'sad', 'angry', 'anxious'];
    
    if (positiveEmotions.includes(emotion)) return '#4caf50';
    if (negativeEmotions.includes(emotion)) return '#f44336';
    return '#ff9800';
  };

  const getUnsubmittedStudents = () => {
    if (!students || !Array.isArray(students)) {
      return [];
    }
    const submittedStudentIds = emotionData.map(entry => entry.studentId);
    return students.filter(student => !submittedStudentIds.includes(student.id));
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          fontSize: 14,
          fontWeight: 600,
          color: '#333',
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#333',
        bodyColor: '#666',
        borderColor: '#e0e0e0',
        borderWidth: 1,
        cornerRadius: 8,
        titleFont: { size: 14, weight: 'normal' },
        bodyFont: { size: 13 },
        padding: 12,
        displayColors: true,
        usePointStyle: true
      }
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#999', font: { size: 12 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: '#f0f0f0', borderDash: [2, 2] },
        border: { display: false },
        ticks: { color: '#999', font: { size: 12 }, stepSize: 1 }
      }
    },
    elements: {
      point: { hoverBackgroundColor: '#ffffff', hoverBorderWidth: 3 }
    },
    interaction: { intersect: false, mode: 'index' }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: '80vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 2,
        borderBottom: '1px solid #e0e0e0'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon sx={{ color: '#1976d2', fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#333' }}>
            감정출석부 대시보드
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#999' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* 시간별 감정 변화 차트 */}
        <Card sx={{ mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingUpIcon sx={{ color: '#1976d2' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                시간별 감정 변화
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
              <TextField
                label="시작일"
                type="date"
                value={chartStartDate}
                onChange={(e) => setChartStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 150 }}
              />
              <TextField
                label="종료일"
                type="date"
                value={chartEndDate}
                onChange={(e) => setChartEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 150 }}
              />
            </Box>

            <Paper sx={{ p: 2, height: 300, backgroundColor: '#fafafa' }}>
              {chartData.labels && chartData.labels.length > 0 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#999'
                }}>
                  <Typography>선택한 기간에 데이터가 없습니다</Typography>
                </Box>
              )}
            </Paper>
          </CardContent>
        </Card>

        {/* 선택된 날짜 정보 대시보드 */}
        <Card sx={{ mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <CardContent>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 3,
              pb: 2,
              borderBottom: '1px solid #e0e0e0'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon sx={{ color: '#1976d2' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  상세 조회 날짜
                </Typography>
              </Box>
              <TextField
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                size="small"
                variant="outlined"
                sx={{ 
                  minWidth: 160,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                <Typography color="text.secondary" variant="h6">
                  데이터를 불러오는 중...
                </Typography>
              </Box>
            ) : (
              <>
                {/* 통계 요약 */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {[
                    { 
                      label: '총 학생 수', 
                      value: stats.totalStudents, 
                      icon: '👥', 
                      color: '#1976d2',
                      bgColor: '#e3f2fd'
                    },
                    { 
                      label: '제출 완료', 
                      value: stats.totalSubmissions, 
                      icon: '✅', 
                      color: '#4caf50',
                      bgColor: '#e8f5e8'
                    },
                    { 
                      label: '제출률', 
                      value: `${stats.submissionRate}%`, 
                      icon: '📈', 
                      color: '#ff9800',
                      bgColor: '#fff3e0'
                    },
                    { 
                      label: '평균 강도', 
                      value: stats.averageIntensity, 
                      icon: '⭐', 
                      color: '#9c27b0',
                      bgColor: '#f3e5f5'
                    }
                  ].map((stat, index) => (
                    <Grid item xs={6} sm={3} key={index}>
                      <Card sx={{ 
                        textAlign: 'center', 
                        p: 3,
                        height: 140,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        backgroundColor: stat.bgColor,
                        border: `1px solid ${stat.color}20`,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }
                      }}>
                        <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>
                          {stat.icon}
                        </Typography>
                        <Typography variant="h4" sx={{ 
                          fontWeight: 700, 
                          color: stat.color, 
                          mb: 0.5,
                          lineHeight: 1
                        }}>
                          {stat.value}
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          color: stat.color,
                          fontWeight: 500,
                          fontSize: '0.9rem'
                        }}>
                          {stat.label}
                        </Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {/* 감정 분포 */}
                {stats?.emotions && Object.keys(stats.emotions).length > 0 && (
                  <>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1, 
                      mb: 3,
                      pb: 1,
                      borderBottom: '1px solid #e0e0e0'
                    }}>
                      <EmotionIcon sx={{ color: '#1976d2' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        감정 분포
                      </Typography>
                    </Box>
                    <Grid container spacing={2}>
                      {Object.entries(stats.emotions).map(([emotion, count]) => (
                        <Grid item xs={6} sm={4} md={3} key={emotion}>
                          <Card sx={{ 
                            textAlign: 'center', 
                            p: 2.5,
                            height: 120,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            backgroundColor: `${getEmotionColor(emotion)}08`,
                            border: `2px solid ${getEmotionColor(emotion)}30`,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
                              backgroundColor: `${getEmotionColor(emotion)}15`
                            }
                          }}>
                            <Typography sx={{ fontSize: '2rem', mb: 1 }}>
                              {getEmotionIcon(emotion)}
                            </Typography>
                            <Typography variant="body1" sx={{ 
                              mb: 0.5, 
                              fontWeight: 600,
                              color: '#333'
                            }}>
                              {emotion}
                            </Typography>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 700, 
                              color: getEmotionColor(emotion)
                            }}>
                              {count}명
                            </Typography>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </>
                )}

                {/* 데이터 없음 상태 */}
                {emotionData.length === 0 && (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 6,
                    backgroundColor: '#f8f9fa',
                    borderRadius: 2,
                    border: '1px dashed #dee2e6'
                  }}>
                    <InboxIcon sx={{ fontSize: 64, color: '#adb5bd', mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#6c757d' }}>
                      선택한 날짜에 데이터가 없습니다
                    </Typography>
                    <Typography color="text.secondary">
                      {new Date(selectedDate).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}에 감정출석 기록이 없습니다.
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 제출 완료 학생들 */}
        {!loading && emotionData.length > 0 && (
          <Card sx={{ mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <CheckCircleIcon sx={{ color: '#4caf50' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  제출 완료 ({emotionData.length}명)
                </Typography>
              </Box>
              <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr', // 모바일: 1열
                  sm: 'repeat(2, 1fr)', // 태블릿: 2열
                  md: 'repeat(3, 1fr)', // 중형 화면: 3열
                  lg: 'repeat(4, 1fr)', // 대형 화면: 4열
                  xl: 'repeat(5, 1fr)' // 초대형 화면: 5열
                },
                gap: 2.5,
                width: '100%'
              }}>
                {emotionData.map((entry) => (
                    <Card sx={{ 
                      width: '100%',
                      height: {
                        xs: 280, // 모바일: 작은 높이
                        sm: 300, // 태블릿: 중간 높이
                        md: 320, // 중형 화면: 표준 높이
                        lg: 340, // 대형 화면: 큰 높이
                        xl: 360  // 초대형 화면: 최대 높이
                      },
                      p: { xs: 2, sm: 2.5 }, 
                      backgroundColor: '#ffffff',
                      border: `2px solid ${getEmotionColor(entry.emotion)}20`,
                      borderRadius: 3,
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        borderColor: `${getEmotionColor(entry.emotion)}60`,
                        boxShadow: `0 8px 25px ${getEmotionColor(entry.emotion)}20`,
                        transform: 'translateY(-3px)'
                      },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        backgroundColor: getEmotionColor(entry.emotion),
                        borderRadius: '3px 3px 0 0'
                      }
                    }}>
                      {/* 학생 이름과 감정 */}
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start', 
                        mb: 2.5,
                        pt: 1,
                        minHeight: 60
                      }}>
                        <Box sx={{ flex: 1, mr: 2 }}>
                          <Typography variant="h6" sx={{ 
                            fontWeight: 700, 
                            color: '#333',
                            fontSize: { xs: '1rem', sm: '1.1rem', lg: '1.2rem' },
                            mb: 0.5,
                            wordBreak: 'keep-all',
                            lineHeight: 1.3
                          }}>
                            {entry.studentName}
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            color: '#666',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                          }}>
                            {new Date(entry.timestamp?.toDate?.() || entry.timestamp).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 0.5,
                          flexShrink: 0
                        }}>
                          <Typography sx={{ 
                            fontSize: { xs: '1.8rem', sm: '2rem', md: '2.2rem', lg: '2.4rem' },
                            lineHeight: 1
                          }}>
                            {getEmotionIcon(entry.emotion)}
                          </Typography>
                          <Chip
                            label={entry.emotion}
                            size="small"
                            sx={{
                              backgroundColor: `${getEmotionColor(entry.emotion)}15`,
                              color: getEmotionColor(entry.emotion),
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              height: 24,
                              border: `1px solid ${getEmotionColor(entry.emotion)}30`,
                              maxWidth: 80,
                              '& .MuiChip-label': {
                                px: 1,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }
                            }}
                          />
                        </Box>
                      </Box>

                      {/* 감정 강도 */}
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        mb: 2,
                        p: 1.5,
                        backgroundColor: '#f8f9fa',
                        borderRadius: 2,
                        border: '1px solid #e9ecef',
                        flexShrink: 0
                      }}>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 600,
                          color: '#555',
                          mr: 1,
                          fontSize: '0.8rem'
                        }}>
                          강도
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.4, mx: 1 }}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Box
                              key={i}
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                backgroundColor: i < entry.intensity 
                                  ? getEmotionColor(entry.emotion) 
                                  : '#e0e0e0',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {i < entry.intensity && (
                                <Typography sx={{ 
                                  color: 'white', 
                                  fontSize: '0.6rem',
                                  fontWeight: 700
                                }}>
                                  ★
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 700,
                          color: getEmotionColor(entry.emotion),
                          ml: 1,
                          fontSize: '0.8rem'
                        }}>
                          {entry.intensity}/5
                        </Typography>
                      </Box>

                      {/* 원인 */}
                      <Box sx={{ mb: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 600,
                          color: '#333',
                          mb: 0.5,
                          fontSize: '0.85rem'
                        }}>
                          원인
                        </Typography>
                        <Box sx={{ 
                          flex: 1,
                          display: 'flex',
                          alignItems: 'flex-start'
                        }}>
                          <Typography variant="body2" sx={{ 
                            color: '#666',
                            backgroundColor: '#f5f5f5',
                            p: 1.2,
                            borderRadius: 1,
                            fontSize: '0.8rem',
                            lineHeight: 1.5,
                            wordBreak: 'keep-all',
                            overflowWrap: 'break-word',
                            whiteSpace: 'pre-wrap',
                            width: '100%',
                            maxHeight: '80px',
                            overflow: 'auto'
                          }}>
                            {entry.cause}
                          </Typography>
                        </Box>
                      </Box>

                      {/* 메모 */}
                      <Box sx={{ flexShrink: 0, height: entry.memo ? 'auto' : '60px', display: 'flex', flexDirection: 'column' }}>
                        {entry.memo ? (
                          <>
                            <Typography variant="body2" sx={{ 
                              fontWeight: 600,
                              color: '#333',
                              mb: 0.5,
                              fontSize: '0.85rem'
                            }}>
                              메모
                            </Typography>
                            <Paper sx={{
                              p: 1.2,
                              backgroundColor: `${getEmotionColor(entry.emotion)}08`,
                              borderLeft: `3px solid ${getEmotionColor(entry.emotion)}`,
                              borderRadius: 1,
                              boxShadow: 'none',
                              flex: 1,
                              maxHeight: '60px',
                              overflow: 'auto'
                            }}>
                              <Typography variant="caption" sx={{ 
                                fontStyle: 'italic',
                                color: '#555',
                                lineHeight: 1.5,
                                fontSize: '0.75rem',
                                wordBreak: 'keep-all',
                                overflowWrap: 'break-word',
                                whiteSpace: 'pre-wrap'
                              }}>
                                "{entry.memo}"
                              </Typography>
                            </Paper>
                          </>
                        ) : (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            height: '100%',
                            color: '#ccc',
                            fontSize: '0.8rem',
                            fontStyle: 'italic'
                          }}>
                            메모 없음
                          </Box>
                        )}
                      </Box>
                    </Card>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* 미제출 학생들 */}
        {!loading && getUnsubmittedStudents().length > 0 && (
          <Card sx={{ mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <ScheduleIcon sx={{ color: '#ff9800' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  미제출 ({getUnsubmittedStudents().length}명)
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                {getUnsubmittedStudents().map((student) => (
                  <Chip
                    key={student.id}
                    label={student.name}
                    variant="outlined"
                    sx={{
                      backgroundColor: '#fff3e0',
                      borderColor: '#ffb74d',
                      color: '#f57c00',
                      fontWeight: 500,
                      fontSize: '0.85rem',
                      height: 32
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid #e0e0e0' }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            borderRadius: 3,
            px: 4,
            py: 1.5,
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)'
          }}
        >
          완료
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmotionDashboardModal; 