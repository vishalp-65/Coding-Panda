// Helper functions for problem handling

export const getLanguageDisplayName = (language: string): string => {
  const languageMap: Record<string, string> = {
    java: 'Java',
    python: 'Python',
    cpp: 'C++',
    rust: 'Rust',
    javascript: 'JavaScript',
    go: 'Go',
  };
  return languageMap[language] || language;
};

export const getLanguageFileExtension = (language: string): string => {
  const extensionMap: Record<string, string> = {
    java: '.java',
    python: '.py',
    cpp: '.cpp',
    rust: '.rs',
    javascript: '.js',
    go: '.go',
  };
  return extensionMap[language] || '.txt';
};

export const formatExecutionTime = (timeMs: number): string => {
  if (timeMs < 1000) {
    return `${timeMs}ms`;
  }
  return `${(timeMs / 1000).toFixed(2)}s`;
};

export const formatMemoryUsage = (memoryBytes: number): string => {
  if (memoryBytes < 1024) {
    return `${memoryBytes}B`;
  } else if (memoryBytes < 1024 * 1024) {
    return `${(memoryBytes / 1024).toFixed(1)}KB`;
  } else {
    return `${(memoryBytes / (1024 * 1024)).toFixed(1)}MB`;
  }
};

export const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return 'text-green-400';
    case 'medium':
      return 'text-yellow-400';
    case 'hard':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
};

export const getDifficultyBadgeColor = (difficulty: string): string => {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'hard':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};
