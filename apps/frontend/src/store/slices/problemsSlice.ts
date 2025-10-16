import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { problemsApi } from '@/services/api';

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface Problem {
  id: string;
  title: string;
  slug: string;
  number: number;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  constraints: {
    timeLimit: number;
    memoryLimit: number;
    inputFormat: string;
    outputFormat: string;
  };
  testCases: TestCase[];
  statistics: {
    totalSubmissions: number;
    acceptedSubmissions: number;
    acceptanceRate: number;
  };
  status?: 'solved' | 'attempted' | null;
  createdAt: string;
  updatedAt: string;
}

export interface SearchCriteria {
  query?: string;
  difficulty?: string[];
  tags?: string[];
  status?: 'solved' | 'attempted' | 'unsolved';
  page?: number;
  limit?: number;
}

interface ProblemsState {
  problems: Problem[];
  currentProblem: Problem | null;
  searchCriteria: SearchCriteria;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  bookmarkedProblems: string[];
}

const initialState: ProblemsState = {
  problems: [],
  currentProblem: null,
  searchCriteria: {
    page: 1,
    limit: 20,
  },
  totalCount: 0,
  isLoading: false,
  error: null,
  bookmarkedProblems: [],
};

export const fetchProblems = createAsyncThunk(
  'problems/fetchProblems',
  async (criteria: SearchCriteria) => {
    const response = await problemsApi.searchProblems(criteria);
    return response;
  }
);

export const fetchProblemById = createAsyncThunk(
  'problems/fetchProblemById',
  async (identifier: string) => {
    // identifier can be either problem ID or problem number
    const response = await problemsApi.getProblem(identifier);
    return response.data;
  }
);

export const bookmarkProblem = createAsyncThunk(
  'problems/bookmarkProblem',
  async (problemId: string) => {
    await problemsApi.bookmarkProblem(problemId);
    return problemId;
  }
);

export const unbookmarkProblem = createAsyncThunk(
  'problems/unbookmarkProblem',
  async (problemId: string) => {
    await problemsApi.unbookmarkProblem(problemId);
    return problemId;
  }
);

const problemsSlice = createSlice({
  name: 'problems',
  initialState,
  reducers: {
    setSearchCriteria: (state, action: PayloadAction<SearchCriteria>) => {
      state.searchCriteria = { ...state.searchCriteria, ...action.payload };
    },
    clearCurrentProblem: state => {
      state.currentProblem = null;
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // Fetch problems
      .addCase(fetchProblems.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProblems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.problems = action.payload.data;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchProblems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch problems';
      })
      // Fetch problem by ID
      .addCase(fetchProblemById.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProblemById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProblem = action.payload;
      })
      .addCase(fetchProblemById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch problem';
      })
      // Bookmark problem
      .addCase(bookmarkProblem.fulfilled, (state, action) => {
        state.bookmarkedProblems.push(action.payload);
      })
      // Unbookmark problem
      .addCase(unbookmarkProblem.fulfilled, (state, action) => {
        state.bookmarkedProblems = state.bookmarkedProblems.filter(
          id => id !== action.payload
        );
      });
  },
});

export const { setSearchCriteria, clearCurrentProblem, clearError } =
  problemsSlice.actions;
export default problemsSlice.reducer;
