import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

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
  const [showTableView, setShowTableView] = useState(true);
  const [draggedEntry, setDraggedEntry] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);
  const [showMoveConfirmation, setShowMoveConfirmation] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);

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
        <div style={{
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
                onClick={() => {
                  // CSV 다운로드 기능 구현 예정
                  alert('CSV 다운로드 기능을 구현 중입니다.');
                }}
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
                    onClick={() => setShowTableView(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: showTableView ? '1px solid #e1e5e9' : 'none',
                      backgroundColor: showTableView ? 'white' : '#1976d2',
                      color: showTableView ? '#666' : 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    📋 목록 보기
                  </button>
                  <button
                    onClick={() => setShowTableView(true)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: showTableView ? 'none' : '1px solid #e1e5e9',
                      backgroundColor: showTableView ? '#1976d2' : 'white',
                      color: showTableView ? 'white' : '#666',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    📊 표 보기
                  </button>
                </div>

                {showTableView ? (
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
                            minWidth: '1400px',
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '14px',
                            backgroundColor: 'white'
                          }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f5f5f5' }}>
                              <th style={{
                                padding: '16px 12px',
                                textAlign: 'left',
                                fontWeight: '600',
                                color: '#333',
                                borderBottom: '2px solid #e8eaed',
                                minWidth: '80px'
                              }}>
                                👤 학생명
                              </th>
                              {PERIODS.map(period => (
                                <th key={period} style={{
                                  padding: '16px 12px',
                                  textAlign: 'center',
                                  fontWeight: '600',
                                  color: '#333',
                                  borderBottom: '2px solid #e8eaed',
                                  minWidth: '250px',
                                  width: '250px'
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
                                  padding: '16px 12px',
                                  fontWeight: '600',
                                  color: '#333',
                                  backgroundColor: '#fafafa',
                                  borderRight: '1px solid #e8eaed'
                                }}>
                                  {studentName}
                                </td>
                                {PERIODS.map(period => {
                                  const entry = studentData[studentName][period];
                                  return (
                                    <td
                                      key={period}
                                      style={{
                                        padding: '8px',
                                        textAlign: 'center',
                                        borderRight: '1px solid #f0f0f0',
                                        backgroundColor: dragOverCell === `${studentName}-${period}` ? '#e3f2fd' : 'white',
                                        cursor: entry ? 'grab' : 'default',
                                        minHeight: '120px',
                                        minWidth: '250px',
                                        width: '250px',
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
                                            {(() => {
                                              if (!entry.content || entry.content === '내용 없음') {
                                                return (
                                                  <div style={{ 
                                                    fontSize: '12px', 
                                                    color: '#999', 
                                                    fontStyle: 'italic',
                                                    textAlign: 'center'
                                                  }}>
                                                    내용 없음
                                                  </div>
                                                );
                                              }

                                              // 키워드와 내용을 별도 필드에서 가져오기
                                              const keyword = entry.keyword || '';
                                              const content = entry.content || '';

                                              return (
                                                <div>
                                                  {/* 핵심 키워드 (굵은 글씨) */}
                                                  {keyword && (
                                                    <div style={{
                                                      fontSize: '13px',
                                                      fontWeight: '800',
                                                      color: '#e65100',
                                                      marginBottom: content ? '4px' : '0px',
                                                      lineHeight: '1.2',
                                                      wordWrap: 'break-word',
                                                      overflowWrap: 'break-word'
                                                    }}>
                                                      {keyword}
                                                    </div>
                                                  )}
                                                  
                                                  {/* 상세 학습내용 (얇은 글씨) */}
                                                  {content && (
                                                    <div style={{
                                                      fontSize: '11px',
                                                      color: '#666',
                                                      lineHeight: '1.3',
                                                      fontWeight: '300',
                                                      wordWrap: 'break-word',
                                                      overflowWrap: 'break-word'
                                                    }}>
                                                      {content}
                                                    </div>
                                                  )}
                                                  
                                                  {/* 키워드와 내용이 모두 없는 경우 */}
                                                  {!keyword && !content && (
                                                    <div style={{ 
                                                      fontSize: '12px', 
                                                      color: '#999', 
                                                      fontStyle: 'italic',
                                                      textAlign: 'center'
                                                    }}>
                                                      내용 없음
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                          
                                          {/* 점수 영역 */}
                                          <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                                            <span style={{
                                              padding: '3px 6px',
                                              borderRadius: '4px',
                                              fontSize: '10px',
                                              backgroundColor: getScoreColor(entry.understanding, 'understanding'),
                                              color: 'white',
                                              fontWeight: '600',
                                              boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                            }}>
                                              이해도 {entry.understanding || 0}
                                            </span>
                                            <span style={{
                                              padding: '3px 6px',
                                              borderRadius: '4px',
                                              fontSize: '10px',
                                              backgroundColor: getScoreColor(entry.satisfaction, 'satisfaction'),
                                              color: 'white',
                                              fontWeight: '600',
                                              boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                            }}>
                                              만족도 {entry.satisfaction || 0}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div style={{
                                          padding: '20px',
                                          color: '#999',
                                          fontSize: '12px',
                                          border: '2px dashed #e0e0e0',
                                          borderRadius: '8px',
                                          minHeight: '80px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          backgroundColor: '#fafafa'
                                        }}>
                                          <div style={{ 
                                            fontSize: '20px', 
                                            marginBottom: '4px',
                                            opacity: 0.5 
                                          }}>📝</div>
                                          <div style={{ 
                                            fontSize: '11px', 
                                            color: '#bbb',
                                            fontWeight: '500'
                                          }}>
                                            학습일지 없음
                                          </div>
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
                  // 리스트 보기
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

                      // 데이터가 없어도 항상 리스트 표시
                      if (filteredData.length === 0) {
                        // 빈 상태 표시 (등록된 학생들에 대한 빈 항목들)
                        return students.map((studentName, index) => (
                          <div
                            key={`empty-${studentName}-${index}`}
                            style={{
                              padding: '16px',
                              marginBottom: '12px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '8px',
                              border: '1px solid #e8eaed',
                              opacity: 0.6
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>
                                  👤 {studentName}
                                </h4>
                                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#999' }}>
                                  📅 날짜: {selectedDateFilter ? new Date(selectedDateFilter).toLocaleDateString('ko-KR') : '오늘'}
                                </p>
                                <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5', color: '#999', fontStyle: 'italic' }}>
                                  📝 학습일지가 작성되지 않았습니다
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  backgroundColor: '#e0e0e0',
                                  color: '#999'
                                }}>
                                  이해도: -
                                </span>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  backgroundColor: '#e0e0e0',
                                  color: '#999'
                                }}>
                                  만족도: -
                                </span>
                              </div>
                            </div>
                          </div>
                        ));
                      }

                      return filteredData.map((entry, index) => (
                        <div
                          key={entry.id || index}
                          style={{
                            padding: '16px',
                            marginBottom: '12px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            border: '1px solid #e8eaed'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>
                                👤 {entry.studentName} - 🕐 {entry.period}
                              </h4>
                              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
                                📅 날짜: {new Date(entry.date).toLocaleDateString('ko-KR')}
                              </p>
                              <div style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
                                📝 
                                {entry.keyword && (
                                  <span style={{ fontWeight: '800', color: '#e65100', marginLeft: '4px' }}>
                                    {entry.keyword}
                                  </span>
                                )}
                                {entry.keyword && entry.content && <br />}
                                {entry.content && (
                                  <span style={{ fontWeight: '300', color: '#666', marginLeft: entry.keyword ? '16px' : '4px' }}>
                                    {entry.content}
                                  </span>
                                )}
                                {!entry.keyword && !entry.content && (
                                  <span style={{ color: '#999', fontStyle: 'italic', marginLeft: '4px' }}>내용 없음</span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                backgroundColor: getScoreColor(entry.understanding, 'understanding'),
                                color: 'white'
                              }}>
                                이해도: {entry.understanding || 0}
                              </span>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                backgroundColor: getScoreColor(entry.satisfaction, 'satisfaction'),
                                color: 'white'
                              }}>
                                만족도: {entry.satisfaction || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      ));
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
    </>
  );
};

export default LearningJournalViewModal;