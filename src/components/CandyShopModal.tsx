import { CouponTab } from './CouponTab';

export const CandyShopModal: React.FC<CandyShopModalProps> = ({ isOpen, onClose, isTeacher }) => {
  const [activeTab, setActiveTab] = useState<'balance' | 'items' | 'transactions' | 'coupons'>('balance');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          // ... existing motion props ...
        >
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">캔디숍</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setActiveTab('balance')}
                className={`px-4 py-2 rounded ${
                  activeTab === 'balance'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                잔액
              </button>
              <button
                onClick={() => setActiveTab('items')}
                className={`px-4 py-2 rounded ${
                  activeTab === 'items'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                품목
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-4 py-2 rounded ${
                  activeTab === 'transactions'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                입출금 내역
              </button>
              <button
                onClick={() => setActiveTab('coupons')}
                className={`px-4 py-2 rounded ${
                  activeTab === 'coupons'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                쿠폰함
              </button>
            </div>

            {activeTab === 'balance' && (
              // ... existing balance tab content ...
            )}
            {activeTab === 'items' && (
              // ... existing items tab content ...
            )}
            {activeTab === 'transactions' && (
              // ... existing transactions tab content ...
            )}
            {activeTab === 'coupons' && (
              <CouponTab isTeacher={isTeacher} />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 