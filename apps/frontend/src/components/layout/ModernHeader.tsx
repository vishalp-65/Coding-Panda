import { useState, useRef, useEffect } from 'react';
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
  Target,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
  LucideIcon,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { logout } from '@/store/slices/authSlice';
import { useTheme } from '@/contexts/ThemeContext';
import logo from '@/assets/image.svg';

// --- Types ---
// (Assuming INotification and User types exist)
interface INotification {
  id: string;
  title?: string;
  message: string;
  type: 'error' | 'success' | 'warning' | 'info';
  timestamp: number;
}
interface User {
  username: string;
  email: string;
  profile?: { avatar?: string };
}
type Theme = 'light' | 'dark' | 'system';

// --- Constants (Moved Outside) ---
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BookOpen },
  { name: 'Problems', href: '/problems', icon: Code2 },
  { name: 'Contests', href: '/contests', icon: Trophy },
  { name: 'Discuss', href: '/discuss', icon: Users },
  { name: 'Interview', href: '/interview', icon: Target },
];

// --- Custom Hook ---

/**
 * Manages dropdown state and closing when clicking outside.
 */
const useDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return { ref, isOpen, setIsOpen };
};

// --- Reusable UI Components ---

/**
 * A generic icon button for the header.
 */
interface HeaderIconButtonProps {
  onClick: () => void;
  'aria-label': string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}
const HeaderIconButton = ({
  children,
  className = '',
  ...props
}: HeaderIconButtonProps) => (
  <button
    {...props}
    className={`p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${className}`}
  >
    {children}
  </button>
);

/**
 * Generic dropdown menu wrapper.
 */
interface DropdownMenuProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}
const DropdownMenu = ({
  isOpen,
  children,
  className = '',
}: DropdownMenuProps) => {
  if (!isOpen) return null;
  return (
    <div
      className={`absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 ${className}`}
    >
      {children}
    </div>
  );
};

// --- Header Sub-Components ---

const Logo = () => (
  <Link to="/dashboard" className="flex items-center space-x-1 flex-shrink-0">
    {/* <div className="w-9 h-9 bg-gradient-to-r from-blue-100 to-purple-200 rounded-lg flex items-center justify-center">
    </div> */}
    <img
      src={logo}
      alt="CodingPanda Logo"
      className="h-14 w-14 object-contain"
      onError={e => {
        console.error('Logo failed to load:', logo);
        e.currentTarget.style.display = 'none';
      }}
    />
    <span className="font-bold text-md sm:text-xl text-black dark:text-white hidden sm:block whitespace-nowrap">
      CodingPanda
    </span>
  </Link>
);

interface DesktopNavigationProps {
  showSearch: boolean;
}
const DesktopNavigation = ({ showSearch }: DesktopNavigationProps) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav
      className={`hidden md:flex items-center space-x-1 transition-opacity duration-200 ${
        showSearch ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'
      }`}
    >
      {navigation.map(item => (
        <Link
          key={item.name}
          to={item.href}
          className={`flex items-center space-x-1 lg:space-x-2 px-5 lg:px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            isActive(item.href)
              ? 'bg-gray-300/70 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <item.icon className="h-5 w-5 lg:h-4 lg:w-4 flex-shrink-0" />
          <span className="hidden lg:inline">{item.name}</span>
        </Link>
      ))}
    </nav>
  );
};

const DesktopSearch = ({ showSearch }: { showSearch: boolean }) => (
  <div
    className={`hidden lg:flex flex-1 max-w-md mx-4 xl:mx-8 transition-opacity duration-200 ${
      showSearch ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'
    }`}
  >
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        type="text"
        placeholder="Search problems..."
        className="w-full pl-10 pr-4 py-2 bg-gray-200/60 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-lg text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />
    </div>
  </div>
);

interface MobileSearchProps {
  showSearch: boolean;
  toggleSearch: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
}
const MobileSearch = ({
  showSearch,
  toggleSearch,
  searchQuery,
  setSearchQuery,
  searchInputRef,
}: MobileSearchProps) => (
  <div
    className={`search-container lg:hidden transition-all duration-300 ${
      showSearch
        ? 'fixed left-0 right-0 top-0 h-16 bg-slate-50 dark:bg-gray-800 flex items-center px-4 z-50 border-b border-gray-200 dark:border-gray-700'
        : 'relative'
    }`}
  >
    {showSearch ? (
      <div className="flex items-center w-full space-x-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search problems..."
            className="w-full pl-10 pr-4 py-2 bg-gray-200/60 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-lg text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <HeaderIconButton onClick={toggleSearch} aria-label="Close search">
          <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </HeaderIconButton>
      </div>
    ) : (
      <HeaderIconButton onClick={toggleSearch} aria-label="Search">
        <Search className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </HeaderIconButton>
    )}
  </div>
);

const ThemeMenu = () => {
  const { theme, actualTheme, setTheme } = useTheme();
  const { ref, isOpen, setIsOpen } = useDropdown();

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  const ThemeIcon =
    {
      light: Sun,
      dark: Moon,
      system: Monitor,
    }[theme] || Monitor;

  const themeOptions: { name: string; value: Theme; icon: LucideIcon }[] = [
    { name: 'Light', value: 'light', icon: Sun },
    { name: 'Dark', value: 'dark', icon: Moon },
    { name: 'System', value: 'system', icon: Monitor },
  ];

  return (
    <div ref={ref} className="relative dropdown-container hidden sm:block">
      <HeaderIconButton
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle theme"
        title={`Current theme: ${theme} (${actualTheme})`}
      >
        <ThemeIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </HeaderIconButton>

      <DropdownMenu isOpen={isOpen} className="w-44">
        {themeOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleThemeChange(opt.value)}
            className={`flex items-center w-full px-4 py-2 text-sm transition-colors ${
              theme === opt.value
                ? 'text-blue-500 dark:text-blue-400 bg-gray-100 dark:bg-gray-700/50'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <opt.icon className="h-4 w-4 mr-2" />
            {opt.name}
            {theme === opt.value && (
              <span className="ml-auto text-xs">({actualTheme})</span>
            )}
          </button>
        ))}
      </DropdownMenu>
    </div>
  );
};

const NotificationMenu = () => {
  const { notifications } = useAppSelector(state => state.ui);
  const { ref, isOpen, setIsOpen } = useDropdown();
  const hasNotifications = notifications.length > 0;

  return (
    <div ref={ref} className="relative dropdown-container">
      <HeaderIconButton
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="relative"
      >
        <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        {hasNotifications && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </HeaderIconButton>

      <DropdownMenu isOpen={isOpen} className="w-80 sm:w-96">
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-black dark:text-white">
            Notifications
          </h3>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {hasNotifications ? (
            notifications.map((notification: INotification, index: number) => (
              <div
                key={index}
                className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 cursor-pointer transition-colors"
              >
                <p className="text-sm text-black dark:text-white font-medium">
                  {notification.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {notification.message}
                </p>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center">
              <Bell className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No notifications
              </p>
            </div>
          )}
        </div>
      </DropdownMenu>
    </div>
  );
};

interface UserMenuProps {
  user: User | null;
}
const UserMenu = ({ user }: UserMenuProps) => {
  const dispatch = useAppDispatch();
  const { ref, isOpen, setIsOpen } = useDropdown();

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      setIsOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div ref={ref} className="relative dropdown-container">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="User menu"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
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

      <DropdownMenu isOpen={isOpen} className="w-48">
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-black dark:text-white truncate">
            {user?.username}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {user?.email}
          </p>
        </div>
        <Link
          to="/profile"
          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white transition-colors"
          onClick={() => setIsOpen(false)}
        >
          <User className="h-4 w-4 mr-2" />
          Profile
        </Link>
        <Link
          to="/settings"
          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white transition-colors"
          onClick={() => setIsOpen(false)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Link>
        <hr className="my-1 border-gray-200 dark:border-gray-700" />
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </button>
      </DropdownMenu>
    </div>
  );
};

interface MobileNavigationMenuProps {
  showMobileMenu: boolean;
  setShowMobileMenu: (show: boolean) => void;
}
const MobileNavigationMenu = ({
  showMobileMenu,
  setShowMobileMenu,
}: MobileNavigationMenuProps) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  if (!showMobileMenu) return null;

  return (
    <div className="md:hidden fixed top-16 left-0 right-0 bottom-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-xl z-40 overflow-y-auto">
      <nav className="px-4 py-2 space-y-1">
        {navigation.map(item => (
          <Link
            key={item.name}
            to={item.href}
            className={`flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${
              isActive(item.href)
                ? 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white'
            }`}
            onClick={() => setShowMobileMenu(false)}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        ))}

        {/* Mobile-only items */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
          <div className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center space-x-2">
              <Flame className="h-5 w-5 text-orange-400" />
              <span className="text-sm font-medium text-orange-400">
                7 day streak
              </span>
            </div>
          </div>
          <button className="flex items-center justify-center w-full px-3 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg text-black text-sm font-medium hover:from-yellow-400 hover:to-orange-400 transition-colors">
            Upgrade to Premium
          </button>
        </div>
      </nav>
    </div>
  );
};

// --- Main Header Component ---

const ModernHeader = () => {
  const { user } = useAppSelector(state => state.auth);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container') && showSearch) {
        setShowSearch(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearch]);

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
    }
  };

  return (
    <>
      <header className="bg-slate-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between h-full px-3 sm:px-4 max-w-full">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-8 flex-shrink-0">
            {/* Mobile menu toggle */}
            <HeaderIconButton
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden"
              aria-label="Toggle menu"
            >
              {showMobileMenu ? (
                <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              )}
            </HeaderIconButton>

            <Logo />
            <DesktopNavigation showSearch={showSearch} />
          </div>

          {/* Center - Search (Desktop) */}
          <DesktopSearch showSearch={showSearch} />

          {/* Right side - User actions */}
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <MobileSearch
              showSearch={showSearch}
              toggleSearch={toggleSearch}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchInputRef={searchInputRef}
            />

            {/* Icons container, hidden when mobile search is active */}
            {!showSearch && (
              <div className="flex items-center space-x-1 sm:space-x-2">
                <ThemeMenu />
                <div className="hidden md:flex items-center space-x-2 px-2 lg:px-3 py-1 bg-orange-100 dark:bg-orange-500/20 rounded-full">
                  <Flame className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                  <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                    7
                  </span>
                </div>
                {/* <button className="hidden md:flex items-center space-x-2 px-2 lg:px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-black text-xs lg:text-sm font-medium hover:from-yellow-400 hover:to-orange-400 transition-colors whitespace-nowrap">
                  Premium
                </button> */}
                <NotificationMenu />
                <UserMenu user={user} />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      <MobileNavigationMenu
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
      />

      {/* Spacer to push content below fixed header */}
      <div className="h-16" />
    </>
  );
};

export default ModernHeader;
