import { useState, useEffect } from 'react';

export function useAuth() {
  // 실제로는 Firebase Auth 등에서 user를 받아와야 함
  const [user, setUser] = useState({ uid: 'test-user' }); // 임시 user

  // 실제 프로젝트에서는 Firebase Auth 연동 필요
  useEffect(() => {
    // setUser(firebase.auth().currentUser) 등으로 대체
  }, []);

  return { user };
} 