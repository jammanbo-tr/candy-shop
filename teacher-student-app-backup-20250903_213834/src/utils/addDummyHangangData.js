import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

// classId will be passed as parameter

// 과거 한강 가치 더미 데이터
const pastDummyData = [
  { name: '김민수', trade: 7, farming: 5, strategic: 3, desc: '한강은 배로 물건을 나르기 좋았어요. 삼국이 모두 한강을 차지하려고 했던 이유인 것 같아요.' },
  { name: '이서연', trade: 6, farming: 6, strategic: 3, desc: '한강 주변에는 농사짓기 좋은 땅이 많았고, 다른 나라와 교역하기도 편했을 것 같아요.' },
  { name: '박준호', trade: 4, farming: 3, strategic: 8, desc: '한강은 적군이 쳐들어오는 것을 막는 천연 방벽 역할을 했을 거예요. 군사적으로 매우 중요했어요.' },
  { name: '최유나', trade: 8, farming: 4, strategic: 3, desc: '한강을 통해 중국과 교역했을 것 같아요. 비단이나 도자기 같은 물건들을 실어 날랐을 거예요.' },
  { name: '정민재', trade: 5, farming: 7, strategic: 3, desc: '한강 주변은 물이 풍부해서 농사짓기 좋았고, 홍수가 나면 땅이 더 비옥해졌을 것 같아요.' },
  { name: '강혜진', trade: 6, farming: 5, strategic: 4, desc: '한강이 바다와 연결되어 있어서 멀리 있는 나라들과도 교역할 수 있었을 거예요.' },
  { name: '윤도현', trade: 3, farming: 4, strategic: 8, desc: '한강은 자연스러운 경계선이 되어서 나라를 지키는 데 도움이 되었을 것 같아요.' },
  { name: '임소영', trade: 7, farming: 6, strategic: 2, desc: '한강에서 잡은 물고기를 다른 지역에 팔았을 것 같고, 강 주변에서 농사도 잘 지었을 거예요.' },
  { name: '한지우', trade: 5, farming: 5, strategic: 5, desc: '한강은 교역, 농업, 군사 모든 면에서 골고루 중요했던 것 같아요. 그래서 삼국이 모두 원했겠죠.' },
  { name: '조예린', trade: 8, farming: 3, strategic: 4, desc: '한강을 통해서 소금이나 철 같은 중요한 물건들을 운반했을 거예요. 육로보다 훨씬 편했을 것 같아요.' },
  { name: '신태민', trade: 4, farming: 6, strategic: 5, desc: '한강 유역은 땅이 평평하고 물이 많아서 쌀농사를 짓기 정말 좋았을 거예요.' },
  { name: '오하은', trade: 6, farming: 4, strategic: 5, desc: '한강이 있어서 다른 지역으로 이동하기 편했고, 적들의 침입도 감시하기 좋았을 것 같아요.' },
  { name: '배성훈', trade: 7, farming: 5, strategic: 3, desc: '한강 하구까지 배가 올 수 있어서 외국 상인들과 만나기 좋았을 거예요.' },
  { name: '송지민', trade: 5, farming: 8, strategic: 2, desc: '한강 주변의 넓은 평야에서 많은 사람들이 농사를 지어서 나라가 부유해졌을 것 같아요.' },
  { name: '허준영', trade: 3, farming: 5, strategic: 7, desc: '한강은 천연 요새 같았을 거예요. 강을 건너기 어려워서 적군을 막기 좋았을 것 같아요.' },
  { name: '남채원', trade: 8, farming: 4, strategic: 3, desc: '한강을 통해 백제, 고구려, 신라가 서로 물건을 주고받았을 것 같아요. 무역의 중심지였을 거예요.' },
  { name: '고민석', trade: 6, farming: 6, strategic: 3, desc: '한강에서 물을 쉽게 구할 수 있어서 사람들이 살기 좋았고, 농사짓기도 편했을 거예요.' },
  { name: '서예은', trade: 4, farming: 7, strategic: 4, desc: '한강의 홍수는 무서웠지만, 덕분에 땅이 더 비옥해져서 농사가 잘 되었을 것 같아요.' },
  { name: '유건우', trade: 7, farming: 3, strategic: 5, desc: '한강을 통해 다른 나라의 문화와 기술도 함께 들어왔을 거예요. 문명 교류의 통로였을 것 같아요.' },
  { name: '문수아', trade: 5, farming: 6, strategic: 4, desc: '한강 주변에는 사람들이 많이 살았을 거예요. 물이 있고 땅이 좋아서 도시가 발달했을 것 같아요.' }
];

// 현재 한강 가치 더미 데이터
const presentDummyData = [
  { name: '김민수', x: 30, y: 40, desc: '한강에서 자전거 타며 바람을 맞는 기분이 정말 상쾌해요. 스트레스가 다 날아가는 느낌이에요.' },
  { name: '이서연', x: 25, y: 35, desc: '가족과 함께 한강공원에서 피크닉을 했는데 너무 행복했어요. 도시 속 자연이라서 더 소중해요.' },
  { name: '박준호', x: -20, y: 10, desc: '한강이 너무 복잡하고 시끄러워서 조용히 쉬기는 어려운 것 같아요. 사람이 너무 많아요.' },
  { name: '최유나', x: 40, y: 30, desc: '한강에서 보는 일몰이 정말 아름다워요. 친구들과 산책하며 이야기하는 시간이 최고예요.' },
  { name: '정민재', x: 35, y: 25, desc: '한강에서 운동하면서 건강도 챙기고 기분도 좋아져요. 러닝코스가 잘 되어 있어서 좋아요.' },
  { name: '강혜진', x: 20, y: 45, desc: '한강에서 친구들과 치킨을 먹으며 놀 때가 가장 즐거워요. 야경도 정말 예쁘고요!' },
  { name: '윤도현', x: -10, y: -20, desc: '한강 물이 생각보다 더러워 보여서 아쉬워요. 환경보호가 더 필요한 것 같아요.' },
  { name: '임소영', x: 45, y: 20, desc: '한강에서 책을 읽으면서 혼자만의 시간을 갖는 게 좋아요. 마음이 평온해져요.' },
  { name: '한지우', x: 30, y: 35, desc: '한강은 서울시민들의 쉼터 같아요. 언제나 사람들이 와서 힐링하는 공간인 것 같아요.' },
  { name: '조예린', x: 25, y: 40, desc: '한강에서 보는 불꽃축제나 드론쇼가 정말 멋져요. 특별한 추억을 만들 수 있어요.' },
  { name: '신태민', x: -5, y: 5, desc: '한강 주변 교통이 복잡해서 가기가 좀 불편해요. 주차하기도 어렵고요.' },
  { name: '오하은', x: 40, y: 35, desc: '한강에서 라면을 끓여 먹으면서 친구들과 수다 떠는 시간이 정말 소중해요.' },
  { name: '배성훈', x: 35, y: 30, desc: '한강에서 자전거를 타면서 서울의 스카이라인을 보는 게 정말 멋져요.' },
  { name: '송지민', x: 20, y: 50, desc: '한강 축제 때 가면 너무 신나요! 음식도 많고 공연도 볼 수 있어서 좋아요.' },
  { name: '허준영', x: -15, y: -10, desc: '한강이 생각보다 관리가 잘 안 되어 있는 것 같아요. 쓰레기도 많이 보이고요.' },
  { name: '남채원', x: 50, y: 25, desc: '한강은 제 인생의 안식처예요. 힘들 때마다 와서 위로받고 힘을 얻어가요.' },
  { name: '고민석', x: 30, y: 20, desc: '한강에서 드라마 촬영하는 것도 자주 보고, 관광객들도 많이 와서 자랑스러워요.' },
  { name: '서예은', x: 15, y: 45, desc: '한강에서 반려동물과 산책하는 시간이 정말 행복해요. 강아지도 좋아하는 것 같아요.' },
  { name: '유건우', x: 40, y: 40, desc: '한강은 서울의 상징 같아요. 외국인 친구들에게 자랑하고 싶은 우리의 소중한 공간이에요.' },
  { name: '문수아', x: 25, y: 30, desc: '한강에서 요가를 하거나 명상을 하면 마음이 정말 편안해져요. 자연의 힘을 느껴요.' }
];

export const addDummyHangangData = async (classId) => {
  try {
    console.log('더미 데이터 추가 시작...');
    
    // 과거 데이터 추가
    for (const data of pastDummyData) {
      await addDoc(collection(db, `hangang-past-values-${classId}`), {
        userId: data.name,
        userName: data.name,
        values: {
          trade: data.trade,
          farming: data.farming,
          strategic: data.strategic
        },
        description: data.desc,
        createdAt: new Date().toISOString()
      });
    }
    
    // 현재 데이터 추가
    for (const data of presentDummyData) {
      await addDoc(collection(db, `hangang-present-values-${classId}`), {
        userId: data.name,
        userName: data.name,
        emotionPoint: {
          x: data.x,
          y: data.y
        },
        description: data.desc,
        createdAt: new Date().toISOString()
      });
    }
    
    console.log('더미 데이터 추가 완료!');
  } catch (error) {
    console.error('더미 데이터 추가 실패:', error);
  }
};