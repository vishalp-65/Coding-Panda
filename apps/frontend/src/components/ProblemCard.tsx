import React from 'react';
import { Link } from 'react-router-dom';
import type { Problem } from '../types/types';

interface ProblemCardProps {
  problem: Problem;
}

const difficultyStyles = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800',
};

export const ProblemCard: React.FC<ProblemCardProps> = ({ problem }) => (
  <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-900 mb-1">
          {problem.title}
        </h4>

        <div className="flex items-center space-x-2 text-xs">
          <span
            className={`px-2 py-1 rounded-full ${difficultyStyles[problem.difficulty]}`}
          >
            {problem.difficulty}
          </span>
          <span className="text-gray-500">
            {problem.acceptanceRate}% acceptance
          </span>
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {problem.tags.map(tag => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <Link to={`/problems/${problem.id}`} className="btn-outline text-xs ml-4">
        Solve
      </Link>
    </div>
  </div>
);
