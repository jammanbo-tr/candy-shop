import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  Paper,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Tabs,
  Tab,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Slider,
  Switch,
  FormControlLabel
} from '@mui/material';
import { collection, addDoc, query, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import MapIcon from '@mui/icons-material/Map';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import PinDropIcon from '@mui/icons-material/PinDrop';

// 감정 목록 (이모지 기반, 긍정/부정 분류 포함)
const EMOTIONS = [
  { name: '행복', emoji: '😊', color: '#4CAF50', type: 'positive' },
  { name: '슬픔', emoji: '😢', color: '#2196F3', type: 'negative' },
  { name: '화남', emoji: '😠', color: '#F44336', type: 'negative' },
  { name: '놀람', emoji: '😲', color: '#FF9800', type: 'neutral' },
  { name: '무서움', emoji: '😨', color: '#9C27B0', type: 'negative' },
  { name: '혐오', emoji: '🤢', color: '#795548', type: 'negative' },
  { name: '지루함', emoji: '😴', color: '#607D8B', type: 'neutral' },
  { name: '흥미진진', emoji: '🤩', color: '#E91E63', type: 'positive' },
  { name: '평온함', emoji: '😌', color: '#00BCD4', type: 'positive' },
  { name: '스트레스', emoji: '😫', color: '#FF5722', type: 'negative' },
  { name: '집중', emoji: '🤔', color: '#3F51B5', type: 'positive' },
  { name: '졸음', emoji: '😪', color: '#9E9E9E', type: 'negative' }
];

// 스타일 상수
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

const cardStyle = {
  borderRadius: 16,
  boxShadow: '0 2px 8px #b2ebf240',
  background: '#fff'
};

const MapPage = () => {
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationData, setLocationData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.9780 });
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [tempLocation, setTempLocation] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapType, setHeatmapType] = useState('all'); // 'all', 'positive', 'negative'

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadLocationData();
  }, []);

  // 현재 위치 가져오기
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setUserLocation(location);
          setMapCenter(location);
          setShowMap(true);
          setLoading(false);
        },
        (error) => {
          console.error('위치 가져오기 실패:', error);
          setError('위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      setError('이 브라우저는 위치 서비스를 지원하지 않습니다.');
      setLoading(false);
    }
  };

  // 위치 데이터 로드
  const loadLocationData = async () => {
    try {
      const q = query(collection(db, 'emotionLocations'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLocationData(data);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setError('데이터를 불러오는데 실패했습니다.');
    }
  };

  // 감정 저장
  const saveEmotion = async (emotion) => {
    if (!selectedLocation && !userLocation) return;

    const locationToSave = selectedLocation || userLocation;
    
    try {
      setLoading(true);
      await addDoc(collection(db, 'emotionLocations'), {
        location: locationToSave,
        emotion: emotion.name,
        emotionEmoji: emotion.emoji,
        emotionType: emotion.type,
        timestamp: serverTimestamp(),
        accuracy: locationToSave.accuracy || null
      });

      setShowModal(false);
      setSelectedLocation(null);
      loadLocationData(); // 데이터 새로고침
      
      // 성공 메시지
      setError('');
      setLoading(false);
    } catch (error) {
      console.error('감정 저장 실패:', error);
      setError('감정을 저장하는데 실패했습니다.');
      setLoading(false);
    }
  };

  // 감정 통계
  const getEmotionStats = () => {
    const stats = {};
    locationData.forEach(item => {
      stats[item.emotion] = (stats[item.emotion] || 0) + 1;
    });
    return stats;
  };

  // 감정 타입별 통계
  const getEmotionTypeStats = () => {
    const stats = { positive: 0, negative: 0, neutral: 0 };
    locationData.forEach(item => {
      const emotion = EMOTIONS.find(e => e.name === item.emotion);
      if (emotion) {
        stats[emotion.type] = (stats[emotion.type] || 0) + 1;
      }
    });
    return stats;
  };

  // 위치 문자열 변환
  const getLocationString = (location) => {
    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  };

  // 최근 감정 기록
  const getRecentEmotions = () => {
    return locationData
      .sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds)
      .slice(0, 10);
  };

  // 감정별 카운트
  const getEmotionCounts = () => {
    const stats = getEmotionStats();
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  };

  // 히트맵 데이터 필터링
  const getFilteredHeatmapData = () => {
    if (heatmapType === 'all') return locationData;
    
    return locationData.filter(item => {
      const emotion = EMOTIONS.find(e => e.name === item.emotion);
      return emotion && emotion.type === heatmapType;
    });
  };

  // 지도 클릭 핸들러 (실제로는 iframe이라 구현이 제한적)
  const handleMapClick = (event) => {
    // 지도 클릭 이벤트 처리 (미래 확장용)
    console.log('Map clicked:', event);
  };

  // 위치 선택기 열기
  const openLocationPicker = () => {
    setShowLocationPicker(true);
    if (userLocation) {
      setTempLocation(userLocation);
    }
  };

  // 위치 확정
  const confirmLocation = () => {
    setSelectedLocation(tempLocation);
    setShowLocationPicker(false);
    setShowModal(true);
  };

  if (loading && !showModal && !userLocation) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>🗺️ 감정 지도를 준비하고 있어요...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#f7faf7',
        padding: { xs: 1, sm: 2, md: 3 }
      }}
    >
      <Container maxWidth="xl">
        {/* 헤더 */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            background: '#fff',
            padding: { xs: 2, sm: 3 },
            borderRadius: '16px',
            boxShadow: '0 2px 8px #b2ebf240'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              sx={{ 
                display: { xs: 'block', md: 'none' },
                background: '#e0f7fa',
                color: '#1976d2',
                '&:hover': { background: '#b3e5fc' }
              }}
              onClick={() => setDrawerOpen(true)}
            >
              <MenuIcon />
            </IconButton>
            <Box
              component="img"
              src="/jar.png"
              alt="Map Icon"
              sx={{ 
                width: { xs: 32, sm: 40 }, 
                height: { xs: 32, sm: 40 }
              }}
            />
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 'bold', 
                color: '#1976d2',
                fontSize: { xs: 18, sm: 24 }
              }}
            >
              🗺️ 감정 지도
            </Typography>
          </Box>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{ 
              display: { xs: 'none', md: 'block' },
              '& .MuiTab-root': {
                borderRadius: '12px',
                margin: '0 4px',
                color: '#1976d2',
                fontWeight: 'bold'
              },
              '& .Mui-selected': {
                background: '#e0f7fa'
              }
            }}
          >
            <Tab 
              label="감정 기록" 
              icon={<EmojiEmotionsIcon />}
              iconPosition="start"
            />
            <Tab 
              label="분석 결과" 
              icon={<AnalyticsIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* 모바일 드로어 */}
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: 280,
              background: '#f7faf7',
              padding: 2
            }
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold', mb: 2 }}>
              🗺️ 감정 지도 메뉴
            </Typography>
            <List>
              <ListItem 
                button 
                onClick={() => {
                  setTabValue(0);
                  setDrawerOpen(false);
                }}
                sx={{
                  borderRadius: '12px',
                  mb: 1,
                  background: tabValue === 0 ? '#e0f7fa' : 'transparent',
                  '&:hover': { background: '#e0f7fa' }
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ background: '#1976d2', width: 32, height: 32 }}>
                    <EmojiEmotionsIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary="감정 기록" 
                  sx={{ '& .MuiTypography-root': { color: '#1976d2', fontWeight: 'bold' } }}
                />
              </ListItem>
              <ListItem 
                button 
                onClick={() => {
                  setTabValue(1);
                  setDrawerOpen(false);
                }}
                sx={{
                  borderRadius: '12px',
                  background: tabValue === 1 ? '#e0f7fa' : 'transparent',
                  '&:hover': { background: '#e0f7fa' }
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ background: '#1976d2', width: 32, height: 32 }}>
                    <AnalyticsIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary="분석 결과" 
                  sx={{ '& .MuiTypography-root': { color: '#1976d2', fontWeight: 'bold' } }}
                />
              </ListItem>
            </List>
          </Box>
        </Drawer>

        {tabValue === 0 && (
          <Grid container spacing={2}>
            {/* 대형 지도 영역 */}
            <Grid item xs={12} lg={8}>
              <Paper sx={{ ...cardStyle, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                    📍 감정 지도
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={getCurrentLocation}
                      startIcon={<MyLocationIcon />}
                      sx={{
                        borderRadius: '12px',
                        borderColor: '#1976d2',
                        color: '#1976d2',
                        '&:hover': { background: '#e0f7fa' }
                      }}
                    >
                      현재 위치
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={openLocationPicker}
                      startIcon={<PinDropIcon />}
                      sx={{
                        borderRadius: '12px',
                        background: '#1976d2',
                        '&:hover': { background: '#1565c0' }
                      }}
                    >
                      위치 선택
                    </Button>
                  </Box>
                </Box>

                {/* 확대된 지도 영역 */}
                <Box
                  sx={{
                    width: '100%',
                    height: { xs: 400, sm: 500, md: 600 },
                    background: '#f7faf7',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '2px solid #e0f7fa',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showMap && (userLocation || selectedLocation) ? (
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      title="감정 기록 지도"
                      src={`https://www.google.com/maps/embed/v1/view?key=AIzaSyD9q64HTN-tWQ9v8I0PdDL3Sq48kWSHRyA&center=${(selectedLocation || userLocation).lat},${(selectedLocation || userLocation).lng}&zoom=16`}
                      allowFullScreen
                    />
                  ) : (
                    <>
                      <Box
                        component="img"
                        src="/seat1.png"
                        alt="Map Placeholder"
                        sx={{ width: { xs: 80, sm: 120 }, opacity: 0.5, mb: 2 }}
                      />
                      <Typography variant="h6" sx={{ color: '#666', fontWeight: 'bold', mb: 2 }}>
                        🗺️ 감정을 기록할 위치를 선택해주세요
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#999', textAlign: 'center' }}>
                        현재 위치 버튼을 누르거나<br />
                        위치 선택 버튼으로 정확한 위치를 설정해보세요
                      </Typography>
                    </>
                  )}

                  {/* 선택된 위치 표시 */}
                  {selectedLocation && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        background: 'rgba(25, 118, 210, 0.9)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      📍 선택된 위치: {getLocationString(selectedLocation)}
                    </Box>
                  )}
                </Box>

                {/* 위치 정보 */}
                <Box sx={{ mt: 2, p: 2, background: '#f7faf7', borderRadius: '12px' }}>
                  <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                    <strong>현재 좌표:</strong> {
                      selectedLocation ? getLocationString(selectedLocation) :
                      userLocation ? getLocationString(userLocation) : 
                      '위치를 선택해주세요'
                    }
                  </Typography>
                  {(selectedLocation || userLocation) && (
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      GPS 정확도: {(selectedLocation || userLocation)?.accuracy ? 
                        `${Math.round((selectedLocation || userLocation).accuracy)}m` : '-'
                      }
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* 사이드바 */}
            <Grid item xs={12} lg={4}>
              <Grid container spacing={2}>
                {/* 감정 통계 */}
                <Grid item xs={12}>
                  <Paper sx={{ ...cardStyle, p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 'bold' }}>
                      📊 감정 통계
                    </Typography>
                    
                    <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                      총 기록: {locationData.length}개 👍
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {Object.entries(getEmotionStats()).map(([emotion, count]) => {
                        const emotionData = EMOTIONS.find(e => e.name === emotion);
                        return (
                          <Chip
                            key={emotion}
                            label={`${emotionData?.emoji} ${emotion} ${count}`}
                            sx={{
                              background: '#f7faf7',
                              color: '#1976d2',
                              fontWeight: 'bold',
                              border: '1px solid #e0f7fa',
                              '&:hover': { background: '#e0f7fa' }
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Paper>
                </Grid>

                {/* 감정 타입별 통계 */}
                <Grid item xs={12}>
                  <Paper sx={{ ...cardStyle, p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 'bold' }}>
                      🎭 감정 유형 분석
                    </Typography>
                    
                    {(() => {
                      const typeStats = getEmotionTypeStats();
                      const total = Object.values(typeStats).reduce((a, b) => a + b, 0);
                      return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ color: '#4CAF50', fontWeight: 'bold' }}>
                              😊 긍정적
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {typeStats.positive}회 ({total > 0 ? Math.round((typeStats.positive / total) * 100) : 0}%)
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ color: '#F44336', fontWeight: 'bold' }}>
                              😞 부정적
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {typeStats.negative}회 ({total > 0 ? Math.round((typeStats.negative / total) * 100) : 0}%)
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ color: '#FF9800', fontWeight: 'bold' }}>
                              😐 중립적
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {typeStats.neutral}회 ({total > 0 ? Math.round((typeStats.neutral / total) * 100) : 0}%)
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })()}
                  </Paper>
                </Grid>

                {/* 사용 방법 */}
                <Grid item xs={12}>
                  <Paper sx={{ ...cardStyle, p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 'bold' }}>
                      📱 사용 방법
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: '#666', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 20, height: 20, borderRadius: '50%', background: '#e0f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold', color: '#1976d2' }}>1</Box>
                        현재 위치 또는 원하는 위치 선택
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 20, height: 20, borderRadius: '50%', background: '#e0f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold', color: '#1976d2' }}>2</Box>
                        플로팅 버튼으로 감정 기록
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 20, height: 20, borderRadius: '50%', background: '#e0f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold', color: '#1976d2' }}>3</Box>
                        현재 기분에 맞는 감정 선택
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 20, height: 20, borderRadius: '50%', background: '#e0f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold', color: '#1976d2' }}>4</Box>
                        분석 탭에서 히트맵 확인
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        )}

        {tabValue === 1 && (
          <Grid container spacing={3}>
            {/* 히트맵 분석 */}
            <Grid item xs={12}>
              <Paper sx={{ ...cardStyle, p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                    🔥 감정 히트맵 분석
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showHeatmap}
                          onChange={(e) => setShowHeatmap(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="히트맵 표시"
                    />
                    <Button
                      variant={heatmapType === 'all' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setHeatmapType('all')}
                      sx={{ borderRadius: '12px', minWidth: 60 }}
                    >
                      전체
                    </Button>
                    <Button
                      variant={heatmapType === 'positive' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setHeatmapType('positive')}
                      sx={{ borderRadius: '12px', minWidth: 60, borderColor: '#4CAF50', color: heatmapType === 'positive' ? '#fff' : '#4CAF50', '&.Mui-disabled': { borderColor: '#4CAF50' } }}
                    >
                      긍정
                    </Button>
                    <Button
                      variant={heatmapType === 'negative' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setHeatmapType('negative')}
                      sx={{ borderRadius: '12px', minWidth: 60, borderColor: '#F44336', color: heatmapType === 'negative' ? '#fff' : '#F44336', '&.Mui-disabled': { borderColor: '#F44336' } }}
                    >
                      부정
                    </Button>
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
                  {heatmapType === 'all' && '모든 감정 데이터를 표시합니다.'}
                  {heatmapType === 'positive' && '긍정적인 감정(행복, 흥미진진, 평온함, 집중)만 표시합니다.'}
                  {heatmapType === 'negative' && '부정적인 감정(슬픔, 화남, 무서움, 혐오, 스트레스, 졸음)만 표시합니다.'}
                </Typography>

                {/* 히트맵 데이터 요약 */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {(() => {
                    const filteredData = getFilteredHeatmapData();
                    const locationClusters = {};
                    
                    // 위치별로 감정 데이터 그룹화
                    filteredData.forEach(item => {
                      const key = `${item.location.lat.toFixed(3)},${item.location.lng.toFixed(3)}`;
                      if (!locationClusters[key]) {
                        locationClusters[key] = { location: item.location, emotions: [], count: 0 };
                      }
                      locationClusters[key].emotions.push(item.emotion);
                      locationClusters[key].count++;
                    });

                    return Object.entries(locationClusters)
                      .sort((a, b) => b[1].count - a[1].count)
                      .slice(0, 5)
                      .map(([key, cluster], index) => (
                        <Grid item xs={12} sm={6} md={4} key={key}>
                          <Box
                            sx={{
                              background: index === 0 ? '#e3f2fd' : '#f7faf7',
                              padding: 2,
                              borderRadius: '12px',
                              border: index === 0 ? '2px solid #1976d2' : '1px solid #e0f7fa'
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 1 }}>
                              🏆 핫스팟 #{index + 1}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>
                              📍 {getLocationString(cluster.location)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                              {cluster.count}회 기록
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#999' }}>
                              주요 감정: {cluster.emotions.slice(0, 3).join(', ')}
                            </Typography>
                          </Box>
                        </Grid>
                      ));
                  })()}
                </Grid>
              </Paper>
            </Grid>

            {/* 최근 기록 */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ ...cardStyle, p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 'bold' }}>
                  ⏰ 최근 기록
                </Typography>
                
                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  {getRecentEmotions().map((item, index) => {
                    const emotionData = EMOTIONS.find(e => e.name === item.emotion);
                    return (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          padding: '8px 12px',
                          borderRadius: '12px',
                          background: '#f7faf7',
                          mb: 1,
                          border: '1px solid #e0f7fa'
                        }}
                      >
                        <Avatar
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            background: emotionData?.type === 'positive' ? '#e8f5e8' : 
                                      emotionData?.type === 'negative' ? '#ffebee' : '#fff3e0',
                            color: emotionData?.type === 'positive' ? '#4CAF50' : 
                                   emotionData?.type === 'negative' ? '#F44336' : '#FF9800',
                            fontSize: 18
                          }}
                        >
                          {emotionData?.emoji}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                            {emotionData?.emoji} {item.emotion}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666' }}>
                            {getLocationString(item.location)} • {new Date(item.timestamp.seconds * 1000).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                  {getRecentEmotions().length === 0 && (
                    <Typography variant="body2" sx={{ color: '#999', textAlign: 'center', py: 3 }}>
                      아직 기록이 없습니다.
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* 감정별 통계 */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ ...cardStyle, p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 'bold' }}>
                  📈 감정별 빈도
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {getEmotionCounts().map(([emotion, count], index) => {
                    const emotionData = EMOTIONS.find(e => e.name === emotion);
                    const percentage = locationData.length > 0 ? Math.round((count / locationData.length) * 100) : 0;
                    return (
                      <Box
                        key={emotion}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          padding: '8px 12px',
                          borderRadius: '12px',
                          background: '#f7faf7',
                          border: '1px solid #e0f7fa'
                        }}
                      >
                        <Avatar
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            background: emotionData?.type === 'positive' ? '#e8f5e8' : 
                                      emotionData?.type === 'negative' ? '#ffebee' : '#fff3e0',
                            color: emotionData?.type === 'positive' ? '#4CAF50' : 
                                   emotionData?.type === 'negative' ? '#F44336' : '#FF9800',
                            fontSize: 18
                          }}
                        >
                          {emotionData?.emoji}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                            {emotionData?.emoji} {emotion}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 60,
                                height: 4,
                                background: '#e0f7fa',
                                borderRadius: '2px',
                                overflow: 'hidden'
                              }}
                            >
                              <Box
                                sx={{
                                  width: `${percentage}%`,
                                  height: '100%',
                                  background: emotionData?.type === 'positive' ? '#4CAF50' : 
                                             emotionData?.type === 'negative' ? '#F44336' : '#FF9800',
                                  borderRadius: '2px'
                                }}
                              />
                            </Box>
                            <Typography variant="caption" sx={{ color: '#666', minWidth: 60 }}>
                              {count}회 ({percentage}%)
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* 위치 선택 모달 */}
        <Dialog 
          open={showLocationPicker} 
          onClose={() => setShowLocationPicker(false)}
          maxWidth="md"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              borderRadius: '16px',
              background: '#fff',
              boxShadow: '0 8px 32px #b2ebf260'
            }
          }}
        >
          <DialogTitle sx={{ 
            textAlign: 'center', 
            color: '#1976d2', 
            fontWeight: 'bold',
            borderBottom: '1px solid #e0f7fa',
            position: 'relative'
          }}>
            📍 위치 선택하기
            <IconButton
              onClick={() => setShowLocationPicker(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <Typography variant="body2" sx={{ color: '#666', mb: 3, textAlign: 'center' }}>
              감정을 기록할 정확한 위치를 선택해주세요
            </Typography>
            
            {/* 임시 위치 표시 */}
            <Box
              sx={{
                height: 300,
                background: '#f7faf7',
                borderRadius: '12px',
                border: '2px solid #e0f7fa',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3
              }}
            >
              <PinDropIcon sx={{ fontSize: 48, color: '#1976d2', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold', mb: 1 }}>
                위치 선택 도구
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', textAlign: 'center' }}>
                현재는 현재 위치를 기본으로 설정됩니다.<br />
                향후 업데이트에서 정확한 핀 선택 기능이 추가될 예정입니다.
              </Typography>
              
              {tempLocation && (
                <Box sx={{ mt: 2, p: 2, background: '#e3f2fd', borderRadius: '8px' }}>
                  <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                    선택된 위치: {getLocationString(tempLocation)}
                  </Typography>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ padding: 3, justifyContent: 'center', gap: 2 }}>
            <Button 
              onClick={() => setShowLocationPicker(false)}
              sx={{
                borderRadius: '12px',
                background: '#f7faf7',
                color: '#666',
                fontWeight: 'bold',
                padding: '10px 24px',
                border: '1px solid #e0e0e0',
                '&:hover': { background: '#e0e0e0' }
              }}
            >
              취소
            </Button>
            <Button 
              onClick={confirmLocation}
              disabled={!tempLocation}
              sx={{
                borderRadius: '12px',
                background: '#1976d2',
                color: '#fff',
                fontWeight: 'bold',
                padding: '10px 24px',
                boxShadow: '0 2px 8px #1976d240',
                '&:hover': { background: '#1565c0' },
                '&:disabled': { background: '#f5f5f5', color: '#999' }
              }}
            >
              이 위치로 확정
            </Button>
          </DialogActions>
        </Dialog>

        {/* 개선된 감정 선택 모달 */}
        <Dialog 
          open={showModal} 
          onClose={() => setShowModal(false)}
          maxWidth="sm"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }
          }}
        >
          <DialogTitle sx={{ 
            textAlign: 'center', 
            fontWeight: 'bold',
            fontSize: '1.5rem',
            position: 'relative',
            pt: 4
          }}>
            🎭 현재 기분을 선택해주세요
            <IconButton
              onClick={() => setShowModal(false)}
              sx={{ 
                position: 'absolute', 
                right: 8, 
                top: 8,
                color: 'white',
                '&:hover': { background: 'rgba(255,255,255,0.1)' }
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <Typography variant="body2" sx={{ 
              color: 'rgba(255,255,255,0.8)', 
              mb: 3, 
              textAlign: 'center',
              fontSize: '1rem'
            }}>
              📍 {selectedLocation ? getLocationString(selectedLocation) : 
                   userLocation ? getLocationString(userLocation) : ''}
            </Typography>
            
            <Grid container spacing={2}>
              {EMOTIONS.map((emotion) => (
                <Grid item xs={6} sm={4} key={emotion.name}>
                  <Button
                    onClick={() => saveEmotion(emotion)}
                    disabled={loading}
                    sx={{
                      width: '100%',
                      height: 90,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1,
                      borderRadius: '16px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '2px solid rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 'bold',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: 'rgba(255,255,255,0.2)',
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                        border: '2px solid rgba(255,255,255,0.4)'
                      },
                      '&:active': {
                        transform: 'translateY(-2px)'
                      },
                      '&:disabled': { 
                        background: 'rgba(255,255,255,0.05)', 
                        color: 'rgba(255,255,255,0.3)',
                        border: '2px solid rgba(255,255,255,0.1)',
                        transform: 'none'
                      }
                    }}
                  >
                    <Typography variant="h5" sx={{ lineHeight: 1 }}>
                      {emotion.emoji}
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      fontWeight: 'bold',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                    }}>
                      {emotion.name}
                    </Typography>
                  </Button>
                </Grid>
              ))}
            </Grid>

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <CircularProgress sx={{ color: 'white' }} />
                <Typography sx={{ ml: 2, color: 'white' }}>저장 중...</Typography>
              </Box>
            )}
          </DialogContent>
        </Dialog>

        {/* 플로팅 액션 버튼 */}
        <Fab
          color="primary"
          onClick={() => {
            if (selectedLocation || userLocation) {
              setShowModal(true);
            } else {
              getCurrentLocation();
            }
          }}
          disabled={loading}
          sx={{
            position: 'fixed',
            bottom: { xs: 20, sm: 30 },
            right: { xs: 20, sm: 30 },
            background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            width: 64,
            height: 64,
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
            '&:hover': { 
              background: 'linear-gradient(45deg, #5a6fd8 0%, #6a4190 100%)',
              transform: 'scale(1.1)',
              boxShadow: '0 12px 30px rgba(102, 126, 234, 0.6)'
            },
            '&:disabled': { 
              background: '#f5f5f5', 
              color: '#999' 
            }
          }}
        >
          {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : <EmojiEmotionsIcon sx={{ fontSize: 28 }} />}
        </Fab>

        {/* 에러 표시 */}
        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError('')}
            sx={{ 
              position: 'fixed',
              bottom: 100,
              left: '50%',
              transform: 'translateX(-50%)',
              borderRadius: '12px',
              background: '#ffebee',
              color: '#c62828',
              border: '1px solid #ffcdd2',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              '& .MuiAlert-icon': { color: '#c62828' },
              zIndex: 9999
            }}
          >
            {error}
          </Alert>
        )}
      </Container>
    </Box>
  );
};

export default MapPage; 