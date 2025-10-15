const { Client } = require('pg');
const fs = require('fs-extra');
const path = require('path');

class PostgresMigrationRunner {
    constructor() {
        this.client = new Client({
            connectionString: process.env.DATABASE_URL
        });
    }

    async connect() {
        await this.client.connect();
        console.log('Connected to PostgreSQL');
    }

    async disconnect() {
        await this.client.end();
        console.log('Disconnected from PostgreSQL');
    }

    async createMigrationsTable() {
        const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW(),
        checksum VARCHAR(255) NOT NULL
      );
    `;
        await this.client.query(query);
    }

    async getExecutedMigrations() {
        const result = await this.client.query(
            'SELECT version FROM migrations ORDER BY version'
        );
        return result.rows.map(row => row.version);
    }

    async executeMigration(migration) {
        const { version, name, sql, checksum } = migration;

        console.log(`Executing migration: ${version} - ${name}`);

        await this.client.query('BEGIN');

        try {
            // Execute the migration SQL
            await this.client.query(sql);

            // Record the migration
            await this.client.query(
                'INSERT INTO migrations (version, name, checksum) VALUES ($1, $2, $3)',
                [version, name, checksum]
            );

            await this.client.query('COMMIT');
            console.log(`Migration ${version} executed successfully`);
        } catch (error) {
            await this.client.query('ROLLBACK');
            throw error;
        }
    }

    async rollbackMigration(migration) {
        const { version, name, rollbackSql } = migration;

        console.log(`Rolling back migration: ${version} - ${name}`);

        await this.client.query('BEGIN');

        try {
            // Execute the rollback SQL
            if (rollbackSql) {
                await this.client.query(rollbackSql);
            }

            // Remove the migration record
            await this.client.query(
                'DELETE FROM migrations WHERE version = $1',
                [version]
            );

            await this.client.query('COMMIT');
            console.log(`Migration ${version} rolled back successfully`);
        } catch (error) {
            await this.client.query('ROLLBACK');
            throw error;
        }
    }

    async loadMigrations() {
        const migrationsDir = path.join(__dirname, '../migrations/postgres');
        const files = await fs.readdir(migrationsDir);

        const migrations = [];

        for (const file of files.sort()) {
            if (file.endsWith('.sql')) {
                const filePath = path.join(migrationsDir, file);
                const content = await fs.readFile(filePath, 'utf8');

                const [upSql, downSql] = content.split('-- ROLLBACK');

                const version = file.split('_')[0];
                const name = file.replace(/^\d+_/, '').replace('.sql', '');

                migrations.push({
                    version,
                    name,
                    sql: upSql.trim(),
                    rollbackSql: downSql ? downSql.trim() : null,
                    checksum: this.calculateChecksum(upSql.trim())
                });
            }
        }

        return migrations;
    }

    calculateChecksum(content) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(content).digest('hex');
    }

    async run() {
        try {
            await this.connect();
            await this.createMigrationsTable();

            const executedMigrations = await this.getExecutedMigrations();
            const allMigrations = await this.loadMigrations();

            const pendingMigrations = allMigrations.filter(
                migration => !executedMigrations.includes(migration.version)
            );

            if (pendingMigrations.length === 0) {
                console.log('No pending migrations');
                return;
            }

            console.log(`Found ${pendingMigrations.length} pending migrations`);

            for (const migration of pendingMigrations) {
                await this.executeMigration(migration);
            }

            console.log('All migrations executed successfully');
        } catch (error) {
            console.error('Migration failed:', error);
            process.exit(1);
        } finally {
            await this.disconnect();
        }
    }
}

if (require.main === module) {
    const runner = new PostgresMigrationRunner();
    runner.run();
}

module.exports = PostgresMigrationRunner;