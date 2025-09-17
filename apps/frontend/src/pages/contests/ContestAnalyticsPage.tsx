import { useParams } from 'react-router-dom';
import ContestAnalytics from '@/components/contest/ContestAnalytics';

const ContestAnalyticsPage: React.FC = () => {
    const { contestId } = useParams<{ contestId: string }>();

    if (!contestId) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-gray-900">Contest not found</h2>
                <p className="text-gray-600 mt-2">The contest you're looking for doesn't exist.</p>
            </div>
        );
    }

    return <ContestAnalytics contestId={contestId} />;
};

export default ContestAnalyticsPage;