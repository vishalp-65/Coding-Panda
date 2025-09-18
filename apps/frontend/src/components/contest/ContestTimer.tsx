import { useState, useEffect } from 'react';
import { Clock, Play, Pause } from 'lucide-react';

interface ContestTimerProps {
    startTime: string;
    endTime: string;
    status: 'upcoming' | 'live' | 'ended';
    onStatusChange?: (newStatus: 'upcoming' | 'live' | 'ended') => void;
}

interface TimeRemaining {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
}

const ContestTimer: React.FC<ContestTimerProps> = ({
    startTime,
    endTime,
    status: initialStatus,
    onStatusChange
}) => {
    const [status, setStatus] = useState(initialStatus);
    const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: 0
    });

    const calculateTimeRemaining = (): TimeRemaining => {
        const now = new Date().getTime();
        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();

        let targetTime: number;
        let newStatus: 'upcoming' | 'live' | 'ended';

        if (now < start) {
            targetTime = start;
            newStatus = 'upcoming';
        } else if (now < end) {
            targetTime = end;
            newStatus = 'live';
        } else {
            targetTime = 0;
            newStatus = 'ended';
        }

        if (newStatus !== status) {
            setStatus(newStatus);
            onStatusChange?.(newStatus);
        }

        if (targetTime === 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
        }

        const total = targetTime - now;
        const days = Math.floor(total / (1000 * 60 * 60 * 24));
        const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((total % (1000 * 60)) / 1000);

        return { days, hours, minutes, seconds, total };
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeRemaining(calculateTimeRemaining());
        }, 1000);

        // Initial calculation
        setTimeRemaining(calculateTimeRemaining());

        return () => clearInterval(timer);
    }, [startTime, endTime, status]);

    const formatTime = (value: number): string => {
        return value.toString().padStart(2, '0');
    };

    const getStatusColor = () => {
        switch (status) {
            case 'upcoming':
                return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'live':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'ended':
                return 'text-gray-600 bg-gray-50 border-gray-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'upcoming':
                return <Clock className="h-4 w-4" />;
            case 'live':
                return <Play className="h-4 w-4" />;
            case 'ended':
                return <Pause className="h-4 w-4" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'upcoming':
                return 'Starts in';
            case 'live':
                return 'Ends in';
            case 'ended':
                return 'Contest ended';
            default:
                return 'Contest';
        }
    };

    if (status === 'ended') {
        return (
            <div className={`inline-flex items-center px-3 py-2 rounded-lg border ${getStatusColor()}`}>
                {getStatusIcon()}
                <span className="ml-2 font-medium">{getStatusText()}</span>
            </div>
        );
    }

    return (
        <div className={`inline-flex items-center px-3 py-2 rounded-lg border ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="ml-2 font-medium">{getStatusText()}:</span>

            <div className="ml-3 flex items-center space-x-1">
                {timeRemaining.days > 0 && (
                    <>
                        <div className="text-center">
                            <div className="text-lg font-bold">{formatTime(timeRemaining.days)}</div>
                            <div className="text-xs">days</div>
                        </div>
                        <span className="text-lg font-bold">:</span>
                    </>
                )}

                <div className="text-center">
                    <div className="text-lg font-bold">{formatTime(timeRemaining.hours)}</div>
                    <div className="text-xs">hrs</div>
                </div>
                <span className="text-lg font-bold">:</span>

                <div className="text-center">
                    <div className="text-lg font-bold">{formatTime(timeRemaining.minutes)}</div>
                    <div className="text-xs">min</div>
                </div>
                <span className="text-lg font-bold">:</span>

                <div className="text-center">
                    <div className="text-lg font-bold">{formatTime(timeRemaining.seconds)}</div>
                    <div className="text-xs">sec</div>
                </div>
            </div>
        </div>
    );
};

export default ContestTimer;