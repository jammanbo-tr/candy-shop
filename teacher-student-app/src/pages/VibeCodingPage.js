import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';

const VibeCodingPage = () => {
  const navigate = useNavigate();
  const [hoveredSection, setHoveredSection] = useState(null);

  const layoutSections = {
    header: {
      title: '헤더 (Header)',
      description: '웹사이트의 가장 윗부분입니다. 보통 로고, 주요 메뉴(내비게이션), 로그인/회원가입 버튼 등이 위치합니다.',
      color: '#FF6B6B',
      position: { top: 0, left: 0, right: 0, height: '80px' }
    },
    navbar: {
      title: '내비게이션 바 (Navigation Bar / Navbar)',
      description: '사용자가 웹사이트의 다른 페이지로 쉽게 이동할 수 있도록 도와주는 메뉴 모음입니다. 보통 헤더 안에 포함됩니다.',
      color: '#4ECDC4',
      position: { top: '20px', left: '50%', transform: 'translateX(-50%)', width: '60%', height: '40px' }
    },
    sidebar: {
      title: '사이드바 (Sidebar)',
      description: '메인 콘텐츠의 왼쪽 또는 오른쪽에 위치하는 세로 영역입니다. 추가적인 메뉴, 필터, 광고 등을 배치할 때 사용됩니다.',
      color: '#95E1D3',
      position: { top: '80px', left: 0, bottom: '60px', width: '200px' }
    },
    grid: {
      title: '그리드 시스템 (Grid System)',
      description: '웹페이지의 콘텐츠를 질서정연하게 배치하기 위한 격자무늬 시스템입니다. 컬럼(Column)으로 구성되며, 반응형 디자인의 핵심 요소입니다.',
      color: '#FFE66D',
      position: { top: '80px', left: '200px', right: 0, bottom: '60px' }
    },
    footer: {
      title: '푸터 (Footer)',
      description: '웹사이트의 가장 아랫부분입니다. 회사 정보, 저작권, 개인정보처리방침, 소셜 미디어 링크 등이 들어갑니다.',
      color: '#F38181',
      position: { bottom: 0, left: 0, right: 0, height: '60px' }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Noto Sans KR, sans-serif',
      position: 'relative'
    }}>
      {/* 홈 버튼 */}
      <button
        onClick={() => navigate('/teacher')}
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: 'white',
          border: 'none',
          borderRadius: '50%',
          width: 50,
          height: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 1000,
          transition: 'all 0.3s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <HomeIcon style={{ color: '#667eea' }} />
      </button>

      {/* 타이틀 */}
      <div style={{
        textAlign: 'center',
        marginBottom: 40,
        color: 'white'
      }}>
        <h1 style={{
          fontSize: 48,
          fontWeight: 'bold',
          marginBottom: 10,
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          🎨 바이브 코딩
        </h1>
        <p style={{
          fontSize: 20,
          opacity: 0.9,
          textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
        }}>
          웹 레이아웃의 기본 구조를 배워보세요
        </p>
      </div>

      {/* 메인 레이아웃 데모 영역 */}
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        background: 'white',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        position: 'relative',
        height: '70vh',
        minHeight: 600
      }}>
        {/* Header */}
        <div
          onMouseEnter={() => setHoveredSection('header')}
          onMouseLeave={() => setHoveredSection(null)}
          style={{
            ...layoutSections.header.position,
            position: 'absolute',
            background: layoutSections.header.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 30px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            opacity: hoveredSection === 'header' ? 1 : 0.7,
            transform: hoveredSection === 'header' ? 'scale(1.02)' : 'scale(1)',
            zIndex: hoveredSection === 'header' ? 10 : 1,
            boxShadow: hoveredSection === 'header' ? '0 8px 20px rgba(0,0,0,0.3)' : 'none'
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>🍬 캔디샵</div>
          <div style={{ fontSize: 14, color: 'white', opacity: 0.8 }}>로고 & 브랜드</div>
        </div>

        {/* Navbar (inside Header) */}
        <div
          onMouseEnter={() => setHoveredSection('navbar')}
          onMouseLeave={() => setHoveredSection(null)}
          style={{
            ...layoutSections.navbar.position,
            position: 'absolute',
            background: layoutSections.navbar.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            borderRadius: 20,
            cursor: 'pointer',
            transition: 'all 0.3s',
            opacity: hoveredSection === 'navbar' ? 1 : 0.7,
            transform: hoveredSection === 'navbar' ? 'scale(1.05)' : 'scale(1)',
            zIndex: hoveredSection === 'navbar' ? 10 : 2,
            boxShadow: hoveredSection === 'navbar' ? '0 8px 20px rgba(0,0,0,0.3)' : 'none'
          }}
        >
          <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>홈</span>
          <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>학생관리</span>
          <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>게임</span>
          <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>설정</span>
        </div>

        {/* Sidebar */}
        <div
          onMouseEnter={() => setHoveredSection('sidebar')}
          onMouseLeave={() => setHoveredSection(null)}
          style={{
            ...layoutSections.sidebar.position,
            position: 'absolute',
            background: layoutSections.sidebar.color,
            padding: 20,
            cursor: 'pointer',
            transition: 'all 0.3s',
            opacity: hoveredSection === 'sidebar' ? 1 : 0.7,
            transform: hoveredSection === 'sidebar' ? 'scale(1.02)' : 'scale(1)',
            zIndex: hoveredSection === 'sidebar' ? 10 : 1,
            boxShadow: hoveredSection === 'sidebar' ? '0 8px 20px rgba(0,0,0,0.3)' : 'none',
            overflow: 'hidden'
          }}
        >
          <div style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 15 }}>메뉴</div>
          {['대시보드', '학생 목록', '퀘스트', '아이템샵', '통계'].map((item, idx) => (
            <div key={idx} style={{
              background: 'rgba(255,255,255,0.3)',
              padding: '8px 12px',
              marginBottom: 8,
              borderRadius: 8,
              color: 'white',
              fontSize: 13
            }}>
              {item}
            </div>
          ))}
        </div>

        {/* Grid System (Main Content) */}
        <div
          onMouseEnter={() => setHoveredSection('grid')}
          onMouseLeave={() => setHoveredSection(null)}
          style={{
            ...layoutSections.grid.position,
            position: 'absolute',
            background: layoutSections.grid.color,
            padding: 20,
            cursor: 'pointer',
            transition: 'all 0.3s',
            opacity: hoveredSection === 'grid' ? 1 : 0.7,
            transform: hoveredSection === 'grid' ? 'scale(1.01)' : 'scale(1)',
            zIndex: hoveredSection === 'grid' ? 10 : 1,
            boxShadow: hoveredSection === 'grid' ? '0 8px 20px rgba(0,0,0,0.3)' : 'none',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 15,
            overflow: 'auto'
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <div key={num} style={{
              background: 'rgba(255,255,255,0.5)',
              borderRadius: 12,
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              color: '#333',
              fontWeight: 600,
              minHeight: 100
            }}>
              콘텐츠 #{num}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          onMouseEnter={() => setHoveredSection('footer')}
          onMouseLeave={() => setHoveredSection(null)}
          style={{
            ...layoutSections.footer.position,
            position: 'absolute',
            background: layoutSections.footer.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s',
            opacity: hoveredSection === 'footer' ? 1 : 0.7,
            transform: hoveredSection === 'footer' ? 'scale(1.02)' : 'scale(1)',
            zIndex: hoveredSection === 'footer' ? 10 : 1,
            boxShadow: hoveredSection === 'footer' ? '0 8px 20px rgba(0,0,0,0.3)' : 'none'
          }}
        >
          <div style={{ color: 'white', fontSize: 13, textAlign: 'center' }}>
            © 2025 캔디샵 | 개인정보처리방침 | 이용약관
          </div>
        </div>
      </div>

      {/* 설명 패널 */}
      {hoveredSection && (
        <div style={{
          position: 'fixed',
          bottom: 30,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'white',
          padding: '25px 35px',
          borderRadius: 20,
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          maxWidth: 600,
          zIndex: 1000,
          animation: 'slideUp 0.3s ease-out'
        }}>
          <h3 style={{
            margin: 0,
            marginBottom: 10,
            color: layoutSections[hoveredSection].color,
            fontSize: 22,
            fontWeight: 'bold'
          }}>
            {layoutSections[hoveredSection].title}
          </h3>
          <p style={{
            margin: 0,
            color: '#555',
            fontSize: 16,
            lineHeight: 1.6
          }}>
            {layoutSections[hoveredSection].description}
          </p>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default VibeCodingPage;
