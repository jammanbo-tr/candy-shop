import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  Paper,
  Tabs,
  Tab,
  Portal
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

  // 새로운 기능을 위한 상태들
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentEmotionPattern, setStudentEmotionPattern] = useState([]);
  const [similarStudents, setSimilarStudents] = useState([]);
  const [patternAnalyzing, setPatternAnalyzing] = useState(false);
  const [analysisRange, setAnalysisRange] = useState(7);
  const [individualStartDate, setIndividualStartDate] = useState('');
  const [individualEndDate, setIndividualEndDate] = useState('');
  const [useCustomDateRange, setUseCustomDateRange] = useState(false); // 7, 14, 21일
  const [aiAnalysisResults, setAiAnalysisResults] = useState([]);
  const [activeTab, setActiveTab] = useState(0); // 0: 전체 분석, 1: 개별 분석, 2: 감정 클러스터링, 3: 주간분석
  const [clusteringDate, setClusteringDate] = useState('');
  const [clusteringData, setClusteringData] = useState([]);
  const [clusteringAnalysis, setClusteringAnalysis] = useState(null);
  const [clusteringLoading, setClusteringLoading] = useState(false);
  const [hoveredStudent, setHoveredStudent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // 주간분석을 위한 상태들
  const [weeklyData, setWeeklyData] = useState([]);
  const [weeklyAverage, setWeeklyAverage] = useState([]);
  const [weeklyAnalysis, setWeeklyAnalysis] = useState('');
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState('');
  const [weeklyStats, setWeeklyStats] = useState({
    currentWeek: {},
    averageWeek: {},
    comparison: {}
  });

  // 무지개 테두리 애니메이션을 위한 글로벌 스타일
  useEffect(() => {
    if (!document.head.querySelector('[data-emotion-dashboard-styles]')) {
      const rainbowBorderStyle = document.createElement('style');
      rainbowBorderStyle.textContent = `
        @keyframes rainbowBorder {
          0% { border-color: #ff0000; }
          14% { border-color: #ff8000; }
          28% { border-color: #ffff00; }
          42% { border-color: #80ff00; }
          57% { border-color: #00ff00; }
          71% { border-color: #00ff80; }
          85% { border-color: #0080ff; }
          100% { border-color: #ff0000; }
        }
      `;
      rainbowBorderStyle.setAttribute('data-emotion-dashboard-styles', '');
      document.head.appendChild(rainbowBorderStyle);
    }
  }, []);

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
      
      // 개별 학생 분석 기간 초기화 (7일)
      const individualEnd = new Date();
      const individualStart = new Date();
      individualStart.setDate(individualEnd.getDate() - 6); // 7일 전
      setIndividualEndDate(getKoreaDateString(individualEnd));
      setIndividualStartDate(getKoreaDateString(individualStart));
      
      // 클러스터링 날짜 초기화 (오늘)
      setClusteringDate(todayString);
      
      // 주간분석 초기화 (이번 주 월요일부터)
      const today = new Date();
      const currentDay = today.getDay();
      const mondayOffset = currentDay === 0 ? 6 : currentDay - 1; // 일요일이면 6, 그 외는 현재요일-1
      const thisMonday = new Date(today);
      thisMonday.setDate(today.getDate() - mondayOffset);
      setSelectedWeekStart(getKoreaDateString(thisMonday));
      
      console.log('📅 감정출석부 대시보드 열림 - 날짜 설정:', {
        selectedDate: todayString,
        chartStartDate: getKoreaDateString(startDate),
        chartEndDate: getKoreaDateString(endDate),
        individualStartDate: getKoreaDateString(individualStart),
        individualEndDate: getKoreaDateString(individualEnd),
        clusteringDate: todayString,
        selectedWeekStart: getKoreaDateString(thisMonday)
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

  // 주간분석 데이터 로딩
  useEffect(() => {
    if (isOpen && selectedWeekStart && activeTab === 3) {
      loadWeeklyData(selectedWeekStart);
    }
  }, [isOpen, selectedWeekStart, activeTab]);

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

  // 감정을 강도에 따른 점수로 변환하는 함수 (1-5점 강도를 반영)
  const getEmotionScore = (emotion, intensity = 3) => {
    const positiveEmotions = ['기쁨', '평온함', '기대감', 'happy', 'calm', 'excited', 'joy', 'pleasant', 'good', '좋음', '행복', '즐거움'];
    const negativeEmotions = ['슬픔', '화남', '불안', 'sad', 'angry', 'anxious', 'upset', 'worried', 'stressed', '스트레스', '걱정', '짜증'];
    
    // 기본 감정 범주 점수 (1: 부정적, 2: 중립, 3: 긍정적)
    let baseScore;
    if (positiveEmotions.includes(emotion)) {
      baseScore = 3;
    } else if (negativeEmotions.includes(emotion)) {
      baseScore = 1;
    } else {
      baseScore = 2; // 중립
    }
    
    // 강도(1-5)를 반영하여 세분화 (0.1~5.0 범위)
    // 강도 1 = 0.5, 강도 2 = 0.7, 강도 3 = 1.0, 강도 4 = 1.3, 강도 5 = 1.5
    const intensityMultiplier = 0.3 + (intensity * 0.2); // 0.5 ~ 1.5
    
    const finalScore = baseScore + (baseScore - 2) * (intensityMultiplier - 1);
    
    // 최종 점수를 0.5 ~ 5.0 범위로 제한
    return Math.max(0.5, Math.min(5.0, finalScore));
  };

  // 개별 학생의 감정 패턴 분석
  const analyzeStudentPattern = async (studentId, range = analysisRange, customStart = null, customEnd = null) => {
    if (!studentId) return;
    
    setPatternAnalyzing(true);
    try {
      // 지정된 기간의 데이터 수집 - 커스텀 날짜 또는 기본 범위 사용
      let endDate, startDate;
      
      if (useCustomDateRange && customStart && customEnd) {
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
      } else {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(endDate.getDate() - (range - 1));
      }
      
      const studentData = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateString = getKoreaDateString(currentDate);
        
        // 새로운 구조에서 조회
        try {
          const emotionRef = doc(db, 'students', studentId, 'emotions', dateString);
          const emotionDoc = await getDoc(emotionRef);
          
          if (emotionDoc.exists()) {
            const data = emotionDoc.data();
            studentData.push({
              date: dateString,
              emotion: data.emotion,
              intensity: data.intensity || 3,
              cause: data.cause || '',
              score: getEmotionScore(data.emotion, data.intensity),
              timestamp: data.timestamp
            });
          } else {
            // 기존 구조에서도 조회 시도
            const legacyQuery = query(
              collection(db, 'emotionAttendance'),
              where('date', '==', dateString),
              where('studentId', '==', studentId)
            );
            const legacySnapshot = await getDocs(legacyQuery);
            
            if (!legacySnapshot.empty) {
              const legacyData = legacySnapshot.docs[0].data();
              studentData.push({
                date: dateString,
                emotion: legacyData.emotion,
                intensity: legacyData.intensity || 3,
                cause: legacyData.cause || '',
                score: getEmotionScore(legacyData.emotion, legacyData.intensity),
                timestamp: legacyData.timestamp
              });
            }
          }
        } catch (error) {
          console.error(`날짜 ${dateString} 데이터 조회 오류:`, error);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      setStudentEmotionPattern(studentData);
      
      // 비슷한 패턴의 학생들 찾기
      await findSimilarStudents(studentId, studentData, range, customStart, customEnd);
      
    } catch (error) {
      console.error('학생 감정 패턴 분석 오류:', error);
    } finally {
      setPatternAnalyzing(false);
    }
  };

  // 비슷한 감정 패턴을 가진 학생들 찾기
  const findSimilarStudents = async (targetStudentId, targetPattern, range, customStart = null, customEnd = null) => {
    if (!students || students.length < 2) {
      setSimilarStudents([]);
      return;
    }

    const similarities = [];
    
    for (const student of students) {
      if (student.id === targetStudentId) continue;
      
      // 해당 학생의 전체 감정 패턴 수집 (차트 표시를 위해)
      const studentData = [];
      let endDate, startDate;
      
      if (useCustomDateRange && customStart && customEnd) {
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
      } else {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(endDate.getDate() - (range - 1));
      }
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateString = getKoreaDateString(currentDate);
        
        try {
          const emotionRef = doc(db, 'students', student.id, 'emotions', dateString);
          const emotionDoc = await getDoc(emotionRef);
          
          if (emotionDoc.exists()) {
            const data = emotionDoc.data();
            studentData.push({
              date: dateString,
              score: getEmotionScore(data.emotion, data.intensity),
              emotion: data.emotion,
              intensity: data.intensity || 3,
              cause: data.cause || '',
              timestamp: data.timestamp
            });
          } else {
            // 기존 구조에서 조회
            const legacyQuery = query(
              collection(db, 'emotionAttendance'),
              where('date', '==', dateString),
              where('studentId', '==', student.id)
            );
            const legacySnapshot = await getDocs(legacyQuery);
            
            if (!legacySnapshot.empty) {
              const legacyData = legacySnapshot.docs[0].data();
              studentData.push({
                date: dateString,
                score: getEmotionScore(legacyData.emotion, legacyData.intensity),
                emotion: legacyData.emotion,
                intensity: legacyData.intensity || 3,
                cause: legacyData.cause || '',
                timestamp: legacyData.timestamp
              });
            }
          }
        } catch (error) {
          console.error(`학생 ${student.id} 데이터 조회 오류:`, error);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // 기본 패턴 유사도 계산 (빠른 필터링용)
      const basicSimilarity = calculateSimilarity(targetPattern, studentData);
      if (basicSimilarity > 0.3) { // 30% 이상 유사할 때만 포함 (AI 분석 대상으로)
        similarities.push({
          student: student,
          similarity: basicSimilarity,
          matchingDays: studentData.filter(d => d.score).length,
          patternData: studentData
        });
      }
    }
    
    // 기본 유사도 순으로 정렬하여 상위 8명 선택 (AI 분석 효율성을 위해)
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topSimilarStudents = similarities.slice(0, 8);
    
    // AI를 통한 정교한 유사도 분석
    try {
      const aiAnalysis = await analyzePatternWithAI(
        { name: targetStudentId, ...students.find(s => s.id === targetStudentId) }, 
        targetPattern, 
        topSimilarStudents
      );
      
      // AI 분석 결과를 바탕으로 유사도 업데이트
      const enhancedSimilarities = [];
      topSimilarStudents.forEach(student => {
        const aiResult = aiAnalysis.find(ai => ai.studentName === student.student.name);
        if (aiResult && aiResult.similarity >= 40) { // AI가 40% 이상으로 판단한 경우만
          enhancedSimilarities.push({
            ...student,
            similarity: aiResult.similarity / 100, // 0-1 범위로 변환
            aiAnalysis: aiResult
          });
        }
      });
      
      // AI 분석 결과 저장
      setAiAnalysisResults(aiAnalysis);
      
      // AI 기반 유사도 순으로 재정렬하여 상위 4명
      enhancedSimilarities.sort((a, b) => b.similarity - a.similarity);
      setSimilarStudents(enhancedSimilarities.slice(0, 4));
      
    } catch (aiError) {
      console.error('AI 분석 실패, 기본 유사도 사용:', aiError);
      // AI 분석 실패 시 기본 유사도 사용
      setSimilarStudents(similarities.slice(0, 4));
    }
  };

  // Gemini API를 활용한 고도화된 감정 패턴 분석
  const analyzePatternWithAI = async (targetStudent, targetPattern, comparisonStudents) => {
    try {
      const genAI = new GoogleGenerativeAI('AIzaSyDWuEDjA__mWPWE1njZpGPYSG__MnHYycM');
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // 분석용 데이터 준비
      const targetPatternText = targetPattern.map(p => 
        `${p.date}: ${p.emotion}(${p.score.toFixed(1)}점) - 강도:${p.intensity}/5 - 원인:${p.cause || '없음'}`
      ).join('\n');

      const comparisonTexts = comparisonStudents.map(student => {
        const patternText = student.patternData.map(p => 
          `${p.date}: ${p.emotion || '없음'}(${p.score ? p.score.toFixed(1) : 0}점) - 강도:${p.intensity || 3}/5 - 원인:${p.cause || '없음'}`
        ).join('\n');
        return `${student.student.name}:\n${patternText}`;
      }).join('\n\n');

      const prompt = `
교실 내 학생들의 감정 패턴을 전문적으로 분석해주세요.

# 점수 체계 설명:
- 감정 점수는 감정 종류와 강도(1-5)를 모두 반영한 0.5-5.0점 범위입니다
- 1.0점: 매우부정적, 2.0점: 부정적, 3.0점: 중립, 4.0점: 긍정적, 5.0점: 매우긍정적
- 같은 감정이라도 강도에 따라 점수가 달라집니다 (예: 기쁨 강도1 = 3.5점, 기쁨 강도5 = 4.5점)

# 기준 학생: ${targetStudent.name}
${targetPatternText}

# 비교 대상 학생들:
${comparisonTexts}

# 분석 요청사항:
1. 각 학생과 기준 학생의 감정 패턴 유사도를 정확히 평가해주세요 (0-100%)
2. 유사도 계산 시 고려사항:
   - 감정의 종류와 변화 패턴
   - 감정 강도의 유사성 (점수의 세밀한 변화 포함)
   - 감정 원인의 공통점
   - 시간적 흐름에서의 감정 변화 추세
   - 감정 기복의 주기성과 강도 변화

3. 각 학생별로 다음 형식으로 분석 결과를 제공해주세요:
   - 학생명: [이름]
   - 유사도: [0-100 사이 정수]%
   - 유사한 점: [구체적 설명]
   - 다른 점: [구체적 설명]
   - 교육적 시사점: [교사가 알아야 할 내용]

4. 40% 이상의 유사도를 보이는 학생만 "유의미한 유사성"으로 판단해주세요.

응답은 JSON 형태로 제공해주세요:
{
  "analysis": [
    {
      "studentName": "학생명",
      "similarity": 유사도숫자,
      "similarities": "유사한 점",
      "differences": "다른 점",
      "educationalInsight": "교육적 시사점"
    }
  ]
}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // JSON 파싱 시도
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysisResult = JSON.parse(jsonMatch[0]);
          return analysisResult.analysis || [];
        }
      } catch (parseError) {
        console.error('AI 응답 파싱 오류:', parseError);
      }
      
      return [];
    } catch (error) {
      console.error('AI 분석 오류:', error);
      return [];
    }
  };

  // 감정 클러스터링 분석
  const performEmotionClustering = async (targetDate) => {
    if (!targetDate || !students) return;
    
    setClusteringLoading(true);
    try {
      console.log('📊 감정 클러스터링 분석 시작:', targetDate);
      
      // 해당 날짜의 모든 학생 감정 데이터 수집
      const studentsData = [];
      
      if (!students || students.length === 0) {
        setClusteringAnalysis({ error: '학생 목록이 없습니다.' });
        return;
      }
      
      for (const student of students) {
        try {
          if (!student || !student.id || !student.name) {
            console.warn('잘못된 학생 데이터:', student);
            continue;
          }
          
          const emotionRef = doc(db, 'students', student.id, 'emotions', targetDate);
          const emotionDoc = await getDoc(emotionRef);
          
          if (emotionDoc.exists()) {
            const data = emotionDoc.data();
            if (data.emotion && typeof data.intensity === 'number' && data.intensity > 0) {
              const score = getEmotionScore(data.emotion, data.intensity);
              if (score && !isNaN(score)) {
                studentsData.push({
                  id: student.id,
                  name: student.name || '익명',
                  emotion: data.emotion || '알 수 없음',
                  intensity: data.intensity || 3,
                  score: score,
                  cause: data.cause || '',
                  submittedAt: data.submittedAt || null,
                  // 클러스터링을 위한 2D 좌표 생성 (감정 점수와 강도 기반)
                  x: score, // 감정 점수를 X축으로
                  y: data.intensity // 강도를 Y축으로
                });
              }
            }
          }
        } catch (error) {
          console.error(`학생 ${student.name} 감정 데이터 조회 오류:`, error);
        }
      }
      
      console.log('📊 수집된 학생 데이터:', studentsData);
      
      if (studentsData.length < 2) {
        setClusteringData([]);
        setClusteringAnalysis({ error: '분석할 데이터가 충분하지 않습니다.' });
        return;
      }
      
      // 간단한 K-means 클러스터링 (3개 클러스터: 부정적, 중립, 긍정적)
      const clusters = performKMeansClustering(studentsData, 3);
      
      // AI를 활용한 클러스터링 결과 분석
      let analysis;
      try {
        analysis = await analyzeClusteringWithAI(clusters, targetDate);
      } catch (aiError) {
        console.warn('AI 분석 실패, 기본 분석으로 대체:', aiError);
        // AI 분석 실패 시 기본 분석 제공
        analysis = {
          overallSummary: `${targetDate}일 총 ${clusters.reduce((sum, c) => sum + c.students.length, 0)}명의 학생이 ${clusters.length}개 그룹으로 분류되었습니다.`,
          clusterAnalysis: clusters.map(cluster => ({
            clusterLabel: cluster.label,
            studentCount: cluster.students.length,
            characteristics: cluster.students.length > 0 ? `평균 감정점수 ${(cluster.students.reduce((sum, s) => sum + s.score, 0) / cluster.students.length).toFixed(1)}점` : '데이터 없음',
            commonFactors: '상세 분석을 위해 잠시 후 다시 시도해주세요',
            teachingStrategy: '개별 학생별 맞춤 지도 권장',
            attentionLevel: cluster.students.reduce((sum, s) => sum + s.score, 0) / cluster.students.length < 2.5 ? '높음' : '보통'
          })),
          recommendations: 'AI 분석이 일시적으로 제한되어 기본 권장사항을 제공합니다. 각 그룹별 특성에 맞는 개별 지도를 권장합니다.',
          classroomMood: clusters.reduce((sum, c) => sum + c.students.length, 0) > 0 ? '전반적으로 안정적' : '데이터 부족'
        };
      }
      
      setClusteringData(clusters);
      setClusteringAnalysis(analysis);
      
    } catch (error) {
      console.error('감정 클러스터링 오류:', error);
      setClusteringAnalysis({ error: '클러스터링 분석 중 오류가 발생했습니다.' });
    } finally {
      setClusteringLoading(false);
    }
  };

  // Convex Hull 계산 (Graham Scan 알고리즘)
  const calculateConvexHull = (points) => {
    if (points.length < 3) return points;
    
    // 최하단 점을 찾고 시작점으로 설정
    let start = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].y < points[start].y || 
          (points[i].y === points[start].y && points[i].x < points[start].x)) {
        start = i;
      }
    }
    
    // 시작점을 첫 번째로 이동
    [points[0], points[start]] = [points[start], points[0]];
    
    // 각도에 따라 정렬
    const startPoint = points[0];
    points.slice(1).sort((a, b) => {
      const angleA = Math.atan2(a.y - startPoint.y, a.x - startPoint.x);
      const angleB = Math.atan2(b.y - startPoint.y, b.x - startPoint.x);
      return angleA - angleB;
    });
    
    const hull = [points[0], points[1]];
    
    for (let i = 2; i < points.length; i++) {
      // 왼쪽 턴이 아닌 점들 제거
      while (hull.length > 1) {
        const cross = (hull[hull.length-1].x - hull[hull.length-2].x) * 
                     (points[i].y - hull[hull.length-2].y) - 
                     (hull[hull.length-1].y - hull[hull.length-2].y) * 
                     (points[i].x - hull[hull.length-2].x);
        if (cross > 0) break;
        hull.pop();
      }
      hull.push(points[i]);
    }
    
    return hull;
  };

  // K-means 클러스터링 구현
  const performKMeansClustering = (data, k = 3) => {
    // 초기 중심점 설정 (더 넓게 분포하도록 조정)
    const centroids = [
      { x: 1.8, y: 2.5, label: '부정적 감정 그룹', color: '#f44336' }, // 부정적
      { x: 3.0, y: 3.0, label: '중립적 감정 그룹', color: '#ff9800' }, // 중립
      { x: 4.2, y: 4.0, label: '긍정적 감정 그룹', color: '#4caf50' }  // 긍정적
    ];
    
    const maxIterations = 10;
    let assignments = new Array(data.length).fill(0);
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // 각 데이터 포인트를 가장 가까운 중심점에 할당
      const newAssignments = data.map((point, index) => {
        let minDistance = Infinity;
        let bestCluster = 0;
        
        centroids.forEach((centroid, clusterIndex) => {
          const distance = Math.sqrt(
            Math.pow(point.x - centroid.x, 2) + Math.pow(point.y - centroid.y, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            bestCluster = clusterIndex;
          }
        });
        
        return bestCluster;
      });
      
      // 수렴 검사
      if (JSON.stringify(assignments) === JSON.stringify(newAssignments)) {
        break;
      }
      assignments = newAssignments;
      
      // 중심점 업데이트 (라벨과 색상은 유지)
      centroids.forEach((centroid, clusterIndex) => {
        const clusterPoints = data.filter((_, index) => assignments[index] === clusterIndex);
        if (clusterPoints.length > 0) {
          centroid.x = clusterPoints.reduce((sum, p) => sum + p.x, 0) / clusterPoints.length;
          centroid.y = clusterPoints.reduce((sum, p) => sum + p.y, 0) / clusterPoints.length;
        }
      });
    }
    
    // 클러스터 결과 정리
    const clusters = centroids.map((centroid, index) => {
      const clusterStudents = data.filter((_, dataIndex) => assignments[dataIndex] === index);
      
      // 유효한 학생 데이터만 필터링
      const validStudents = clusterStudents.filter(student => 
        student && 
        student.id && 
        student.name && 
        student.emotion &&
        typeof student.intensity === 'number' &&
        typeof student.score === 'number' &&
        !isNaN(student.score)
      );
      
      // Convex Hull 계산 (클러스터 경계)
      const points = validStudents.map(s => ({ x: s.x, y: s.y }));
      const hull = validStudents.length >= 3 ? calculateConvexHull([...points]) : points;
      
      return {
        id: index,
        label: centroid.label || `클러스터 ${index + 1}`,
        color: centroid.color || '#ccc',
        centroid: { 
          x: centroid.x || 0, 
          y: centroid.y || 0 
        },
        students: validStudents,
        hull: hull || [] // 클러스터 경계점들
      };
    });
    
    return clusters;
  };

  // AI를 활용한 클러스터링 결과 분석
  const analyzeClusteringWithAI = async (clusters, targetDate) => {
    try {
      const genAI = new GoogleGenerativeAI('AIzaSyDWuEDjA__mWPWE1njZpGPYSG__MnHYycM');
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // 클러스터 정보를 텍스트로 변환
      const clusterInfo = clusters.map(cluster => {
        const studentList = cluster.students.map(s => 
          `${s.name}: ${s.emotion}(${s.score.toFixed(1)}점, 강도${s.intensity}/5) - 원인: ${s.cause || '없음'}`
        ).join('\n');
        
        return `### ${cluster.label} (${cluster.students.length}명)
중심점: 감정점수 ${cluster.centroid.x.toFixed(1)}, 강도 ${cluster.centroid.y.toFixed(1)}
학생들:
${studentList}`;
      }).join('\n\n');

      const prompt = `
${targetDate}일 교실 내 학생들의 감정 클러스터링 분석을 해주세요.

# 클러스터링 결과:
${clusterInfo}

# 분석 요청사항:
1. 각 클러스터의 특성과 의미를 분석해주세요
2. 각 클러스터에 속한 학생들의 공통점을 찾아주세요
3. 교사가 주목해야 할 클러스터와 그 이유를 제시해주세요
4. 각 클러스터별 맞춤형 지도 방안을 제안해주세요
5. 전체적인 교실 분위기와 개선점을 분석해주세요

응답은 JSON 형태로 제공해주세요:
{
  "overallSummary": "전체 분석 요약",
  "clusterAnalysis": [
    {
      "clusterLabel": "클러스터명",
      "studentCount": 학생수,
      "characteristics": "클러스터 특성",
      "commonFactors": "공통 요인",
      "teachingStrategy": "지도 방안",
      "attentionLevel": "관심도 (높음/보통/낮음)"
    }
  ],
  "recommendations": "전체 권장사항",
  "classroomMood": "교실 분위기 평가"
}`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // JSON 파싱 시도
      try {
        const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
        const analysis = JSON.parse(cleanedResponse);
        return analysis;
      } catch (parseError) {
        console.error('AI 응답 파싱 오류:', parseError);
        return {
          error: 'AI 분석 결과를 처리하는 중 오류가 발생했습니다.',
          rawResponse: response
        };
      }
      
    } catch (error) {
      console.error('클러스터링 AI 분석 오류:', error);
      
      // API 할당량 초과 에러 체크
      if (error.message && (error.message.includes('quota') || error.message.includes('rate limit'))) {
        throw new Error('API 할당량 초과: 잠시 후 다시 시도해주세요');
      }
      
      throw new Error('AI 분석 서비스 일시 중단');
    }
  };

  // 패턴 유사도 계산 (단순한 피어슨 상관계수 사용 - 백업용)
  const calculateSimilarity = (pattern1, pattern2) => {
    if (pattern1.length === 0 || pattern2.length === 0) return 0;
    
    // 공통 날짜만 비교
    const commonData = [];
    pattern1.forEach(p1 => {
      const p2 = pattern2.find(p => p.date === p1.date);
      if (p2) {
        commonData.push({ score1: p1.score, score2: p2.score });
      }
    });
    
    if (commonData.length < 2) return 0;
    
    const n = commonData.length;
    const sum1 = commonData.reduce((sum, d) => sum + d.score1, 0);
    const sum2 = commonData.reduce((sum, d) => sum + d.score2, 0);
    const sum1Sq = commonData.reduce((sum, d) => sum + d.score1 * d.score1, 0);
    const sum2Sq = commonData.reduce((sum, d) => sum + d.score2 * d.score2, 0);
    const sumProducts = commonData.reduce((sum, d) => sum + d.score1 * d.score2, 0);
    
    const numerator = sumProducts - (sum1 * sum2 / n);
    const denominator = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
    
    if (denominator === 0) return 0;
    const correlation = numerator / denominator;
    
    // -1~1 범위를 0~1로 변환
    return (correlation + 1) / 2;
  };

  const processChartData = (data) => {
    const dateGroups = {};
    data.forEach(entry => {
      const date = entry.date;
      if (!dateGroups[date]) {
        dateGroups[date] = { positive: 0, negative: 0, neutral: 0, total: 0 };
      }
      
      const emotion = entry.emotion;
      const positiveEmotions = ['기쁨', '평온함', '기대감', 'happy', 'calm', 'excited', 'joy', 'pleasant', 'good', '좋음', '행복', '즐거움'];
      const negativeEmotions = ['슬픔', '화남', '불안', 'sad', 'angry', 'anxious', 'upset', 'worried', 'stressed', '스트레스', '걱정', '짜증'];
      
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

  // 주간분석 데이터 로딩 함수
  const loadWeeklyData = async (weekStartDate) => {
    if (!weekStartDate) return;
    
    setWeeklyLoading(true);
    try {
      // 주간 데이터 계산 (월~금)
      const weekDays = [];
      const weekStart = new Date(weekStartDate);
      
      for (let i = 0; i < 5; i++) { // 월~금
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        weekDays.push(getKoreaDateString(date));
      }
      
      // 현재 주간 데이터 가져오기
      const currentWeekData = [];
      for (const dateStr of weekDays) {
        const dayData = await getDayEmotionData(dateStr);
        currentWeekData.push({
          date: dateStr,
          dayName: ['월', '화', '수', '목', '금'][weekDays.indexOf(dateStr)],
          emotionCounts: dayData.emotions,
          students: dayData.data,
          averageIntensity: dayData.averageIntensity || 0
        });
      }
      
      // 누적 평균 데이터 계산 (지난 4주간의 같은 요일 평균)
      const averageWeekData = await calculateWeeklyAverage(weekDays);
      
      setWeeklyData(currentWeekData);
      setWeeklyAverage(averageWeekData);
      
      // Gemini API로 주간 분석 수행
      await analyzeWeeklyTrends(currentWeekData, averageWeekData);
      
    } catch (error) {
      console.error('주간 데이터 로딩 실패:', error);
    } finally {
      setWeeklyLoading(false);
    }
  };

  // 특정 날짜의 감정 데이터 가져오기
  const getDayEmotionData = async (dateStr) => {
    try {
      const emotionQuery = query(
        collection(db, `emotionAttendance/${dateStr}/records`),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(emotionQuery);
      const data = [];
      const emotions = {};
      let totalIntensity = 0;
      let intensityCount = 0;
      
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          ...docData
        });
        
        if (docData.emotion) {
          emotions[docData.emotion] = (emotions[docData.emotion] || 0) + 1;
          if (docData.intensity) {
            totalIntensity += parseInt(docData.intensity);
            intensityCount++;
          }
        }
      });
      
      return {
        data,
        emotions,
        averageIntensity: intensityCount > 0 ? totalIntensity / intensityCount : 0
      };
    } catch (error) {
      console.error('날짜별 감정 데이터 조회 실패:', error);
      return { data: [], emotions: {}, averageIntensity: 0 };
    }
  };

  // 누적 평균 계산 (지난 4주간의 같은 요일 평균)
  const calculateWeeklyAverage = async (weekDays) => {
    const averageData = [];
    
    for (let i = 0; i < 5; i++) { // 월~금
      const dayName = ['월', '화', '수', '목', '금'][i];
      const pastDays = [];
      
      // 지난 4주간의 같은 요일 데이터 수집
      for (let week = 1; week <= 4; week++) {
        const pastDate = new Date(weekDays[i]);
        pastDate.setDate(pastDate.getDate() - (week * 7));
        const pastDateStr = getKoreaDateString(pastDate);
        
        const dayData = await getDayEmotionData(pastDateStr);
        if (dayData.data.length > 0) {
          pastDays.push(dayData);
        }
      }
      
      // 평균 계산
      const avgEmotions = {};
      let avgIntensity = 0;
      let totalStudents = 0;
      
      if (pastDays.length > 0) {
        const emotionTotals = {};
        let totalIntensitySum = 0;
        let totalIntensityCount = 0;
        
        pastDays.forEach(day => {
          Object.keys(day.emotions).forEach(emotion => {
            emotionTotals[emotion] = (emotionTotals[emotion] || 0) + day.emotions[emotion];
          });
          totalIntensitySum += day.averageIntensity * day.data.length;
          totalIntensityCount += day.data.length;
          totalStudents += day.data.length;
        });
        
        // 평균값으로 변환
        Object.keys(emotionTotals).forEach(emotion => {
          avgEmotions[emotion] = Math.round(emotionTotals[emotion] / pastDays.length);
        });
        
        avgIntensity = totalIntensityCount > 0 ? totalIntensitySum / totalIntensityCount : 0;
      }
      
      averageData.push({
        dayName,
        emotionCounts: avgEmotions,
        averageIntensity: avgIntensity,
        averageStudents: Math.round(totalStudents / Math.max(pastDays.length, 1))
      });
    }
    
    return averageData;
  };

  // Gemini API로 주간 트렌드 분석
  const analyzeWeeklyTrends = async (currentWeek, averageWeek) => {
    try {
      const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      // 분석용 데이터 준비
      const currentWeekSummary = currentWeek.map(day => ({
        day: day.dayName,
        emotions: day.emotionCounts,
        intensity: day.averageIntensity,
        studentCount: day.students.length,
        notes: day.students.map(s => s.notes || s.reason).filter(n => n && n.trim()).join('; ')
      }));

      const averageWeekSummary = averageWeek.map(day => ({
        day: day.dayName,
        emotions: day.emotionCounts,
        intensity: day.averageIntensity,
        averageStudents: day.averageStudents
      }));

      const prompt = `
다음은 이번 주 학생들의 감정출석 데이터와 지난 4주간의 평균 데이터입니다.

## 이번 주 데이터:
${JSON.stringify(currentWeekSummary, null, 2)}

## 지난 4주 평균 데이터:
${JSON.stringify(averageWeekSummary, null, 2)}

## 분석 요청:
1. **주간 감정 트렌드 분석**: 월요일부터 금요일까지의 감정 변화 패턴
2. **평균 대비 분석**: 이번 주가 평소와 어떻게 다른지 비교
3. **비고 내용 분석**: 학생들이 작성한 비고를 바탕으로 한 심층 분석
4. **주의사항 및 권장사항**: 교사가 알아야 할 중요한 인사이트

분석 결과를 한국어로, 교사가 이해하기 쉽게 작성해주세요.
각 항목을 명확히 구분하여 제시하고, 구체적인 수치와 예시를 포함해주세요.
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();
      
      setWeeklyAnalysis(analysisText);
      
    } catch (error) {
      console.error('주간 분석 실패:', error);
      setWeeklyAnalysis('주간 분석을 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.');
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
    <Portal>
      <Dialog
        open={isOpen}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        ref={dialogRef}
        disableEscapeKeyDown={false}
        disablePortal={false}
        keepMounted={false}
        sx={{
        zIndex: 9999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        '& .MuiDialog-paper': {
          minHeight: '80vh',
          maxHeight: '95vh',
          width: '95vw',
          maxWidth: '1400px',
          borderRadius: 3,
          overflow: 'visible',
          pointerEvents: 'auto',
          zIndex: 10000,
          position: 'relative',
          border: '3px solid #ff0000',
          animation: 'rainbowBorder 4s infinite'
        },
        '& .MuiBackdrop-root': {
          zIndex: 9998,
          pointerEvents: 'auto',
          position: 'fixed',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
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

      <DialogContent ref={dashboardRef} sx={{ 
        p: 0,
        pointerEvents: 'auto',
        '&:focus': {
          outline: 'none'
        }
      }}>
        {/* 탭 네비게이션 */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}>
          <Tabs 
            value={activeTab} 
            onChange={(event, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: '#1976d2',
                height: 3
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                minHeight: 48,
                '&.Mui-selected': {
                  color: '#1976d2'
                }
              }
            }}
          >
            <Tab 
              label="📊 전체 감정 분석" 
              sx={{ 
                fontSize: '1.1rem',
                fontWeight: 600,
                color: activeTab === 0 ? '#1976d2' : '#666'
              }}
            />
            <Tab 
              label="🔍 개별 학생 분석" 
              sx={{ 
                fontSize: '1.1rem',
                fontWeight: 600,
                color: activeTab === 1 ? '#1976d2' : '#666'
              }}
            />
            <Tab 
              label="🎯 감정 클러스터링" 
              sx={{ 
                fontSize: '1.1rem',
                fontWeight: 600,
                color: activeTab === 2 ? '#1976d2' : '#666'
              }}
            />
            <Tab 
              label="📅 주간 분석" 
              sx={{ 
                fontSize: '1.1rem',
                fontWeight: 600,
                color: activeTab === 3 ? '#1976d2' : '#666'
              }}
            />
          </Tabs>
        </Box>

        {/* 탭 콘텐츠 */}
        <Box sx={{ 
          p: 3,
          pointerEvents: 'auto',
          position: 'relative'
        }}>
          {/* 전체 감정 분석 탭 */}
          {activeTab === 0 && (
            <>
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
            </>
          )}

          {/* 개별 학생 분석 탭 */}
          {activeTab === 1 && (
            <>
              <Card sx={{ mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <AssessmentIcon sx={{ color: '#9c27b0' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                🔍 개별 학생 감정 패턴 분석
              </Typography>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                학생을 선택하고 분석 기간을 설정하여 감정 변화 패턴과 비슷한 패턴을 보이는 교실 내 다른 학생들을 찾아보세요.
              </Typography>
              
              {/* 분석 기간 선택 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>분석 기간:</Typography>
                
                {/* 빠른 선택 버튼들 */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {[7, 14, 21].map(days => (
                    <Chip
                      key={days}
                      label={`${days}일`}
                      onClick={() => {
                        setUseCustomDateRange(false);
                        setAnalysisRange(days);
                        
                        // 날짜 범위 자동 설정
                        const endDate = new Date();
                        const startDate = new Date();
                        startDate.setDate(endDate.getDate() - (days - 1));
                        setIndividualEndDate(getKoreaDateString(endDate));
                        setIndividualStartDate(getKoreaDateString(startDate));
                        
                        if (selectedStudent) {
                          analyzeStudentPattern(selectedStudent.id, days);
                        }
                      }}
                      variant={!useCustomDateRange && analysisRange === days ? 'filled' : 'outlined'}
                      sx={{
                        backgroundColor: !useCustomDateRange && analysisRange === days ? '#2196f3' : '#f5f5f5',
                        color: !useCustomDateRange && analysisRange === days ? 'white' : '#333',
                        borderColor: !useCustomDateRange && analysisRange === days ? '#2196f3' : '#ddd',
                        fontWeight: 500,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: !useCustomDateRange && analysisRange === days ? '#1976d2' : '#e0e0e0'
                        }
                      }}
                    />
                  ))}
                  <Chip
                    label="사용자 지정"
                    onClick={() => {
                      setUseCustomDateRange(true);
                      if (selectedStudent) {
                        analyzeStudentPattern(selectedStudent.id, analysisRange, individualStartDate, individualEndDate);
                      }
                    }}
                    variant={useCustomDateRange ? 'filled' : 'outlined'}
                    sx={{
                      backgroundColor: useCustomDateRange ? '#9c27b0' : '#f5f5f5',
                      color: useCustomDateRange ? 'white' : '#333',
                      borderColor: useCustomDateRange ? '#9c27b0' : '#ddd',
                      fontWeight: 500,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: useCustomDateRange ? '#7b1fa2' : '#e0e0e0'
                      }
                    }}
                  />
                </Box>
                
                {/* 사용자 지정 날짜 입력 */}
                {useCustomDateRange && (
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                    <TextField
                      label="시작일"
                      type="date"
                      value={individualStartDate}
                      onChange={(e) => {
                        setIndividualStartDate(e.target.value);
                        if (selectedStudent && individualEndDate) {
                          analyzeStudentPattern(selectedStudent.id, analysisRange, e.target.value, individualEndDate);
                        }
                      }}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                      sx={{ minWidth: 150 }}
                    />
                    <TextField
                      label="종료일"
                      type="date"
                      value={individualEndDate}
                      onChange={(e) => {
                        setIndividualEndDate(e.target.value);
                        if (selectedStudent && individualStartDate) {
                          analyzeStudentPattern(selectedStudent.id, analysisRange, individualStartDate, e.target.value);
                        }
                      }}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                      sx={{ minWidth: 150 }}
                    />
                  </Box>
                )}
              </Box>
              
              {/* 학생 선택 */}
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>학생 선택:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {students && students.map((student) => (
                  <Chip
                    key={student.id}
                    label={student.name}
                    onClick={() => {
                      setSelectedStudent(student);
                      if (useCustomDateRange) {
                        analyzeStudentPattern(student.id, analysisRange, individualStartDate, individualEndDate);
                      } else {
                        analyzeStudentPattern(student.id, analysisRange);
                      }
                    }}
                    variant={selectedStudent?.id === student.id ? 'filled' : 'outlined'}
                    sx={{
                      backgroundColor: selectedStudent?.id === student.id ? '#9c27b0' : '#f5f5f5',
                      color: selectedStudent?.id === student.id ? 'white' : '#333',
                      borderColor: selectedStudent?.id === student.id ? '#9c27b0' : '#ddd',
                      fontWeight: 500,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: selectedStudent?.id === student.id ? '#7b1fa2' : '#e0e0e0'
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* 선택된 학생의 감정 패턴 차트 */}
            {selectedStudent && studentEmotionPattern.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  📊 {selectedStudent.name}님의 감정 패턴 
                  {useCustomDateRange 
                    ? `(${individualStartDate} ~ ${individualEndDate})`
                    : `(지난 ${analysisRange}일)`}
                </Typography>
                <Box sx={{ height: 400 }}>
                  <Line
                    data={{
                      labels: studentEmotionPattern.map(p => {
                        const date = new Date(p.date);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }),
                      datasets: [
                        // 선택된 학생의 패턴 (굵은 선)
                        {
                          label: `${selectedStudent.name} (선택된 학생)`,
                          data: studentEmotionPattern.map(p => p.score),
                          borderColor: '#9c27b0',
                          backgroundColor: 'rgba(156, 39, 176, 0.1)',
                          borderWidth: 5, // 더 굵게
                          fill: true,
                          tension: 0.4,
                          pointRadius: 8,
                          pointHoverRadius: 10,
                          pointBorderWidth: 3,
                          pointBorderColor: '#ffffff',
                          order: 0 // 가장 위에 표시
                        },
                        // 비슷한 패턴의 학생들
                        ...similarStudents.map((similar, index) => {
                          const colors = ['#4caf50', '#ff9800', '#2196f3', '#e91e63'];
                          const color = colors[index % colors.length];
                          return {
                            label: `${similar.student.name} (${Math.round(similar.similarity * 100)}% 유사)`,
                            data: similar.patternData.map(p => p.score || null),
                            borderColor: color,
                            backgroundColor: `${color}20`,
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            borderDash: [5, 5], // 점선으로 구분
                            order: index + 1
                          };
                        })
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        intersect: false,
                        mode: 'index'
                      },
                      scales: {
                        y: {
                          beginAtZero: false,
                          min: 0.5,
                          max: 5.5,
                          ticks: {
                            stepSize: 1,
                            callback: function(value) {
                              const labels = { 
                                1: '매우부정적',
                                2: '부정적', 
                                3: '중립', 
                                4: '긍정적',
                                5: '매우긍정적'
                              };
                              return labels[value] || '';
                            }
                          },
                          grid: {
                            color: 'rgba(0,0,0,0.1)'
                          }
                        },
                        x: {
                          grid: {
                            color: 'rgba(0,0,0,0.05)'
                          }
                        }
                      },
                      plugins: {
                        legend: {
                          display: true,
                          position: 'bottom',
                          labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                              size: 12
                            }
                          }
                        },
                        tooltip: {
                          callbacks: {
                            title: function(context) {
                              const date = studentEmotionPattern[context[0].dataIndex]?.date;
                              if (date) {
                                const dateObj = new Date(date);
                                return `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;
                              }
                              return '';
                            },
                            label: function(context) {
                              const datasetLabel = context.dataset.label;
                              const value = context.parsed.y;
                              
                              // 점수에 따른 감정 강도 레이블
                              const getScoreLabel = (score) => {
                                if (score >= 4.5) return '매우긍정적';
                                if (score >= 3.5) return '긍정적';
                                if (score >= 2.5) return '중립';
                                if (score >= 1.5) return '부정적';
                                return '매우부정적';
                              };
                              
                              if (context.datasetIndex === 0) {
                                // 선택된 학생의 상세 정보
                                const dataPoint = studentEmotionPattern[context.dataIndex];
                                return `${datasetLabel}: ${getScoreLabel(value)} - ${dataPoint.emotion} (강도: ${dataPoint.intensity}/5, 점수: ${value.toFixed(1)})`;
                              } else {
                                // 비슷한 학생들의 기본 정보
                                const similarStudent = similarStudents[context.datasetIndex - 1];
                                const dataPoint = similarStudent.patternData[context.dataIndex];
                                if (dataPoint) {
                                  return `${datasetLabel}: ${getScoreLabel(value)} - ${dataPoint.emotion} (강도: ${dataPoint.intensity || 3}/5, 점수: ${value.toFixed(1)})`;
                                }
                              }
                              return '';
                            },
                            afterLabel: function(context) {
                              if (context.datasetIndex === 0) {
                                const dataPoint = studentEmotionPattern[context.dataIndex];
                                return dataPoint.cause ? `원인: ${dataPoint.cause}` : '';
                              }
                              return '';
                            }
                          }
                        }
                      }
                    }}
                  />
                </Box>
              </Box>
            )}

            {/* 비슷한 패턴의 학생들 */}
            {selectedStudent && similarStudents.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  👥 {selectedStudent.name}님과 비슷한 감정 패턴을 보이는 학생들 (차트에 함께 표시됨)
                </Typography>
                <Grid container spacing={2}>
                  {similarStudents.map((similar, index) => (
                    <Grid item xs={12} sm={6} md={4} key={similar.student.id}>
                      <Card sx={{
                        p: 2,
                        backgroundColor: '#f3e5f5',
                        border: '1px solid #ce93d8',
                        borderRadius: 2
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {similar.student.name}
                          </Typography>
                          <Chip
                            label={`${Math.round(similar.similarity * 100)}% 유사`}
                            size="small"
                            sx={{
                              backgroundColor: '#9c27b0',
                              color: 'white',
                              fontWeight: 500,
                              fontSize: '0.75rem'
                            }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          데이터 있는 날: {similar.matchingDays}일 / {analysisRange}일
                        </Typography>
                        
                        {/* AI 분석 결과 표시 */}
                        {similar.aiAnalysis && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: '#1976d2' }}>
                              🤖 AI 분석 결과
                            </Typography>
                            
                            <Typography variant="caption" display="block" sx={{ mb: 0.5, color: '#4caf50' }}>
                              <strong>유사한 점:</strong> {similar.aiAnalysis.similarities}
                            </Typography>
                            
                            <Typography variant="caption" display="block" sx={{ mb: 0.5, color: '#ff9800' }}>
                              <strong>다른 점:</strong> {similar.aiAnalysis.differences}
                            </Typography>
                            
                            <Typography variant="caption" display="block" sx={{ mb: 1, color: '#9c27b0', fontWeight: 500 }}>
                              <strong>💡 교육적 시사점:</strong> {similar.aiAnalysis.educationalInsight}
                            </Typography>
                          </Box>
                        )}
                        
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                          최근 7일 감정 패턴:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {similar.patternData.slice(-7).map((day, dayIndex) => {
                            // 감정에 따른 색상 결정
                            const getEmotionColor = (emotion, score) => {
                              const positiveEmotions = ['기쁨', '평온함', '기대감', 'happy', 'calm', 'excited', 'joy', 'pleasant', 'good', '좋음', '행복', '즐거움'];
                              const negativeEmotions = ['슬픔', '화남', '불안', 'sad', 'angry', 'anxious', 'upset', 'worried', 'stressed', '스트레스', '걱정', '짜증'];
                              
                              if (positiveEmotions.includes(emotion)) {
                                return score >= 4 ? '#4caf50' : '#81c784'; // 진한 초록 / 연한 초록
                              } else if (negativeEmotions.includes(emotion)) {
                                return score <= 2 ? '#f44336' : '#e57373'; // 진한 빨강 / 연한 빨강
                              } else {
                                return '#ff9800'; // 주황 (중립)
                              }
                            };
                            
                            return (
                              <Box
                                key={dayIndex}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '50%',
                                  backgroundColor: getEmotionColor(day.emotion, day.score),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  color: 'white',
                                  border: '2px solid rgba(255,255,255,0.3)'
                                }}
                                title={`${day.date}: ${day.emotion} (${Math.round(day.score * 10) / 10}점)`}
                              >
                                {Math.round(day.score * 10) / 10}
                              </Box>
                            );
                          })}
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* 분석 중 표시 */}
            {patternAnalyzing && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  🔄 감정 패턴을 분석하고 있습니다...
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  🤖 AI가 정교하게 분석 중입니다
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      border: '4px solid #e0e0e0',
                      borderTop: '4px solid #9c27b0',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    }}
                  />
                </Box>
              </Box>
            )}

            {/* 유사한 학생이 없는 경우 */}
            {selectedStudent && !patternAnalyzing && studentEmotionPattern.length > 0 && similarStudents.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 3, backgroundColor: '#f8f9fa', borderRadius: 2, mt: 2 }}>
                <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                  🤔 {selectedStudent.name}님과 유의미한 감정 패턴 유사성을 보이는 학생이 없습니다
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  AI 분석 결과 40% 이상의 유사도를 보이는 학생이 발견되지 않았습니다.<br/>
                  이는 해당 학생이 독특한 감정 패턴을 가지고 있음을 의미할 수 있습니다.
                </Typography>
              </Box>
            )}

            {/* 선택된 학생이 있지만 데이터가 없는 경우 */}
            {selectedStudent && !patternAnalyzing && studentEmotionPattern.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body1" color="text.secondary">
                  😔 {selectedStudent.name}님의 최근 {analysisRange}일간 감정출석 데이터가 충분하지 않습니다.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
            </>
          )}

          {/* 감정 클러스터링 탭 */}
          {activeTab === 2 && (
            <>
              <Card sx={{ mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <AssessmentIcon sx={{ color: '#9c27b0' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      🎯 감정 클러스터링 분석
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      특정 날짜의 학생들을 감정 상태에 따라 클러스터링하여 비슷한 감정을 가진 학생 그룹을 찾아보세요.
                    </Typography>
                    
                    {/* 날짜 선택 */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
                      <TextField
                        label="분석 날짜"
                        type="date"
                        value={clusteringDate}
                        onChange={(e) => {
                          setClusteringDate(e.target.value);
                          if (e.target.value) {
                            performEmotionClustering(e.target.value);
                          }
                        }}
                        InputLabelProps={{ shrink: true }}
                        size="medium"
                        sx={{ minWidth: 200 }}
                      />
                      <Button
                        variant="contained"
                        onClick={() => performEmotionClustering(clusteringDate)}
                        disabled={clusteringLoading || !clusteringDate}
                        sx={{
                          backgroundColor: '#9c27b0',
                          '&:hover': { backgroundColor: '#7b1fa2' },
                          textTransform: 'none',
                          fontWeight: 600
                        }}
                      >
                        {clusteringLoading ? '분석 중...' : '클러스터링 분석'}
                      </Button>
                    </Box>
                  </Box>

                  {/* 로딩 상태 */}
                  {clusteringLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <Typography color="text.secondary" variant="h6">
                        감정 클러스터링 분석 중...
                      </Typography>
                    </Box>
                  )}

                  {/* 클러스터링 결과 */}
                  {!clusteringLoading && clusteringData.length > 0 && (
                    <Box>
                      {/* 감정 그룹 클러스터 */}
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        👥 감정 그룹 클러스터링 ({clusteringDate})
                      </Typography>
                      
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: '1fr 1fr',
                          md: '1fr 1fr 1fr'
                        },
                        gap: 2, 
                        mb: 4,
                        width: '100%'
                      }}>
                        {clusteringData.map((cluster) => (
                          <Box key={cluster.id}>
                            <Card sx={{ 
                              height: '100%',
                              borderLeft: `6px solid ${cluster.color}`,
                              position: 'relative',
                              overflow: 'visible'
                            }}>
                              <CardContent>
                                {/* 클러스터 제목 */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                  <Box
                                    sx={{
                                      width: 20,
                                      height: 20,
                                      backgroundColor: cluster.color,
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '12px',
                                      color: 'white',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    {cluster.students.length}
                                  </Box>
                                  <Typography variant="h6" sx={{ 
                                    fontWeight: 600,
                                    color: cluster.color
                                  }}>
                                    {cluster.label}
                                  </Typography>
                                </Box>

                                {/* 학생 목록 */}
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    참여 학생 ({cluster.students.length}명):
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {cluster.students.map((student) => (
                                      <Chip
                                        key={student.id}
                                        label={student.name}
                                        size="small"
                                        sx={{
                                          backgroundColor: `${cluster.color}15`,
                                          color: cluster.color,
                                          border: `1px solid ${cluster.color}40`,
                                          fontWeight: 500,
                                          cursor: 'pointer',
                                          '&:hover': {
                                            backgroundColor: `${cluster.color}25`,
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                          },
                                          transition: 'all 0.2s ease-in-out'
                                        }}
                                        onMouseEnter={(e) => {
                                          setHoveredStudent(student);
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setTooltipPosition({
                                            x: rect.left + rect.width / 2,
                                            y: rect.top - 10
                                          });
                                        }}
                                        onMouseLeave={() => {
                                          setHoveredStudent(null);
                                        }}
                                      />
                                    ))}
                                  </Box>
                                </Box>

                                {/* 그룹 통계 */}
                                {cluster.students.length > 0 && (
                                  <Box sx={{ 
                                    backgroundColor: `${cluster.color}08`,
                                    borderRadius: 2,
                                    p: 2,
                                    border: `1px solid ${cluster.color}20`
                                  }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                      📊 그룹 특성
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                                      평균 감정 점수: {(cluster.students.reduce((sum, s) => sum + s.score, 0) / cluster.students.length).toFixed(1)}/5.0
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                                      평균 감정 강도: {(cluster.students.reduce((sum, s) => sum + s.intensity, 0) / cluster.students.length).toFixed(1)}/5
                                    </Typography>
                                    <Typography variant="body2">
                                      주요 감정: {(() => {
                                        const emotionCount = cluster.students.reduce((acc, s) => {
                                          if (s.emotion) {
                                            acc[s.emotion] = (acc[s.emotion] || 0) + 1;
                                          }
                                          return acc;
                                        }, {});
                                        
                                        return Object.entries(emotionCount)
                                          .sort(([,a], [,b]) => b - a)
                                          .slice(0, 3)
                                          .map(([emotion, count]) => `${emotion}(${count})`)
                                          .join(', ') || '데이터 없음';
                                      })()}
                                    </Typography>
                                  </Box>
                                )}
                              </CardContent>
                            </Card>
                          </Box>
                        ))}
                      </Box>

                      {/* 호버 툴팁 */}
                      {hoveredStudent && (
                        <Box
                          sx={{
                            position: 'fixed',
                            left: tooltipPosition.x,
                            top: tooltipPosition.y,
                            transform: 'translateX(-50%) translateY(-100%)',
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            color: 'white',
                            padding: '12px 16px',
                            borderRadius: 2,
                            fontSize: '14px',
                            fontWeight: 500,
                            zIndex: 1000,
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              top: '100%',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              border: '6px solid transparent',
                              borderTopColor: 'rgba(0, 0, 0, 0.9)'
                            }
                          }}
                        >
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                              👤 {hoveredStudent.name}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              😊 {hoveredStudent.emotion}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              📊 점수: {hoveredStudent.score.toFixed(1)}/5.0
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              💪 강도: {hoveredStudent.intensity}/5
                            </Typography>
                            {hoveredStudent.cause && (
                              <Typography variant="body2">
                                💭 원인: {hoveredStudent.cause}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )}

                      {/* AI 분석 결과 */}
                      {clusteringAnalysis && !clusteringAnalysis.error && (
                        <Box>
                          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            🤖 AI 클러스터링 분석 결과
                          </Typography>
                          
                          {/* 전체 요약 */}
                          <Card sx={{ mb: 3, backgroundColor: '#f8f9fa' }}>
                            <CardContent>
                              <Typography variant="h6" sx={{ mb: 1, color: '#1976d2' }}>
                                📋 전체 분석 요약
                              </Typography>
                              <Typography variant="body1">
                                {clusteringAnalysis.overallSummary}
                              </Typography>
                            </CardContent>
                          </Card>

                          {/* 클러스터별 분석 */}
                          <Box sx={{ 
                            display: 'grid', 
                            gridTemplateColumns: {
                              xs: '1fr',
                              sm: '1fr 1fr',
                              md: '1fr 1fr 1fr'
                            },
                            gap: 2, 
                            mb: 3,
                            width: '100%'
                          }}>
                            {clusteringAnalysis.clusterAnalysis && clusteringAnalysis.clusterAnalysis.map((analysis, index) => {
                              const cluster = clusteringData.find(c => c.label === analysis.clusterLabel);
                              return (
                                <Box key={index}>
                                  <Card sx={{ 
                                    height: '100%',
                                    borderLeft: `4px solid ${cluster?.color || '#ccc'}`
                                  }}>
                                    <CardContent>
                                      <Typography variant="h6" sx={{ 
                                        mb: 1, 
                                        color: cluster?.color || '#666',
                                        fontWeight: 600
                                      }}>
                                        {analysis.clusterLabel}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        학생 수: {analysis.studentCount}명
                                      </Typography>
                                      <Typography variant="body2" sx={{ mb: 1 }}>
                                        <strong>특성:</strong> {analysis.characteristics}
                                      </Typography>
                                      <Typography variant="body2" sx={{ mb: 1 }}>
                                        <strong>공통 요인:</strong> {analysis.commonFactors}
                                      </Typography>
                                      <Typography variant="body2" sx={{ mb: 1 }}>
                                        <strong>지도 방안:</strong> {analysis.teachingStrategy}
                                      </Typography>
                                      <Chip
                                        label={`관심도: ${analysis.attentionLevel}`}
                                        size="small"
                                        color={
                                          analysis.attentionLevel === '높음' ? 'error' : 
                                          analysis.attentionLevel === '보통' ? 'warning' : 'success'
                                        }
                                        sx={{ mt: 1 }}
                                      />
                                    </CardContent>
                                  </Card>
                                </Box>
                              );
                            })}
                          </Box>

                          {/* 전체 권장사항 */}
                          <Card sx={{ backgroundColor: '#e8f5e8' }}>
                            <CardContent>
                              <Typography variant="h6" sx={{ mb: 1, color: '#2e7d32' }}>
                                💡 교사 권장사항
                              </Typography>
                              <Typography variant="body1" sx={{ mb: 2 }}>
                                {clusteringAnalysis.recommendations}
                              </Typography>
                              <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#666' }}>
                                <strong>교실 분위기:</strong> {clusteringAnalysis.classroomMood}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* 에러 상태 */}
                  {!clusteringLoading && clusteringAnalysis?.error && (
                    <Box sx={{ textAlign: 'center', p: 4 }}>
                      <Typography color="text.secondary" variant="h6">
                        {clusteringAnalysis.error}
                      </Typography>
                    </Box>
                  )}

                  {/* 데이터 없음 */}
                  {!clusteringLoading && clusteringData.length === 0 && clusteringDate && !clusteringAnalysis?.error && (
                    <Box sx={{ textAlign: 'center', p: 4 }}>
                      <Typography color="text.secondary" variant="h6">
                        😔 선택한 날짜({clusteringDate})에 충분한 감정 데이터가 없습니다.
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        다른 날짜를 선택해주세요.
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* 주간분석 탭 */}
          {activeTab === 3 && (
            <>
              <Card sx={{ 
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)', 
                borderRadius: 3,
                border: '1px solid #e3f2fd'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      mb: 3, 
                      fontWeight: 700, 
                      color: '#1976d2',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    📅 주간 감정 분석
                  </Typography>

                  {/* 주간 선택 */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      분석할 주간 선택 (월요일 기준)
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <TextField
                        type="date"
                        value={selectedWeekStart}
                        onChange={(e) => setSelectedWeekStart(e.target.value)}
                        sx={{ 
                          minWidth: 200,
                          '& .MuiInputBase-root': {
                            borderRadius: 2,
                            backgroundColor: '#f8f9fa'
                          }
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={() => loadWeeklyData(selectedWeekStart)}
                        disabled={weeklyLoading}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600
                        }}
                      >
                        {weeklyLoading ? '분석 중...' : '주간 분석 시작'}
                      </Button>
                    </Box>
                  </Box>

                  {/* 로딩 상태 */}
                  {weeklyLoading && (
                    <Box sx={{ textAlign: 'center', p: 4 }}>
                      <Typography color="text.secondary" variant="h6">
                        📊 주간 데이터를 분석하고 있습니다...
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        잠시만 기다려주세요.
                      </Typography>
                    </Box>
                  )}

                  {/* 주간 분석 결과 */}
                  {!weeklyLoading && weeklyData.length > 0 && (
                    <Box>
                      {/* 주간 감정 그래프 */}
                      <Card sx={{ mb: 3, backgroundColor: '#f8f9fa' }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            📊 주간 감정 동향 비교
                          </Typography>
                          <Box sx={{ height: 400, mb: 2 }}>
                            <Line 
                              data={{
                                labels: weeklyData.map(day => day.dayName),
                                datasets: [
                                  {
                                    label: '이번 주 긍정 감정',
                                    data: weeklyData.map(day => 
                                      (day.emotionCounts['기쁨'] || 0) + 
                                      (day.emotionCounts['행복'] || 0) + 
                                      (day.emotionCounts['신남'] || 0)
                                    ),
                                    borderColor: '#4caf50',
                                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                    fill: true,
                                    tension: 0.4
                                  },
                                  {
                                    label: '이번 주 부정 감정',
                                    data: weeklyData.map(day => 
                                      (day.emotionCounts['슬픔'] || 0) + 
                                      (day.emotionCounts['화남'] || 0) + 
                                      (day.emotionCounts['스트레스'] || 0)
                                    ),
                                    borderColor: '#f44336',
                                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                    fill: true,
                                    tension: 0.4
                                  },
                                  {
                                    label: '평균 긍정 감정',
                                    data: weeklyAverage.map(day => 
                                      (day.emotionCounts['기쁨'] || 0) + 
                                      (day.emotionCounts['행복'] || 0) + 
                                      (day.emotionCounts['신남'] || 0)
                                    ),
                                    borderColor: '#81c784',
                                    backgroundColor: 'transparent',
                                    borderDash: [5, 5],
                                    fill: false,
                                    tension: 0.4
                                  },
                                  {
                                    label: '평균 부정 감정',
                                    data: weeklyAverage.map(day => 
                                      (day.emotionCounts['슬픔'] || 0) + 
                                      (day.emotionCounts['화남'] || 0) + 
                                      (day.emotionCounts['스트레스'] || 0)
                                    ),
                                    borderColor: '#ef5350',
                                    backgroundColor: 'transparent',
                                    borderDash: [5, 5],
                                    fill: false,
                                    tension: 0.4
                                  }
                                ]
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'top',
                                    labels: {
                                      usePointStyle: true,
                                      pointStyle: 'circle'
                                    }
                                  },
                                  title: {
                                    display: true,
                                    text: '이번 주 vs 평균 감정 비교'
                                  }
                                },
                                scales: {
                                  y: {
                                    beginAtZero: true,
                                    title: {
                                      display: true,
                                      text: '학생 수'
                                    }
                                  },
                                  x: {
                                    title: {
                                      display: true,
                                      text: '요일'
                                    }
                                  }
                                }
                              }}
                            />
                          </Box>
                        </CardContent>
                      </Card>

                      {/* 주간 분석 상세 */}
                      {weeklyAnalysis && (
                        <Card sx={{ mb: 3, backgroundColor: '#e8f5e8' }}>
                          <CardContent>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#2e7d32' }}>
                              🤖 AI 주간 분석 리포트
                            </Typography>
                            <Box sx={{ 
                              whiteSpace: 'pre-wrap', 
                              lineHeight: 1.7,
                              fontSize: '0.95rem',
                              color: '#333'
                            }}>
                              {weeklyAnalysis}
                            </Box>
                          </CardContent>
                        </Card>
                      )}

                      {/* 주간 상세 데이터 */}
                      <Grid container spacing={2}>
                        {weeklyData.map((day, index) => (
                          <Grid item xs={12} md={6} lg={4} key={day.dayName}>
                            <Card sx={{ backgroundColor: '#f3e5f5' }}>
                              <CardContent>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                  {day.dayName}요일 ({day.date})
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>참여 학생:</strong> {day.students.length}명
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 2 }}>
                                  <strong>평균 강도:</strong> {day.averageIntensity.toFixed(1)}
                                </Typography>
                                <Box>
                                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                                    감정 분포:
                                  </Typography>
                                  {Object.entries(day.emotionCounts).map(([emotion, count]) => (
                                    <Chip
                                      key={emotion}
                                      label={`${emotion} ${count}명`}
                                      size="small"
                                      sx={{ 
                                        mr: 0.5, 
                                        mb: 0.5,
                                        backgroundColor: emotion === '기쁨' || emotion === '행복' || emotion === '신남' 
                                          ? '#c8e6c9' : '#ffcdd2'
                                      }}
                                    />
                                  ))}
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {/* 데이터 없음 */}
                  {!weeklyLoading && weeklyData.length === 0 && selectedWeekStart && (
                    <Box sx={{ textAlign: 'center', p: 4 }}>
                      <Typography color="text.secondary" variant="h6">
                        😔 선택한 주간에 감정 데이터가 없습니다.
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        다른 주간을 선택해주세요.
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </Box>
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
    </Portal>
  );
};

export default EmotionDashboardModal;
