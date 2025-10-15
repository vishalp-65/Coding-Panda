import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Code2,
    Trophy,
    BookOpen,
    Users,
    Bell,
    User,
    LogOut,
    Settings,
    Search,
    Flame,
    Timer,
    Target
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { logout } from '@/store/slices/authSlice';

const ModernHeader = () => {
    const dispatch = useAppDispatch();
    const location = useLocation();
    const { user } = useAppSelector(state => state.auth);
    const { notifications } = useAppSelector(state => state.ui);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const handleLogout = async () => {
        try {
            await dispatch(logout()).unwrap();
            setShowUserMenu(false);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: BookOpen },
        { name: 'Problems', href: '/problems', icon: Code2 },
        { name: 'Contests', href: '/contests', icon: Trophy },
        { name: 'Discuss', href: '/discuss', icon: Users },
        { name: 'Interview', href: '/interview', icon: Target },
    ];

    const isActive = (path: string) => location.pathname.startsWith(path);

    return (
        <header className="bg-gray-800 border-b border-gray-700 h-14 fixed top-0 left-0 right-0 z-50">
            <div className="flex items-center justify-between h-full px-4 max-w-7xl mx-auto">
                {/* Left side - Logo and Navigation */}
                <div className="flex items-center space-x-8">
                    <Link to="/dashboard" className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Code2 className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-bold text-xl text-white">CodePlatform</span>
                    </Link>

                    <nav className="hidden md:flex items-center space-x-1">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.href)
                                    ? 'bg-gray-700 text-white'
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    }`}
                            >
                                <item.icon className="h-4 w-4" />
                                <span>{item.name}</span>
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Center - Search */}
                <div className="hidden lg:flex flex-1 max-w-lg mx-8">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search problems..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Right side - User actions */}
                <div className="flex items-center space-x-4">
                    {/* Streak */}
                    <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-orange-500/20 rounded-full">
                        <Flame className="h-4 w-4 text-orange-400" />
                        <span className="text-sm font-medium text-orange-400">7</span>
                    </div>

                    {/* Premium */}
                    <button className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-black text-sm font-medium hover:from-yellow-400 hover:to-orange-400 transition-colors">
                        <span>Premium</span>
                    </button>

                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2 rounded-md hover:bg-gray-700 transition-colors"
                        >
                            <Bell className="h-5 w-5 text-gray-300" />
                            {notifications.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {notifications.length > 9 ? '9+' : notifications.length}
                                </span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-2 z-50">
                                <div className="px-4 py-2 border-b border-gray-700">
                                    <h3 className="text-sm font-medium text-white">Notifications</h3>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {notifications.length > 0 ? (
                                        notifications.map((notification, index) => (
                                            <div
                                                key={index}
                                                className="px-4 py-3 hover:bg-gray-700 border-b border-gray-700 last:border-b-0"
                                            >
                                                <p className="text-sm text-white">{notification.title}</p>
                                                <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-8 text-center">
                                            <Bell className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                                            <p className="text-sm text-gray-400">No notifications</p>
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
                            className="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-700 transition-colors"
                        >
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                {user?.profile?.avatar ? (
                                    <img
                                        src={user.profile.avatar}
                                        alt={user.username}
                                        className="w-8 h-8 rounded-full"
                                    />
                                ) : (
                                    <User className="h-4 w-4 text-white" />
                                )}
                            </div>
                        </button>

                        {showUserMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1 z-50">
                                <div className="px-4 py-2 border-b border-gray-700">
                                    <p className="text-sm font-medium text-white">{user?.username}</p>
                                    <p className="text-xs text-gray-400">{user?.email}</p>
                                </div>
                                <Link
                                    to="/profile"
                                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    <User className="h-4 w-4 mr-2" />
                                    Profile
                                </Link>
                                <Link
                                    to="/settings"
                                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    <Settings className="h-4 w-4 mr-2" />
                                    Settings
                                </Link>
                                <hr className="my-1 border-gray-700" />
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default ModernHeader;