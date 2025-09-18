import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
    return (
        <div
            className={cn(
                'bg-white rounded-lg shadow-sm border border-gray-200',
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}