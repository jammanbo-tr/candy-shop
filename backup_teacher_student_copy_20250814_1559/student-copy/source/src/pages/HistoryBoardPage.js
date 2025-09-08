import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { getGoogleMaps } from '../utils/googleMapsLoader';
import HistoryIcon from '@mui/icons-material/History';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MapIcon from '@mui/icons-material/Map';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageIcon from '@mui/icons-material/Image';

const HistoryBoardPage = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentResponse, setStudentResponse] = useState({
    text: '',
    location: null,
    coordinates: null,
    imageUrl: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.9780 }); // 서울 중심
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [showAllResponsesModal, setShowAllResponsesModal] = useState(false);
  const [allResponses, setAllResponses] = useState([]);
  const [showClusteringModal, setShowClusteringModal] = useState(false);
  const [clusteringResults, setClusteringResults] = useState(null);
  const [clusteringMap, setClusteringMap] = useState(null);
  const mapRef = useRef(null);

  // 더미 데이터 생성 함수
  const generateDummyData = () => {
    const koreanLocations = [
      { lat: 37.5665, lng: 126.9780, name: '서울', text: '한국의 수도로서 정치, 경제, 문화의 중심지입니다.' },
      { lat: 35.1796, lng: 129.0756, name: '부산', text: '한국의 제2도시로 항구도시로서 무역의 중심지입니다.' },
      { lat: 35.8714, lng: 128.6014, name: '대구', text: '한국의 내륙도시로 교통의 요지입니다.' },
      { lat: 37.4563, lng: 126.7052, name: '인천', text: '서해안의 항구도시로 국제공항이 있는 도시입니다.' },
      { lat: 35.1595, lng: 126.8526, name: '광주', text: '전라남도의 중심도시로 문화예술의 도시입니다.' },
      { lat: 36.3504, lng: 127.3845, name: '대전', text: '충청남도의 중심도시로 과학기술의 도시입니다.' },
      { lat: 37.2911, lng: 127.0089, name: '수원', text: '경기도의 중심도시로 역사문화의 도시입니다.' },
      { lat: 37.4563, lng: 126.7052, name: '울산', text: '산업도시로 현대자동차와 석유화학공단이 있습니다.' },
      { lat: 36.6744, lng: 127.2829, name: '청주', text: '충청북도의 중심도시로 농업의 중심지입니다.' },
      { lat: 35.1595, lng: 126.8526, name: '전주', text: '전라북도의 중심도시로 한옥마을이 유명합니다.' },
      { lat: 37.4563, lng: 126.7052, name: '창원', text: '경상남도의 중심도시로 산업도시입니다.' },
      { lat: 36.3504, lng: 127.3845, name: '천안', text: '충청남도의 도시로 교통의 요지입니다.' },
      { lat: 37.2911, lng: 127.0089, name: '용인', text: '경기도의 도시로 교육도시입니다.' },
      { lat: 37.4563, lng: 126.7052, name: '포항', text: '동해안의 항구도시로 철강산업이 발달했습니다.' },
      { lat: 36.6744, lng: 127.2829, name: '안산', text: '경기도의 도시로 산업도시입니다.' },
      { lat: 35.1595, lng: 126.8526, name: '김해', text: '경상남도의 도시로 김해공항이 있습니다.' },
      { lat: 37.4563, lng: 126.7052, name: '여수', text: '전라남도의 항구도시로 석유화학산업이 발달했습니다.' },
      { lat: 36.3504, lng: 127.3845, name: '춘천', text: '강원도의 중심도시로 관광도시입니다.' },
      { lat: 37.2911, lng: 127.0089, name: '원주', text: '강원도의 도시로 교육도시입니다.' },
      { lat: 37.4563, lng: 126.7052, name: '강릉', text: '강원도의 도시로 관광도시입니다.' },
      { lat: 36.6744, lng: 127.2829, name: '충주', text: '충청북도의 도시로 농업도시입니다.' },
      { lat: 35.1595, lng: 126.8526, name: '제천', text: '충청북도의 도시로 관광도시입니다.' },
      { lat: 37.4563, lng: 126.7052, name: '보령', text: '충청남도의 도시로 해양관광도시입니다.' },
      { lat: 36.3504, lng: 127.3845, name: '공주', text: '충청남도의 도시로 역사문화도시입니다.' },
      { lat: 37.2911, lng: 127.0089, name: '논산', text: '충청남도의 도시로 농업도시입니다.' },
      { lat: 37.4563, lng: 126.7052, name: '계룡', text: '충청남도의 도시로 군사도시입니다.' },
      { lat: 36.6744, lng: 127.2829, name: '당진', text: '충청남도의 도시로 항구도시입니다.' },
      { lat: 35.1595, lng: 126.8526, name: '아산', text: '충청남도의 도시로 산업도시입니다.' },
      { lat: 37.4563, lng: 126.7052, name: '서산', text: '충청남도의 도시로 해양관광도시입니다.' },
      { lat: 36.3504, lng: 127.3845, name: '태안', text: '충청남도의 도시로 해양관광도시입니다.' },
      { lat: 37.2911, lng: 127.0089, name: '홍성', text: '충청남도의 도시로 농업도시입니다.' },
      { lat: 37.4563, lng: 126.7052, name: '예산', text: '충청남도의 도시로 농업도시입니다.' },
      { lat: 36.6744, lng: 127.2829, name: '청양', text: '충청남도의 도시로 농업도시입니다.' },
      { lat: 35.1595, lng: 126.8526, name: '금산', text: '충청남도의 도시로 농업도시입니다.' },
      { lat: 37.4563, lng: 126.7052, name: '부여', text: '충청남도의 도시로 역사문화도시입니다.' },
      { lat: 36.3504, lng: 127.3845, name: '서천', text: '충청남도의 도시로 해양관광도시입니다.' },
      { lat: 37.2911, lng: 127.0089, name: '보은', text: '충청북도의 도시로 농업도시입니다.' },
      { lat: 37.4563, lng: 126.7052, name: '옥천', text: '충청북도의 도시로 농업도시입니다.' },
      { lat: 36.6744, lng: 127.2829, name: '영동', text: '충청북도의 도시로 농업도시입니다.' },
      { lat: 35.1595, lng: 126.8526, name: '증평', text: '충청북도의 도시로 농업도시입니다.' },
      { lat: 37.4563, lng: 126.7052, name: '진천', text: '충청북도의 도시로 농업도시입니다.' },
      { lat: 36.3504, lng: 127.3845, name: '괴산', text: '충청북도의 도시로 농업도시입니다.' },
      { lat: 37.2911, lng: 127.0089, name: '음성', text: '충청북도의 도시로 농업도시입니다.' },
      { lat: 37.4563, lng: 126.7052, name: '단양', text: '충청북도의 도시로 관광도시입니다.' },
      { lat: 36.6744, lng: 127.2829, name: '영월', text: '강원도의 도시로 관광도시입니다.' },
      { lat: 35.1595, lng: 126.8526, name: '평창', text: '강원도의 도시로 관광도시입니다.' },
      { lat: 37.4563, lng: 126.7052, name: '정선', text: '강원도의 도시로 관광도시입니다.' },
      { lat: 36.3504, lng: 127.3845, name: '철원', text: '강원도의 도시로 농업도시입니다.' },
      { lat: 37.2911, lng: 127.0089, name: '화천', text: '강원도의 도시로 관광도시입니다.' },
      { lat: 37.4563, lng: 126.7052, name: '양구', text: '강원도의 도시로 관광도시입니다.' },
      { lat: 36.6744, lng: 127.2829, name: '인제', text: '강원도의 도시로 관광도시입니다.' },
      { lat: 35.1595, lng: 126.8526, name: '고성', text: '강원도의 도시로 관광도시입니다.' },
      { lat: 37.4563, lng: 126.7052, name: '양양', text: '강원도의 도시로 관광도시입니다.' },
      { lat: 36.3504, lng: 127.3845, name: '동해', text: '강원도의 도시로 항구도시입니다.' },
      { lat: 37.2911, lng: 127.0089, name: '삼척', text: '강원도의 도시로 관광도시입니다.' },
      { lat: 37.4563, lng: 126.7052, name: '태백', text: '강원도의 도시로 관광도시입니다.' }
    ];

    const asianLocations = [
      // 중국 도시들
      { lat: 39.9042, lng: 116.4074, name: '베이징', text: '중국의 수도로 정치, 문화의 중심지입니다.' },
      { lat: 31.2304, lng: 121.4737, name: '상하이', text: '중국의 경제 중심지로 금융의 도시입니다.' },
      { lat: 23.1291, lng: 113.2644, name: '광저우', text: '중국 남부의 경제 중심지입니다.' },
      { lat: 30.2741, lng: 120.1551, name: '항저우', text: '중국의 관광도시로 서호가 유명합니다.' },
      { lat: 22.3193, lng: 114.1694, name: '홍콩', text: '중국의 특별행정구로 금융의 중심지입니다.' },
      { lat: 22.1987, lng: 113.5439, name: '마카오', text: '중국의 특별행정구로 관광도시입니다.' },
      { lat: 34.0522, lng: 118.2437, name: '난징', text: '중국의 역사문화도시입니다.' },
      { lat: 36.0611, lng: 103.8343, name: '란저우', text: '중국 서부의 도시입니다.' },
      { lat: 43.8256, lng: 87.6168, name: '우루무치', text: '중국 서부의 도시입니다.' },
      { lat: 25.0330, lng: 121.5654, name: '타이페이', text: '대만의 수도로 정치, 경제의 중심지입니다.' },
      { lat: 24.1477, lng: 120.6736, name: '타이중', text: '대만의 중부 도시입니다.' },
      { lat: 22.9997, lng: 120.2270, name: '타이난', text: '대만의 남부 도시입니다.' },
      { lat: 25.0330, lng: 121.5654, name: '가오슝', text: '대만의 남부 항구도시입니다.' },
      { lat: 25.0330, lng: 121.5654, name: '신주', text: '대만의 북부 도시입니다.' },
      { lat: 25.0330, lng: 121.5654, name: '지룽', text: '대만의 북부 항구도시입니다.' },
      { lat: 25.0330, lng: 121.5654, name: '이란', text: '대만의 동부 도시입니다.' },
      { lat: 25.0330, lng: 121.5654, name: '화롄', text: '대만의 동부 도시입니다.' },
      { lat: 25.0330, lng: 121.5654, name: '타이둥', text: '대만의 동부 도시입니다.' },
      { lat: 25.0330, lng: 121.5654, name: '펑후', text: '대만의 섬 도시입니다.' },
      { lat: 25.0330, lng: 121.5654, name: '진먼', text: '대만의 섬 도시입니다.' },
      { lat: 25.0330, lng: 121.5654, name: '마쭈', text: '대만의 섬 도시입니다.' },
      // 일본 도시들
      { lat: 35.6762, lng: 139.6503, name: '도쿄', text: '일본의 수도로 정치, 경제의 중심지입니다.' },
      { lat: 34.6937, lng: 135.5023, name: '오사카', text: '일본의 제2도시로 상업의 중심지입니다.' },
      { lat: 35.0116, lng: 135.7681, name: '교토', text: '일본의 고도로 역사문화의 도시입니다.' },
      { lat: 35.1815, lng: 136.9066, name: '나고야', text: '일본의 중부 도시로 자동차 산업이 발달했습니다.' },
      { lat: 43.0618, lng: 141.3545, name: '삿포로', text: '일본의 북부 도시로 홋카이도의 중심지입니다.' },
      { lat: 35.4437, lng: 139.6380, name: '요코하마', text: '일본의 항구도시입니다.' },
      { lat: 34.3853, lng: 132.4553, name: '히로시마', text: '일본의 서부 도시입니다.' },
      { lat: 32.7503, lng: 129.8675, name: '나가사키', text: '일본의 서부 항구도시입니다.' },
      { lat: 35.8617, lng: 104.1954, name: '후쿠오카', text: '일본의 서부 도시입니다.' },
      { lat: 35.6762, lng: 139.6503, name: '센다이', text: '일본의 동부 도시입니다.' },
      { lat: 34.6937, lng: 135.5023, name: '니가타', text: '일본의 중부 도시입니다.' },
      { lat: 35.0116, lng: 135.7681, name: '가나자와', text: '일본의 중부 도시입니다.' },
      { lat: 35.1815, lng: 136.9066, name: '시즈오카', text: '일본의 중부 도시입니다.' },
      { lat: 43.0618, lng: 141.3545, name: '하마마쓰', text: '일본의 중부 도시입니다.' },
      { lat: 35.4437, lng: 139.6380, name: '오카야마', text: '일본의 서부 도시입니다.' },
      { lat: 34.3853, lng: 132.4553, name: '구마모토', text: '일본의 서부 도시입니다.' },
      { lat: 32.7503, lng: 129.8675, name: '가고시마', text: '일본의 서부 도시입니다.' },
      { lat: 35.8617, lng: 104.1954, name: '오키나와', text: '일본의 남부 도시입니다.' },
      // 몽골 도시들
      { lat: 47.9184, lng: 106.9177, name: '울란바토르', text: '몽골의 수도로 정치, 경제의 중심지입니다.' },
      { lat: 49.6344, lng: 100.1624, name: '다르한', text: '몽골의 제2도시입니다.' },
      { lat: 48.8234, lng: 103.5348, name: '에르데네트', text: '몽골의 산업도시입니다.' },
      { lat: 47.9184, lng: 106.9177, name: '초이발상', text: '몽골의 도시입니다.' },
      { lat: 49.6344, lng: 100.1624, name: '무르운', text: '몽골의 도시입니다.' },
      { lat: 48.8234, lng: 103.5348, name: '바양홍고르', text: '몽골의 도시입니다.' },
      { lat: 47.9184, lng: 106.9177, name: '바양올기', text: '몽골의 도시입니다.' },
      { lat: 49.6344, lng: 100.1624, name: '부르간', text: '몽골의 도시입니다.' },
      { lat: 48.8234, lng: 103.5348, name: '고비알타이', text: '몽골의 도시입니다.' },
      { lat: 47.9184, lng: 106.9177, name: '다르항울', text: '몽골의 도시입니다.' },
      { lat: 49.6344, lng: 100.1624, name: '도르노드', text: '몽골의 도시입니다.' },
      { lat: 48.8234, lng: 103.5348, name: '두드강가', text: '몽골의 도시입니다.' },
      { lat: 47.9184, lng: 106.9177, name: '고비숨버', text: '몽골의 도시입니다.' },
      { lat: 49.6344, lng: 100.1624, name: '헨티', text: '몽골의 도시입니다.' },
      { lat: 48.8234, lng: 103.5348, name: '호브드', text: '몽골의 도시입니다.' },
      { lat: 47.9184, lng: 106.9177, name: '호브스골', text: '몽골의 도시입니다.' },
      { lat: 49.6344, lng: 100.1624, name: '오르홍', text: '몽골의 도시입니다.' },
      { lat: 48.8234, lng: 103.5348, name: '셀렝게', text: '몽골의 도시입니다.' },
      { lat: 47.9184, lng: 106.9177, name: '수흐바타르', text: '몽골의 도시입니다.' },
      { lat: 49.6344, lng: 100.1624, name: '투브', text: '몽골의 도시입니다.' },
      { lat: 48.8234, lng: 103.5348, name: '우브스', text: '몽골의 도시입니다.' },
      { lat: 47.9184, lng: 106.9177, name: '울란고브', text: '몽골의 도시입니다.' },
      { lat: 49.6344, lng: 100.1624, name: '자브한', text: '몽골의 도시입니다.' }
    ];

    const internationalLocations = [
      { lat: 40.7128, lng: -74.0060, name: '뉴욕', text: '미국의 경제 중심지로 월스트리트가 있는 도시입니다.' },
      { lat: 34.0522, lng: -118.2437, name: '로스앤젤레스', text: '미국의 엔터테인먼트 산업의 중심지입니다.' },
      { lat: 41.8781, lng: -87.6298, name: '시카고', text: '미국의 중부 지역의 경제 중심지입니다.' },
      { lat: 29.7604, lng: -95.3698, name: '휴스턴', text: '미국의 석유 산업의 중심지입니다.' },
      { lat: 33.7490, lng: -84.3880, name: '애틀랜타', text: '미국 남부의 교통과 경제의 중심지입니다.' },
      { lat: 25.7617, lng: -80.1918, name: '마이애미', text: '미국의 관광도시로 해양관광이 유명합니다.' },
      { lat: 39.9526, lng: -75.1652, name: '필라델피아', text: '미국의 역사적인 도시입니다.' },
      { lat: 32.7767, lng: -96.7970, name: '댈러스', text: '미국의 항공 산업의 중심지입니다.' },
      { lat: 36.1699, lng: -115.1398, name: '라스베가스', text: '미국의 엔터테인먼트 도시입니다.' },
      { lat: 47.6062, lng: -122.3321, name: '시애틀', text: '미국의 기술 산업의 중심지입니다.' },
      { lat: 51.5074, lng: -0.1278, name: '런던', text: '영국의 수도로 금융의 중심지입니다.' },
      { lat: 48.8566, lng: 2.3522, name: '파리', text: '프랑스의 수도로 예술과 문화의 도시입니다.' },
      { lat: 52.5200, lng: 13.4050, name: '베를린', text: '독일의 수도로 역사와 문화의 도시입니다.' },
      { lat: 41.9028, lng: 12.4964, name: '로마', text: '이탈리아의 수도로 고대 문명의 중심지입니다.' },
      { lat: 40.4168, lng: -3.7038, name: '마드리드', text: '스페인의 수도로 예술과 문화의 도시입니다.' },
      { lat: 52.3676, lng: 4.9041, name: '암스테르담', text: '네덜란드의 수도로 운하의 도시입니다.' },
      { lat: 50.8503, lng: 4.3517, name: '브뤼셀', text: '벨기에의 수도로 EU의 중심지입니다.' },
      { lat: 59.3293, lng: 18.0686, name: '스톡홀름', text: '스웨덴의 수도로 북유럽의 중심지입니다.' },
      { lat: 59.9139, lng: 10.7522, name: '오슬로', text: '노르웨이의 수도로 자연과 문화의 도시입니다.' },
      { lat: 60.1699, lng: 24.9384, name: '헬싱키', text: '핀란드의 수도로 북유럽의 중심지입니다.' },
      { lat: 55.6761, lng: 12.5683, name: '코펜하겐', text: '덴마크의 수도로 북유럽의 중심지입니다.' },
      { lat: 64.1353, lng: -21.8952, name: '레이캬비크', text: '아이슬란드의 수도로 자연의 도시입니다.' },
      { lat: 52.2297, lng: 21.0122, name: '바르샤바', text: '폴란드의 수도로 중앙유럽의 중심지입니다.' },
      { lat: 50.0755, lng: 14.4378, name: '프라하', text: '체코의 수도로 중앙유럽의 문화도시입니다.' },
      { lat: 47.4979, lng: 19.0402, name: '부다페스트', text: '헝가리의 수도로 중앙유럽의 문화도시입니다.' },
      { lat: 44.4268, lng: 26.1025, name: '부쿠레슈티', text: '루마니아의 수도로 동유럽의 중심지입니다.' },
      { lat: 42.6977, lng: 23.3219, name: '소피아', text: '불가리아의 수도로 동유럽의 중심지입니다.' },
      { lat: 41.0082, lng: 28.9784, name: '이스탄불', text: '터키의 도시로 동서양의 교차점입니다.' },
      { lat: 39.9334, lng: 32.8597, name: '앙카라', text: '터키의 수도로 정치의 중심지입니다.' },
      { lat: 55.7558, lng: 37.6176, name: '모스크바', text: '러시아의 수도로 동유럽의 중심지입니다.' },
      { lat: 59.9311, lng: 30.3609, name: '상트페테르부르크', text: '러시아의 문화도시입니다.' },
      { lat: 55.6761, lng: 12.5683, name: '스톡홀름', text: '스웨덴의 수도로 북유럽의 중심지입니다.' },
      { lat: 59.9139, lng: 10.7522, name: '오슬로', text: '노르웨이의 수도로 자연과 문화의 도시입니다.' },
      { lat: 60.1699, lng: 24.9384, name: '헬싱키', text: '핀란드의 수도로 북유럽의 중심지입니다.' },
      { lat: 55.6761, lng: 12.5683, name: '코펜하겐', text: '덴마크의 수도로 북유럽의 중심지입니다.' },
      { lat: 64.1353, lng: -21.8952, name: '레이캬비크', text: '아이슬란드의 수도로 자연의 도시입니다.' },
      { lat: 52.2297, lng: 21.0122, name: '바르샤바', text: '폴란드의 수도로 중앙유럽의 중심지입니다.' },
      { lat: 50.0755, lng: 14.4378, name: '프라하', text: '체코의 수도로 중앙유럽의 문화도시입니다.' },
      { lat: 47.4979, lng: 19.0402, name: '부다페스트', text: '헝가리의 수도로 중앙유럽의 문화도시입니다.' },
      { lat: 44.4268, lng: 26.1025, name: '부쿠레슈티', text: '루마니아의 수도로 동유럽의 중심지입니다.' },
      { lat: 42.6977, lng: 23.3219, name: '소피아', text: '불가리아의 수도로 동유럽의 중심지입니다.' },
      { lat: 41.0082, lng: 28.9784, name: '이스탄불', text: '터키의 도시로 동서양의 교차점입니다.' },
      { lat: 39.9334, lng: 32.8597, name: '앙카라', text: '터키의 수도로 정치의 중심지입니다.' },
      { lat: 55.7558, lng: 37.6176, name: '모스크바', text: '러시아의 수도로 동유럽의 중심지입니다.' },
      { lat: 59.9311, lng: 30.3609, name: '상트페테르부르크', text: '러시아의 문화도시입니다.' },
      { lat: 39.9042, lng: 116.4074, name: '베이징', text: '중국의 수도로 정치와 문화의 중심지입니다.' },
      { lat: 31.2304, lng: 121.4737, name: '상하이', text: '중국의 경제 중심지로 무역의 중심지입니다.' },
      { lat: 23.1291, lng: 113.2644, name: '광저우', text: '중국의 남부 지역의 경제 중심지입니다.' },
      { lat: 30.2741, lng: 120.1551, name: '항저우', text: '중국의 동부 지역의 경제 중심지입니다.' },
      { lat: 22.3193, lng: 114.1694, name: '홍콩', text: '중국의 특별행정구로 금융의 중심지입니다.' },
      { lat: 22.1667, lng: 113.5500, name: '마카오', text: '중국의 특별행정구로 관광의 중심지입니다.' },
      { lat: 35.6762, lng: 139.6503, name: '도쿄', text: '일본의 수도로 경제와 문화의 중심지입니다.' },
      { lat: 34.6937, lng: 135.5023, name: '오사카', text: '일본의 제2도시로 경제의 중심지입니다.' },
      { lat: 35.1815, lng: 136.9066, name: '나고야', text: '일본의 중부 지역의 경제 중심지입니다.' },
      { lat: 43.0618, lng: 141.3545, name: '삿포로', text: '일본의 북부 지역의 중심지입니다.' },
      { lat: 33.5902, lng: 130.4017, name: '후쿠오카', text: '일본의 서부 지역의 중심지입니다.' },
      { lat: 35.0116, lng: 135.7681, name: '교토', text: '일본의 고대 수도로 문화의 중심지입니다.' },
      { lat: 34.0522, lng: 135.7681, name: '나라', text: '일본의 고대 수도로 문화의 중심지입니다.' },
      { lat: 35.6762, lng: 139.6503, name: '요코하마', text: '일본의 항구도시로 무역의 중심지입니다.' },
      { lat: 34.6937, lng: 135.5023, name: '고베', text: '일본의 항구도시로 무역의 중심지입니다.' },
      { lat: 35.1815, lng: 136.9066, name: '히로시마', text: '일본의 서부 지역의 중심지입니다.' },
      { lat: 43.0618, lng: 141.3545, name: '센다이', text: '일본의 북부 지역의 중심지입니다.' },
      { lat: 33.5902, lng: 130.4017, name: '구마모토', text: '일본의 서부 지역의 중심지입니다.' },
      { lat: 35.0116, lng: 135.7681, name: '가고시마', text: '일본의 남부 지역의 중심지입니다.' },
      { lat: 34.0522, lng: 135.7681, name: '오키나와', text: '일본의 최남단 지역의 중심지입니다.' },
      { lat: 35.6762, lng: 139.6503, name: '니가타', text: '일본의 중부 지역의 중심지입니다.' },
      { lat: 34.6937, lng: 135.5023, name: '가나자와', text: '일본의 중부 지역의 문화도시입니다.' },
      { lat: 35.1815, lng: 136.9066, name: '마쓰야마', text: '일본의 서부 지역의 중심지입니다.' },
      { lat: 43.0618, lng: 141.3545, name: '아키타', text: '일본의 북부 지역의 중심지입니다.' },
      { lat: 33.5902, lng: 130.4017, name: '나가사키', text: '일본의 서부 지역의 중심지입니다.' },
      { lat: 35.0116, lng: 135.7681, name: '시모노세키', text: '일본의 서부 지역의 중심지입니다.' },
      { lat: 34.0522, lng: 135.7681, name: '하카타', text: '일본의 서부 지역의 중심지입니다.' },
      { lat: 35.6762, lng: 139.6503, name: '사가', text: '일본의 서부 지역의 중심지입니다.' },
      { lat: 34.6937, lng: 135.5023, name: '오이타', text: '일본의 서부 지역의 중심지입니다.' },
      { lat: 35.1815, lng: 136.9066, name: '미야자키', text: '일본의 남부 지역의 중심지입니다.' },
      { lat: 43.0618, lng: 141.3545, name: '가고시마', text: '일본의 남부 지역의 중심지입니다.' },
      { lat: 33.5902, lng: 130.4017, name: '오키나와', text: '일본의 최남단 지역의 중심지입니다.' }
    ];

    const dummyResponses = [];

    // 한국 데이터 50개 추가
    koreanLocations.forEach((location, index) => {
      dummyResponses.push({
        studentName: `학생${index + 1}`,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        text: location.text,
        coordinates: { lat: location.lat + (Math.random() - 0.5) * 0.1, lng: location.lng + (Math.random() - 0.5) * 0.1 },
        location: `${location.name} 근처`
      });
    });

    // 해외 데이터 50개 추가
    internationalLocations.forEach((location, index) => {
      dummyResponses.push({
        studentName: `학생${index + 51}`,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        text: location.text,
        coordinates: { lat: location.lat + (Math.random() - 0.5) * 0.1, lng: location.lng + (Math.random() - 0.5) * 0.1 },
        location: `${location.name} 근처`
      });
    });

    return dummyResponses;
  };

  // 더미 데이터 추가 함수
  const addDummyData = async () => {
    try {
      const dummyResponses = generateDummyData();
      
      // Firestore에 더미 데이터 추가
      const boardRef = doc(db, 'historyBoards', boardId);
      await updateDoc(boardRef, {
        responses: arrayUnion(...dummyResponses)
      });

      // 로컬 상태 업데이트
      setBoard(prev => ({
        ...prev,
        responses: [...(prev.responses || []), ...dummyResponses]
      }));

      alert('더미 데이터 100개가 성공적으로 추가되었습니다!');
    } catch (error) {
      console.error('더미 데이터 추가 실패:', error);
      alert('더미 데이터 추가 중 오류가 발생했습니다.');
    }
  };

  // 게시판 데이터 가져오기
  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const boardDoc = await getDoc(doc(db, 'historyBoards', boardId));
        if (boardDoc.exists()) {
          setBoard({ id: boardDoc.id, ...boardDoc.data() });
        } else {
          alert('게시판을 찾을 수 없습니다.');
          navigate('/');
        }
      } catch (error) {
        console.error('게시판 가져오기 실패:', error);
        alert('게시판을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (boardId) {
      fetchBoard();
    }
  }, [boardId, navigate]);

  // 지도 초기화
  const initializeMap = async () => {
    if (map) return;
    
    setMapLoading(true);
    
    try {
      const google = await getGoogleMaps();
      
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: 10,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true
      });

      setMap(mapInstance);

      // 지도 클릭 이벤트 리스너
      mapInstance.addListener('click', (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        
        // 기존 마커 제거
        if (marker) {
          marker.setMap(null);
        }
        
        // 새 마커 생성
        const newMarker = new google.maps.Marker({
          position: { lat, lng },
          map: mapInstance,
          title: '선택된 위치 (클릭하여 제거)',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(32, 32)
          }
        });
        
        // 마커 클릭 이벤트 리스너 추가
        newMarker.addListener('click', () => {
          newMarker.setMap(null);
          setMarker(null);
          setSelectedLocation(null);
          setStudentResponse(prev => ({
            ...prev,
            location: '',
            coordinates: null
          }));
        });
        
        setMarker(newMarker);
        setSelectedLocation({ lat, lng });
        setStudentResponse(prev => ({
          ...prev,
          location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          coordinates: { lat, lng }
        }));
      });

    } catch (error) {
      console.error('지도 로딩 실패:', error);
      alert('지도를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setMapLoading(false);
    }
  };

  // 지도 표시/숨김 토글
  const toggleMap = () => {
    setShowMap(!showMap);
  };

  // 지도가 표시될 때 초기화
  useEffect(() => {
    if (!map && board && board.type === 'location') {
      initializeMap();
    }
  }, [map, board]);

  // 모든 답변 모달에서 지도 초기화
  useEffect(() => {
    if (showAllResponsesModal && allResponses.length > 0) {
      const initializeAllResponsesMap = async () => {
        try {
          const google = await getGoogleMaps();
          
          const mapElement = document.getElementById('allResponsesMap');
          if (mapElement) {
            const allResponsesMap = new google.maps.Map(mapElement, {
              center: { lat: 37.5665, lng: 126.9780 }, // 서울 중심
              zoom: 3,
              mapTypeId: google.maps.MapTypeId.ROADMAP,
              mapTypeControl: true,
              streetViewControl: true,
              fullscreenControl: true,
              zoomControl: true
            });

            // 모든 답변의 위치에 마커 추가
            allResponses.forEach((response, index) => {
              if (response.coordinates) {
                const marker = new google.maps.Marker({
                  position: response.coordinates,
                  map: allResponsesMap,
                  title: `${response.studentName}의 선택`,
                  label: {
                    text: `${index + 1}`,
                    color: 'white',
                    fontWeight: 'bold'
                  },
                  icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                    scaledSize: new google.maps.Size(32, 32)
                  }
                });

                // 정보창 추가
                const infoWindow = new google.maps.InfoWindow({
                  content: `
                    <div style="padding: 8px;">
                      <h4 style="margin: 0 0 4px 0; color: #333;">${response.studentName}</h4>
                      <p style="margin: 0; color: #666; font-size: 12px;">${response.text || '위치만 선택'}</p>
                    </div>
                  `
                });

                marker.addListener('click', () => {
                  infoWindow.open(allResponsesMap, marker);
                });
              }
            });
          }
        } catch (error) {
          console.error('모든 답변 지도 초기화 실패:', error);
        }
      };

      // 모달이 완전히 렌더링된 후 지도 초기화
      setTimeout(initializeAllResponsesMap, 100);
    }
  }, [showAllResponsesModal, allResponses]);

  // 이미지 업로드 핸들러
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        setStudentResponse(prev => ({
          ...prev,
          imageUrl: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 모든 답변 가져오기
  const fetchAllResponses = async () => {
    try {
      const boardDoc = await getDoc(doc(db, 'historyBoards', boardId));
      if (boardDoc.exists()) {
        const responses = boardDoc.data().responses || [];
        setAllResponses(responses);
      }
    } catch (error) {
      console.error('답변 가져오기 실패:', error);
    }
  };

  // 답변 제출
  const handleSubmitResponse = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (board.type === 'location' && !studentResponse.coordinates) {
      alert('지도에서 위치를 선택해주세요.');
      return;
    }

    if (board.type === 'text' && !studentResponse.text.trim()) {
      alert('답변을 입력해주세요.');
      return;
    }

    if (board.type === 'location' && studentResponse.coordinates && !studentResponse.text.trim()) {
      alert('위치를 선택한 이유를 설명해주세요.');
      return;
    }

    if (board.type === 'image' && !imageFile) {
      alert('이미지를 업로드해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      const responseData = {
        studentId: user.uid,
        studentName: user.displayName || '익명',
        timestamp: Date.now(),
        text: studentResponse.text,
        location: studentResponse.location,
        coordinates: studentResponse.coordinates,
        imageUrl: studentResponse.imageUrl
      };

      await updateDoc(doc(db, 'historyBoards', boardId), {
        responses: arrayUnion(responseData)
      });

      await fetchAllResponses();
      setShowAllResponsesModal(true);
      setStudentResponse({
        text: '',
        location: null,
        coordinates: null,
        imageUrl: ''
      });
      setSelectedLocation(null);
      setImageFile(null);
      setImagePreview('');
    } catch (error) {
      console.error('답변 제출 실패:', error);
      alert('답변 제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 텍스트 전처리 함수
  const preprocessText = (text) => {
    // 조사, 연결사, 불용어 제거
    const stopWords = [
      '이', '가', '을', '를', '의', '에', '에서', '로', '으로', '와', '과', '도', '는', '은', '만', '부터', '까지',
      '그리고', '또는', '하지만', '그런데', '그래서', '그러면', '그러나', '또한',
      '있다', '없다', '하다', '되다', '이것', '그것', '저것', '무엇', '어떤', '어떻게', '왜', '언제', '어디서',
      '있어요', '있습니다', '됩니다', '해요', '합니다', '입니다', '이에요', '이예요'
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
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // 도읍 후보지 분석 실행
  const handleCapitalRecommendation = () => {
    if (!allResponses || allResponses.length === 0) {
      alert('분석할 응답이 없습니다.');
      return;
    }

    try {
      // 군집 분석 수행
      const results = performClustering(allResponses);
      
      setClusteringResults(results);
      setShowAllResponsesModal(false); // 전체 응답 모달 닫기
      setShowClusteringModal(true); // 군집분석 모달 열기
    } catch (error) {
      console.error('도읍 후보지 분석 중 오류:', error);
      alert('분석 중 오류가 발생했습니다.');
    }
  };

  // 클러스터링 맵 초기화 함수
  const initializeClusteringMap = async () => {
    if (!clusteringResults) return;

    try {
      const google = await getGoogleMaps();
      const mapElement = document.getElementById('clusteringMap');
      
      if (!mapElement) {
        console.error('클러스터링 맵 요소를 찾을 수 없습니다');
        return;
      }

      // 모든 응답의 중심점 계산
      const allValidResponses = clusteringResults.clusters.flatMap(cluster => cluster.responses);
      if (allValidResponses.length === 0) return;

      // 대한민국 중심으로 설정하고 세계 전체를 볼 수 있는 줌 레벨 사용
      const newMap = new google.maps.Map(mapElement, {
        zoom: 3, // 세계 전체를 볼 수 있는 줌 레벨
        center: { lat: 36.5, lng: 127.5 }, // 대한민국 중심
        mapTypeId: google.maps.MapTypeId.TERRAIN
      });

      setClusteringMap(newMap);

      // 히트맵 데이터 준비
      const heatmapData = allValidResponses.map(response => ({
        location: new google.maps.LatLng(response.coordinates.lat, response.coordinates.lng),
        weight: 1
      }));

      // 히트맵 레이어 생성
      const heatmap = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: newMap,
        radius: 50,
        opacity: 0.8,
        gradient: [
          'rgba(0, 255, 255, 0)',
          'rgba(0, 255, 255, 1)',
          'rgba(0, 191, 255, 1)',
          'rgba(0, 127, 255, 1)',
          'rgba(0, 63, 255, 1)',
          'rgba(0, 0, 255, 1)',
          'rgba(0, 0, 223, 1)',
          'rgba(0, 0, 191, 1)',
          'rgba(0, 0, 159, 1)',
          'rgba(0, 0, 127, 1)',
          'rgba(63, 0, 91, 1)',
          'rgba(127, 0, 63, 1)',
          'rgba(191, 0, 31, 1)',
          'rgba(255, 0, 0, 1)'
        ]
      });

      // 클러스터 중심점 마커 추가 (큰 크기)
      clusteringResults.clusters.forEach((cluster, index) => {
        if (cluster.geographicCenter) {
          // 클러스터 중심점 마커 (궁궐 아이콘, 큰 크기, 높은 우선순위)
          const clusterMarker = new google.maps.Marker({
            position: { lat: cluster.geographicCenter.lat, lng: cluster.geographicCenter.lng },
            map: newMap,
            title: `도읍 후보지 ${cluster.id}`,
            zIndex: 1000 + cluster.id, // 높은 z-index로 항상 위에 표시
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="25" cy="25" r="22" fill="#f57c00" stroke="#fff" stroke-width="4"/>
                  <circle cx="25" cy="25" r="18" fill="#ff8f00" stroke="#f57c00" stroke-width="2"/>
                  <text x="25" y="32" text-anchor="middle" fill="white" font-size="18" font-weight="bold">🏛️</text>
                </svg>
              `),
              scaledSize: new google.maps.Size(50, 50),
              anchor: new google.maps.Point(25, 25)
            }
          });

          // 클러스터 정보 윈도우
          const clusterInfoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; max-width: 200px;">
                <h4 style="margin: 0 0 8px 0; color: #f57c00;">🏛️ ${cluster.center}</h4>
                <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>추천 학생:</strong> ${cluster.responses.length}명</p>
                <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>대표 단어:</strong> ${cluster.representativeWords.slice(0, 3).join(', ')}</p>
                <p style="margin: 0; font-size: 11px; color: #666;">👑 단군왕검님께 추천하는 도읍지입니다</p>
              </div>
            `
          });

          clusterMarker.addListener('click', () => {
            clusterInfoWindow.open(newMap, clusterMarker);
          });
        }

        // 개별 응답 마커 추가 (번호 표시, 크기 증가)
        cluster.responses.forEach((response, responseIndex) => {
          const responseMarker = new google.maps.Marker({
            position: { lat: response.coordinates.lat, lng: response.coordinates.lng },
            map: newMap,
            title: `${response.studentName || '익명'} - ${cluster.center}`,
            zIndex: 100 + responseIndex, // 낮은 z-index로 도읍 후보지 마커 아래에 표시
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="14" cy="14" r="12" fill="#e53935" stroke="#fff" stroke-width="2"/>
                  <text x="14" y="18" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${cluster.id}</text>
                </svg>
              `),
              scaledSize: new google.maps.Size(28, 28),
              anchor: new google.maps.Point(14, 14)
            }
          });

          // 응답 정보 윈도우
          const responseInfoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; max-width: 250px;">
                <h4 style="margin: 0 0 8px 0; color: #e53935;">${response.studentName || '익명'}</h4>
                <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>소속:</strong> ${cluster.center}</p>
                ${response.text ? `<p style="margin: 0; font-size: 11px; line-height: 1.4;">"${response.text}"</p>` : ''}
              </div>
            `
          });

          responseMarker.addListener('click', () => {
            responseInfoWindow.open(newMap, responseMarker);
          });
        });
      });

    } catch (error) {
      console.error('클러스터링 맵 초기화 오류:', error);
    }
  };

  // 클러스터링 모달이 열릴 때 맵 초기화
  React.useEffect(() => {
    if (showClusteringModal && clusteringResults) {
      setTimeout(initializeClusteringMap, 100);
    }
  }, [showClusteringModal, clusteringResults]);

  // 시간 포맷 함수
  const formatTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);
    if (diff < 60) return `${diff}초 전`;
    if (diff < 3600) return `${Math.floor(diff/60)}분 전`;
    const d = new Date(timestamp);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>로딩 중...</div>
          <div style={{ fontSize: '16px', opacity: 0.8 }}>게시판을 불러오고 있습니다</div>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>게시판을 찾을 수 없습니다</div>
          <button
            onClick={() => navigate('/history')}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              background: 'white',
              color: '#667eea',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            역사 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/history')}
            disabled
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'not-allowed',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: 0.5
            }}
          >
            <ArrowBackIcon />
            뒤로가기 (일시 비활성화)
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              <HistoryIcon style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              역사 학습 게시판
            </h1>
            <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              {board.category} • {board.period}
            </p>
          </div>
        </div>
      </div>

      {/* 게시판 내용 */}
      <div style={{ 
        background: 'white', 
        borderRadius: '16px', 
        padding: '24px', 
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
              {board.title}
            </h2>
          </div>
          
          <div style={{ 
            background: '#e3f2fd', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            border: '1px solid #bbdefb'
          }}>
            <p style={{ 
              margin: 0, 
              color: '#1976d2', 
              fontSize: '14px', 
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              💡 한국이 아닌 어느 곳이어도 괜찮아요!
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
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
              {board.type === 'location' ? '위치 선택' : board.type === 'text' ? '텍스트 답변' : '이미지 업로드'}
            </span>
          </div>

          {board.description && (
            <p style={{ 
              margin: '0 0 16px 0', 
              color: '#666', 
              lineHeight: '1.6',
              fontSize: '14px'
            }}>
              {board.description}
            </p>
          )}


        </div>

        {/* 답변 입력 섹션 */}
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#333' }}>
            답변 작성
          </h3>

          {/* 위치 선택 */}
          {board.type === 'location' && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '12px' 
              }}>
                <MapIcon style={{ color: '#4caf50' }} />
                <span style={{ fontWeight: 'bold', color: '#333' }}>위치 선택</span>
              </div>
              
              <div style={{ 
                height: '500px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '2px solid #e0e0e0',
                position: 'relative'
              }}>
                  {mapLoading && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(255,255,255,0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', marginBottom: '8px' }}>지도 로딩 중...</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>잠시만 기다려주세요</div>
                      </div>
                    </div>
                  )}
                  <div 
                    ref={mapRef}
                    style={{ 
                      width: '100%', 
                      height: '100%' 
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'white',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#666',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    zIndex: 2
                  }}>
                    지도를 클릭하여 위치를 선택하세요
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#4caf50',
                    color: 'white',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    zIndex: 2
                  }}>
                    📍 핀을 다시 클릭하면 사라져요
                  </div>
                </div>

              {selectedLocation && (
                <div style={{ 
                  marginTop: '12px',
                  padding: '12px',
                  background: '#e8f5e8',
                  borderRadius: '8px',
                  border: '1px solid #4caf50'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#2e7d32', marginBottom: '8px' }}>
                    <LocationOnIcon style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    선택된 위치:
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                    위도: {selectedLocation.lat.toFixed(6)}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                    경도: {selectedLocation.lng.toFixed(6)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                    이제 아래에 선택한 이유를 설명해주세요
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 텍스트 답변 (위치 선택 후에도 표시) */}
          {(board.type === 'text' || (board.type === 'location' && selectedLocation)) && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '8px' 
              }}>
                <label style={{ 
                  fontWeight: 'bold', 
                  color: '#333' 
                }}>
                  {board.type === 'location' ? '선택한 이유 설명' : '답변 작성'}
                </label>
                {board.type === 'location' && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    <span style={{ color: '#4caf50', fontWeight: 'bold' }}>💡</span>
                    <span>한국이 아닌 곳이어도 괜찮아요</span>
                    <span style={{ color: '#ff9800', fontWeight: 'bold' }}>📍</span>
                    <span>핀을 다시 클릭하면 사라져요</span>
                  </div>
                )}
              </div>
              <textarea
                value={studentResponse.text}
                onChange={(e) => setStudentResponse(prev => ({ ...prev, text: e.target.value }))}
                placeholder={board.type === 'location' 
                  ? "위치를 선택한 이유를 자세히 설명해주세요..." 
                  : "질문에 대한 답변을 자세히 작성해주세요..."
                }
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          )}

          {/* 이미지 업로드 */}
          {board.type === 'image' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold', 
                color: '#333' 
              }}>
                이미지 업로드
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ marginBottom: '12px' }}
              />
              {imagePreview && (
                <div style={{ marginTop: '12px' }}>
                  <img 
                    src={imagePreview} 
                    alt="미리보기" 
                    style={{ 
                      maxWidth: '200px', 
                      maxHeight: '200px', 
                      borderRadius: '8px',
                      border: '1px solid #ddd'
                    }} 
                  />
                </div>
              )}
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            onClick={handleSubmitResponse}
            disabled={submitting}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              background: submitting ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <SendIcon />
            {submitting ? '제출 중...' : '답변 제출'}
          </button>
        </div>
      </div>

      {/* 기존 답변들 */}
      {board.responses && (
        <div style={{ 
          background: 'white', 
          borderRadius: '16px', 
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>
              다른 학생들의 답변 ({board.responses.length}개)
            </h3>
            <button
              onClick={() => {
                setAllResponses(board.responses);
                setShowAllResponsesModal(true);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              전체 응답 확인
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {board.responses.map((response, index) => (
              <div key={index} style={{ 
                padding: '16px', 
                background: '#f8f9fa', 
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontWeight: 'bold', color: '#333' }}>
                    {response.studentName}
                  </span>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(response.timestamp).toLocaleString()}
                  </span>
                </div>
                
                {response.text && (
                  <p style={{ margin: '0 0 8px 0', color: '#333', lineHeight: '1.5' }}>
                    {response.text}
                  </p>
                )}
                
                {response.location && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    <LocationOnIcon style={{ fontSize: '16px' }} />
                    {response.location}
                  </div>
                )}
                
                {response.imageUrl && (
                  <img 
                    src={response.imageUrl} 
                    alt="답변 이미지" 
                    style={{ 
                      maxWidth: '200px', 
                      maxHeight: '200px', 
                      borderRadius: '4px',
                      marginTop: '8px'
                    }} 
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 모든 답변 모달 */}
      {showAllResponsesModal && (
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
              <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>
                🎉 답변이 성공적으로 제출되었습니다!
              </h2>
              <button
                onClick={() => setShowAllResponsesModal(false)}
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

            {/* 도읍 후보지 분석 버튼 */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '24px',
              padding: '20px',
              background: '#fff3e0',
              borderRadius: '12px',
              border: '2px solid #ffcc80'
            }}>
              <p style={{ 
                margin: '0 0 16px 0', 
                fontSize: '16px', 
                color: '#f57c00',
                fontWeight: 'bold'
              }}>
                🏛️ 단군왕검님의 지혜로운 결정을 도와드릴게요!
              </p>
              <button
                onClick={handleCapitalRecommendation}
                style={{
                  padding: '16px 32px',
                  borderRadius: '12px',
                  background: '#f57c00',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 8px rgba(245, 124, 0, 0.3)',
                  transition: 'transform 0.2s',
                  minWidth: '280px'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                🏛️ 도읍 후보지는 어딜까?
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#333' }}>
                📍 모든 학생들의 위치 선택 ({allResponses.length}개)
              </h3>
              
              {/* 지도 영역 */}
              <div style={{ 
                height: '400px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '2px solid #e0e0e0',
                position: 'relative',
                marginBottom: '20px'
              }}>
                <div 
                  id="allResponsesMap"
                  style={{ 
                    width: '100%', 
                    height: '100%' 
                  }}
                />
              </div>
            </div>

            {/* 답변 목록 */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#333' }}>
                💬 모든 답변 ({allResponses.length}개)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {allResponses.map((response, index) => (
                  <div key={index} style={{ 
                    padding: '16px', 
                    background: '#f8f9fa', 
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontWeight: 'bold', color: '#333' }}>
                        {response.studentName}
                      </span>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {new Date(response.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    {response.text && (
                      <p style={{ margin: '0 0 8px 0', color: '#333', lineHeight: '1.5' }}>
                        {response.text}
                      </p>
                    )}
                    
                    {response.location && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        fontSize: '12px',
                        color: '#666'
                      }}>
                        <LocationOnIcon style={{ fontSize: '16px' }} />
                        {response.location}
                      </div>
                    )}
                    
                    {response.imageUrl && (
                      <img 
                        src={response.imageUrl} 
                        alt="답변 이미지" 
                        style={{ 
                          maxWidth: '200px', 
                          maxHeight: '200px', 
                          borderRadius: '4px',
                          marginTop: '8px'
                        }} 
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setShowAllResponsesModal(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 도읍 후보지 분석 모달 */}
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
              {/* 단군왕검님을 위한 최적의 도읍지 분석 */}
              <div style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '12px',
                border: '2px solid #e0e0e0'
              }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '18px' }}>
                  🏛️ 단군왕검님을 위한 최적의 도읍지 분석
                </h3>
                
                {/* 지도 영역 */}
                <div style={{ 
                  height: '500px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '2px solid #e0e0e0',
                  position: 'relative',
                  marginBottom: '16px'
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
                    <li>🏛️ <strong>큰 주황 마커</strong>는 각 도읍 후보지의 중심점입니다 (클릭하면 상세 정보 확인)</li>
                    <li>🔴 <strong>빨간 번호 마커</strong>는 개별 학생들이 추천한 위치입니다</li>
                    <li>🌈 <strong>히트맵 색상</strong>은 응답 밀도를 나타냅니다 (파랑→보라→빨강 순으로 밀도 증가)</li>
                    <li>📍 마커를 클릭하면 학생들의 추천 이유를 자세히 볼 수 있습니다</li>
                    <li>👑 가장 많은 학생이 추천한 지역이 최적의 도읍 후보지입니다!</li>
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
                      background: '#f57c00', 
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
                      <h4 style={{ margin: '0 0 8px 0', color: '#f57c00', fontSize: '14px' }}>
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
                          background: '#fff3e0',
                          color: '#f57c00',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          border: '1px solid #ffcc80'
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
                        <div key={response.id || responseIndex} style={{
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

export default HistoryBoardPage; 