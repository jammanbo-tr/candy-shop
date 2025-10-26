# 아바타 이미지 디렉토리

이 디렉토리에 아바타 아이템 이미지 파일을 배치합니다.

## 파일 명명 규칙

- 머리 아이템: `head_001.png`, `head_002.png`, ...
- 얼굴 아이템: `face_001.png`, `face_002.png`, ...
- 옷 아이템: `body_001.png`, `body_002.png`, ...
- 악세서리: `accessory_001.png`, `accessory_002.png`, ...
- 배경: `background_001.png`, `background_002.png`, ...

## 이미지 요구사항

- **형식**: PNG (투명 배경 권장)
- **크기**: 200x200px 이상
- **배경**: 투명 (alpha channel)
- **해상도**: 72-150 DPI

## 레이어 순서

아바타는 다음 순서로 레이어가 쌓입니다:

1. 배경 (background) - 가장 뒤
2. 옷 (body)
3. 악세서리 (accessory)
4. 얼굴 (face)
5. 머리 (head) - 가장 앞

## 현재 정의된 아이템

### 머리 (Head)
- head_001.png - 빨간 모자
- head_002.png - 파란 모자
- head_003.png - 왕관
- head_004.png - 마법사 모자

### 얼굴 (Face)
- face_001.png - 동그란 안경
- face_002.png - 선글라스
- face_003.png - 하트 안경

### 옷 (Body)
- body_001.png - 티셔츠
- body_002.png - 후드티
- body_003.png - 정장
- body_004.png - 드레스

### 악세서리 (Accessory)
- accessory_001.png - 나비 넥타이
- accessory_002.png - 목걸이
- accessory_003.png - 날개

### 배경 (Background)
- background_001.png - 하늘 배경
- background_002.png - 별빛 배경
- background_003.png - 무지개 배경

## 임시 이미지

실제 이미지를 준비하기 전까지 이모지나 placeholder를 사용할 수 있습니다.
이미지 로드 실패 시 자동으로 fallback이 적용됩니다.

## 이미지 제작 팁

1. **일관된 스타일**: 모든 아이템이 같은 아트 스타일을 유지
2. **적절한 크기**: 너무 작거나 크지 않게
3. **중앙 정렬**: 이미지가 중앙에 배치되도록
4. **여백 확보**: 가장자리에 약간의 여백 유지
5. **컬러**: 밝고 선명한 색상 사용
