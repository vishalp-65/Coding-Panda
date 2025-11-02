import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
    variant?: 'default' | 'dropdown' | 'compact';
    showLabels?: boolean;
}

const ThemeToggle = ({ variant = 'default', showLabels = true }: ThemeToggleProps) => {
    const { theme, actualTheme, setTheme } = useTheme();

    const themes = [
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'system', label: 'System', icon: Monitor },
    ] as const;

    const getCurrentIcon = () => {
        const currentTheme = themes.find(t => t.value === theme);
        return currentTheme?.icon || Monitor;
    };

    if (variant === 'dropdown') {
        return (
            <div className="space-y-1">
                {themes.map(({ value, label, icon: Icon }) => (
                    <button
                        key={value}
                        onClick={() => setTheme(value)}
                        className={`flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors ${theme === value
                                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                    >
                        <Icon className="h-4 w-4 mr-3" />
                        {label}
                        {theme === value && (
                            <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">
                                ({actualTheme})
                            </span>
                        )}
                    </button>
                ))}
            </div>
        );
    }

    if (variant === 'compact') {
        const CurrentIcon = getCurrentIcon();
        return (
            <button
                onClick={() => {
                    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
                    setTheme(nextTheme);
                }}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={`Current: ${theme} (${actualTheme})`}
            >
                <CurrentIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
        );
    }

    return (
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 transition-colors">
            {themes.map(({ value, label, icon: Icon }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${theme === value
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm scale-105'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-750'
                        }`}
                    title={`Switch to ${label.toLowerCase()} theme${theme === value ? ` (current: ${actualTheme})` : ''}`}
                >
                    <Icon className="h-4 w-4" />
                    {showLabels && <span className="hidden sm:inline">{label}</span>}
                </button>
            ))}
        </div>
    );
};

export default ThemeToggle;