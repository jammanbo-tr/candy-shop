import React, { useState, useEffect, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, doc, updateDoc, arrayUnion, setDoc, getDocs, query, orderBy, deleteDoc, getDoc, addDoc, limit, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { getGoogleMaps } from '../utils/googleMapsLoader';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useNavigate } from 'react-router-dom';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CampaignIcon from '@mui/icons-material/Campaign';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useAuth } from '../hooks/useAuth';
import LinkIcon from '@mui/icons-material/Link';
import BarChartIcon from '@mui/icons-material/BarChart';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import HistoryIcon from '@mui/icons-material/History';
import TimelineIcon from '@mui/icons-material/Timeline';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SchoolIcon from '@mui/icons-material/School';
import AddIcon from '@mui/icons-material/Add';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ForumIcon from '@mui/icons-material/Forum';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GroupIcon from '@mui/icons-material/Group';

const HISTORY_CATEGORIES = [
  '고대사',
  '중세사', 
  '근대사',
  '현대사',
  '한국사',
  '세계사',
  '문화사',
  '기타'
];

const HISTORY_PERIODS = [
  '선사시대',
  '고조선',
  '삼국시대',
  '통일신라',
  '고려',
  '조선',
  '근대',
  '현대'
];

// 버튼 스타일 공통 객체
const buttonStyle = {
  fontSize: 13,
  minWidth: 72,
  padding: '7px 14px',
  whiteSpace: 'nowrap',
  borderRadius: 12,
  fontWeight: 'bold',
  boxShadow: '0 2px 8px #b2ebf240',
  transition: 'all 0.2s',
  cursor: 'pointer',
};

// 시간 포맷 함수
function formatTimeAgo(ts) {
  const now = Date.now();
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff/60)}분 전`;
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

const HistoryPage = () => {
  // 상태 관리
  const [studentsSnapshot, loading, firestoreError] = useCollection(collection(db, 'students'));
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyBoards, setHistoryBoards] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showCreateEntryModal, setShowCreateEntryModal] = useState(false);
  const [showDanGunModal, setShowDanGunModal] = useState(false);
  const [showStudentResponsesModal, setShowStudentResponsesModal] = useState(false);
  const [selectedBoardResponses, setSelectedBoardResponses] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [showClusteringModal, setShowClusteringModal] = useState(false);
  const [clusteringResults, setClusteringResults] = useState(null);
  const [clusteringMap, setClusteringMap] = useState(null);
  const [newBoardData, setNewBoardData] = useState({
    title: '',
    description: '',
    question: '',
    category: '고대사',
    period: '고조선',
    type: 'location', // location, text, image 등
    coordinates: [],
    active: true
  });
  const [newEntryData, setNewEntryData] = useState({
    title: '',
    content: '',
    category: '고대사',
    period: '고조선',
    importance: '보통',
    tags: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterByStudent, setFilterByStudent] = useState('all');
  const [analyticsData, setAnalyticsData] = useState({
    totalEntries: 0,
    totalBoards: 0,
    categoryDistribution: {},
    periodDistribution: {},
    studentContributions: {},
    recentActivity: [],
    locationData: []
  });
  const [alertMsg, setAlertMsg] = useState('');

  // 학생 데이터 처리
  const students = useMemo(() => {
    if (!studentsSnapshot) return [];
    return studentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }, [studentsSnapshot]);

  // 역사 데이터 가져오기
  useEffect(() => {
    const fetchHistoryData = async () => {
      try {
        const historyRef = collection(db, 'historyEntries');
        const q = query(historyRef, orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const entries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setHistoryEntries(entries);
        });
        return unsubscribe;
      } catch (error) {
        console.error('역사 데이터 가져오기 실패:', error);
      }
    };

    fetchHistoryData();
  }, []);

  // 역사 게시판 가져오기
  useEffect(() => {
    const fetchHistoryBoards = async () => {
      try {
        const boardsRef = collection(db, 'historyBoards');
        const q = query(boardsRef, orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const boards = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setHistoryBoards(boards);
        });
        return unsubscribe;
      } catch (error) {
        console.error('역사 게시판 가져오기 실패:', error);
      }
    };

    fetchHistoryBoards();
  }, []);

  // 분석 데이터 계산
  useEffect(() => {
    if (historyEntries.length > 0 || historyBoards.length > 0) {
      const analytics = {
        totalEntries: historyEntries.length,
        totalBoards: historyBoards.length,
        categoryDistribution: {},
        periodDistribution: {},
        studentContributions: {},
        recentActivity: [...historyEntries.slice(0, 10), ...historyBoards.slice(0, 5)],
        locationData: historyBoards.filter(board => board.type === 'location' && board.coordinates.length > 0)
      };

      historyEntries.forEach(entry => {
        // 카테고리 분포
        analytics.categoryDistribution[entry.category] = 
          (analytics.categoryDistribution[entry.category] || 0) + 1;
        
        // 시대 분포
        analytics.periodDistribution[entry.period] = 
          (analytics.periodDistribution[entry.period] || 0) + 1;
        
        // 학생 기여도
        analytics.studentContributions[entry.studentName] = 
          (analytics.studentContributions[entry.studentName] || 0) + 1;
      });

      setAnalyticsData(analytics);
    }
  }, [historyEntries, historyBoards]);

  // 새로운 역사 게시판 생성
  const handleCreateBoard = async () => {
    if (!newBoardData.title.trim() || !newBoardData.question.trim()) {
      setAlertMsg('제목과 질문을 모두 입력해주세요.');
      return;
    }

    try {
      const boardData = {
        ...newBoardData,
        timestamp: Date.now(),
        createdBy: 'teacher',
        responses: [],
        active: true
      };

      await addDoc(collection(db, 'historyBoards'), boardData);
      setShowCreateBoardModal(false);
      setNewBoardData({
        title: '',
        description: '',
        question: '',
        category: '고대사',
        period: '고조선',
        type: 'location',
        coordinates: [],
        active: true
      });
      setAlertMsg('역사 게시판이 성공적으로 생성되었습니다!');
    } catch (error) {
      console.error('역사 게시판 생성 실패:', error);
      setAlertMsg('역사 게시판 생성 중 오류가 발생했습니다.');
    }
  };

  // 단군왕검 게시판 생성
  const handleCreateDanGunBoard = async () => {
    try {
      const boardData = {
        title: '내가 단군왕검이었다면 어느 곳에 나라를 만들었을까?',
        description: '지도에서 위치를 선택하고 그 이유를 설명해주세요.',
        question: '내가 단군왕검이었다면 어느 곳에 나라를 만들었을까?',
        category: '고대사',
        period: '고조선',
        type: 'location',
        coordinates: [],
        active: true,
        timestamp: Date.now(),
        createdBy: 'teacher',
        responses: []
      };

      await addDoc(collection(db, 'historyBoards'), boardData);
      setShowDanGunModal(false);
      setAlertMsg('단군왕검 게시판이 성공적으로 생성되었습니다!');
    } catch (error) {
      console.error('단군왕검 게시판 생성 실패:', error);
      setAlertMsg('단군왕검 게시판 생성 중 오류가 발생했습니다.');
    }
  };

  // 새로운 역사 항목 생성
  const handleCreateEntry = async () => {
    if (!newEntryData.title.trim() || !newEntryData.content.trim()) {
      setAlertMsg('제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      const entryData = {
        ...newEntryData,
        timestamp: Date.now(),
        studentId: 'teacher',
        studentName: '교사',
        likes: 0,
        comments: []
      };

      await addDoc(collection(db, 'historyEntries'), entryData);
      setShowCreateEntryModal(false);
      setNewEntryData({
        title: '',
        content: '',
        category: '고대사',
        period: '고조선',
        importance: '보통',
        tags: []
      });
      setAlertMsg('역사 항목이 성공적으로 생성되었습니다!');
    } catch (error) {
      console.error('역사 항목 생성 실패:', error);
      setAlertMsg('역사 항목 생성 중 오류가 발생했습니다.');
    }
  };

  // 태그 추가/제거
  const handleTagChange = (tag) => {
    const currentTags = newEntryData.tags;
    if (currentTags.includes(tag)) {
      setNewEntryData({
        ...newEntryData,
        tags: currentTags.filter(t => t !== tag)
      });
    } else {
      setNewEntryData({
        ...newEntryData,
        tags: [...currentTags, tag]
      });
    }
  };

  // 텍스트 전처리 함수
  const preprocessText = (text) => {
    // 조사, 연결사, 불용어 제거
    const stopWords = [
      '이', '가', '을', '를', '의', '에', '에서', '로', '으로', '와', '과', '도', '는', '은', '만', '부터', '까지',
      '그리고', '또는', '하지만', '그런데', '그래서', '그러면', '그러나', '그리고', '또한', '또는', '또한',
      '있다', '없다', '하다', '되다', '있다', '없다', '이것', '그것', '저것', '무엇', '어떤', '어떻게', '왜', '언제', '어디서',
      '있어요', '있습니다', '됩니다', '됩니다', '해요', '합니다', '입니다', '이에요', '이예요', '이야', '이야요',
      '그리고', '또는', '하지만', '그런데', '그래서', '그러면', '그러나', '또한', '또는', '또한',
      '이렇게', '그렇게', '저렇게', '어떻게', '왜', '언제', '어디서', '무엇', '어떤', '어떻게', '왜', '언제', '어디서',
      '이것', '그것', '저것', '무엇', '어떤', '어떻게', '왜', '언제', '어디서',
      '이런', '그런', '저런', '어떤', '어떻게', '왜', '언제', '어디서',
      '이렇게', '그렇게', '저렇게', '어떻게', '왜', '언제', '어디서',
      '이것은', '그것은', '저것은', '무엇은', '어떤은', '어떻게는', '왜는', '언제는', '어디서는',
      '이것이', '그것이', '저것이', '무엇이', '어떤이', '어떻게가', '왜가', '언제가', '어디서가',
      '이것을', '그것을', '저것을', '무엇을', '어떤을', '어떻게를', '왜를', '언제를', '어디서를',
      '이것에', '그것에', '저것에', '무엇에', '어떤에', '어떻게에', '왜에', '언제에', '어디서에',
      '이것에서', '그것에서', '저것에서', '무엇에서', '어떤에서', '어떻게에서', '왜에서', '언제에서', '어디서에서',
      '이것로', '그것로', '저것로', '무엇로', '어떤로', '어떻게로', '왜로', '언제로', '어디서로',
      '이것으로', '그것으로', '저것으로', '무엇으로', '어떤으로', '어떻게로', '왜로', '언제로', '어디서로',
      '이것와', '그것와', '저것와', '무엇와', '어떤와', '어떻게와', '왜와', '언제와', '어디서와',
      '이것과', '그것과', '저것과', '무엇과', '어떤과', '어떻게과', '왜과', '언제과', '어디서과',
      '이것도', '그것도', '저것도', '무엇도', '어떤도', '어떻게도', '왜도', '언제도', '어디서도',
      '이것는', '그것는', '저것는', '무엇는', '어떤는', '어떻게는', '왜는', '언제는', '어디서는',
      '이것은', '그것은', '저것은', '무엇은', '어떤은', '어떻게는', '왜는', '언제는', '어디서는',
      '이것만', '그것만', '저것만', '무엇만', '어떤만', '어떻게만', '왜만', '언제만', '어디서만',
      '이것부터', '그것부터', '저것부터', '무엇부터', '어떤부터', '어떻게부터', '왜부터', '언제부터', '어디서부터',
      '이것까지', '그것까지', '저것까지', '무엇까지', '어떤까지', '어떻게까지', '왜까지', '언제까지', '어디서까지'
    ];
    
    let processedText = text.replace(/[^\w\s가-힣]/g, ' '); // 특수문자 제거
    processedText = processedText.replace(/\s+/g, ' ').trim(); // 연속 공백 제거
    
    // 불용어 제거
    stopWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      processedText = processedText.replace(regex, '');
    });
    
    // 의미 있는 단어만 필터링 (2글자 이상, 조사나 어미가 아닌 단어)
    const meaningfulWords = processedText.split(' ').filter(word => {
      if (word.length < 2) return false;
      
      // 조사나 어미로 끝나는 단어 제거
      const endings = ['의', '에', '에서', '로', '으로', '와', '과', '도', '는', '은', '만', '부터', '까지', '이', '가', '을', '를', '요', '다', '니다', '습니다', '어요', '아요', '이에요', '이예요'];
      const hasEnding = endings.some(ending => word.endsWith(ending));
      if (hasEnding) return false;
      
      // 조사나 어미로 시작하는 단어 제거
      const starts = ['이', '가', '을', '를', '의', '에', '에서', '로', '으로', '와', '과', '도', '는', '은', '만', '부터', '까지'];
      const hasStart = starts.some(start => word.startsWith(start));
      if (hasStart) return false;
      
      return true;
    });
    
    return meaningfulWords;
  };

  // 단어 빈도 분석
  const analyzeWordFrequency = (texts) => {
    const wordCount = {};
    
    texts.forEach(text => {
      const words = preprocessText(text);
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20); // 상위 20개 단어
  };

  // 지리적 좌표 기반 군집 분석 함수
  const performClustering = (responses) => {
    // 좌표가 있는 응답만 필터링
    const validResponses = responses.filter(r => r.coordinates && r.coordinates.lat && r.coordinates.lng);
    
    if (validResponses.length < 3) {
      return {
        clusters: [{ 
          id: 1, 
          responses: validResponses, 
          representativeWords: analyzeWordFrequency(validResponses.map(r => r.text || '')).slice(0, 5).map(([word]) => word),
          center: '전체 응답',
          geographicCenter: validResponses.length > 0 ? {
            lat: validResponses.reduce((sum, r) => sum + r.coordinates.lat, 0) / validResponses.length,
            lng: validResponses.reduce((sum, r) => sum + r.coordinates.lng, 0) / validResponses.length
          } : null
        }]
      };
    }

    // K-means 클러스터링을 위한 간단한 구현 (도읍 후보지 분석)
    const k = Math.min(5, Math.ceil(validResponses.length / 3)); // 최대 5개 도읍 후보지
    const clusters = performKMeansClustering(validResponses, k);

    return { clusters };
  };

  // K-means 클러스터링 함수
  const performKMeansClustering = (responses, k) => {
    // 초기 중심점들을 랜덤하게 선택
    const centers = [];
    for (let i = 0; i < k; i++) {
      const randomIndex = Math.floor(Math.random() * responses.length);
      centers.push({
        lat: responses[randomIndex].coordinates.lat,
        lng: responses[randomIndex].coordinates.lng
      });
    }

    let clusters = [];
    let iterations = 0;
    const maxIterations = 100;

    while (iterations < maxIterations) {
      // 각 응답을 가장 가까운 중심점에 할당
      clusters = centers.map((center, index) => ({
        id: index + 1,
        responses: [],
        center: `도읍 후보지 ${index + 1}`,
        geographicCenter: center
      }));

      responses.forEach(response => {
        let minDistance = Infinity;
        let closestClusterIndex = 0;

        centers.forEach((center, index) => {
          const distance = calculateDistance(
            response.coordinates.lat, response.coordinates.lng,
            center.lat, center.lng
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestClusterIndex = index;
          }
        });

        clusters[closestClusterIndex].responses.push(response);
      });

      // 새로운 중심점 계산
      const newCenters = clusters.map(cluster => {
        if (cluster.responses.length === 0) {
          return { lat: 0, lng: 0 };
        }
        return {
          lat: cluster.responses.reduce((sum, r) => sum + r.coordinates.lat, 0) / cluster.responses.length,
          lng: cluster.responses.reduce((sum, r) => sum + r.coordinates.lng, 0) / cluster.responses.length
        };
      });

      // 중심점이 거의 변하지 않으면 종료
      const centersChanged = newCenters.some((newCenter, index) => {
        const oldCenter = centers[index];
        return calculateDistance(newCenter.lat, newCenter.lng, oldCenter.lat, oldCenter.lng) > 0.001;
      });

      if (!centersChanged) break;

      centers.splice(0, centers.length, ...newCenters);
      iterations++;
    }

    // 각 도읍 후보지에 대표 단어 추가
    clusters.forEach(cluster => {
      const texts = cluster.responses.map(r => r.text || '').filter(text => text.length > 0);
      cluster.representativeWords = analyzeWordFrequency(texts).slice(0, 5).map(([word]) => word);
    });

    // 빈 도읍 후보지 제거
    return clusters.filter(cluster => cluster.responses.length > 0);
  };

  // 두 지점 간의 거리 계산 (Haversine 공식)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // 지구의 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // 학생 응답 가져오기
  const fetchStudentResponses = async (boardId) => {
    try {
      // historyBoards 문서에서 responses 필드를 직접 가져오기
      const boardDoc = await getDoc(doc(db, 'historyBoards', boardId));
      if (boardDoc.exists()) {
        const boardData = boardDoc.data();
        const responses = boardData.responses || [];
        
        // 각 응답에 고유 ID 추가 (인덱스 기반)
        return responses.map((response, index) => ({
          id: `response_${index}`,
          ...response
        }));
      }
      return [];
    } catch (error) {
      console.error('학생 응답 가져오기 실패:', error);
      return [];
    }
  };

  // 군집 분석 지도 초기화
  useEffect(() => {
    if (showClusteringModal && clusteringResults) {
      const initializeClusteringMap = async () => {
        try {
                          const google = await getGoogleMaps();
          const mapElement = document.getElementById('clusteringMap');
          
          if (mapElement) {
            const map = new google.maps.Map(mapElement, {
              center: { lat: 37.5665, lng: 126.9780 },
              zoom: 6,
              mapTypeId: google.maps.MapTypeId.ROADMAP,
              mapTypeControl: true,
              streetViewControl: true,
              fullscreenControl: true,
              zoomControl: true
            });

            // 군집별 색상 정의
            const clusterColors = [
              '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
              '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
            ];

            // 모든 응답 지점을 히트맵 데이터로 변환
            const heatmapData = [];
            clusteringResults.clusters.forEach((cluster, clusterIndex) => {
              cluster.responses.forEach((response) => {
                if (response.coordinates) {
                  heatmapData.push({
                    location: new google.maps.LatLng(response.coordinates.lat, response.coordinates.lng),
                    weight: 1 // 각 응답의 기본 가중치
                  });
                }
              });
            });

            // 히트맵 레이어 생성
            const heatmap = new google.maps.visualization.HeatmapLayer({
              data: heatmapData,
              map: map,
              radius: 50, // 히트맵 반경
              opacity: 0.8,
              gradient: [
                'rgba(0, 255, 255, 0)',    // 투명 (낮은 밀도)
                'rgba(0, 255, 255, 1)',    // 시안 (낮은 밀도)
                'rgba(0, 191, 255, 1)',    // 하늘색
                'rgba(0, 127, 255, 1)',    // 파랑
                'rgba(0, 63, 255, 1)',     // 진한 파랑
                'rgba(0, 0, 255, 1)',      // 파랑
                'rgba(191, 0, 255, 1)',    // 보라
                'rgba(255, 0, 255, 1)',    // 마젠타
                'rgba(255, 0, 191, 1)',    // 핑크
                'rgba(255, 0, 127, 1)',    // 연한 빨강
                'rgba(255, 0, 63, 1)',     // 빨강
                'rgba(255, 0, 0, 1)'       // 진한 빨강 (높은 밀도)
              ]
            });

            // 각 군집의 응답들을 개별 마커로 표시
            clusteringResults.clusters.forEach((cluster, clusterIndex) => {
              const clusterColor = clusterColors[clusterIndex % clusterColors.length];
              
              // 각 응답의 개별 마커
              cluster.responses.forEach((response, responseIndex) => {
                if (response.coordinates) {
                  const marker = new google.maps.Marker({
                    position: response.coordinates,
                    map: map,
                    title: `${cluster.center} - ${response.studentName || '익명'}`,
                    label: {
                      text: `${clusterIndex + 1}`,
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '12px'
                    },
                    icon: {
                      url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                      scaledSize: new google.maps.Size(28, 28)
                    },
                    zIndex: 500 // 히트맵보다 위에, 도읍 후보지보다 아래에 표시
                  });

                  // 마커에 클러스터 정보를 포함한 정보창 추가
                  const infoWindow = new google.maps.InfoWindow({
                    content: `
                      <div style="padding: 8px; min-width: 200px;">
                        <h4 style="margin: 0 0 4px 0; color: #333; font-size: 14px;">
                          ${cluster.center} 군집
                        </h4>
                        <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">
                          <strong>학생:</strong> ${response.studentName || '익명'}
                        </p>
                        <p style="margin: 0; color: #666; font-size: 12px;">
                          <strong>답변:</strong> ${response.text || '위치만 선택'}
                        </p>
                      </div>
                    `
                  });

                  marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                  });
                }
              });
            });

            // 각 군집의 중심점에 도읍 후보지 마커 추가
            clusteringResults.clusters.forEach((cluster, clusterIndex) => {
              if (cluster.geographicCenter) {
                const centerMarker = new google.maps.Marker({
                  position: cluster.geographicCenter,
                  map: map,
                  title: `${cluster.center} - 도읍 후보지`,
                  label: {
                    text: '🏛️',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '18px'
                  },
                  icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                    scaledSize: new google.maps.Size(50, 50)
                  },
                  zIndex: 1000 // 다른 마커들보다 위에 표시
                });

                // 중심점 정보창
                const centerInfoWindow = new google.maps.InfoWindow({
                  content: `
                    <div style="padding: 12px; min-width: 250px;">
                      <h4 style="margin: 0 0 8px 0; color: #1976d2; font-size: 16px;">
                        🏛️ ${cluster.center} - 도읍 후보지
                      </h4>
                      <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">
                        <strong>응답 수:</strong> ${cluster.responses.length}개
                      </p>
                      <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">
                        <strong>좌표:</strong> ${cluster.geographicCenter.lat.toFixed(6)}, ${cluster.geographicCenter.lng.toFixed(6)}
                      </p>
                      <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">
                        <strong>대표 단어:</strong> ${cluster.representativeWords.join(', ')}
                      </p>
                      <p style="margin: 0; color: #4caf50; font-size: 12px; font-weight: bold;">
                        💡 이 위치를 도읍으로 고려해보세요!
                      </p>
                    </div>
                  `
                });

                centerMarker.addListener('click', () => {
                  centerInfoWindow.open(map, centerMarker);
                });
              }
            });

            setClusteringMap(map);
          }
        } catch (error) {
          console.error('군집 분석 지도 초기화 실패:', error);
        }
      };

      setTimeout(initializeClusteringMap, 100);
    }
  }, [showClusteringModal, clusteringResults]);

  // 학생 응답 모달 열기
  const handleViewStudentResponses = async (board) => {
    setSelectedBoard(board);
    const responses = await fetchStudentResponses(board.id);
    setSelectedBoardResponses(responses);
    setShowStudentResponsesModal(true);
  };

  // 단군왕검 도읍 추천 (군집분석) 실행
  const handleDanGunCapitalRecommendation = async (board) => {
    if (!board.responses || board.responses.length === 0) {
      alert('분석할 응답이 없습니다.');
      return;
    }

    try {
      // 응답 데이터를 분석에 적합한 형태로 변환
      const analysisData = board.responses.map((response, index) => ({
        id: `response_${index}`,
        text: response.text || response.answer || '',
        coordinates: response.coordinates || { lat: 0, lng: 0 },
        studentName: response.studentName || '익명',
        timestamp: response.timestamp || Date.now()
      }));

      // 군집 분석 수행
      const results = performClustering(analysisData);
      
      setClusteringResults(results);
      setShowStudentResponsesModal(false); // 전체 응답 모달 닫기
      setShowClusteringModal(true); // 군집분석 모달 열기
    } catch (error) {
      console.error('단군왕검 도읍 추천 분석 중 오류:', error);
      alert('분석 중 오류가 발생했습니다.');
    }
  };

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>로딩 중...</div>;
  if (firestoreError) return <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>오류: {firestoreError.message}</div>;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      {/* 헤더 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        padding: '20px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '16px',
        color: 'white',
        backdropFilter: 'blur(10px)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
            <HistoryIcon style={{ marginRight: '12px', verticalAlign: 'middle' }} />
            역사 학습 중앙제어
          </h1>
          <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>
            학생들의 역사 학습을 관리하고 분석합니다
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowCreateBoardModal(true)}
            style={{
              ...buttonStyle,
              background: '#fff',
              color: '#667eea',
              border: 'none',
              padding: '12px 24px',
              fontSize: '14px'
            }}
          >
            <AddIcon style={{ marginRight: '8px', fontSize: '20px' }} />
            게시판 생성
          </button>
          <button
            onClick={() => setShowAnalyticsModal(true)}
            style={{
              ...buttonStyle,
              background: '#fff',
              color: '#667eea',
              border: 'none',
              padding: '12px 24px',
              fontSize: '14px'
            }}
          >
            <AnalyticsIcon style={{ marginRight: '8px', fontSize: '20px' }} />
            분석 대시보드
          </button>
        </div>
      </div>

      {/* 알림 메시지 */}
      {alertMsg && (
        <div style={{
          position: 'fixed',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#ffebee',
          color: '#c62828',
          padding: '12px 32px',
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 16,
          zIndex: 9999,
          boxShadow: '0 2px 8px #c6282820'
        }}
        onClick={() => setAlertMsg('')}
        >
          {alertMsg}
        </div>
      )}

      {/* 상단 버튼 그룹 */}
      <div style={{ 
        display: 'flex', 
        gap: 12, 
        marginBottom: 24,
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => setShowDanGunModal(true)}
          style={{
            background: '#e8f5e8',
            border: '2px solid #2e7d32',
            color: '#2e7d32',
            fontWeight: 'bold',
            borderRadius: 12,
            boxShadow: '0 2px 8px #4caf5030',
            padding: '8px 18px',
            fontSize: 14,
            minWidth: 70,
            transition: 'all 0.2s',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <LocationOnIcon style={{ fontSize: 20 }} />
          단군왕검 게시판
        </button>
        <button
          onClick={() => setShowCreateEntryModal(true)}
          style={{
            background: '#e0f7fa',
            border: '2px solid #1976d2',
            color: '#1976d2',
            fontWeight: 'bold',
            borderRadius: 12,
            boxShadow: '0 2px 8px #b2ebf240',
            padding: '8px 18px',
            fontSize: 14,
            minWidth: 70,
            transition: 'all 0.2s',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <SchoolIcon style={{ fontSize: 20 }} />
          역사 항목 추가
        </button>
        <button
          onClick={() => setShowAnalyticsModal(true)}
          style={{
            background: '#fffde7',
            border: '2px solid #ff9800',
            color: '#ff9800',
            fontWeight: 'bold',
            borderRadius: 12,
            boxShadow: '0 2px 8px #ffd54f30',
            padding: '8px 18px',
            fontSize: 14,
            minWidth: 70,
            transition: 'all 0.2s',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <DashboardIcon style={{ fontSize: 20 }} />
          데이터 분석
        </button>
      </div>

      {/* 통계 카드 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div style={{ 
          background: '#fff', 
          padding: '20px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#667eea' }}>총 게시판</h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{analyticsData.totalBoards}</p>
        </div>
        <div style={{ 
          background: '#fff', 
          padding: '20px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#667eea' }}>총 항목</h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{analyticsData.totalEntries}</p>
        </div>
        <div style={{ 
          background: '#fff', 
          padding: '20px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#667eea' }}>참여 학생</h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            {Object.keys(analyticsData.studentContributions).length}
          </p>
        </div>
        <div style={{ 
          background: '#fff', 
          padding: '20px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#667eea' }}>위치 데이터</h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            {analyticsData.locationData.length}
          </p>
        </div>
      </div>

      {/* 게시판 목록 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
        gap: '16px',
        marginBottom: '24px'
      }}>
                  {historyBoards.map(board => (
            <div key={board.id} style={{ 
              background: '#fff', 
              padding: '20px', 
              borderRadius: '12px', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => window.open(`/history-board/${board.id}`, '_blank')}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            title="클릭하여 학생용 페이지 열기"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>
                  {board.title}
                </h3>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  <span>학생용 링크:</span>
                  <code style={{ 
                    background: '#f0f0f0', 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'monospace'
                  }}>
                    {window.location.origin}/history-board/{board.id}
                  </code>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(`${window.location.origin}/history-board/${board.id}`);
                      setAlertMsg('링크가 클립보드에 복사되었습니다!');
                    }}
                    style={{
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    복사
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ 
                    background: '#667eea', 
                    color: 'white', 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px' 
                  }}>
                    {board.category}
                  </span>
                  <span style={{ 
                    background: '#764ba2', 
                    color: 'white', 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px' 
                  }}>
                    {board.period}
                  </span>
                  <span style={{ 
                    background: board.type === 'location' ? '#4caf50' : '#ff9800',
                    color: 'white', 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px' 
                  }}>
                    {board.type === 'location' ? '위치' : '텍스트'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewStudentResponses(board);
                  }}
                  style={{
                    background: '#2196f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  전체 응답 확인
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('이 게시판을 삭제하시겠습니까?')) {
                      deleteDoc(doc(db, 'historyBoards', board.id));
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e53935',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            
            <p style={{ 
              margin: '0 0 12px 0', 
              color: '#666', 
              lineHeight: '1.5'
            }}>
              {board.description}
            </p>

            <div style={{ 
              fontSize: '12px',
              color: '#888',
              marginBottom: '12px'
            }}>
              <strong>질문:</strong> {board.question}
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              fontSize: '12px',
              color: '#888'
            }}>
              <span>응답: {board.responses?.length || 0}개</span>
              <span>{formatTimeAgo(board.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 단군왕검 게시판 생성 모달 */}
      {showDanGunModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div style={{ 
            background: '#fff', 
            padding: '24px', 
            borderRadius: '16px', 
            width: '90vw', 
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2e7d32' }}>
              <LocationOnIcon style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              단군왕검 게시판 생성
            </h2>
            
            <p style={{ margin: '0 0 20px 0', color: '#666', lineHeight: '1.5' }}>
              학생들이 지도에서 위치를 선택하고 그 이유를 설명하는 게시판을 생성합니다.
            </p>

            <div style={{ 
              background: '#f8f9fa', 
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#2e7d32' }}>게시판 정보:</h4>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>
                <strong>제목:</strong> 내가 단군왕검이었다면 어느 곳에 나라를 만들었을까?
              </p>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>
                <strong>질문:</strong> 내가 단군왕검이었다면 어느 곳에 나라를 만들었을까?
              </p>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>
                <strong>설명:</strong> 지도에서 위치를 선택하고 그 이유를 설명해주세요.
              </p>
              <p style={{ margin: '0', fontSize: '14px' }}>
                <strong>유형:</strong> 위치 선택 + 텍스트 설명
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowDanGunModal(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  background: '#f5f5f5',
                  color: '#666',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                취소
              </button>
              <button
                onClick={handleCreateDanGunBoard}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  background: '#2e7d32',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게시판 생성 모달 */}
      {showCreateBoardModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div style={{ 
            background: '#fff', 
            padding: '24px', 
            borderRadius: '16px', 
            width: '90vw', 
            maxWidth: '600px', 
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#667eea' }}>새 역사 게시판 생성</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>제목</label>
              <input
                type="text"
                value={newBoardData.title}
                onChange={(e) => setNewBoardData({...newBoardData, title: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
                placeholder="게시판 제목을 입력하세요"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>설명</label>
              <textarea
                value={newBoardData.description}
                onChange={(e) => setNewBoardData({...newBoardData, description: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                placeholder="게시판 설명을 입력하세요"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>질문</label>
              <textarea
                value={newBoardData.question}
                onChange={(e) => setNewBoardData({...newBoardData, question: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                placeholder="학생들에게 할 질문을 입력하세요"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>카테고리</label>
                <select
                  value={newBoardData.category}
                  onChange={(e) => setNewBoardData({...newBoardData, category: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '14px'
                  }}
                >
                  {HISTORY_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>시대</label>
                <select
                  value={newBoardData.period}
                  onChange={(e) => setNewBoardData({...newBoardData, period: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '14px'
                  }}
                >
                  {HISTORY_PERIODS.map(period => (
                    <option key={period} value={period}>{period}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>유형</label>
              <select
                value={newBoardData.type}
                onChange={(e) => setNewBoardData({...newBoardData, type: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value="location">위치 선택</option>
                <option value="text">텍스트 답변</option>
                <option value="image">이미지 업로드</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateBoardModal(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  background: '#f5f5f5',
                  color: '#666',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                취소
              </button>
              <button
                onClick={handleCreateBoard}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 분석 대시보드 모달 */}
      {showAnalyticsModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div style={{ 
            background: '#fff', 
            padding: '24px', 
            borderRadius: '16px', 
            width: '90vw', 
            maxWidth: '800px', 
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#667eea' }}>역사 학습 분석 대시보드</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>카테고리별 분포</h3>
                {Object.entries(analyticsData.categoryDistribution).map(([category, count]) => (
                  <div key={category} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>{category}</span>
                    <span style={{ fontWeight: 'bold' }}>{count}</span>
                  </div>
                ))}
              </div>
              
              <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>시대별 분포</h3>
                {Object.entries(analyticsData.periodDistribution).map(([period, count]) => (
                  <div key={period} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>{period}</span>
                    <span style={{ fontWeight: 'bold' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>학생별 기여도</h3>
              {Object.entries(analyticsData.studentContributions)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([student, count]) => (
                  <div key={student} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>{student}</span>
                    <span style={{ fontWeight: 'bold' }}>{count}개</span>
                  </div>
                ))}
            </div>

            <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>위치 데이터 분석</h3>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                총 {analyticsData.locationData.length}개의 위치 데이터가 수집되었습니다.
              </p>
              {analyticsData.locationData.length > 0 && (
                <div style={{ fontSize: '14px' }}>
                  <p><strong>군집 분석:</strong> 위치 데이터를 기반으로 후보지를 추출할 수 있습니다.</p>
                  <p><strong>핫스팟:</strong> 가장 많이 선택된 지역을 확인할 수 있습니다.</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAnalyticsModal(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 학생 응답 모달 */}
      {showStudentResponsesModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div style={{ 
            background: '#fff', 
            padding: '24px', 
            borderRadius: '16px', 
            width: '90vw', 
            maxWidth: '1000px', 
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#667eea' }}>
                {selectedBoard?.title} - 학생 응답 ({selectedBoardResponses.length}개)
              </h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    const results = performClustering(selectedBoardResponses);
                    setClusteringResults(results);
                    setShowClusteringModal(true);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: '#f57c00',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(245, 124, 0, 0.3)'
                  }}
                >
                  🏛️ 단군왕검님의 도읍 추천!
                </button>
                <button
                  onClick={() => setShowStudentResponsesModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {selectedBoardResponses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                아직 학생 응답이 없습니다.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {selectedBoardResponses.map((response, index) => (
                  <div key={response.id} style={{
                    background: '#f8f9fa',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, color: '#333' }}>
                        학생 {index + 1} - {response.studentName || '익명'}
                      </h4>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {formatTimeAgo(response.timestamp)}
                      </span>
                    </div>

                    {response.coordinates && (
                      <div style={{ marginBottom: '12px' }}>
                        <strong>선택한 위치:</strong> 
                        <span style={{ color: '#2196f3', marginLeft: '8px' }}>
                          {response.coordinates.lat.toFixed(6)}, {response.coordinates.lng.toFixed(6)}
                        </span>
                      </div>
                    )}

                    {response.text && (
                      <div style={{ marginBottom: '12px' }}>
                        <strong>답변:</strong>
                        <p style={{ margin: '8px 0 0 0', lineHeight: '1.5' }}>
                          {response.text}
                        </p>
                      </div>
                    )}

                    {response.imageUrl && (
                      <div style={{ marginBottom: '12px' }}>
                        <strong>첨부 이미지:</strong>
                        <div style={{ marginTop: '8px' }}>
                          <img 
                            src={response.imageUrl} 
                            alt="학생 응답 이미지"
                            style={{ 
                              maxWidth: '200px', 
                              maxHeight: '200px', 
                              borderRadius: '4px',
                              border: '1px solid #ddd'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setShowStudentResponsesModal(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 군집 분석 모달 */}
      {showClusteringModal && clusteringResults && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div style={{ 
            background: '#fff', 
            padding: '24px', 
            borderRadius: '16px', 
            width: '90vw', 
            maxWidth: '1200px', 
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#f57c00' }}>
                🏛️ 단군왕검님의 도읍 추천 결과 ({clusteringResults.clusters.length}개 도읍 후보지)
              </h2>
              <button
                onClick={() => setShowClusteringModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
              {/* 도읍 결정을 위한 군집 분석 지도 */}
              <div style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '12px',
                border: '2px solid #e0e0e0'
              }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '18px' }}>
                  🏛️ 단군왕검님을 위한 최적의 도읍지 분석
                </h3>
                <div style={{ 
                  height: '500px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '2px solid #e0e0e0',
                  position: 'relative'
                }}>
                  <div 
                    id="clusteringMap"
                    style={{ 
                      width: '100%', 
                      height: '100%' 
                    }}
                  />
                </div>
                <div style={{ 
                  marginTop: '12px', 
                  padding: '12px', 
                  background: '#e3f2fd', 
                  borderRadius: '8px',
                  border: '1px solid #bbdefb'
                }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#f57c00' }}>
                    💡 단군왕검님의 도읍 결정 가이드:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#333' }}>
                    <li>색상 그라데이션 히트맵은 응답 밀도를 나타냅니다 (파랑→보라→빨강 순으로 밀도 증가)</li>
                    <li>빨간색이 진한 지역일수록 응답이 집중된 고밀도 지역입니다</li>
                    <li>🔴 빨간 핀은 개별 학생들이 추천한 도읍 위치입니다 (숫자는 도읍 후보지 번호)</li>
                    <li>🏛️ 파란 마커는 각 도읍 후보지의 중심점으로 단군왕검님께 추천하는 최종 후보지입니다</li>
                    <li>히트맵이 가장 진한 지역의 중심점을 우선적으로 도읍으로 고려해보세요</li>
                    <li>여러 밀집 지역이 연결된 교통 요지는 단군왕검님의 나라에 이상적인 도읍 후보지입니다</li>
                  </ul>
                </div>
              </div>

              {clusteringResults.clusters.map((cluster, clusterIndex) => (
                <div key={cluster.id} style={{
                  background: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '2px solid #e0e0e0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>
                      🏛️ {cluster.center} - 도읍 후보지 ({cluster.responses.length}개 응답)
                    </h3>
                    <div style={{ 
                      padding: '4px 12px', 
                      background: '#1976d2', 
                      color: 'white', 
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      도읍 후보 {cluster.id}
                    </div>
                  </div>
                  
                  {/* 도읍 후보지 정보 */}
                  {cluster.geographicCenter && (
                    <div style={{
                      background: '#e3f2fd',
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      border: '1px solid #bbdefb'
                    }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#1976d2', fontSize: '14px' }}>
                        📍 도읍 후보지 좌표
                      </h4>
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#333' }}>
                        <strong>위도:</strong> {cluster.geographicCenter.lat.toFixed(6)}
                      </p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#333' }}>
                        <strong>경도:</strong> {cluster.geographicCenter.lng.toFixed(6)}
                      </p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#333' }}>
                        <strong>도읍 영향 반경:</strong> {Math.max(50, 50 * (cluster.responses.length / 10)).toFixed(1)}km
                      </p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#333' }}>
                        <strong>추천도 밀도:</strong> {(cluster.responses.length / (Math.PI * Math.pow(Math.max(50, 50 * (cluster.responses.length / 10)), 2))).toFixed(2)}개/km²
                      </p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#f57c00', fontWeight: 'bold' }}>
                        👑 이 위치는 {cluster.responses.length}명의 학생이 단군왕검님께 추천한 도읍 후보지입니다
                      </p>
                    </div>
                  )}

                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#666' }}>
                      📝 도읍 추천 이유 (학생들이 많이 언급한 단어들):
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {cluster.representativeWords.map((word, wordIndex) => (
                        <span key={wordIndex} style={{
                          padding: '4px 12px',
                          background: '#e3f2fd',
                          color: '#1976d2',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 12px 0', color: '#666' }}>
                      💬 이 도읍 후보지를 추천한 학생들의 의견:
                    </h4>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {cluster.responses.map((response, responseIndex) => (
                        <div key={response.id} style={{
                          background: 'white',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', color: '#333' }}>
                              {response.studentName || '익명'}
                            </span>
                            <span style={{ fontSize: '11px', color: '#666' }}>
                              {formatTimeAgo(response.timestamp)}
                            </span>
                          </div>
                          
                          {response.coordinates && (
                            <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                              📍 위치: {response.coordinates.lat.toFixed(6)}, {response.coordinates.lng.toFixed(6)}
                            </div>
                          )}
                          
                          {response.text && (
                            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4', color: '#333' }}>
                              {response.text}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <button
                onClick={() => setShowClusteringModal(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  background: '#f57c00',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(245, 124, 0, 0.3)'
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage; 