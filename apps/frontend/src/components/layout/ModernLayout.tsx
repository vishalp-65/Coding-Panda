import { Outlet } from 'react-router-dom';
import ModernHeader from './ModernHeader';

const ModernLayout = () => {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
            <ModernHeader />
            <main className="pt-14 h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
                <div className="transition-all duration-300 ease-in-out">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default ModernLayout;