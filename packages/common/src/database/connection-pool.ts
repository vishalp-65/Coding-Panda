import { Pool, PoolClient, PoolConfig } from 'pg';
import { logger } from '../logger';

export interface ConnectionPoolConfig extends PoolConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    max?: number;
    min?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    maxUses?: number;
    allowExitOnIdle?: boolean;
}

export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
    command: string;
}

export interface Transaction {
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}

export class ConnectionPool {
    private pool: Pool;
    private config: ConnectionPoolConfig;

    constructor(config: ConnectionPoolConfig) {
        this.config = {
            max: 20,
            min: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            maxUses: 7500,
            allowExitOnIdle: true,
            ...config,
        };

        this.pool = new Pool(this.config);
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.pool.on('connect', (client: PoolClient) => {
            logger.debug('New database client connected');
        });

        this.pool.on('acquire', (client: PoolClient) => {
            logger.debug('Client acquired from pool');
        });

        this.pool.on('remove', (client: PoolClient) => {
            logger.debug('Client removed from pool');
        });

        this.pool.on('error', (err: Error, client: PoolClient) => {
            logger.error('Database pool error:', err);
        });
    }

    async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
        const start = Date.now();

        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;

            logger.debug(`Query executed in ${duration}ms`, {
                query: text.substring(0, 100),
                duration,
                rowCount: result.rowCount,
            });

            return {
                rows: result.rows,
                rowCount: result.rowCount || 0,
                command: result.command,
            };
        } catch (error) {
            const duration = Date.now() - start;
            logger.error(`Query failed after ${duration}ms:`, {
                query: text.substring(0, 100),
                error: error instanceof Error ? error.message : error,
                duration,
            });
            throw error;
        }
    }

    async getClient(): Promise<PoolClient> {
        return this.pool.connect();
    }

    async transaction<T>(
        callback: (trx: Transaction) => Promise<T>
    ): Promise<T> {
        const client = await this.getClient();

        try {
            await client.query('BEGIN');

            const transaction: Transaction = {
                query: async <R = any>(text: string, params?: any[]): Promise<QueryResult<R>> => {
                    const result = await client.query(text, params);
                    return {
                        rows: result.rows,
                        rowCount: result.rowCount || 0,
                        command: result.command,
                    };
                },
                commit: async (): Promise<void> => {
                    await client.query('COMMIT');
                },
                rollback: async (): Promise<void> => {
                    await client.query('ROLLBACK');
                },
            };

            const result = await callback(transaction);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            const result = await this.query('SELECT 1 as health');
            return result.rows.length > 0 && result.rows[0].health === 1;
        } catch (error) {
            logger.error('Database health check failed:', error);
            return false;
        }
    }

    async getPoolStats(): Promise<{
        totalCount: number;
        idleCount: number;
        waitingCount: number;
    }> {
        return {
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount,
        };
    }

    async end(): Promise<void> {
        await this.pool.end();
        logger.info('Database connection pool closed');
    }
}

// Query builder helpers for common patterns
export class QueryBuilder {
    static select(table: string, columns: string[] = ['*']): SelectQueryBuilder {
        return new SelectQueryBuilder(table, columns);
    }

    static insert(table: string): InsertQueryBuilder {
        return new InsertQueryBuilder(table);
    }

    static update(table: string): UpdateQueryBuilder {
        return new UpdateQueryBuilder(table);
    }

    static delete(table: string): DeleteQueryBuilder {
        return new DeleteQueryBuilder(table);
    }
}

class SelectQueryBuilder {
    private table: string;
    private columns: string[];
    private whereConditions: string[] = [];
    private orderByClause: string = '';
    private limitClause: string = '';
    private offsetClause: string = '';
    private params: any[] = [];

    constructor(table: string, columns: string[]) {
        this.table = table;
        this.columns = columns;
    }

    where(condition: string, ...params: any[]): this {
        this.whereConditions.push(condition);
        this.params.push(...params);
        return this;
    }

    orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
        this.orderByClause = `ORDER BY ${column} ${direction}`;
        return this;
    }

    limit(count: number): this {
        this.limitClause = `LIMIT $${this.params.length + 1}`;
        this.params.push(count);
        return this;
    }

    offset(count: number): this {
        this.offsetClause = `OFFSET $${this.params.length + 1}`;
        this.params.push(count);
        return this;
    }

    build(): { query: string; params: any[] } {
        let query = `SELECT ${this.columns.join(', ')} FROM ${this.table}`;

        if (this.whereConditions.length > 0) {
            query += ` WHERE ${this.whereConditions.join(' AND ')}`;
        }

        if (this.orderByClause) {
            query += ` ${this.orderByClause}`;
        }

        if (this.limitClause) {
            query += ` ${this.limitClause}`;
        }

        if (this.offsetClause) {
            query += ` ${this.offsetClause}`;
        }

        return { query, params: this.params };
    }
}

class InsertQueryBuilder {
    private table: string;
    private columns: string[] = [];
    private valuesList: any[] = [];

    constructor(table: string) {
        this.table = table;
    }

    values(data: Record<string, any>): this {
        this.columns = Object.keys(data);
        this.valuesList = Object.values(data);
        return this;
    }

    build(): { query: string; params: any[] } {
        const placeholders = this.valuesList.map((_, index) => `$${index + 1}`).join(', ');
        const query = `INSERT INTO ${this.table} (${this.columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        return { query, params: this.valuesList };
    }
}

class UpdateQueryBuilder {
    private table: string;
    private setClause: string[] = [];
    private whereConditions: string[] = [];
    private params: any[] = [];

    constructor(table: string) {
        this.table = table;
    }

    set(column: string, value: any): this {
        this.setClause.push(`${column} = $${this.params.length + 1}`);
        this.params.push(value);
        return this;
    }

    where(condition: string, ...params: any[]): this {
        this.whereConditions.push(condition);
        this.params.push(...params);
        return this;
    }

    build(): { query: string; params: any[] } {
        let query = `UPDATE ${this.table} SET ${this.setClause.join(', ')}`;

        if (this.whereConditions.length > 0) {
            query += ` WHERE ${this.whereConditions.join(' AND ')}`;
        }

        query += ' RETURNING *';
        return { query, params: this.params };
    }
}

class DeleteQueryBuilder {
    private table: string;
    private whereConditions: string[] = [];
    private params: any[] = [];

    constructor(table: string) {
        this.table = table;
    }

    where(condition: string, ...params: any[]): this {
        this.whereConditions.push(condition);
        this.params.push(...params);
        return this;
    }

    build(): { query: string; params: any[] } {
        let query = `DELETE FROM ${this.table}`;

        if (this.whereConditions.length > 0) {
            query += ` WHERE ${this.whereConditions.join(' AND ')}`;
        }

        return { query, params: this.params };
    }
}