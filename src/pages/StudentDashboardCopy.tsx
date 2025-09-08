import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query } from 'firebase/firestore';
import { db } from '../../../teacher-student-app/src/firebase';
import { useLevelUp } from '../hooks/useLevelUp';
import { CardDrawModal } from '../components/CardDrawModal';

export const StudentDashboardCopy = () => {
  const { showCardModal, closeCardModal } = useLevelUp();
  const navigate = useNavigate();
  const [studentsSnapshot, loading, error] = useCollection(
    query(collection(db, 'copy_students'), orderBy('name'))
  );

  const students = studentsSnapshot?.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) || [];

  const handleStudentSelect = (studentId: string) => {
    navigate(`/student-copy/${studentId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">학생 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>오류가 발생했습니다: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 text-center">
            학생 페이지 선택 (사본)
          </h1>
          <p className="text-center text-gray-600 mt-2">
            사본 데이터베이스의 학생을 선택하세요
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">학생 목록</h2>
          
          {students.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">등록된 학생이 없습니다.</p>
              <p className="text-sm text-gray-500">
                교사 사본 페이지에서 학생을 추가하거나 사본 데이터를 초기화하세요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student) => (
                <div
                  key={student.id}
                  onClick={() => handleStudentSelect(student.id)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white cursor-pointer transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold">
                        {student.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">{student.name}</h3>
                      <p className="text-blue-100">
                        레벨 {student.level || 0} • {student.exp || 0} 경험치
                      </p>
                      <p className="text-blue-100">
                        💰 {(student.balance || 0).toLocaleString()}원
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white border-opacity-20">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-100">
                        사본 데이터베이스
                      </span>
                      <span className="text-blue-100">
                        클릭하여 입장 →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">💡 안내사항</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 사본 데이터베이스를 사용하는 독립적인 학생 페이지입니다</li>
              <li>• 기존 학생 데이터에 영향을 주지 않습니다</li>
              <li>• 새로운 경험치 시스템이 적용됩니다 (150→170→190→210...)</li>
              <li>• 모든 기능을 자유롭게 테스트할 수 있습니다</li>
            </ul>
          </div>
        </div>
      </div>
      
      <CardDrawModal 
        isOpen={showCardModal} 
        onClose={closeCardModal} 
      />
    </div>
  );
}; 