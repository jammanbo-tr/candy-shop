import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
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
  Inbox as InboxIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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

// 한국 시간 기준 날짜 문자열 생성 함수
const getKoreaDateString = (date = new Date()) => {
  const koreaTime = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  return koreaTime.toISOString().split('T')[0];
};

const EmotionDashboardModal = ({ isOpen, onClose, students }) => {
  const [emotionData, setEmotionData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [chartStartDate, setChartStartDate] = useState('');
  const [chartEndDate, setChartEndDate] = useState('');
  const [downloading, setDownloading] = useState(false);
  const dashboardRef = useRef(null);
  const dialogRef = useRef(null);
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    totalStudents: 0,
    submissionRate: 0,
    emotions: {},
    causes: {},
    averageIntensity: 0
  });

  useEffect(() => {
    if (isOpen) {
      // 한국 시간 기준으로 날짜 계산 (EmotionAttendanceModal과 동일하게)
      const todayString = getKoreaDateString();
      setSelectedDate(todayString);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 13);
      
      setChartEndDate(getKoreaDateString(endDate));
      setChartStartDate(getKoreaDateString(startDate));
      
      console.log('📅 감정출석부 대시보드 열림 - 날짜 설정:', {
        selectedDate: todayString,
        chartStartDate: getKoreaDateString(startDate),
        chartEndDate: getKoreaDateString(endDate)
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedDate) {
      loadEmotionData();
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    if (isOpen && chartStartDate && chartEndDate) {
      loadChartData();
    }
  }, [isOpen, chartStartDate, chartEndDate]);

  const loadEmotionData = async () => {
    setLoading(true);
    
    // 학생 목록 확인
    console.log('👥 전달받은 학생 목록:', {
      studentsCount: students?.length || 0,
      studentNames: students?.map(s => s.name || s.id) || [],
      selectedDate: selectedDate,
      studentsDetail: students // 전체 학생 정보 출력
    });
    
    try {
      // 1. 기존 구조에서 데이터 조회
      console.log('🔍 기존 구조에서 데이터 조회 시작:', {
        collection: 'emotionAttendance',
        selectedDate: selectedDate
      });
      
      const legacyQuery = query(
        collection(db, 'emotionAttendance'),
        where('date', '==', selectedDate),
        orderBy('timestamp', 'desc')
      );
      
      const legacySnapshot = await getDocs(legacyQuery);
      const legacyData = [];
      legacySnapshot.forEach((doc) => {
        legacyData.push({ id: doc.id, ...doc.data(), source: 'legacy' });
      });
      
      console.log('📊 기존 구조 조회 결과:', {
        count: legacyData.length,
        data: legacyData
      });

      // 2. 새로운 서브컬렉션 구조에서 데이터 조회
      const newData = [];
      if (students && students.length > 0) {
        console.log('🔍 새로운 구조에서 데이터 조회 시작:', {
          studentsCount: students.length,
          selectedDate: selectedDate
        });
        
        for (const student of students) {
          try {
            const emotionRef = doc(db, 'students', student.id, 'emotions', selectedDate);
            console.log(`📋 학생 ${student.name || student.id}의 감정출석 조회 시도:`, {
              path: `students/${student.id}/emotions/${selectedDate}`,
              studentId: student.id,
              studentName: student.name
            });
            
            const emotionDoc = await getDoc(emotionRef);
            if (emotionDoc.exists()) {
              const data = emotionDoc.data();
              console.log(`✅ 학생 ${student.name || student.id}의 감정출석 데이터 발견:`, data);
              newData.push({
                id: emotionDoc.id,
                studentId: student.id,
                studentName: student.name || student.id,
                grade: student.grade || '',
                class: student.class || '',
                ...data,
                source: 'new'
              });
            } else {
              console.log(`❌ 학생 ${student.name || student.id}의 감정출석 데이터 없음`);
            }
          } catch (error) {
            console.error(`학생 ${student.id}의 감정출석 조회 오류:`, error);
          }
        }
      } else {
        console.log('⚠️ 새로운 구조 조회 건너뜀: 학생 목록이 없음');
      }

      // 3. 두 데이터를 합치고 중복 제거 (같은 학생의 같은 날짜 데이터)
      const allData = [...legacyData];
      newData.forEach(newItem => {
        const isDuplicate = legacyData.some(legacyItem => 
          legacyItem.studentId === newItem.studentId && 
          legacyItem.date === newItem.date
        );
        if (!isDuplicate) {
          allData.push(newItem);
        }
      });

      // 시간순으로 정렬
      allData.sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || new Date(0);
        const timeB = b.timestamp?.toDate?.() || new Date(0);
        return timeB - timeA;
      });

      console.log(`📊 감정출석 데이터 로드 완료 (${selectedDate}):`, {
        legacyCount: legacyData.length,
        newCount: newData.length,
        totalCount: allData.length,
        legacyStudents: legacyData.map(item => item.studentName || item.studentId),
        newStudents: newData.map(item => item.studentName || item.studentId),
        allStudents: allData.map(item => ({ 
          name: item.studentName || item.studentId, 
          source: item.source,
          date: item.date,
          emotion: item.emotion
        }))
      });

      // 상세 디버깅: 각 학생별 데이터 확인
      console.log('🔍 상세 데이터 분석:');
      console.log('기존 구조 데이터:', legacyData.map(item => ({
        student: item.studentName || item.studentId,
        date: item.date,
        emotion: item.emotion,
        timestamp: item.timestamp?.toDate?.()?.toLocaleString('ko-KR')
      })));
      console.log('새 구조 데이터:', newData.map(item => ({
        student: item.studentName || item.studentId,
        date: item.date,
        emotion: item.emotion,
        timestamp: item.timestamp?.toDate?.()?.toLocaleString('ko-KR')
      })));
      
      setEmotionData(allData);
      calculateStats(allData);
    } catch (error) {
      console.error('감정출석 데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      // 1. 기존 구조에서 차트 데이터 조회
      const legacyQuery = query(
        collection(db, 'emotionAttendance'),
        orderBy('date', 'asc')
      );
      
      const legacySnapshot = await getDocs(legacyQuery);
      const legacyData = [];
      legacySnapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.date;
        if (date >= chartStartDate && date <= chartEndDate) {
          legacyData.push({ id: doc.id, ...data, source: 'legacy' });
        }
      });

      // 2. 새로운 서브컬렉션 구조에서 차트 데이터 조회
      const newData = [];
      if (students && students.length > 0) {
        for (const student of students) {
          try {
            const emotionsRef = collection(db, 'students', student.id, 'emotions');
            const emotionsSnapshot = await getDocs(emotionsRef);
            
            emotionsSnapshot.forEach((emotionDoc) => {
              const data = emotionDoc.data();
              const date = data.date;
              if (date && date >= chartStartDate && date <= chartEndDate) {
                newData.push({
                  id: emotionDoc.id,
                  studentId: student.id,
                  studentName: student.name || student.id,
                  ...data,
                  source: 'new'
                });
              }
            });
          } catch (error) {
            console.error(`학생 ${student.id}의 감정출석 차트 데이터 조회 오류:`, error);
          }
        }
      }

      // 3. 두 데이터를 합치고 중복 제거
      const allData = [...legacyData];
      newData.forEach(newItem => {
        const isDuplicate = legacyData.some(legacyItem => 
          legacyItem.studentId === newItem.studentId && 
          legacyItem.date === newItem.date
        );
        if (!isDuplicate) {
          allData.push(newItem);
        }
      });

      console.log(`📊 차트 데이터 로드 완료 (${chartStartDate} ~ ${chartEndDate}):`, {
        legacyCount: legacyData.length,
        newCount: newData.length,
        totalCount: allData.length
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
      // 한국 시간 기준으로 날짜 생성 (다른 부분과 통일)
      dates.push(getKoreaDateString(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const chartLabels = dates.map(date => {
      const d = new Date(date);
      return (d.getMonth() + 1) + '/' + d.getDate();
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

  const downloadAsImage = async () => {
    if (!dashboardRef.current || !dialogRef.current) return;
    
    setDownloading(true);
    
    // DialogContent의 원본 스타일 저장
    const originalOverflow = dashboardRef.current.style.overflow;
    const originalMaxHeight = dashboardRef.current.style.maxHeight;
    const originalHeight = dashboardRef.current.style.height;
    
    // Dialog Paper의 원본 스타일 저장
    const dialogPaper = dialogRef.current.querySelector('.MuiDialog-paper');
    const originalPaperMaxHeight = dialogPaper ? dialogPaper.style.maxHeight : '';
    const originalPaperHeight = dialogPaper ? dialogPaper.style.height : '';
    
    try {
      // Dialog Paper 스타일 조정 (모달 전체 높이 제한 해제)
      if (dialogPaper) {
        dialogPaper.style.maxHeight = 'none';
        dialogPaper.style.height = 'auto';
      }
      
      // DialogContent 스타일 조정 (콘텐츠 영역 스크롤 해제)
      dashboardRef.current.style.overflow = 'visible';
      dashboardRef.current.style.maxHeight = 'none';
      dashboardRef.current.style.height = 'auto';
      
      // 레이아웃 재계산을 위한 지연
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        height: dashboardRef.current.scrollHeight,
        width: dashboardRef.current.scrollWidth,
        scrollX: 0,
        scrollY: 0,
        windowWidth: dashboardRef.current.scrollWidth,
        windowHeight: dashboardRef.current.scrollHeight
      });
      
      const link = document.createElement('a');
      link.download = `감정출석부_대시보드_${selectedDate}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('이미지 다운로드 실패:', error);
      alert('이미지 다운로드에 실패했습니다.');
    } finally {
      // 원본 스타일 복원
      dashboardRef.current.style.overflow = originalOverflow;
      dashboardRef.current.style.maxHeight = originalMaxHeight;
      dashboardRef.current.style.height = originalHeight;
      
      if (dialogPaper) {
        dialogPaper.style.maxHeight = originalPaperMaxHeight;
        dialogPaper.style.height = originalPaperHeight;
      }
      
      setDownloading(false);
    }
  };

  const downloadAsPDF = async () => {
    if (!dashboardRef.current || !dialogRef.current) return;
    
    setDownloading(true);
    
    // DialogContent의 원본 스타일 저장
    const originalOverflow = dashboardRef.current.style.overflow;
    const originalMaxHeight = dashboardRef.current.style.maxHeight;
    const originalHeight = dashboardRef.current.style.height;
    
    // Dialog Paper의 원본 스타일 저장
    const dialogPaper = dialogRef.current.querySelector('.MuiDialog-paper');
    const originalPaperMaxHeight = dialogPaper ? dialogPaper.style.maxHeight : '';
    const originalPaperHeight = dialogPaper ? dialogPaper.style.height : '';
    
    try {
      // Dialog Paper 스타일 조정 (모달 전체 높이 제한 해제)
      if (dialogPaper) {
        dialogPaper.style.maxHeight = 'none';
        dialogPaper.style.height = 'auto';
      }
      
      // DialogContent 스타일 조정 (콘텐츠 영역 스크롤 해제)
      dashboardRef.current.style.overflow = 'visible';
      dashboardRef.current.style.maxHeight = 'none';
      dashboardRef.current.style.height = 'auto';
      
      // 레이아웃 재계산을 위한 지연
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        height: dashboardRef.current.scrollHeight,
        width: dashboardRef.current.scrollWidth,
        scrollX: 0,
        scrollY: 0,
        windowWidth: dashboardRef.current.scrollWidth,
        windowHeight: dashboardRef.current.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`감정출석부_대시보드_${selectedDate}.pdf`);
    } catch (error) {
      console.error('PDF 다운로드 실패:', error);
      alert('PDF 다운로드에 실패했습니다.');
    } finally {
      // 원본 스타일 복원
      dashboardRef.current.style.overflow = originalOverflow;
      dashboardRef.current.style.maxHeight = originalMaxHeight;
      dashboardRef.current.style.height = originalHeight;
      
      if (dialogPaper) {
        dialogPaper.style.maxHeight = originalPaperMaxHeight;
        dialogPaper.style.height = originalPaperHeight;
      }
      
      setDownloading(false);
    }
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
      ref={dialogRef}
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: '80vh',
          maxHeight: '90vh',
          zIndex: 10010,
          overflow: 'visible' // 스크롤 문제 해결
        }
      }}
      sx={{
        zIndex: 10010,
        '& .MuiBackdrop-root': {
          zIndex: 10008
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
          <Typography variant="h5" sx={{ 
            fontWeight: 600, 
            background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FFEAA7, #DDA0DD, #98D8C8)',
            backgroundSize: '300% 300%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'rainbow 3s ease-in-out infinite',
            '@keyframes rainbow': {
              '0%, 100%': { backgroundPosition: '0% 50%' },
              '50%': { backgroundPosition: '100% 50%' }
            }
          }}>
            🌈 감정출석부 대시보드
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ImageIcon />}
            onClick={downloadAsImage}
            disabled={downloading}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#4caf50',
              color: '#4caf50',
              '&:hover': {
                borderColor: '#388e3c',
                backgroundColor: '#e8f5e8'
              }
            }}
          >
            이미지
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PdfIcon />}
            onClick={downloadAsPDF}
            disabled={downloading}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#f44336',
              color: '#f44336',
              '&:hover': {
                borderColor: '#d32f2f',
                backgroundColor: '#ffebee'
              }
            }}
          >
            PDF
          </Button>
          <IconButton onClick={onClose} sx={{ color: '#999' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent ref={dashboardRef} sx={{ p: 3 }}>
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
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ 
                      textAlign: 'center', 
                      p: 3,
                      minHeight: 140,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      backgroundColor: '#e3f2fd',
                      border: '1px solid #1976d220',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }
                    }}>
                      <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>👥</Typography>
                      <Typography variant="h4" sx={{ 
                        fontWeight: 700, 
                        color: '#1976d2', 
                        mb: 0.5,
                        lineHeight: 1
                      }}>
                        {stats.totalStudents}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#1976d2',
                        fontWeight: 500,
                        fontSize: '0.9rem'
                      }}>
                        총 학생 수
                      </Typography>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ 
                      textAlign: 'center', 
                      p: 3,
                      minHeight: 140,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      backgroundColor: '#e8f5e8',
                      border: '1px solid #4caf5020',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }
                    }}>
                      <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>✅</Typography>
                      <Typography variant="h4" sx={{ 
                        fontWeight: 700, 
                        color: '#4caf50', 
                        mb: 0.5,
                        lineHeight: 1
                      }}>
                        {stats.totalSubmissions}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#4caf50',
                        fontWeight: 500,
                        fontSize: '0.9rem'
                      }}>
                        제출 완료
                      </Typography>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ 
                      textAlign: 'center', 
                      p: 3,
                      minHeight: 140,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      backgroundColor: '#fff3e0',
                      border: '1px solid #ff980020',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }
                    }}>
                      <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>📈</Typography>
                      <Typography variant="h4" sx={{ 
                        fontWeight: 700, 
                        color: '#ff9800', 
                        mb: 0.5,
                        lineHeight: 1
                      }}>
                        {stats.submissionRate}%
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#ff9800',
                        fontWeight: 500,
                        fontSize: '0.9rem'
                      }}>
                        제출률
                      </Typography>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ 
                      textAlign: 'center', 
                      p: 3,
                      minHeight: 140,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      backgroundColor: '#f3e5f5',
                      border: '1px solid #9c27b020',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }
                    }}>
                      <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>⭐</Typography>
                      <Typography variant="h4" sx={{ 
                        fontWeight: 700, 
                        color: '#9c27b0', 
                        mb: 0.5,
                        lineHeight: 1
                      }}>
                        {stats.averageIntensity}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#9c27b0',
                        fontWeight: 500,
                        fontSize: '0.9rem'
                      }}>
                        평균 강도
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>

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
                            minHeight: 120,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            backgroundColor: getEmotionColor(emotion) + '08',
                            border: '2px solid ' + getEmotionColor(emotion) + '30',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
                              backgroundColor: getEmotionColor(emotion) + '15'
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

        {!loading && emotionData.length > 0 && (
          <Card sx={{ mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <CheckCircleIcon sx={{ color: '#4caf50' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  제출 완료 ({emotionData.length}명)
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {emotionData.map((entry) => (
                  <Grid item xs={12} sm={6} md={4} key={entry.id}>
                    <Card sx={{ 
                      p: 2.5, 
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: '#ffffff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transform: 'translateY(-1px)'
                      }
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#333' }}>
                          {entry.studentName}
                        </Typography>
                        <Chip
                          icon={<span style={{ fontSize: '1.1rem' }}>{getEmotionIcon(entry.emotion)}</span>}
                          label={entry.emotion}
                          size="small"
                          sx={{
                            backgroundColor: getEmotionColor(entry.emotion) + '20',
                            color: getEmotionColor(entry.emotion),
                            fontWeight: 600,
                            fontSize: '0.8rem'
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          강도:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.3 }}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <img 
                              key={i}
                              src="/lv3.png" 
                              alt="레벨"
                              style={{ 
                                width: 16,
                                height: 16,
                                opacity: i < entry.intensity ? 1 : 0.2
                              }}
                            />
                          ))}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                          ({entry.intensity}/5)
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: entry.memo ? 1.5 : 0 }}>
                        <span style={{ fontWeight: 500 }}>원인:</span> {entry.cause}
                      </Typography>
                      {entry.memo && (
                        <Paper sx={{
                          p: 1.5,
                          backgroundColor: '#e3f2fd',
                          borderLeft: '3px solid #1976d2',
                          borderRadius: 1
                        }}>
                          <Typography variant="caption" sx={{ 
                            fontStyle: 'italic',
                            color: '#1565c0',
                            lineHeight: 1.4
                          }}>
                            "{entry.memo}"
                          </Typography>
                        </Paper>
                      )}
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

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

      <DialogActions sx={{ p: 3, borderTop: '1px solid #e0e0e0', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {downloading && (
            <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
              다운로드 중...
            </Typography>
          )}
        </Box>
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
