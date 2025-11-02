import { Toaster } from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';

const ThemedToaster = () => {
    const { actualTheme } = useTheme();

    return (
        <Toaster
            position="top-right"
            toastOptions={{
                duration: 4000,
                style: {
                    background: actualTheme === 'dark' ? '#374151' : '#ffffff',
                    color: actualTheme === 'dark' ? '#f9fafb' : '#111827',
                    border: actualTheme === 'dark' ? '1px solid #4b5563' : '1px solid #e5e7eb',
                },
                success: {
                    iconTheme: {
                        primary: '#10b981',
                        secondary: actualTheme === 'dark' ? '#374151' : '#ffffff',
                    },
                },
                error: {
                    iconTheme: {
                        primary: '#ef4444',
                        secondary: actualTheme === 'dark' ? '#374151' : '#ffffff',
                    },
                },
            }}
        />
    );
};

export default ThemedToaster;