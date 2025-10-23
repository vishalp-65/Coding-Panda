import { useState, useMemo, useCallback } from 'react';
import {
  BookOpen,
  MessageSquare,
  History,
  Bookmark,
  BookmarkCheck,
  ThumbsUp,
  ThumbsDown,
  Share,
  BarChart3,
} from 'lucide-react';
import { Problem } from '@/types/problemSolving';

interface ModernProblemDescriptionProps {
  problem: Problem;
}

type ActiveTab = 'description' | 'editorial' | 'submissions' | 'discuss';

interface Tab {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: Tab[] = [
  { id: 'description', label: 'Description', icon: BookOpen },
  { id: 'editorial', label: 'Editorial', icon: BookOpen },
  { id: 'submissions', label: 'Submissions', icon: History },
  { id: 'discuss', label: 'Discuss', icon: MessageSquare },
];

const ModernProblemDescription = ({
  problem,
}: ModernProblemDescriptionProps) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('description');
  const [isBookmarked, setIsBookmarked] = useState(
    problem.isBookmarked || false
  );
  const [liked, setLiked] = useState<boolean | null>(null);

  // Memoized helper functions
  const getDifficultyColor = useMemo(() => {
    const colors: Record<string, string> = {
      easy: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30',
      medium:
        'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30',
      hard: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30',
    };

    return (
      colors[problem.difficulty] ||
      'bg-gray-500/20 text-gray-400 border-gray-500/30'
    );
  }, [problem.difficulty]);

  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }, []);

  const formattedDescription = useMemo(() => {
    return problem.description
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-gray-400">$1</em>')
      .replace(
        /`(.*?)`/g,
        '<code class="bg-gray-800 text-blue-400 px-1 py-0.5 rounded text-sm">$1</code>'
      )
      .replace(
        /```([\s\S]*?)```/g,
        '<pre class="bg-gray-800 p-3 rounded-md overflow-x-auto my-2"><code class="text-gray-300">$1</code></pre>'
      )
      .replace(/\n/g, '<br>');
  }, [problem.description]);

  const handleLikeToggle = useCallback((isLike: boolean) => {
    setLiked(prev => (prev === isLike ? null : isLike));
  }, []);

  const handleBookmarkToggle = useCallback(() => {
    setIsBookmarked(prev => !prev);
    // TODO: Call API to persist bookmark state
  }, []);

  const handleShare = useCallback(() => {
    // TODO: Implement share functionality
    console.log('Share problem:', problem.id);
  }, [problem.id]);

  return (
    <div className="h-full flex flex-col text-gray-900 dark:text-white bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span
              className={`px-2 py-1 rounded-md text-xs font-medium border ${getDifficultyColor}`}
            >
              {problem.difficulty.charAt(0).toUpperCase() +
                problem.difficulty.slice(1)}
            </span>
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <BarChart3 className="h-4 w-4" />
                <span>{problem.statistics.acceptanceRate.toFixed(1)}%</span>
              </div>
              <span>
                {formatNumber(problem.statistics.totalSubmissions)} submissions
              </span>
            </div>
          </div>

          <ActionButtons
            liked={liked}
            isBookmarked={isBookmarked}
            onLike={() => handleLikeToggle(true)}
            onDislike={() => handleLikeToggle(false)}
            onBookmark={handleBookmarkToggle}
            onShare={handleShare}
          />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {problem.tags.map(tag => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-1 px-4">
          {TABS.map(tab => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <TabContent
          activeTab={activeTab}
          formattedDescription={formattedDescription}
        />
      </div>
    </div>
  );
};

// Helper Components
interface ActionButtonsProps {
  liked: boolean | null;
  isBookmarked: boolean;
  onLike: () => void;
  onDislike: () => void;
  onBookmark: () => void;
  onShare: () => void;
}

const ActionButtons = ({
  liked,
  isBookmarked,
  onLike,
  onDislike,
  onBookmark,
  onShare,
}: ActionButtonsProps) => (
  <div className="flex items-center space-x-2">
    <button
      onClick={onLike}
      className={`p-2 rounded-md transition-colors ${
        liked === true
          ? 'bg-green-500/20 text-green-400'
          : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
      }`}
      aria-label="Like problem"
    >
      <ThumbsUp className="h-4 w-4" />
    </button>
    <button
      onClick={onDislike}
      className={`p-2 rounded-md transition-colors ${
        liked === false
          ? 'bg-red-500/20 text-red-400'
          : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
      }`}
      aria-label="Dislike problem"
    >
      <ThumbsDown className="h-4 w-4" />
    </button>
    <button
      onClick={onBookmark}
      className={`p-2 rounded-md transition-colors ${
        isBookmarked
          ? 'bg-blue-500/20 text-blue-400'
          : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
      }`}
      aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      {isBookmarked ? (
        <BookmarkCheck className="h-4 w-4" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
    </button>
    <button
      onClick={onShare}
      className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
      aria-label="Share problem"
    >
      <Share className="h-4 w-4" />
    </button>
  </div>
);

interface TabButtonProps {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
}

const TabButton = ({ tab, isActive, onClick }: TabButtonProps) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
      isActive
        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
    }`}
  >
    <tab.icon className="h-4 w-4" />
    <span>{tab.label}</span>
  </button>
);

interface TabContentProps {
  activeTab: ActiveTab;
  formattedDescription: string;
}

const TabContent = ({ activeTab, formattedDescription }: TabContentProps) => {
  switch (activeTab) {
    case 'description':
      return (
        <div className="prose prose-invert max-w-none">
          <div
            className="text-gray-800 dark:text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formattedDescription }}
          />
        </div>
      );
    case 'editorial':
      return (
        <EmptyTabState icon={BookOpen} message="Editorial coming soon..." />
      );
    case 'submissions':
      return <EmptyTabState icon={History} message="No submissions yet" />;
    case 'discuss':
      return (
        <EmptyTabState icon={MessageSquare} message="Join the discussion..." />
      );
    default:
      return null;
  }
};

interface EmptyTabStateProps {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}

const EmptyTabState = ({ icon: Icon, message }: EmptyTabStateProps) => (
  <div className="text-center py-12">
    <Icon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
    <p className="text-gray-600 dark:text-gray-400">{message}</p>
  </div>
);

export default ModernProblemDescription;
