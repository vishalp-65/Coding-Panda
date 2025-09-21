import mongoose, { Schema, Document } from 'mongoose';

export interface UserProblemDocument extends Document {
  userId: string;
  problemId: string;
  status: 'bookmarked' | 'attempted' | 'solved';
  bookmarkedAt?: Date;
  firstAttemptAt?: Date;
  solvedAt?: Date;
  attempts: number;
  rating?: number;
  notes?: string;
}

const UserProblemSchema = new Schema<UserProblemDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    problemId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['bookmarked', 'attempted', 'solved'],
      required: true,
    },
    bookmarkedAt: { type: Date },
    firstAttemptAt: { type: Date },
    solvedAt: { type: Date },
    attempts: { type: Number, default: 0 },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index to ensure one record per user-problem pair
UserProblemSchema.index({ userId: 1, problemId: 1 }, { unique: true });

// Indexes for efficient querying
UserProblemSchema.index({ userId: 1, status: 1 });
UserProblemSchema.index({ userId: 1, bookmarkedAt: -1 });
UserProblemSchema.index({ userId: 1, solvedAt: -1 });

export const UserProblemModel = mongoose.model<UserProblemDocument>(
  'UserProblem',
  UserProblemSchema
);
