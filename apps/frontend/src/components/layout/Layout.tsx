import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAppSelector } from '@/hooks/redux';

const Layout = () => {
  const { sidebarOpen } = useAppSelector(state => state.ui);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex mt-14">
        <Sidebar />
        <main
          className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? 'ml-64' : 'ml-16'
          }`}
        >
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
