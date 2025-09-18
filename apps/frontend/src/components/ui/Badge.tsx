import React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'outline'
    children: React.ReactNode
}

const badgeVariants = {
    default: 'bg-primary-100 text-primary-800 border-primary-200',
    secondary: 'bg-gray-100 text-gray-800 border-gray-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    outline: 'bg-transparent text-gray-700 border-gray-300'
}

export const Badge: React.FC<BadgeProps> = ({
    variant = 'default',
    className,
    children,
    ...props
}) => {
    return (
        <div
            className={cn(
                'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
                badgeVariants[variant],
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}