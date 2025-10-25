import React from 'react';
import { getItemById } from '../data/avatarItems';

/**
 * 아바타를 표시하는 컴포넌트
 * @param {Object} avatar - 아바타 데이터 { head, face, body, accessory, background }
 * @param {number} size - 아바타 크기 (기본값: 200)
 * @param {boolean} showBorder - 테두리 표시 여부 (기본값: true)
 */
const AvatarDisplay = ({ avatar = {}, size = 200, showBorder = true }) => {
  const layers = ['background', 'body', 'accessory', 'face', 'head'];

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: avatar.background ? 'transparent' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: showBorder ? '4px solid #e3f2fd' : 'none',
        boxShadow: showBorder ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* 기본 캐릭터 실루엣 */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.6,
          zIndex: 0
        }}
      >
        👤
      </div>

      {/* 레이어별 아이템 렌더링 */}
      {layers.map((layer) => {
        const itemId = avatar[layer];
        if (!itemId) return null;

        const item = getItemById(itemId);
        if (!item) return null;

        return (
          <div
            key={layer}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: layers.indexOf(layer) + 1
            }}
          >
            <img
              src={item.imageUrl}
              alt={item.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                // 이미지 로드 실패 시 placeholder 표시
                e.target.style.display = 'none';
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default AvatarDisplay;
