-- Contest Management Service Database Schema
-- This schema supports contests, participants, rankings, and submissions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Contests table
CREATE TABLE contests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    registration_end TIMESTAMP WITH TIME ZONE,
    max_participants INTEGER,
    problem_ids TEXT[] NOT NULL, -- Array of problem IDs from problem service
    rules JSONB DEFAULT '{}',
    scoring_type VARCHAR(50) DEFAULT 'standard', -- 'standard', 'icpc', 'ioi'
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'upcoming', 'active', 'ended', 'cancelled'
    is_public BOOLEAN DEFAULT true,
    created_by UUID NOT NULL, -- User ID who created the contest
    prize_pool DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_registration_time CHECK (registration_end IS NULL OR registration_end <= start_time),
    CONSTRAINT valid_status CHECK (status IN ('draft', 'upcoming', 'active', 'ended', 'cancelled'))
);

-- Contest participants table
CREATE TABLE contest_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    username VARCHAR(100) NOT NULL, -- Cached from user service
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'registered', -- 'registered', 'participating', 'disqualified'
    team_name VARCHAR(100), -- For team contests
    
    UNIQUE(contest_id, user_id),
    CONSTRAINT valid_participant_status CHECK (status IN ('registered', 'participating', 'disqualified'))
);

-- Contest submissions table
CREATE TABLE contest_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES contest_participants(id) ON DELETE CASCADE,
    problem_id VARCHAR(255) NOT NULL,
    code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'pending', 'accepted', 'wrong_answer', 'time_limit', 'memory_limit', 'runtime_error', 'compile_error'
    score INTEGER DEFAULT 0,
    execution_time INTEGER, -- in milliseconds
    memory_used INTEGER, -- in KB
    test_cases_passed INTEGER DEFAULT 0,
    total_test_cases INTEGER DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    judged_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_submission_status CHECK (status IN ('pending', 'accepted', 'wrong_answer', 'time_limit', 'memory_limit', 'runtime_error', 'compile_error'))
);

-- Contest rankings table (materialized view for performance)
CREATE TABLE contest_rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES contest_participants(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    total_score INTEGER DEFAULT 0,
    problems_solved INTEGER DEFAULT 0,
    total_penalty INTEGER DEFAULT 0, -- Time penalty in minutes
    last_submission_time TIMESTAMP WITH TIME ZONE,
    problem_scores JSONB DEFAULT '{}', -- {problem_id: {score, attempts, solved_at}}
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(contest_id, participant_id)
);

-- Contest analytics table
CREATE TABLE contest_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    total_participants INTEGER DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    problem_statistics JSONB DEFAULT '{}', -- Per-problem stats
    language_distribution JSONB DEFAULT '{}',
    submission_timeline JSONB DEFAULT '{}', -- Submissions over time
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(contest_id)
);

-- Indexes for performance
CREATE INDEX idx_contests_status ON contests(status);
CREATE INDEX idx_contests_start_time ON contests(start_time);
CREATE INDEX idx_contests_created_by ON contests(created_by);
CREATE INDEX idx_contest_participants_contest_id ON contest_participants(contest_id);
CREATE INDEX idx_contest_participants_user_id ON contest_participants(user_id);
CREATE INDEX idx_contest_submissions_contest_id ON contest_submissions(contest_id);
CREATE INDEX idx_contest_submissions_participant_id ON contest_submissions(participant_id);
CREATE INDEX idx_contest_submissions_problem_id ON contest_submissions(problem_id);
CREATE INDEX idx_contest_submissions_status ON contest_submissions(status);
CREATE INDEX idx_contest_submissions_submitted_at ON contest_submissions(submitted_at);
CREATE INDEX idx_contest_rankings_contest_id ON contest_rankings(contest_id);
CREATE INDEX idx_contest_rankings_rank ON contest_rankings(contest_id, rank);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contests_updated_at BEFORE UPDATE ON contests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contest_rankings_updated_at BEFORE UPDATE ON contest_rankings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update contest status based on time
CREATE OR REPLACE FUNCTION update_contest_status()
RETURNS void AS $$
BEGIN
    -- Update contests to 'upcoming' if registration has ended but contest hasn't started
    UPDATE contests 
    SET status = 'upcoming' 
    WHERE status = 'draft' 
    AND (registration_end IS NULL OR registration_end <= NOW())
    AND start_time > NOW();
    
    -- Update contests to 'active' if they have started
    UPDATE contests 
    SET status = 'active' 
    WHERE status IN ('draft', 'upcoming') 
    AND start_time <= NOW() 
    AND end_time > NOW();
    
    -- Update contests to 'ended' if they have finished
    UPDATE contests 
    SET status = 'ended' 
    WHERE status = 'active' 
    AND end_time <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate contest rankings
CREATE OR REPLACE FUNCTION calculate_contest_rankings(contest_uuid UUID)
RETURNS void AS $$
DECLARE
    contest_scoring_type VARCHAR(50);
BEGIN
    -- Get contest scoring type
    SELECT scoring_type INTO contest_scoring_type FROM contests WHERE id = contest_uuid;
    
    -- Delete existing rankings for this contest
    DELETE FROM contest_rankings WHERE contest_id = contest_uuid;
    
    -- Calculate rankings based on scoring type
    IF contest_scoring_type = 'standard' THEN
        -- Standard scoring: sum of best scores per problem
        INSERT INTO contest_rankings (contest_id, participant_id, rank, total_score, problems_solved, total_penalty, last_submission_time, problem_scores)
        WITH participant_scores AS (
            SELECT 
                cs.contest_id,
                cs.participant_id,
                cs.problem_id,
                MAX(cs.score) as best_score,
                COUNT(*) as attempts,
                MIN(CASE WHEN cs.status = 'accepted' THEN cs.submitted_at END) as solved_at
            FROM contest_submissions cs
            WHERE cs.contest_id = contest_uuid
            GROUP BY cs.contest_id, cs.participant_id, cs.problem_id
        ),
        participant_totals AS (
            SELECT 
                ps.contest_id,
                ps.participant_id,
                SUM(ps.best_score) as total_score,
                COUNT(CASE WHEN ps.best_score > 0 THEN 1 END) as problems_solved,
                SUM(ps.attempts - 1) * 20 as total_penalty, -- 20 minutes penalty per wrong attempt
                MAX(ps.solved_at) as last_submission_time,
                jsonb_object_agg(ps.problem_id, jsonb_build_object(
                    'score', ps.best_score,
                    'attempts', ps.attempts,
                    'solved_at', ps.solved_at
                )) as problem_scores
            FROM participant_scores ps
            GROUP BY ps.contest_id, ps.participant_id
        )
        SELECT 
            pt.contest_id,
            pt.participant_id,
            RANK() OVER (ORDER BY pt.total_score DESC, pt.problems_solved DESC, pt.total_penalty ASC, pt.last_submission_time ASC) as rank,
            pt.total_score,
            pt.problems_solved,
            pt.total_penalty,
            pt.last_submission_time,
            pt.problem_scores
        FROM participant_totals pt;
    END IF;
END;
$$ LANGUAGE plpgsql;