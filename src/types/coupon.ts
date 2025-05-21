export interface Coupon {
  id: string;
  name: string;
  image: string;
  receivedAt: Date;
  used: boolean;
  usedAt?: Date;
}

export interface CouponWithStudent extends Coupon {
  studentId: string;
  studentName: string;
} 