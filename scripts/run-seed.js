#!/usr/bin/env node

const path = require('path');
const { execSync } = require('child_process');

// Set environment variables
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-coding-platform';

console.log('🌱 Starting database seeding...');
console.log(`📍 MongoDB URI: ${process.env.MONGODB_URI}`);

try {
    // Run the seed script
    execSync('node scripts/seed-problems.js', {
        stdio: 'inherit',
        cwd: process.cwd()
    });

    console.log('✅ Database seeding completed successfully!');
} catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    process.exit(1);
}