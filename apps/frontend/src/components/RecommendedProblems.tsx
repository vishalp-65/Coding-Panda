import React from 'react';
import { Link } from 'react-router-dom';
import type { Problem } from '../types/types';
import { ProblemCard } from './ProblemCard';

interface RecommendedProblemsProps {
  problems: Problem[];
}

export const RecommendedProblems: React.FC<RecommendedProblemsProps> = ({
  problems,
}) => (
  <div className="card">
    <div className="card-header">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Recommended for You
        </h3>
        <Link
          to="/problems"
          className="text-sm text-primary-600 hover:text-primary-500"
        >
          View all
        </Link>
      </div>
    </div>
    <div className="card-content">
      <div className="space-y-4">
        {problems.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No recommendations available
          </p>
        ) : (
          problems.map(problem => (
            <ProblemCard key={problem.id} problem={problem} />
          ))
        )}
      </div>
    </div>
  </div>
);
