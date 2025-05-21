import { useLevelUp } from '../hooks/useLevelUp';
import { CardDrawModal } from '../components/CardDrawModal';

export const StudentDashboard: React.FC = () => {
  const { showCardModal, closeCardModal } = useLevelUp();

  return (
    <div className="min-h-screen bg-gray-100">
      <CardDrawModal 
        isOpen={showCardModal} 
        onClose={closeCardModal} 
      />
    </div>
  );
}; 