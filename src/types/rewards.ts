export type RewardType = 'money' | 'coupon';

export interface Reward {
  id: string;
  type: RewardType;
  value: number;
  name: string;
  image: string;
  probability: number;
}

export const REWARDS: Reward[] = [
  {
    id: 'money_5',
    type: 'money',
    value: 5,
    name: '5원',
    image: '/money.png',
    probability: 0.4, // 40%
  },
  {
    id: 'money_10',
    type: 'money',
    value: 10,
    name: '10원',
    image: '/money.png',
    probability: 0.2, // 20%
  },
  {
    id: 'bites',
    type: 'coupon',
    value: 1,
    name: '바이츠',
    image: '/bites.png',
    probability: 0.1, // 10%
  },
  {
    id: 'chew2',
    type: 'coupon',
    value: 1,
    name: '츄2',
    image: '/chew2.png',
    probability: 0.1, // 10%
  },
  {
    id: 'chupa',
    type: 'coupon',
    value: 1,
    name: '츄파',
    image: '/chupa.png',
    probability: 0.1, // 10%
  },
  {
    id: 'chupafr',
    type: 'coupon',
    value: 1,
    name: '츄파후르츠',
    image: '/chupafr.png',
    probability: 0.05, // 5%
  },
  {
    id: 'bottle',
    type: 'coupon',
    value: 1,
    name: '병음료',
    image: '/bottle.png',
    probability: 0.05, // 5%
  },
]; 