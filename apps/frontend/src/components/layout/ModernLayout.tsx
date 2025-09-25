import { Outlet } from 'react-router-dom';
import ModernHeader from './ModernHeader';
import { useAppSelector } from '@/hooks/redux';

const ModernLayout = () => {
    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <ModernHeader />
            <main className="pt-14 h-screen">
                <Outlet />
            </main>
        </div>
    );
};

export default ModernLayout;