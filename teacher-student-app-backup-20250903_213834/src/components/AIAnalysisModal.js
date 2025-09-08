import React from 'react';

// CSS 애니메이션을 위한 스타일 태그 추가
const spinAnimation = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// 스타일 태그를 head에 추가
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = spinAnimation;
  document.head.appendChild(styleTag);
}

const AIAnalysisModal = ({ isOpen, onClose, students, gasUrl }) => {
  // 모달이 열릴 때만 iframe 로딩 시작
  const [iframeLoaded, setIframeLoaded] = React.useState(false);
  
  React.useEffect(() => {
    if (isOpen) {
      // 모달이 열릴 때 로딩 상태 초기화
      setIframeLoaded(false);
      const loadingElement = document.getElementById('ai-loading');
      if (loadingElement) {
        loadingElement.style.display = 'flex';
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10015 }}>
      <div style={{ background: '#fff', padding: '20px', borderRadius: 28, width: '95vw', height: '90vh', boxShadow: '0 8px 48px rgba(102, 126, 234, 0.3)', border: '4px solid #667eea', display: 'flex', flexDirection: 'column' }}>
        {/* 모달 제목 */}
        <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 16, color: '#667eea', letterSpacing: '-0.5px', textAlign: 'center' }}>
          AI 학습일지 분석
        </div>
        
        {/* iframe으로 Google Apps Script 삽입 */}
        <div style={{ flex: 1, borderRadius: 16, overflow: 'hidden', border: '1px solid #e0e7ff', position: 'relative' }}>
          {/* 로딩 스피너 */}
          <div id="ai-loading" style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)', 
            zIndex: 10,
            background: 'rgba(255,255,255,0.9)',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #667eea', 
              borderTop: '4px solid transparent', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite' 
            }}></div>
            <div style={{ color: '#667eea', fontWeight: 600, fontSize: '14px' }}>
              AI 분석 도구 로딩 중...
            </div>
          </div>
          
          <iframe 
            src={gasUrl || "https://script.google.com/macros/s/AKfycbz83KKePJKN2AWlnohCBNezYXEZsh2cEBSkAQzHISvbxu0pO3p3DqAMIGO3DNqiwOnX/exec?page=board"}
            style={{ 
              width: '100%', 
              height: '100%', 
              border: 'none',
              borderRadius: 16
            }}
            title="AI 학습일지 분석"
            onLoad={() => {
              // iframe 로딩 완료 시 스피너 숨김
              setIframeLoaded(true);
              const loadingElement = document.getElementById('ai-loading');
              if (loadingElement) {
                loadingElement.style.display = 'none';
              }
            }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
            loading="eager"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* 닫기 버튼 */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button 
            onClick={onClose} 
            style={{ 
              fontWeight: 600, 
              borderRadius: 999, 
              background: '#e0f7fa', 
              color: '#1976d2', 
              border: 'none', 
              padding: '8px 32px', 
              fontSize: 15, 
              boxShadow: '0 2px 8px #b2ebf240', 
              cursor: 'pointer' 
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisModal;