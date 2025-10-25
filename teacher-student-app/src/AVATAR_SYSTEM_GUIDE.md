# 아바타 시스템 사용 가이드

## 개요
학생들이 경험치(XP)로 아바타 아이템을 구매하고, 자신만의 아바타를 꾸밀 수 있는 시스템입니다.

## 주요 기능

### 1. 아이템 상점 (ItemShop)
- 경험치(XP)로 아바타 아이템 구매
- 레벨에 따른 아이템 잠금 해제
- 카테고리별 아이템 탐색: 머리, 얼굴, 옷, 악세서리, 배경

### 2. 아바타 꾸미기 (AvatarCustomizer)
- 보유한 아이템으로 아바타 커스터마이징
- 실시간 미리보기
- 카테고리별 아이템 장착/해제

### 3. 아바타 표시 (AvatarDisplay)
- StudentCard에 자동으로 표시
- 아바타가 있으면 아바타 표시, 없으면 기본 레벨 이미지 표시

## StudentPage에 통합하기

### 방법 1: 통합 모달 사용 (권장)

```javascript
import AvatarSystemModal from '../components/AvatarSystemModal';

const StudentPage = () => {
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  return (
    <>
      {/* 아바타 버튼 추가 */}
      <button onClick={() => setShowAvatarModal(true)}>
        ✨ 아바타 꾸미기
      </button>

      {/* 아바타 모달 */}
      {showAvatarModal && (
        <AvatarSystemModal
          student={currentStudent}
          onClose={() => setShowAvatarModal(false)}
          onUpdate={() => {
            // 학생 데이터 새로고침 로직
          }}
        />
      )}
    </>
  );
};
```

### 방법 2: 개별 컴포넌트 사용

```javascript
import ItemShop from '../components/ItemShop';
import AvatarCustomizer from '../components/AvatarCustomizer';

const StudentPage = () => {
  const [showShop, setShowShop] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);

  const handlePurchase = async (itemId, price) => {
    const studentRef = doc(db, 'students', student.id);
    await updateDoc(studentRef, {
      exp: student.exp - price,
      ownedItems: arrayUnion(itemId)
    });
  };

  const handleSaveAvatar = async (avatarData) => {
    const studentRef = doc(db, 'students', student.id);
    await updateDoc(studentRef, {
      avatar: avatarData
    });
  };

  return (
    <>
      <button onClick={() => setShowShop(true)}>🏪 상점</button>
      <button onClick={() => setShowCustomizer(true)}>✨ 꾸미기</button>

      {showShop && (
        <ItemShop
          student={currentStudent}
          onPurchase={handlePurchase}
          onClose={() => setShowShop(false)}
        />
      )}

      {showCustomizer && (
        <AvatarCustomizer
          student={currentStudent}
          onSave={handleSaveAvatar}
          onClose={() => setShowCustomizer(false)}
        />
      )}
    </>
  );
};
```

## 데이터 구조

### Firestore - students 컬렉션

```javascript
{
  id: "student_id",
  name: "홍길동",
  level: 5,
  exp: 850,

  // 아바타 관련 필드
  avatar: {
    head: "head_001",      // 머리 아이템 ID
    face: "face_002",      // 얼굴 아이템 ID
    body: "body_001",      // 옷 아이템 ID
    accessory: "",         // 악세서리 (선택 안함)
    background: "background_001" // 배경
  },
  ownedItems: [           // 보유 아이템 ID 배열
    "head_001",
    "head_002",
    "face_001",
    "face_002",
    "body_001",
    "background_001"
  ]
}
```

## 아이템 추가하기

[teacher-student-app/src/data/avatarItems.js](teacher-student-app/src/data/avatarItems.js)에서 아이템 추가:

```javascript
{
  id: 'new_item_001',           // 고유 ID
  name: '멋진 모자',             // 아이템 이름
  category: 'head',             // 카테고리: head, face, body, accessory, background
  price: 500,                   // 가격 (경험치)
  level: 3,                     // 필요 레벨
  imageUrl: '/avatar/new_item_001.png',  // 이미지 경로
  description: '정말 멋진 모자입니다'    // 설명
}
```

## 이미지 준비

아바타 아이템 이미지는 다음 경로에 준비:
- `public/avatar/` 디렉토리
- PNG 형식 권장
- 투명 배경 권장
- 권장 크기: 200x200px 이상

## 포인트 시스템

현재는 **경험치(exp)**를 포인트로 사용합니다.
- 학생이 발표, 퀘스트 완료 등으로 경험치를 얻으면
- 그 경험치로 아이템을 구매할 수 있습니다
- 구매 시 경험치가 차감됩니다

향후 별도의 포인트 시스템으로 변경하려면:
1. Firestore students 컬렉션에 `points` 필드 추가
2. ItemShop.js에서 `student.exp` 대신 `student.points` 사용
3. 구매 시 `points` 차감

## 주의사항

1. **이미지 경로**: 실제 이미지 파일을 `public/avatar/` 에 준비해야 합니다
2. **Firestore 권한**: students 컬렉션에 대한 읽기/쓰기 권한 확인
3. **레벨 시스템**: 아이템의 `level` 값은 학생의 현재 레벨과 비교됩니다
4. **경험치 차감**: 아이템 구매 시 경험치가 차감되므로 레벨 다운에 주의

## 다음 단계

1. StudentPage에 아바타 버튼 추가
2. TeacherPage에서도 학생 아바타 확인 가능하도록 수정
3. 실제 아바타 이미지 제작 및 추가
4. 아이템 카탈로그 확장
5. 특별 이벤트 아이템 추가
