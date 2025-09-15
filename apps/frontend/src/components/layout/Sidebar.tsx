import { NavLink } from 'react-router-dom'
import {
  Home,
  Code,
  Trophy,
  BookOpen,
  Users,
  BarChart3,
  Settings,
} from 'lucide-react'
import { useAppSelector } from '@/hooks/redux'
import { clsx } from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Problems', href: '/problems', icon: Code },
  { name: 'Contests', href: '/contests', icon: Trophy },
  { name: 'Learn', href: '/learn', icon: BookOpen },
  { name: 'Community', href: '/community', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const Sidebar = () => {
  const { sidebarOpen } = useAppSelector((state) => state.ui)

  return (
    <aside
      className={clsx(
        'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 z-40',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      <nav className="p-4 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              clsx(
                'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                !sidebarOpen && 'justify-center'
              )
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span className="ml-3">{item.name}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar