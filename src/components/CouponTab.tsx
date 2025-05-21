import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { CouponWithStudent } from '../types/coupon';

interface CouponTabProps {
  isTeacher: boolean;
}

export const CouponTab: React.FC<CouponTabProps> = ({ isTeacher }) => {
  const [coupons, setCoupons] = useState<CouponWithStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const studentsRef = collection(db, 'students');
      const studentsSnapshot = await getDocs(studentsRef);
      
      const allCoupons: CouponWithStudent[] = [];
      
      studentsSnapshot.forEach((studentDoc) => {
        const studentData = studentDoc.data();
        const studentCoupons = studentData.coupons || [];
        
        studentCoupons.forEach((coupon: any) => {
          allCoupons.push({
            ...coupon,
            studentId: studentDoc.id,
            studentName: studentData.name,
            receivedAt: coupon.receivedAt.toDate(),
            usedAt: coupon.usedAt?.toDate(),
          });
        });
      });

      // Sort by receivedAt (newest first)
      allCoupons.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
      
      setCoupons(allCoupons);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseCoupon = async (coupon: CouponWithStudent) => {
    if (!isTeacher) return;
    try {
      const studentRef = doc(db, 'students', coupon.studentId);
      const studentDoc = await getDoc(studentRef);
      if (!studentDoc.exists()) return;
      const studentData = studentDoc.data();
      const updatedCoupons = (studentData.coupons || []).map((c: any) => {
        const cReceived = c.receivedAt?.toDate ? c.receivedAt.toDate().getTime() : new Date(c.receivedAt).getTime();
        const couponReceived = coupon.receivedAt?.getTime ? coupon.receivedAt.getTime() : new Date(coupon.receivedAt).getTime();
        if (
          c.id === coupon.id &&
          c.name === coupon.name &&
          cReceived === couponReceived
        ) {
          return { ...c, used: true, usedAt: new Date() };
        }
        return c;
      });
      await updateDoc(studentRef, { coupons: updatedCoupons });
      await fetchCoupons();
    } catch (error) {
      console.error('Error using coupon:', error);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">로딩 중...</div>;
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">쿠폰함</h3>
      {coupons.length === 0 ? (
        <p className="text-center text-gray-500">사용 가능한 쿠폰이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {coupons.map((coupon) => (
            <div
              key={`${coupon.studentId}-${coupon.id}`}
              className={`bg-white rounded-lg p-4 shadow ${
                coupon.used ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <img
                  src={coupon.image}
                  alt={coupon.name}
                  className="w-16 h-16 object-contain"
                />
                <div className="flex-1">
                  <p className="font-semibold">{coupon.name}</p>
                  <p className="text-sm text-gray-600">
                    {coupon.studentName} 학생
                  </p>
                  <p className="text-xs text-gray-500">
                    {coupon.receivedAt.toLocaleDateString()} 수령
                  </p>
                  {coupon.used && (
                    <p className="text-xs text-red-500">
                      {coupon.usedAt?.toLocaleDateString()} 사용됨
                    </p>
                  )}
                </div>
                {isTeacher && !coupon.used && (
                  <button
                    onClick={() => handleUseCoupon(coupon)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    사용
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 