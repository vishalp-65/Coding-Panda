-- Contest Service Database Schema
\c contest_service;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create ENUM types
CREATE TYPE contest_status AS ENUM ('upcoming', 'registration_open', 'ongoing', 'ended', 'cancelled');
CREATE TYPE participant_status AS ENUM ('registered', 'active', 'disqualified', 'withdrawn');
CREATE TYPE submission_status AS ENUM ('pending', 'judging', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error', 'compilation_error');
CREATE TYPE scoring_type AS ENUM ('standard', 'icpc', 'ioi', 'custom');

-- Contests table
CREATE TABLE IF NOT EXISTS contests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    registration_end TIMESTAMP WITH TIME ZONE,
    max_participants INTEGER,
    problem_ids TEXT[] NOT NULL DEFAULT '{}',
    rules JSONB DEFAULT '{}',
    scoring_type scoring_type DEFAULT 'standard',
    status contest_status DEFAULT 'upcoming',
    is_public BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    prize_pool DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contest participants table
CREATE TABLE IF NOT EXISTS contest_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    username VARCHAR(100) NOT NULL,
    team_name VARCHAR(100),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status participant_status DEFAULT 'registered',
    UNIQUE(contest_id, user_id)
);

-- Contest submissions table
CREATE TABLE IF NOT EXISTS contest_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES contest_participants(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL,
    code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    status submission_status DEFAULT 'pending',
    score INTEGER DEFAULT 0,
    execution_time INTEGER, -- in milliseconds
    memory_used INTEGER, -- in KB
    test_cases_passed INTEGER DEFAULT 0,
    total_test_cases INTEGER DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    judged_at TIMESTAMP WITH TIME ZONE
);

-- Contest rankings table
CREATE TABLE IF NOT EXISTS contest_rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES contest_participants(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    total_score INTEGER DEFAULT 0,
    problems_solved INTEGER DEFAULT 0,
    total_penalty INTEGER DEFAULT 0, -- in minutes
    last_submission_time TIMESTAMP WITH TIME ZONE,
    problem_scores JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contest_id, participant_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contests_status ON contests(status);
CREATE INDEX IF NOT EXISTS idx_contests_start_time ON contests(start_time);
CREATE INDEX IF NOT EXISTS idx_contests_created_by ON contests(created_by);
CREATE INDEX IF NOT EXISTS idx_contest_participants_contest_id ON contest_participants(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_participants_user_id ON contest_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_contest_id ON contest_submissions(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_participant_id ON contest_submissions(participant_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_problem_id ON contest_submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_status ON contest_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contest_rankings_contest_id ON contest_rankings(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_rankings_rank ON contest_rankings(contest_id, rank);

-- Function to update contest status based on time
CREATE OR REPLACE FUNCTION update_contest_status()
RETURNS void AS $$
BEGIN
    -- Update to registration_open
    UPDATE contests 
    SET status = 'registration_open'
    WHERE status = 'upcoming' 
    AND registration_start <= NOW() 
    AND (registration_end IS NULL OR registration_end > NOW())
    AND start_time > NOW();

    -- Update to ongoing
    UPDATE contests 
    SET status = 'ongoing'
    WHERE status IN ('upcoming', 'registration_open')
    AND start_time <= NOW() 
    AND end_time > NOW();

    -- Update to ended
    UPDATE contests 
    SET status = 'ended'
    WHERE status = 'ongoing'
    AND end_time <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate contest rankings
CREATE OR REPLACE FUNCTION calculate_contest_rankings(contest_uuid UUID)
RETURNS void AS $$
DECLARE
    participant_record RECORD;
    problem_record RECORD;
    best_submission RECORD;
    participant_score INTEGER;
    participant_penalty INTEGER;
    problems_solved INTEGER;
    problem_scores JSONB;
    last_submission TIMESTAMP WITH TIME ZONE;
    current_rank INTEGER := 1;
BEGIN
    -- Clear existing rankings for this contest
    DELETE FROM contest_rankings WHERE contest_id = contest_uuid;

    -- Calculate rankings for each participant
    FOR participant_record IN 
        SELECT id, user_id FROM contest_participants 
        WHERE contest_id = contest_uuid AND status = 'active'
    LOOP
        participant_score := 0;
        participant_penalty := 0;
        problems_solved := 0;
        problem_scores := '{}';
        last_submission := NULL;

        -- Get contest problems
        FOR problem_record IN 
            SELECT UNNEST(problem_ids) as problem_id FROM contests WHERE id = contest_uuid
        LOOP
            -- Find best submission for this problem
            SELECT * INTO best_submission
            FROM contest_submissions
            WHERE contest_id = contest_uuid 
            AND participant_id = participant_record.id
            AND problem_id = problem_record.problem_id::UUID
            AND status = 'accepted'
            ORDER BY score DESC, submitted_at ASC
            LIMIT 1;

            IF FOUND THEN
                participant_score := participant_score + best_submission.score;
                problems_solved := problems_solved + 1;
                
                -- Calculate penalty (time from contest start to submission in minutes)
                participant_penalty := participant_penalty + 
                    EXTRACT(EPOCH FROM (best_submission.submitted_at - 
                        (SELECT start_time FROM contests WHERE id = contest_uuid))) / 60;

                -- Track last submission time
                IF last_submission IS NULL OR best_submission.submitted_at > last_submission THEN
                    last_submission := best_submission.submitted_at;
                END IF;

                -- Store problem score
                problem_scores := problem_scores || jsonb_build_object(problem_record.problem_id, best_submission.score);
            END IF;
        END LOOP;

        -- Insert ranking record
        INSERT INTO contest_rankings (
            contest_id, participant_id, rank, total_score, problems_solved,
            total_penalty, last_submission_time, problem_scores
        ) VALUES (
            contest_uuid, participant_record.id, 0, participant_score, problems_solved,
            participant_penalty, last_submission, problem_scores
        );
    END LOOP;

    -- Update ranks based on score and penalty
    WITH ranked_participants AS (
        SELECT id,
               ROW_NUMBER() OVER (
                   ORDER BY total_score DESC, problems_solved DESC, total_penalty ASC, last_submission_time ASC
               ) as new_rank
        FROM contest_rankings
        WHERE contest_id = contest_uuid
    )
    UPDATE contest_rankings cr
    SET rank = rp.new_rank
    FROM ranked_participants rp
    WHERE cr.id = rp.id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update contest status
CREATE OR REPLACE FUNCTION trigger_update_contest_status()
RETURNS trigger AS $$
BEGIN
    PERFORM update_contest_status();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (optional - can be called manually or via cron)
-- CREATE TRIGGER contest_status_update_trigger
--     AFTER INSERT OR UPDATE ON contests
--     FOR EACH STATEMENT
--     EXECUTE FUNCTION trigger_update_contest_status();

-- Grant permissions to contest service user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO contest_service_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO contest_service_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO contest_service_user;
GRANT USAGE ON ALL TYPES IN SCHEMA public TO contest_service_user;