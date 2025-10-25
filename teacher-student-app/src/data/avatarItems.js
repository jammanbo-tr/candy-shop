// 아바타 아이템 카탈로그
export const avatarItems = [
  // 머리 장식
  {
    id: 'head_001',
    name: '빨간 모자',
    category: 'head',
    price: 300,
    level: 0,
    imageUrl: '/avatar/head_001.png',
    description: '귀여운 빨간 모자입니다'
  },
  {
    id: 'head_002',
    name: '파란 모자',
    category: 'head',
    price: 300,
    level: 0,
    imageUrl: '/avatar/head_002.png',
    description: '시원한 파란 모자입니다'
  },
  {
    id: 'head_003',
    name: '왕관',
    category: 'head',
    price: 1000,
    level: 5,
    imageUrl: '/avatar/head_003.png',
    description: '화려한 황금 왕관입니다'
  },
  {
    id: 'head_004',
    name: '마법사 모자',
    category: 'head',
    price: 800,
    level: 3,
    imageUrl: '/avatar/head_004.png',
    description: '신비로운 마법사 모자입니다'
  },

  // 얼굴 장식
  {
    id: 'face_001',
    name: '동그란 안경',
    category: 'face',
    price: 200,
    level: 0,
    imageUrl: '/avatar/face_001.png',
    description: '똑똑해 보이는 안경입니다'
  },
  {
    id: 'face_002',
    name: '선글라스',
    category: 'face',
    price: 400,
    level: 2,
    imageUrl: '/avatar/face_002.png',
    description: '멋진 선글라스입니다'
  },
  {
    id: 'face_003',
    name: '하트 안경',
    category: 'face',
    price: 500,
    level: 3,
    imageUrl: '/avatar/face_003.png',
    description: '사랑스러운 하트 안경입니다'
  },

  // 옷
  {
    id: 'body_001',
    name: '티셔츠',
    category: 'body',
    price: 250,
    level: 0,
    imageUrl: '/avatar/body_001.png',
    description: '편안한 티셔츠입니다'
  },
  {
    id: 'body_002',
    name: '후드티',
    category: 'body',
    price: 400,
    level: 1,
    imageUrl: '/avatar/body_002.png',
    description: '힙한 후드티입니다'
  },
  {
    id: 'body_003',
    name: '정장',
    category: 'body',
    price: 800,
    level: 4,
    imageUrl: '/avatar/body_003.png',
    description: '멋진 정장입니다'
  },
  {
    id: 'body_004',
    name: '드레스',
    category: 'body',
    price: 1000,
    level: 5,
    imageUrl: '/avatar/body_004.png',
    description: '우아한 드레스입니다'
  },

  // 악세서리
  {
    id: 'accessory_001',
    name: '나비 넥타이',
    category: 'accessory',
    price: 300,
    level: 1,
    imageUrl: '/avatar/accessory_001.png',
    description: '귀여운 나비 넥타이입니다'
  },
  {
    id: 'accessory_002',
    name: '목걸이',
    category: 'accessory',
    price: 500,
    level: 2,
    imageUrl: '/avatar/accessory_002.png',
    description: '반짝이는 목걸이입니다'
  },
  {
    id: 'accessory_003',
    name: '날개',
    category: 'accessory',
    price: 1200,
    level: 6,
    imageUrl: '/avatar/accessory_003.png',
    description: '천사의 날개입니다'
  },

  // 배경
  {
    id: 'background_001',
    name: '하늘 배경',
    category: 'background',
    price: 400,
    level: 1,
    imageUrl: '/avatar/background_001.png',
    description: '맑은 하늘 배경입니다'
  },
  {
    id: 'background_002',
    name: '별빛 배경',
    category: 'background',
    price: 600,
    level: 3,
    imageUrl: '/avatar/background_002.png',
    description: '별이 빛나는 배경입니다'
  },
  {
    id: 'background_003',
    name: '무지개 배경',
    category: 'background',
    price: 1000,
    level: 5,
    imageUrl: '/avatar/background_003.png',
    description: '화려한 무지개 배경입니다'
  }
];

// 카테고리별 아이템 가져오기
export const getItemsByCategory = (category) => {
  return avatarItems.filter(item => item.category === category);
};

// ID로 아이템 찾기
export const getItemById = (id) => {
  return avatarItems.find(item => item.id === id);
};

// 레벨 제한 체크
export const canPurchaseItem = (item, userLevel) => {
  return userLevel >= item.level;
};

// 카테고리 목록
export const categories = [
  { id: 'head', name: '머리', icon: '🎩' },
  { id: 'face', name: '얼굴', icon: '👓' },
  { id: 'body', name: '옷', icon: '👕' },
  { id: 'accessory', name: '악세서리', icon: '✨' },
  { id: 'background', name: '배경', icon: '🎨' }
];
