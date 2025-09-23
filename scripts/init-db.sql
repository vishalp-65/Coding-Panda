-- Initialize AI Platform Database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create databases for different services (if they don't exist)
SELECT 'CREATE DATABASE user_service'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'user_service')\gexec

SELECT 'CREATE DATABASE contest_service'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'contest_service')\gexec

SELECT 'CREATE DATABASE analytics_service'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'analytics_service')\gexec

SELECT 'CREATE DATABASE ai_platform_analytics'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ai_platform_analytics')\gexec

-- Create users for services (if they don't exist)
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'user_service_user') THEN

      CREATE USER user_service_user WITH PASSWORD 'user_service_pass';
   END IF;
END
$do$;

DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'contest_service_user') THEN

      CREATE USER contest_service_user WITH PASSWORD 'contest_service_pass';
   END IF;
END
$do$;

DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'analytics_service_user') THEN

      CREATE USER analytics_service_user WITH PASSWORD 'analytics_service_pass';
   END IF;
END
$do$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE user_service TO user_service_user;
GRANT ALL PRIVILEGES ON DATABASE contest_service TO contest_service_user;
GRANT ALL PRIVILEGES ON DATABASE analytics_service TO analytics_service_user;
GRANT ALL PRIVILEGES ON DATABASE ai_platform_analytics TO postgres;

-- Grant permissions on ai_platform database to postgres user (for shared usage)
GRANT ALL PRIVILEGES ON DATABASE ai_platform TO postgres;

-- Fix schema permissions for PostgreSQL 15+
-- Make postgres user owner of public schema in ai_platform database
\c ai_platform;
ALTER SCHEMA public OWNER TO postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT CREATE ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;