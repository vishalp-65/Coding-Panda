import mongoose, { Schema, Document } from 'mongoose';
import { Problem, ProblemDifficulty, TestCase, Editorial, ProblemStatistics, ProblemConstraints } from '@ai-platform/types';

export interface ProblemDocument extends Omit<Problem, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const TestCaseSchema = new Schema<TestCase>({
  id: { type: String, required: true },
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: false },
  explanation: { type: String }
}, { _id: false });

const SolutionSchema = new Schema({
  language: { type: String, required: true },
  code: { type: String, required: true },
  explanation: { type: String, required: true },
  author: { type: String, required: true },
  votes: { type: Number, default: 0 }
}, { _id: false });

const EditorialSchema = new Schema<Editorial>({
  content: { type: String, required: true },
  solutions: [SolutionSchema],
  hints: [{ type: String }],
  timeComplexity: { type: String, required: true },
  spaceComplexity: { type: String, required: true },
  relatedTopics: [{ type: String }]
}, { _id: false });

const ProblemConstraintsSchema = new Schema<ProblemConstraints>({
  timeLimit: { type: Number, required: true },
  memoryLimit: { type: Number, required: true },
  inputFormat: { type: String, required: true },
  outputFormat: { type: String, required: true },
  sampleInput: { type: String },
  sampleOutput: { type: String }
}, { _id: false });

const ProblemStatisticsSchema = new Schema<ProblemStatistics>({
  totalSubmissions: { type: Number, default: 0 },
  acceptedSubmissions: { type: Number, default: 0 },
  acceptanceRate: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  difficultyVotes: {
    easy: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard: { type: Number, default: 0 }
  }
}, { _id: false });

const ProblemSchema = new Schema<ProblemDocument>({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true,
    maxlength: 10000
  },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'] as ProblemDifficulty[], 
    required: true 
  },
  tags: [{ 
    type: String, 
    trim: true,
    lowercase: true
  }],
  constraints: { 
    type: ProblemConstraintsSchema, 
    required: true 
  },
  testCases: [TestCaseSchema],
  editorial: EditorialSchema,
  statistics: { 
    type: ProblemStatisticsSchema, 
    default: () => ({
      totalSubmissions: 0,
      acceptedSubmissions: 0,
      acceptanceRate: 0,
      averageRating: 0,
      ratingCount: 0,
      difficultyVotes: { easy: 0, medium: 0, hard: 0 }
    })
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for efficient querying
ProblemSchema.index({ slug: 1 });
ProblemSchema.index({ difficulty: 1 });
ProblemSchema.index({ tags: 1 });
ProblemSchema.index({ 'statistics.acceptanceRate': -1 });
ProblemSchema.index({ createdAt: -1 });
ProblemSchema.index({ title: 'text', description: 'text' });

// Compound indexes for common query patterns
ProblemSchema.index({ difficulty: 1, tags: 1 });
ProblemSchema.index({ difficulty: 1, 'statistics.acceptanceRate': -1 });

export const ProblemModel = mongoose.model<ProblemDocument>('Problem', ProblemSchema);