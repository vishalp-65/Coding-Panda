import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Bell, User, LogOut, Settings } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { logout } from '@/store/slices/authSlice';
import { toggleSidebar } from '@/store/slices/uiSlice';

const Header = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { notifications } = useAppSelector(state => state.ui);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const unreadNotifications = notifications.length;

  return (
    <header className="bg-white border-b border-gray-200 h-16 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AC</span>
            </div>
            <span className="font-semibold text-gray-900">
              AI Coding Platform
            </span>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-md hover:bg-gray-100"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                      <div key={index} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                        <p className="text-sm text-gray-900">{notification.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No notifications</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100"
            >
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                {user?.profile?.avatar ? (
                  <img
                    src={user.profile.avatar}
                    alt={user.username}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <span className="text-sm font-medium">{user?.username}</span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                <Link
                  to="/profile"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
                <hr className="my-1" />
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
