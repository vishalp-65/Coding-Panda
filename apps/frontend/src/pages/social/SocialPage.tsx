import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ActivityFeed from '@/components/social/ActivityFeed';
import UserFollowing from '@/components/social/UserFollowing';
import DiscussionForum from '@/components/discussion/DiscussionForum';
import { Users, MessageSquare, Activity } from 'lucide-react';

const SocialPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'feed';

    const tabs = [
        { id: 'feed', name: 'Activity Feed', icon: Activity },
        { id: 'discussions', name: 'Discussions', icon: MessageSquare },
        { id: 'people', name: 'People', icon: Users },
    ];

    const handleTabChange = (tabId: string) => {
        setSearchParams({ tab: tabId });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Community</h1>
                    <p className="text-gray-600 mt-1">
                        Connect with fellow developers, share knowledge, and grow together
                    </p>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8 px-6">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === tab.id
                                                ? 'border-primary-500 text-primary-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span>{tab.name}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Content */}
                <div>
                    {activeTab === 'feed' && <ActivityFeed />}
                    {activeTab === 'discussions' && <DiscussionForum />}
                    {activeTab === 'people' && (
                        <UserFollowing userId="current-user" type="suggestions" />
                    )}
                </div>
            </div>
        </div>
    );
};

export default SocialPage;