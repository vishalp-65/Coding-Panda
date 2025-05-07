-- Initialize AI Platform Database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create databases for different services
CREATE DATABASE user_service;
CREATE DATABASE contest_service;
CREATE DATABASE analytics_service;

-- Create users for services
CREATE USER user_service_user WITH PASSWORD 'user_service_pass';
CREATE USER contest_service_user WITH PASSWORD 'contest_service_pass';
CREATE USER analytics_service_user WITH PASSWORD 'analytics_service_pass';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE user_service TO user_service_user;
GRANT ALL PRIVILEGES ON DATABASE contest_service TO contest_service_user;
GRANT ALL PRIVILEGES ON DATABASE analytics_service TO analytics_service_user;