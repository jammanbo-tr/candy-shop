import React from 'react';

const ImageViewerModal = ({ isOpen, onClose, imageUrl, studentName, period, date }) => {
  if (!isOpen || !imageUrl) return null;

  // 이미지 다운로드 함수
  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      const fileName = `학습일지_${studentName}_${period}_${date}.jpg`;
      
      if (imageUrl.startsWith('data:')) {
        // Base64 이미지인 경우
        link.href = imageUrl;
      } else {
        // URL 이미지인 경우 - CORS 우회를 위해 fetch 사용
        fetch(imageUrl)
          .then(response => response.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          })
          .catch(() => {
            // 실패시 새 창에서 열기
            window.open(imageUrl, '_blank');
          });
        return;
      }
      
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('다운로드 실패:', error);
      alert('이미지 다운로드에 실패했습니다.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e8eaed'
        }}>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#4285f4',
              margin: '0 0 4px 0'
            }}>
              📸 학습일지 이미지
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#666',
              margin: 0
            }}>
              {studentName} · {period} · {date}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              border: 'none',
              backgroundColor: '#f8f9fa',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#e8eaed'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#f8f9fa'}
          >
            ×
          </button>
        </div>

        {/* 이미지 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <img
            src={imageUrl}
            alt={`${studentName}의 학습일지`}
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{
            display: 'none',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px' }}>😕</div>
            <p style={{ margin: 0 }}>이미지를 불러올 수 없습니다</p>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '20px',
          gap: '12px'
        }}>
          <button
            onClick={handleDownload}
            style={{
              backgroundColor: '#00c851',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#00a73e'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#00c851'}
          >
            💾 다운로드
          </button>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#f8f9fa',
              color: '#666',
              border: '1px solid #e8eaed',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#e8eaed';
              e.target.style.borderColor = '#d2d5da';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#f8f9fa';
              e.target.style.borderColor = '#e8eaed';
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageViewerModal;