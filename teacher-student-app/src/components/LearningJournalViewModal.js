import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, updateDoc, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import ImageViewerModal from './ImageViewerModal';
import { analyzeDataWithGemini, getDemoAnalysisResult, analyzeDataLocally } from '../utils/aiAnalysis';
import WordCloud from './WordCloud';

const PERIODS = ['1교시', '2교시', '3교시', '4교시', '5교시', '6교시'];

// 기본 학생 목록 (실제 환경에서는 다른 소스에서 가져와야 할 수도 있음)
const DEFAULT_STUDENTS = [
  '김규민', '김범준', '김성준', '김수겸', '김주원', '문기훈', '박동하', '백주원',
  '백지원', '손정환', '이도윤', '이예준', '임재희', '조은빈', '조찬희', '최서윤',
  '최서현', '한서우', '황리아', '김주하', '이해원', '하지수', '테스트'
];

const LearningJournalViewModal = ({ isOpen, onClose, selectedDate, refreshData }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState(
    selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState('전체');
  const [visiblePeriods, setVisiblePeriods] = useState({
    '전체': true,
    '1교시': true,
    '2교시': true,
    '3교시': true,
    '4교시': true,
    '5교시': true,
    '6교시': true
  });

  // AI 분석 전용 필터 상태 (표보기와 독립)
  const [aiSelectedDate, setAiSelectedDate] = useState(
    selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [aiVisiblePeriods, setAiVisiblePeriods] = useState({
    '전체': true,
    '1교시': true,
    '2교시': true,
    '3교시': true,
    '4교시': true,
    '5교시': true,
    '6교시': true
  });
  const [showTableView, setShowTableView] = useState(true);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [draggedEntry, setDraggedEntry] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);
  const [showMoveConfirmation, setShowMoveConfirmation] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState(null);
  const [isAnonymousMode, setIsAnonymousMode] = useState(false);

  const getScoreColor = (score, type) => {
    const numScore = parseFloat(score) || 0;
    if (type === 'understanding') {
      if (numScore >= 4.5) return '#2e7d32';
      if (numScore >= 3.5) return '#66bb6a';
      if (numScore >= 2.5) return '#ffb74d';
      if (numScore >= 1.5) return '#ff9800';
      return '#f44336';
    } else {
      if (numScore >= 4.5) return '#c62828';
      if (numScore >= 3.5) return '#e53935';
      if (numScore >= 2.5) return '#ff5722';
      if (numScore >= 1.5) return '#ff7043';
      return '#ff8a65';
    }
  };

  // 학생 목록 가져오기
  const fetchStudents = useCallback(async () => {
    try {
      const studentsRef = collection(db, 'students');
      const querySnapshot = await getDocs(studentsRef);
      const studentNames = [];
      querySnapshot.forEach((doc) => {
        const studentData = doc.data();
        if (studentData.name) {
          studentNames.push(studentData.name);
        }
      });

      // Firestore에서 가져온 학생 목록과 기본 목록을 합치기
      const allStudentNames = [...new Set([...studentNames, ...DEFAULT_STUDENTS])];
      setStudents(allStudentNames.sort());
    } catch (error) {
      console.error('학생 목록 가져오기 오류:', error);
      // 오류 시 기본 학생 목록 사용
      setStudents(DEFAULT_STUDENTS);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const journals = [];
      
      // selectedDateFilter가 있으면 해당 날짜, 없으면 오늘 날짜
      const targetDateStr = selectedDateFilter || new Date().toISOString().split('T')[0];
      
      try {
        const dayRef = collection(db, `journals/${targetDateStr}/entries`);
        const querySnapshot = await getDocs(dayRef);
        querySnapshot.forEach((doc) => {
          journals.push({
            id: doc.id,
            date: targetDateStr,
            ...doc.data()
          });
        });
      } catch (error) {
        console.log(`${targetDateStr} 데이터 없음`);
      }

      journals.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.date);
        const dateB = b.createdAt?.toDate?.() || new Date(b.date);
        return dateB - dateA;
      });
      
      setData(journals);
    } catch (error) {
      console.error('데이터 가져오기 오류:', error);
    }
    setLoading(false);
  }, [selectedDateFilter]);

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
      fetchData();
    }
  }, [isOpen, fetchStudents, fetchData]);
  
  // selectedDateFilter가 변경될 때마다 데이터를 다시 가져오기
  useEffect(() => {
    if (isOpen && selectedDateFilter) {
      fetchData();
    }
  }, [selectedDateFilter, isOpen, fetchData]);

  // CSV 다운로드 기능
  const downloadCSV = () => {
    try {
      // 학생별 데이터 구성
      const studentData = {};
      students.forEach(studentName => {
        studentData[studentName] = {};
        PERIODS.forEach(period => {
          studentData[studentName][period] = null;
        });
      });

      // 데이터를 학생별로 분류
      data.forEach(entry => {
        if (studentData[entry.studentName]) {
          studentData[entry.studentName][entry.period] = entry;
        }
      });

      // CSV 헤더 구성 (구글 스프레드시트와 동일한 구조)
      const headers = ['학생 이름', '1교시', '2교시', '3교시', '4교시', '5교시', '6교시'];
      
      // CSV 데이터 구성
      const csvData = [];
      csvData.push(headers);

      // 각 학생별로 행 생성
      students.forEach(studentName => {
        const row = [studentName];
        
        PERIODS.forEach(period => {
          const entry = studentData[studentName][period];
          if (entry) {
            // 키워드와 내용을 합쳐서 하나의 셀에 저장 (구글 스프레드시트 형식)
            const keyword = entry.keyword || '';
            const content = entry.content || '';
            const understanding = entry.understanding || '';
            const difficulty = entry.difficulty || '';
            
            // 이모지와 점수를 포함한 형태로 구성
            let cellContent = '';
            if (keyword) {
              cellContent += keyword;
            }
            if (content) {
              if (cellContent) cellContent += '\n';
              cellContent += content;
            }
            if (understanding || difficulty) {
              if (cellContent) cellContent += '\n';
              const understandingEmojis = '😊'.repeat(Math.floor(parseFloat(understanding) || 0));
              const difficultyEmojis = '❤️'.repeat(Math.floor(parseFloat(difficulty) || 0));
              cellContent += understandingEmojis + difficultyEmojis;
            }
            
            row.push(cellContent);
          } else {
            row.push(''); // 빈 셀
          }
        });
        
        csvData.push(row);
      });

      // CSV 문자열 생성
      const csvContent = csvData.map(row => 
        row.map(cell => {
          // 셀 내용에 쉼표, 따옴표, 줄바꿈이 있으면 따옴표로 감싸기
          const cellStr = String(cell || '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ).join('\n');

      // BOM 추가하여 한글 깨짐 방지
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
      
      // 파일명 생성 (날짜 포함)
      const fileName = `학습일지_${selectedDateFilter || new Date().toISOString().split('T')[0]}.csv`;
      
      // 다운로드 실행
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
    } catch (error) {
      console.error('CSV 다운로드 오류:', error);
      alert('CSV 다운로드 중 오류가 발생했습니다.');
    }
  };

  // 선택된 교시 수에 따른 동적 열 너비 계산
  const getColumnWidth = () => {
    const selectedPeriodCount = PERIODS.filter(period => visiblePeriods[period]).length;
    if (selectedPeriodCount === 0) return '300px';
    
    // 총 테이블 너비에서 학생명 열을 제외하고 교시 열들로 균등분배
    const availableWidth = 100; // percentage 기준
    const studentNameColumnWidth = 10; // percentage (15% → 10%로 축소)
    const periodColumnWidth = (availableWidth - studentNameColumnWidth) / selectedPeriodCount;
    
    return `${periodColumnWidth}%`;
  };

  // 표보기용 교시 필터 체크박스 핸들러
  const handlePeriodCheckboxChange = (period) => {
    if (period === '전체') {
      // 전체 체크/언체크
      const allChecked = visiblePeriods['전체'];
      const newState = {};
      Object.keys(visiblePeriods).forEach(key => {
        newState[key] = !allChecked;
      });
      setVisiblePeriods(newState);
    } else {
      // 개별 교시 체크/언체크
      const newState = { ...visiblePeriods };
      newState[period] = !newState[period];
      
      // 모든 교시가 선택되면 전체도 체크, 하나라도 해제되면 전체 해제
      const periodKeys = ['1교시', '2교시', '3교시', '4교시', '5교시', '6교시'];
      const allPeriodsChecked = periodKeys.every(key => newState[key]);
      newState['전체'] = allPeriodsChecked;
      
      setVisiblePeriods(newState);
    }
  };

  // AI 분석용 교시 필터 체크박스 핸들러 (독립적)
  const handleAiPeriodCheckboxChange = (period) => {
    if (period === '전체') {
      // 전체 체크/언체크
      const allChecked = aiVisiblePeriods['전체'];
      const newState = {};
      Object.keys(aiVisiblePeriods).forEach(key => {
        newState[key] = !allChecked;
      });
      setAiVisiblePeriods(newState);
    } else {
      // 개별 교시 체크/언체크
      const newState = { ...aiVisiblePeriods };
      newState[period] = !newState[period];
      
      // 모든 교시가 선택되면 전체도 체크, 하나라도 해제되면 전체 해제
      const periodKeys = ['1교시', '2교시', '3교시', '4교시', '5교시', '6교시'];
      const allPeriodsChecked = periodKeys.every(key => newState[key]);
      newState['전체'] = allPeriodsChecked;
      
      setAiVisiblePeriods(newState);
    }
  };

  const handleMoveEntry = async (entry, newPeriod) => {
    try {
      await updateDoc(doc(db, `journals/${entry.date}/entries`, entry.id), {
        period: newPeriod
      });
      
      setData(prevData =>
        prevData.map(item =>
          item.id === entry.id
            ? { ...item, period: newPeriod }
            : item
        )
      );
      
      if (refreshData) refreshData();
    } catch (error) {
      console.error('교시 이동 오류:', error);
      alert('교시 이동 중 오류가 발생했습니다.');
    }
  };

  const handleImageView = (entry) => {
    setSelectedImageData({
      imageUrl: entry.imageBase64 || entry.imageUrl, // Base64 우선, 기존 Storage URL 호환
      studentName: entry.studentName,
      period: entry.period,
      date: entry.date
    });
    setShowImageViewer(true);
  };

  const closeImageViewer = () => {
    setShowImageViewer(false);
    setSelectedImageData(null);
  };

  // AI 학습분석 실행 함수
  const executeAIAnalysis = async () => {
    setAiAnalysisLoading(true);
    setAiAnalysisResult(null);

    try {
      // AI 전용 필터를 사용하여 데이터 필터링
      let filteredData = data.filter(entry => {
        // 날짜 필터 (AI 전용)
        if (aiSelectedDate && entry.date !== aiSelectedDate) {
          return false;
        }
        
        // 교시 필터 (AI 전용, 선택된 교시만)
        const selectedPeriods = Object.keys(aiVisiblePeriods).filter(period => 
          aiVisiblePeriods[period] && period !== '전체'
        );
        
        if (selectedPeriods.length > 0 && !selectedPeriods.includes(entry.period)) {
          return false;
        }
        
        // 내용이 있는 데이터만
        return entry.content && entry.content.trim().length > 0;
      });

      if (filteredData.length === 0) {
        alert('선택된 조건에 해당하는 학습 데이터가 없습니다.');
        return;
      }

      // AI 분석용 데이터 포맷팅
      const analysisData = filteredData.map(entry => ({
        name: entry.studentName || '이름없음',
        content: entry.content
      }));

      console.log('AI 분석 시작:', analysisData);

      // 먼저 Gemini AI 분석 시도 
      const result = await analyzeDataWithGemini(analysisData);
      
      // Gemini 분석 성공 시
      if (!result.demo && !result.error) {
        console.log('Gemini AI 분석 성공:', result);
        setAiAnalysisResult(result);
        return;
      }
      
      // Gemini 분석 실패 시 로컬 분석으로 백업
      console.log('Gemini 분석 실패 또는 API 키 없음, 로컬 분석 시도');
      try {
        const localResult = analyzeDataLocally(analysisData);
        if (localResult.error) {
          throw new Error(localResult.error);
        }
        console.log('로컬 분석 성공:', localResult);
        setAiAnalysisResult(localResult);
      } catch (localError) {
        console.log('로컬 분석도 실패, 데모 결과 사용:', localError);
        const demoResult = getDemoAnalysisResult();
        setAiAnalysisResult(demoResult);
      }

    } catch (error) {
      console.error('AI 분석 오류:', error);
      alert(`AI 분석 중 오류가 발생했습니다: ${error.message}`);
      
      // 오류 시 로컬 분석 시도
      try {
        // 다시 데이터 필터링
        let errorFilteredData = data.filter(entry => {
          if (selectedDateFilter && entry.date !== selectedDateFilter) return false;
          const selectedPeriods = Object.keys(visiblePeriods).filter(period => 
            visiblePeriods[period] && period !== '전체'
          );
          if (selectedPeriods.length > 0 && !selectedPeriods.includes(entry.period)) return false;
          return entry.content && entry.content.trim().length > 0;
        });
        
        const errorAnalysisData = errorFilteredData.map(entry => ({
          name: entry.studentName || '이름없음',
          content: entry.content
        }));
        
        const localFallback = analyzeDataLocally(errorAnalysisData);
        setAiAnalysisResult(localFallback);
      } catch (fallbackError) {
        console.error('로컬 분석도 실패:', fallbackError);
        const demoResult = getDemoAnalysisResult();
        setAiAnalysisResult(demoResult);
      }
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // 익명 모드 Firebase 동기화
  const toggleAnonymousMode = async () => {
    const newMode = !isAnonymousMode;
    setIsAnonymousMode(newMode);
    
    try {
      await setDoc(doc(db, 'settings', 'anonymousMode'), {
        enabled: newMode,
        updatedAt: new Date(),
        updatedBy: 'teacher'
      });
    } catch (error) {
      console.error('익명 모드 설정 저장 실패:', error);
    }
  };

  // 익명 모드 상태 실시간 구독
  useEffect(() => {
    if (!isOpen) return;

    const anonymousModeRef = doc(db, 'settings', 'anonymousMode');
    const unsubscribe = onSnapshot(anonymousModeRef, (doc) => {
      if (doc.exists()) {
        setIsAnonymousMode(doc.data().enabled || false);
      }
    }, (error) => {
      console.error('익명 모드 상태 구독 실패:', error);
    });

    return unsubscribe;
  }, [isOpen]);

  const handleDragStart = (e, entry) => {
    setDraggedEntry({
      ...entry,
      originalPeriod: entry.period
    });
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
    e.target.style.cursor = 'grabbing';
    e.target.style.zIndex = '1000';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    e.target.style.cursor = 'grab';
    e.target.style.zIndex = 'auto';
    e.target.style.transform = 'none';
    setDraggedEntry(null);
    setDragOverCell(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (e, period, studentName) => {
    e.preventDefault();
    if (draggedEntry && draggedEntry.studentName === studentName) {
      setDragOverCell(`${studentName}-${period}`);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverCell(null);
    }
  };

  const handleDrop = (e, targetPeriod, targetStudent) => {
    e.preventDefault();
    setDragOverCell(null);
    if (!draggedEntry || targetPeriod === draggedEntry.originalPeriod) {
      return;
    }
    
    if (draggedEntry.studentName !== targetStudent) {
      alert(`⚠️ ${draggedEntry.studentName}의 데이터는 다른 학생 행으로 이동할 수 없습니다.`);
      return;
    }
    
    const existingEntry = data.find(entry => 
      entry.studentName === targetStudent && entry.period === targetPeriod
    );
    
    if (existingEntry) {
      setPendingMove({ 
        draggedEntry, 
        targetPeriod, 
        targetStudent,
        existingEntry,
        isOverwrite: true
      });
      setShowMoveConfirmation(true);
    } else {
      setPendingMove({ 
        draggedEntry, 
        targetPeriod, 
        targetStudent,
        existingEntry: null,
        isOverwrite: false
      });
      setShowMoveConfirmation(true);
    }
  };

  const confirmMove = async () => {
    if (pendingMove) {
      await handleMoveEntry(pendingMove.draggedEntry, pendingMove.targetPeriod);
    }
    setShowMoveConfirmation(false);
    setPendingMove(null);
  };

  const cancelMove = () => {
    setShowMoveConfirmation(false);
    setPendingMove(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes learningJournalBorder {
          0% { border-color: #ff4444; }
          25% { border-color: #ff8844; }
          50% { border-color: #ffdd44; }
          75% { border-color: #ff6b9d; }
          100% { border-color: #ff4444; }
        }
        .learning-journal-modal {
          animation: learningJournalBorder 3s infinite;
          border: 3px solid #ff4444;
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}>
        <div className="learning-journal-modal" style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '98vw',
          maxHeight: '98vh',
          width: '1932px',
          height: '90vh',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
        }}>
          {/* 헤더 */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e8eaed',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', margin: 0 }}>
                📚 학습일지 조회 🔍
              </h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#666' }}>
                  🏷 특정일 보기:
                </label>
                <input
                  type="date"
                  value={selectedDateFilter || ''}
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    setSelectedDateFilter(selectedValue || null);
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  min={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e1e5e9',
                    fontSize: '14px',
                    cursor: 'pointer',
                    backgroundColor: 'white'
                  }}
                />
                <button
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setSelectedDateFilter(today);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #1976d2',
                    backgroundColor: '#e3f2fd',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#1976d2',
                    cursor: 'pointer'
                  }}
                >
                  📅 오늘로 이동
                </button>
              </div>
              
              {/* 교시 필터 체크박스 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '24px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#666' }}>
                  ⏰ 교시 필터:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {['전체', '1교시', '2교시', '3교시', '4교시', '5교시', '6교시'].map(period => (
                    <label 
                      key={period}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: visiblePeriods[period] ? '#1976d2' : '#666',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={visiblePeriods[period]}
                        onChange={() => handlePeriodCheckboxChange(period)}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer'
                        }}
                      />
                      <span>{period}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#28a745',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onClick={downloadCSV}
              >
                📊 CSV 다운로드
              </button>

              <button
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onClick={() => {
                  // PDF 다운로드 기능 구현 예정
                  alert('PDF 다운로드 기능을 구현 중입니다.');
                }}
              >
                📄 PDF 다운로드
              </button>
              
              {/* 익명 모드 토글 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: isAnonymousMode ? '#fff3e0' : '#f8f9fa',
                border: isAnonymousMode ? '2px solid #ff9800' : '2px solid #e0e0e0',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={toggleAnonymousMode}
              title="학생 데이터 전광판에서 이름과 레벨을 익명으로 표시합니다"
              >
                <div style={{
                  width: '40px',
                  height: '20px',
                  backgroundColor: isAnonymousMode ? '#ff9800' : '#e0e0e0',
                  borderRadius: '10px',
                  position: 'relative',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: isAnonymousMode ? '22px' : '2px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: isAnonymousMode ? '#e65100' : '#666',
                  minWidth: '70px'
                }}>
                  학생 익명모드
                </span>
              </div>
            </div>
            
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ✕
            </button>
          </div>

          {/* 컨텐츠 영역 */}
          <div style={{ maxHeight: '75vh', overflowY: 'auto', padding: '24px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                데이터를 불러오는 중...
              </div>
            ) : (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#333',
                    margin: 0
                  }}>
                    📊 학습데이터 ({data.length}개)
                  </h3>
                  
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center'
                  }}>
                    <select
                      value={selectedPeriodFilter}
                      onChange={(e) => setSelectedPeriodFilter(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e1e5e9',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    >
                      <option value="전체">🕐 전체 교시</option>
                      {PERIODS.map(period => (
                        <option key={period} value={period}>
                          🕐 {period}
                        </option>
                      ))}
                      <option value="작성된교시">✏️ 작성된 교시</option>
                    </select>
                  </div>
                </div>
                
                {/* 뷰 전환 버튼 */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <button
                    onClick={() => {
                      setShowTableView(false);
                      setShowAIAnalysis(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: (!showTableView && !showAIAnalysis) ? 'none' : '1px solid #e1e5e9',
                      backgroundColor: (!showTableView && !showAIAnalysis) ? '#1976d2' : 'white',
                      color: (!showTableView && !showAIAnalysis) ? 'white' : '#666',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    목록 보기
                  </button>
                  <button
                    onClick={() => {
                      setShowTableView(true);
                      setShowAIAnalysis(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: (showTableView && !showAIAnalysis) ? 'none' : '1px solid #e1e5e9',
                      backgroundColor: (showTableView && !showAIAnalysis) ? '#1976d2' : 'white',
                      color: (showTableView && !showAIAnalysis) ? 'white' : '#666',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    표 보기
                  </button>
                  <button
                    onClick={() => setShowAIAnalysis(true)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: showAIAnalysis ? 'none' : '1px solid #e1e5e9',
                      backgroundColor: showAIAnalysis ? '#1976d2' : 'white',
                      color: showAIAnalysis ? 'white' : '#666',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    AI 학습분석
                  </button>
                </div>

                {showAIAnalysis ? (
                  // AI 학습분석 - 워드클라우드 및 분석 결과
                  <div style={{ 
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px',
                    border: '1px solid #e9ecef'
                  }}>
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#1976d2',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      AI 학습분석
                    </h4>
                    
                    {/* 날짜와 교시 선택 UI */}
                    <div style={{
                      backgroundColor: 'white',
                      padding: '16px',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      border: '1px solid #e1e5e9'
                    }}>
                      <h5 style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#333',
                        marginBottom: '12px'
                      }}>
                        📅 분석할 날짜와 교시를 선택하세요
                      </h5>
                      
                      {/* 날짜 선택 */}
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{
                          fontSize: '12px',
                          color: '#666',
                          marginBottom: '4px',
                          display: 'block'
                        }}>
                          날짜 선택
                        </label>
                        <input
                          type="date"
                          value={aiSelectedDate}
                          onChange={(e) => setAiSelectedDate(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #e1e5e9',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      
                      {/* 교시 선택 */}
                      <div>
                        <label style={{
                          fontSize: '12px',
                          color: '#666',
                          marginBottom: '8px',
                          display: 'block'
                        }}>
                          교시 선택 (복수 선택 가능)
                        </label>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}>
                          {PERIODS.map(period => (
                            <label key={period} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: aiVisiblePeriods[period] ? '#e3f2fd' : '#f5f5f5',
                              border: '1px solid ' + (aiVisiblePeriods[period] ? '#1976d2' : '#ddd')
                            }}>
                              <input
                                type="checkbox"
                                checked={aiVisiblePeriods[period]}
                                onChange={() => handleAiPeriodCheckboxChange(period)}
                                style={{ margin: 0 }}
                              />
                              {period}
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      {/* 분석 실행 버튼 */}
                      <button
                        onClick={executeAIAnalysis}
                        disabled={aiAnalysisLoading}
                        style={{
                          marginTop: '16px',
                          padding: '10px 20px',
                          backgroundColor: aiAnalysisLoading ? '#ccc' : '#1976d2',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: aiAnalysisLoading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {aiAnalysisLoading ? '🔄 분석 중...' : '🔍 AI 분석 실행'}
                      </button>
                    </div>
                    
                    {/* 분석 결과 영역 */}
                    {aiAnalysisResult ? (
                      <div style={{
                        display: 'flex',
                        gap: '20px',
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #e1e5e9',
                        minHeight: '70vh', // 화면 높이의 70%로 확장
                        maxHeight: '80vh'  // 최대 80%까지
                      }}>
                        {/* 좌측: 학생 데이터 목록 */}
                        <div style={{ 
                          flex: '1',
                          paddingRight: '20px',
                          borderRight: '1px solid #e1e5e9',
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          <h5 style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#1976d2',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <img src="/mindmap.png" alt="학생 데이터" style={{ width: '20px', height: '20px' }} />
                            학생 학습 내용
                          </h5>
                          
                          <div style={{ 
                            flex: '1',
                            overflowY: 'auto',
                            paddingRight: '8px',
                            maxHeight: 'calc(100vh - 350px)' // 화면 높이에 맞춰 동적 조정
                          }}>
                            {(() => {
                              // AI 전용 필터를 사용하여 실제 데이터 필터링
                              let filteredData = data.filter(entry => {
                                // 날짜 필터 (AI 전용)
                                if (aiSelectedDate && entry.date !== aiSelectedDate) {
                                  return false;
                                }
                                
                                // 교시 필터 (AI 전용, 선택된 교시만)
                                const selectedPeriods = Object.keys(aiVisiblePeriods).filter(period => 
                                  aiVisiblePeriods[period] && period !== '전체'
                                );
                                
                                if (selectedPeriods.length > 0 && !selectedPeriods.includes(entry.period)) {
                                  return false;
                                }
                                
                                // 내용이 있는 데이터만
                                return entry.content && entry.content.trim().length > 0;
                              });

                              if (filteredData.length === 0) {
                                return (
                                  <div style={{
                                    textAlign: 'center',
                                    color: '#666',
                                    padding: '40px 20px'
                                  }}>
                                    <img src="/data_bg.png" alt="빈 데이터" style={{ width: '60px', height: '60px', marginBottom: '12px', opacity: 0.5 }} />
                                    <p style={{ margin: 0 }}>선택된 조건에 해당하는 학습 데이터가 없습니다.</p>
                                  </div>
                                );
                              }

                              return filteredData.map((entry, index) => (
                                <div key={index} style={{
                                  backgroundColor: '#f8f9fa',
                                  padding: '12px',
                                  borderRadius: '8px',
                                  marginBottom: '12px',
                                  border: '1px solid #e9ecef'
                                }}>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '8px',
                                    gap: '8px'
                                  }}>
                                    <img src="/seat1.png" alt="학생" style={{ width: '16px', height: '16px' }} />
                                    <span style={{
                                      fontSize: '14px',
                                      fontWeight: 'bold',
                                      color: '#333'
                                    }}>
                                      {entry.studentName}
                                    </span>
                                    <span style={{
                                      fontSize: '12px',
                                      color: '#666',
                                      backgroundColor: '#e3f2fd',
                                      padding: '2px 6px',
                                      borderRadius: '4px'
                                    }}>
                                      {entry.period}
                                    </span>
                                  </div>
                                  <div style={{
                                    fontSize: '13px',
                                    color: '#555',
                                    lineHeight: '1.4',
                                    backgroundColor: 'white',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #e0e0e0'
                                  }}>
                                    {entry.content}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>

                        {/* 우측: 워드클라우드 및 분석 결과 */}
                        <div style={{ 
                          flex: '1',
                          paddingLeft: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          maxHeight: 'calc(70vh - 100px)', // 전체 모달 높이에 맞춤
                          overflowY: 'auto' // 내용이 많을 때 스크롤
                        }}>
                          {/* 워드클라우드 */}
                          {aiAnalysisResult.keywords && aiAnalysisResult.keywords.length > 0 && (
                            <div style={{ marginBottom: '24px' }}>
                              <h5 style={{
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: '#1976d2',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <img src="/data_bg.png" alt="워드클라우드" style={{ width: '20px', height: '20px' }} />
                                핵심 단어 워드클라우드
                              </h5>
                              <div style={{
                                backgroundColor: '#fafafa',
                                borderRadius: '8px',
                                padding: '16px',
                                border: '1px solid #e1e5e9',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}>
                                <WordCloud words={aiAnalysisResult.keywords} width={500} height={500} />
                              </div>
                            </div>
                          )}

                          {/* 메타인지 우수 학생 */}
                          {aiAnalysisResult.recommendations && aiAnalysisResult.recommendations.length > 0 && (
                            <div style={{ marginBottom: '24px' }}>
                              <h5 style={{
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: '#4caf50',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <img src="/lv11.png" alt="우수 학생" style={{ width: '18px', height: '18px' }} />
                                메타인지 우수 학생
                              </h5>
                              <div style={{
                                maxHeight: '300px', // 최대 높이 제한
                                overflowY: 'auto',  // 스크롤 가능하게
                                paddingRight: '8px'
                              }}>
                                {aiAnalysisResult.recommendations.map((rec, index) => (
                                  <div key={index} style={{
                                    backgroundColor: '#f1f8e9',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    border: '1px solid #c8e6c9',
                                    marginBottom: '8px',
                                    fontSize: '12px',
                                    wordWrap: 'break-word', // 긴 텍스트 줄바꿈
                                    lineHeight: '1.4'
                                  }}>
                                    <div style={{
                                      fontWeight: 'bold',
                                      color: '#2e7d32',
                                      marginBottom: '6px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}>
                                      <img src="/seat1.png" alt="학생" style={{ width: '14px', height: '14px' }} />
                                      {rec.name}
                                    </div>
                                    <div style={{
                                      color: '#666',
                                      marginBottom: '6px',
                                      fontStyle: 'italic',
                                      backgroundColor: 'white',
                                      padding: '6px',
                                      borderRadius: '3px',
                                      wordWrap: 'break-word',
                                      whiteSpace: 'pre-wrap' // 줄바꿈 유지
                                    }}>
                                      "{rec.quote}"
                                    </div>
                                    <div style={{ 
                                      color: '#2e7d32',
                                      wordWrap: 'break-word',
                                      whiteSpace: 'pre-wrap'
                                    }}>
                                      {rec.reason}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 피드백 제안 */}
                          {aiAnalysisResult.feedback_suggestions && aiAnalysisResult.feedback_suggestions.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                              <h5 style={{
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: '#ff9800',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <img src="/hangang.png" alt="피드백" style={{ width: '18px', height: '18px' }} />
                                피드백 제안
                              </h5>
                              <div style={{
                                maxHeight: '250px', // 최대 높이 제한
                                overflowY: 'auto',  // 스크롤 가능하게
                                paddingRight: '8px'
                              }}>
                                {aiAnalysisResult.feedback_suggestions.map((feedback, index) => (
                                  <div key={index} style={{
                                    backgroundColor: '#fff8e1',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    border: '1px solid #ffcc02',
                                    marginBottom: '8px',
                                    fontSize: '12px',
                                    wordWrap: 'break-word', // 긴 텍스트 줄바꿈
                                    lineHeight: '1.4'
                                  }}>
                                    <div style={{
                                      fontWeight: 'bold',
                                      color: '#e65100',
                                      marginBottom: '6px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}>
                                      <img src="/seat2.png" alt="학생" style={{ width: '14px', height: '14px' }} />
                                      {feedback.name}
                                    </div>
                                    <div style={{
                                      color: '#666',
                                      marginBottom: '6px',
                                      fontStyle: 'italic',
                                      backgroundColor: 'white',
                                      padding: '6px',
                                      borderRadius: '3px',
                                      wordWrap: 'break-word',
                                      whiteSpace: 'pre-wrap' // 줄바꿈 유지
                                    }}>
                                      "{feedback.quote}"
                                    </div>
                                    <div style={{ 
                                      color: '#e65100',
                                      wordWrap: 'break-word',
                                      whiteSpace: 'pre-wrap'
                                    }}>
                                      {feedback.suggestion}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 데모 모드 표시 */}
                          {aiAnalysisResult.demo && (
                            <div style={{
                              backgroundColor: '#e3f2fd',
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #2196f3',
                              fontSize: '11px',
                              color: '#1565c0',
                              textAlign: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}>
                              <img src="/logo192.png" alt="데모" style={{ width: '16px', height: '16px' }} />
                              이 결과는 데모 데이터입니다. 실제 Gemini API를 사용하려면 환경변수를 설정해주세요.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        backgroundColor: 'white',
                        padding: '40px',
                        borderRadius: '8px',
                        border: '1px solid #e1e5e9',
                        textAlign: 'center',
                        color: '#666'
                      }}>
                        <img src="/mindmap.png" alt="AI 분석" style={{ width: '48px', height: '48px', marginBottom: '16px', opacity: 0.6 }} />
                        <p style={{ margin: 0, fontSize: '14px' }}>
                          날짜와 교시를 선택한 후 "AI 분석 실행" 버튼을 클릭하세요.
                        </p>
                      </div>
                    )}
                  </div>
                ) : showTableView ? (
                  // 표 보기 - 학생별 교시 테이블
                  <div style={{ overflowX: 'auto' }}>
                    {(() => {
                      // 필터링된 데이터 계산
                      let filteredData = data;
                      
                      if (selectedDateFilter) {
                        filteredData = filteredData.filter(entry => 
                          entry.date === selectedDateFilter
                        );
                      }
                      
                      if (selectedPeriodFilter && selectedPeriodFilter !== '전체') {
                        if (selectedPeriodFilter === '작성된교시') {
                          filteredData = filteredData.filter(entry => entry.content && entry.content.trim());
                        } else {
                          filteredData = filteredData.filter(entry => entry.period === selectedPeriodFilter);
                        }
                      }

                      // 학생별로 데이터 그룹화
                      const studentData = {};
                      
                      // 데이터에서 발견된 학생들
                      const studentsFromData = [...new Set(filteredData.map(entry => entry.studentName))];
                      
                      // 실제 학생 목록과 데이터에서 발견된 학생들을 합치기
                      const allStudents = [...new Set([...students, ...studentsFromData])].sort();
                      
                      // 모든 학생에 대해 빈 구조 초기화
                      allStudents.forEach(studentName => {
                        studentData[studentName] = {};
                      });
                      
                      // 실제 데이터 채우기
                      filteredData.forEach(entry => {
                        if (studentData[entry.studentName]) {
                          studentData[entry.studentName][entry.period] = entry;
                        }
                      });

                      const studentNames = allStudents;

                      return (
                        <div style={{
                          overflowX: 'auto',
                          overflowY: 'visible',
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          backgroundColor: 'white'
                        }}>
                          <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '14px',
                            backgroundColor: 'white',
                            tableLayout: 'fixed'
                          }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f5f5f5' }}>
                              <th style={{
                                padding: '16px 8px',
                                textAlign: 'center',
                                fontWeight: '600',
                                color: '#333',
                                borderBottom: '2px solid #e8eaed',
                                width: '10%',
                                minWidth: '90px'
                              }}>
                                👤 학생명
                              </th>
                              {PERIODS.filter(period => visiblePeriods[period]).map(period => (
                                <th key={period} style={{
                                  padding: '16px 12px',
                                  textAlign: 'center',
                                  fontWeight: '600',
                                  color: '#333',
                                  borderBottom: '2px solid #e8eaed',
                                  width: getColumnWidth(),
                                  minWidth: '200px'
                                }}>
                                  🕐 {period}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {studentNames.map(studentName => (
                              <tr key={studentName} style={{
                                borderBottom: '1px solid #f0f0f0',
                                '&:hover': { backgroundColor: '#f9f9f9' }
                              }}>
                                <td style={{
                                  padding: '16px 8px',
                                  fontWeight: '600',
                                  color: '#333',
                                  backgroundColor: '#fafafa',
                                  borderRight: '1px solid #e8eaed',
                                  width: '10%',
                                  minWidth: '90px',
                                  textAlign: 'center'
                                }}>
                                  {studentName}
                                </td>
                                {PERIODS.filter(period => visiblePeriods[period]).map(period => {
                                  const entry = studentData[studentName][period];
                                  return (
                                    <td
                                      key={period}
                                      style={{
                                        padding: '8px',
                                        textAlign: 'center',
                                        borderRight: '1px solid #f0f0f0',
                                        backgroundColor: dragOverCell === `${studentName}-${period}` ? '#e3f2fd' : 'white',
                                        width: getColumnWidth(),
                                        minWidth: '200px',
                                        cursor: entry ? 'grab' : 'default',
                                        minHeight: '120px',
                                        position: 'relative',
                                        verticalAlign: 'top'
                                      }}
                                      onDragOver={handleDragOver}
                                      onDragEnter={(e) => handleDragEnter(e, period, studentName)}
                                      onDragLeave={handleDragLeave}
                                      onDrop={(e) => handleDrop(e, period, studentName)}
                                    >
                                      {entry ? (
                                        <div
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, entry)}
                                          onDragEnd={handleDragEnd}
                                          style={{
                                            padding: '10px',
                                            borderRadius: '8px',
                                            backgroundColor: 'white',
                                            border: '2px solid #e8eaed',
                                            cursor: 'grab',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                            transition: 'all 0.2s ease'
                                          }}
                                        >
                                          {/* 날짜 헤더 */}
                                          <div style={{ 
                                            marginBottom: '8px', 
                                            fontSize: '11px', 
                                            color: '#1976d2',
                                            fontWeight: '600',
                                            textAlign: 'center',
                                            backgroundColor: '#e3f2fd',
                                            padding: '2px 6px',
                                            borderRadius: '4px'
                                          }}>
                                            📅 {new Date(entry.date).toLocaleDateString('ko-KR')}
                                          </div>
                                          
                                          {/* 키워드/핵심 내용 영역 */}
                                          <div style={{
                                            backgroundColor: '#fff3e0',
                                            border: '1px solid #ffb74d',
                                            borderRadius: '6px',
                                            padding: '8px 10px',
                                            marginBottom: '8px',
                                            minHeight: '65px',
                                            maxHeight: 'none',
                                            overflow: 'visible'
                                          }}>
                                            <div style={{
                                              fontSize: '11px',
                                              fontWeight: '700',
                                              color: '#f57c00',
                                              marginBottom: '6px',
                                              textAlign: 'center',
                                              borderBottom: '1px solid #ffcc80',
                                              paddingBottom: '3px'
                                            }}>
                                              💫 핵심 키워드
                                            </div>
                                            <div style={{
                                              fontSize: '12px',
                                              fontWeight: '600',
                                              color: '#e65100',
                                              lineHeight: '1.3',
                                              textAlign: 'left',
                                              wordBreak: 'break-word',
                                              whiteSpace: 'normal'
                                            }}>
                                              {entry.keyword || '작성되지 않음'}
                                            </div>
                                          </div>

                                          {/* 학습 내용 영역 */}
                                          <div style={{
                                            backgroundColor: '#f3e5f5',
                                            border: '1px solid #ce93d8',
                                            borderRadius: '6px',
                                            padding: '8px 10px',
                                            marginBottom: '8px',
                                            minHeight: '70px',
                                            maxHeight: 'none',
                                            overflow: 'visible'
                                          }}>
                                            <div style={{
                                              fontSize: '11px',
                                              fontWeight: '700',
                                              color: '#7b1fa2',
                                              marginBottom: '6px',
                                              textAlign: 'center',
                                              borderBottom: '1px solid #ce93d8',
                                              paddingBottom: '3px'
                                            }}>
                                              📝 학습 내용
                                            </div>
                                            <div style={{
                                              fontSize: '11px',
                                              color: '#4a148c',
                                              lineHeight: '1.4',
                                              textAlign: 'left',
                                              wordBreak: 'break-word',
                                              whiteSpace: 'normal'
                                            }}>
                                              {/* 텍스트 내용 표시 */}
                                              <div style={{ marginBottom: entry.hasImage && (entry.imageBase64 || entry.imageUrl) ? '8px' : '0' }}>
                                                {entry.content || '작성되지 않음'}
                                              </div>
                                              
                                              {/* 이미지가 있으면 자료보기 버튼도 표시 */}
                                              {entry.hasImage && (entry.imageBase64 || entry.imageUrl) && (
                                                <button
                                                  onClick={() => handleImageView(entry)}
                                                  style={{
                                                    backgroundColor: '#e3f2fd',
                                                    color: '#1976d2',
                                                    border: '1px solid #bbdefb',
                                                    borderRadius: '6px',
                                                    padding: '6px 12px',
                                                    fontSize: '10px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    width: '100%',
                                                    justifyContent: 'center'
                                                  }}
                                                  onMouseOver={(e) => {
                                                    e.target.style.backgroundColor = '#bbdefb';
                                                  }}
                                                  onMouseOut={(e) => {
                                                    e.target.style.backgroundColor = '#e3f2fd';
                                                  }}
                                                >
                                                  📷 자료보기
                                                </button>
                                              )}
                                            </div>
                                          </div>

                                          {/* 이해도/만족도 영역 */}
                                          <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-around',
                                            gap: '8px',
                                            marginTop: '10px'
                                          }}>
                                            {/* 이해도 */}
                                            <div style={{
                                              backgroundColor: '#e8f5e8',
                                              border: '1px solid #4caf50',
                                              borderRadius: '20px',
                                              padding: '4px 8px',
                                              flex: 1,
                                              textAlign: 'center'
                                            }}>
                                              <div style={{
                                                fontSize: '9px',
                                                fontWeight: '600',
                                                color: '#2e7d32'
                                              }}>
                                                이해도
                                              </div>
                                              <div style={{
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                color: '#1b5e20',
                                                marginTop: '2px'
                                              }}>
                                                {entry.understanding || 0}/5
                                              </div>
                                            </div>

                                            {/* 만족도 */}
                                            <div style={{
                                              backgroundColor: '#ffebee',
                                              border: '1px solid #f44336',
                                              borderRadius: '20px',
                                              padding: '4px 8px',
                                              flex: 1,
                                              textAlign: 'center'
                                            }}>
                                              <div style={{
                                                fontSize: '9px',
                                                fontWeight: '600',
                                                color: '#d32f2f'
                                              }}>
                                                만족도
                                              </div>
                                              <div style={{
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                color: '#c62828',
                                                marginTop: '2px'
                                              }}>
                                                {entry.satisfaction || 0}/5
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div style={{
                                          padding: '40px 20px',
                                          textAlign: 'center',
                                          color: '#bbb',
                                          fontSize: '12px',
                                          borderRadius: '8px',
                                          backgroundColor: '#f9f9f9',
                                          border: '2px dashed #ddd'
                                        }}>
                                          📝<br />미작성
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  // 목록 보기 - 시간순 리스트
                  <div>
                    {(() => {
                      let filteredData = data;
                      
                      if (selectedDateFilter) {
                        filteredData = filteredData.filter(entry => 
                          entry.date === selectedDateFilter
                        );
                      }
                      
                      if (selectedPeriodFilter && selectedPeriodFilter !== '전체') {
                        if (selectedPeriodFilter === '작성된교시') {
                          filteredData = filteredData.filter(entry => entry.content && entry.content.trim());
                        } else {
                          filteredData = filteredData.filter(entry => entry.period === selectedPeriodFilter);
                        }
                      }

                      if (filteredData.length === 0) {
                        return (
                          <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            color: '#666',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '12px',
                            border: '1px solid #e9ecef'
                          }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                            <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>데이터가 없습니다</h3>
                            <p style={{ margin: 0, color: '#666' }}>
                              선택한 날짜와 교시에 해당하는 학습일지가 없습니다.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {filteredData.map((entry, index) => (
                            <div
                              key={entry.id || index}
                              style={{
                                padding: '20px',
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                border: '1px solid #e9ecef',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                              }}
                            >
                              {/* 헤더 정보 */}
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '16px',
                                paddingBottom: '12px',
                                borderBottom: '1px solid #e9ecef'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    color: '#1976d2'
                                  }}>
                                    👤 {entry.studentName}
                                  </span>
                                  <span style={{
                                    padding: '4px 12px',
                                    backgroundColor: '#e3f2fd',
                                    color: '#1976d2',
                                    borderRadius: '16px',
                                    fontSize: '13px',
                                    fontWeight: '600'
                                  }}>
                                    🕐 {entry.period}
                                  </span>
                                </div>
                                <div style={{
                                  fontSize: '13px',
                                  color: '#666',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  📅 {new Date(entry.date).toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    weekday: 'short'
                                  })}
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '20px' }}>
                                {/* 키워드 섹션 */}
                                <div style={{ flex: 1 }}>
                                  <div style={{
                                    backgroundColor: '#fff3e0',
                                    border: '1px solid #ffb74d',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    marginBottom: '16px'
                                  }}>
                                    <h4 style={{
                                      fontSize: '14px',
                                      fontWeight: '700',
                                      color: '#f57c00',
                                      margin: '0 0 8px 0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}>
                                      💫 핵심 키워드
                                    </h4>
                                    <div style={{
                                      fontSize: '15px',
                                      fontWeight: '600',
                                      color: '#e65100',
                                      lineHeight: '1.4'
                                    }}>
                                      {entry.keyword || '작성되지 않음'}
                                    </div>
                                  </div>
                                </div>

                                {/* 학습 내용 섹션 */}
                                <div style={{ flex: 2 }}>
                                  <div style={{
                                    backgroundColor: '#f3e5f5',
                                    border: '1px solid #ce93d8',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    marginBottom: '16px'
                                  }}>
                                    <h4 style={{
                                      fontSize: '14px',
                                      fontWeight: '700',
                                      color: '#7b1fa2',
                                      margin: '0 0 8px 0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}>
                                      📝 학습 내용
                                    </h4>
                                    <div style={{
                                      fontSize: '14px',
                                      color: '#4a148c',
                                      lineHeight: '1.6',
                                      whiteSpace: 'pre-wrap'
                                    }}>
                                      {/* 텍스트 내용 표시 */}
                                      <div style={{ marginBottom: entry.hasImage && (entry.imageBase64 || entry.imageUrl) ? '12px' : '0' }}>
                                        {entry.content || '작성되지 않음'}
                                      </div>
                                      
                                      {/* 이미지가 있으면 자료보기 버튼도 표시 */}
                                      {entry.hasImage && (entry.imageBase64 || entry.imageUrl) && (
                                        <button
                                          onClick={() => handleImageView(entry)}
                                          style={{
                                            backgroundColor: '#e3f2fd',
                                            color: '#1976d2',
                                            border: '1px solid #bbdefb',
                                            borderRadius: '8px',
                                            padding: '10px 16px',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            justifyContent: 'center'
                                          }}
                                          onMouseOver={(e) => {
                                            e.target.style.backgroundColor = '#bbdefb';
                                          }}
                                          onMouseOut={(e) => {
                                            e.target.style.backgroundColor = '#e3f2fd';
                                          }}
                                        >
                                          📷 자료보기
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 점수 정보 */}
                              <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '24px',
                                marginTop: '16px'
                              }}>
                                <div style={{
                                  padding: '12px 20px',
                                  backgroundColor: '#e8f5e8',
                                  border: '2px solid #4caf50',
                                  borderRadius: '20px',
                                  textAlign: 'center',
                                  minWidth: '100px'
                                }}>
                                  <div style={{
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#2e7d32'
                                  }}>
                                    📈 이해도
                                  </div>
                                  <div style={{
                                    fontSize: '20px',
                                    fontWeight: '700',
                                    color: '#1b5e20',
                                    marginTop: '4px'
                                  }}>
                                    {entry.understanding || 0}/5
                                  </div>
                                </div>

                                <div style={{
                                  padding: '12px 20px',
                                  backgroundColor: '#ffebee',
                                  border: '2px solid #f44336',
                                  borderRadius: '20px',
                                  textAlign: 'center',
                                  minWidth: '100px'
                                }}>
                                  <div style={{
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#d32f2f'
                                  }}>
                                    😊 만족도
                                  </div>
                                  <div style={{
                                    fontSize: '20px',
                                    fontWeight: '700',
                                    color: '#c62828',
                                    marginTop: '4px'
                                  }}>
                                    {entry.satisfaction || 0}/5
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 교시별 평균 분석 섹션 */}
                {(
                  <div style={{ marginTop: '32px' }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#1976d2',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      📊 교시별 평균 분석
                    </h3>
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '16px' 
                    }}>
                      {(() => {
                        // 필터링된 데이터 계산
                        let filteredData = data;
                        
                        if (selectedDateFilter) {
                          filteredData = filteredData.filter(entry => 
                            entry.date === selectedDateFilter
                          );
                        }
                        
                        if (selectedPeriodFilter && selectedPeriodFilter !== '전체') {
                          if (selectedPeriodFilter === '작성된교시') {
                            filteredData = filteredData.filter(entry => entry.content && entry.content.trim());
                          } else {
                            filteredData = filteredData.filter(entry => entry.period === selectedPeriodFilter);
                          }
                        }

                        // 교시별 통계 계산
                        const periodStats = {};
                        
                        // 모든 교시 초기화 (기타 교시 포함)
                        const allPeriods = [...PERIODS];
                        const otherPeriods = [...new Set(filteredData.map(entry => entry.period).filter(period => !PERIODS.includes(period)))];
                        allPeriods.push(...otherPeriods);
                        
                        allPeriods.forEach(period => {
                          periodStats[period] = {
                            period,
                            entries: filteredData.filter(entry => entry.period === period),
                            avgUnderstanding: 0,
                            avgSatisfaction: 0,
                            count: 0
                          };
                        });

                        // 평균 계산
                        Object.values(periodStats).forEach(stat => {
                          if (stat.entries.length > 0) {
                            stat.count = stat.entries.length;
                            stat.avgUnderstanding = stat.entries.reduce((sum, entry) => sum + (parseFloat(entry.understanding) || 0), 0) / stat.count;
                            stat.avgSatisfaction = stat.entries.reduce((sum, entry) => sum + (parseFloat(entry.satisfaction) || 0), 0) / stat.count;
                          }
                        });

                        return Object.values(periodStats)
                          .filter(stat => stat.count > 0 || PERIODS.includes(stat.period))
                          .map(stat => (
                            <div
                              key={stat.period}
                              style={{
                                backgroundColor: 'white',
                                border: '1px solid #e8eaed',
                                borderRadius: '12px',
                                padding: '16px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }}
                            >
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '12px'
                              }}>
                                <h4 style={{
                                  margin: 0,
                                  fontSize: '16px',
                                  fontWeight: 'bold',
                                  color: '#333'
                                }}>
                                  🕐 {stat.period}
                                </h4>
                              </div>
                              
                              <div style={{ marginBottom: '12px' }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: '8px'
                                }}>
                                  <span style={{ fontSize: '14px', color: '#666' }}>● 이해도</span>
                                  <span style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: getScoreColor(stat.avgUnderstanding, 'understanding')
                                  }}>
                                    {stat.avgUnderstanding.toFixed(1)}점
                                  </span>
                                </div>
                                <div style={{
                                  height: '8px',
                                  backgroundColor: '#f5f5f5',
                                  borderRadius: '4px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    width: `${(stat.avgUnderstanding / 5) * 100}%`,
                                    height: '100%',
                                    backgroundColor: getScoreColor(stat.avgUnderstanding, 'understanding'),
                                    borderRadius: '4px'
                                  }} />
                                </div>
                              </div>

                              <div style={{ marginBottom: '12px' }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: '8px'
                                }}>
                                  <span style={{ fontSize: '14px', color: '#666' }}>♥ 만족도</span>
                                  <span style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: getScoreColor(stat.avgSatisfaction, 'satisfaction')
                                  }}>
                                    {stat.avgSatisfaction.toFixed(1)}점
                                  </span>
                                </div>
                                <div style={{
                                  height: '8px',
                                  backgroundColor: '#f5f5f5',
                                  borderRadius: '4px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    width: `${(stat.avgSatisfaction / 5) * 100}%`,
                                    height: '100%',
                                    backgroundColor: getScoreColor(stat.avgSatisfaction, 'satisfaction'),
                                    borderRadius: '4px'
                                  }} />
                                </div>
                              </div>

                              <div style={{
                                textAlign: 'center',
                                padding: '8px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px'
                              }}>
                                <span style={{ fontSize: '12px', color: '#666' }}>
                                  👥 {stat.count}명 참여
                                </span>
                              </div>
                            </div>
                          ));
                      })()}
                    </div>
                  </div>
                )}

                {/* 통계 요약 섹션 */}
                {(
                  <div style={{ marginTop: '32px' }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#333',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      📈 통계 요약
                    </h3>

                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                      {(() => {
                        // 필터링된 데이터 계산
                        let filteredData = data;
                        
                        if (selectedDateFilter) {
                          filteredData = filteredData.filter(entry => 
                            entry.date === selectedDateFilter
                          );
                        }
                        
                        if (selectedPeriodFilter && selectedPeriodFilter !== '전체') {
                          if (selectedPeriodFilter === '작성된교시') {
                            filteredData = filteredData.filter(entry => entry.content && entry.content.trim());
                          } else {
                            filteredData = filteredData.filter(entry => entry.period === selectedPeriodFilter);
                          }
                        }

                        const totalEntries = filteredData.length;
                        const avgUnderstanding = totalEntries > 0 ? 
                          filteredData.reduce((sum, entry) => sum + (parseFloat(entry.understanding) || 0), 0) / totalEntries : 0;
                        const avgSatisfaction = totalEntries > 0 ? 
                          filteredData.reduce((sum, entry) => sum + (parseFloat(entry.satisfaction) || 0), 0) / totalEntries : 0;

                        return [
                          {
                            label: '총 학습일지 수',
                            value: totalEntries,
                            suffix: '개',
                            color: '#2196f3',
                            bgColor: '#e3f2fd'
                          },
                          {
                            label: '전체 평균 이해도',
                            value: avgUnderstanding.toFixed(1),
                            suffix: '점',
                            color: '#4caf50',
                            bgColor: '#e8f5e8'
                          },
                          {
                            label: '전체 평균 만족도',
                            value: avgSatisfaction.toFixed(1),
                            suffix: '점',
                            color: '#f44336',
                            bgColor: '#ffebee'
                          }
                        ].map((stat, index) => (
                          <div
                            key={index}
                            style={{
                              flex: 1,
                              backgroundColor: stat.bgColor,
                              border: `2px solid ${stat.color}`,
                              borderRadius: '12px',
                              padding: '20px',
                              textAlign: 'center',
                              minWidth: '150px'
                            }}
                          >
                            <div style={{
                              fontSize: '24px',
                              fontWeight: 'bold',
                              color: stat.color,
                              marginBottom: '8px'
                            }}>
                              {stat.value}{stat.suffix}
                            </div>
                            <div style={{
                              fontSize: '14px',
                              color: '#666',
                              fontWeight: '600'
                            }}>
                              {stat.label}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 이동 확인 모달 */}
      {showMoveConfirmation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '8px'
              }}>
                {pendingMove?.isOverwrite ? '데이터 덮어쓰기 확인' : '데이터 이동 확인'}
              </h3>
              <p style={{ color: '#666', lineHeight: '1.5' }}>
                {pendingMove?.isOverwrite ? (
                  <>
                    <strong>{pendingMove?.targetPeriod}</strong>에 이미 데이터가 있습니다.<br/>
                    기존 데이터를 새 데이터로 교체하시겠습니까?
                  </>
                ) : (
                  <>
                    <strong>{pendingMove?.draggedEntry?.studentName}</strong>님의 데이터를<br/>
                    <strong>{pendingMove?.targetPeriod}</strong>로 이동하시겠습니까?
                  </>
                )}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={cancelMove}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={confirmMove}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: pendingMove?.isOverwrite ? '#ef4444' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {pendingMove?.isOverwrite ? '덮어쓰기' : '이동하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 뷰어 모달 */}
      <ImageViewerModal
        isOpen={showImageViewer}
        onClose={closeImageViewer}
        imageUrl={selectedImageData?.imageUrl}
        studentName={selectedImageData?.studentName}
        period={selectedImageData?.period}
        date={selectedImageData?.date}
      />
    </>
  );
};

export default LearningJournalViewModal;