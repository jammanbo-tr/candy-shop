import React from 'react';
import { useNavigate } from 'react-router-dom';

const LabPage = () => {
  const navigate = useNavigate();

  const handleTeacherAccess = () => {
    navigate('/teacher-copy');
  };

  const handleStudentAccess = () => {
    navigate('/student-copy');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, rgba(224,247,250,0.6) 0%, rgba(227,242,253,0.6) 100%), url(/TR_bg.png) center/cover no-repeat',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
      padding: '20px'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '800px',
        width: '100%',
        background: '#fff',
        borderRadius: '32px',
        padding: '60px 40px',
        boxShadow: '0 8px 48px #b2ebf240',
        color: '#333'
      }}>
        {/* 메인 제목 */}
        <h1 style={{
          fontSize: '42px',
          fontWeight: '700',
          marginBottom: '16px',
          background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: '1.2'
        }}>
          교사 개인화 웹앱 제작을 통한<br />학급 피드백 시스템 구축
        </h1>

        {/* 부제목 */}
        <h2 style={{
          fontSize: '28px',
          fontWeight: '600',
          marginBottom: '50px',
          color: '#1976d2'
        }}>
          초등학교 (5학년)
        </h2>

        {/* 설명 */}
        <p style={{
          fontSize: '18px',
          marginBottom: '60px',
          color: '#666',
          lineHeight: '1.6'
        }}>
          혁신적인 교육 기술을 활용한 맞춤형 학급 관리 시스템입니다.<br />
          교사와 학생이 함께 성장할 수 있는 디지털 교육 환경을 제공합니다.
        </p>

        {/* 버튼 영역 */}
        <div style={{
          display: 'flex',
          gap: '30px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {/* 교사용 버튼 */}
          <button
            onClick={handleTeacherAccess}
            style={{
              padding: '20px 40px',
              borderRadius: '16px',
              background: '#e0f7fa',
              color: '#1976d2',
              border: '2px solid #b2ebf2',
              fontSize: '18px',
              fontWeight: '700',
              minWidth: '200px',
              boxShadow: '0 8px 24px #b2ebf240',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-3px)';
              e.target.style.boxShadow = '0 12px 32px #b2ebf260';
              e.target.style.background = '#b2ebf2';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 24px #b2ebf240';
              e.target.style.background = '#e0f7fa';
            }}
          >
            <span style={{
              fontSize: '24px',
              marginBottom: '8px',
              display: 'block'
            }}>👨‍🏫</span>
            교사용 시스템
          </button>

          {/* 학생용 버튼 */}
          <button
            onClick={handleStudentAccess}
            style={{
              padding: '20px 40px',
              borderRadius: '16px',
              background: '#ffe4ec',
              color: '#d72660',
              border: '2px solid #ffb6b9',
              fontSize: '18px',
              fontWeight: '700',
              minWidth: '200px',
              boxShadow: '0 8px 24px #f8bbd0a0',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-3px)';
              e.target.style.boxShadow = '0 12px 32px #f8bbd0c0';
              e.target.style.background = '#f8bbd0';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 24px #f8bbd0a0';
              e.target.style.background = '#ffe4ec';
            }}
          >
            <span style={{
              fontSize: '24px',
              marginBottom: '8px',
              display: 'block'
            }}>👨‍🎓</span>
            학생용 시스템
          </button>
        </div>

        {/* 하단 안내 */}
        <div style={{
          marginTop: '40px',
          fontSize: '14px',
          color: '#888'
        }}>
          <p style={{ marginBottom: '8px' }}>🔧 연구 및 개발 환경</p>
          <p>교육 혁신을 위한 실험적 플랫폼입니다</p>
        </div>
      </div>

      {/* 반응형 스타일 */}
      <style jsx>{`
        @media (max-width: 768px) {
          div[style*="padding: 60px 40px"] {
            padding: 40px 20px !important;
          }
          
          h1[style*="fontSize: 42px"] {
            font-size: 32px !important;
          }
          
          h2[style*="fontSize: 28px"] {
            font-size: 22px !important;
          }
          
          div[style*="display: flex"] {
            flex-direction: column !important;
            align-items: center !important;
          }
          
          button {
            width: 100% !important;
            max-width: 300px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LabPage;
