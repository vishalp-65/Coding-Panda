import { ConnectionPool, QueryResult } from './connection-pool';
import { logger } from '../logger';

export interface PaginationOptions {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    search?: string;
    filters?: Record<string, any>;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    meta?: {
        sortBy?: string;
        sortOrder?: string;
        search?: string;
        filters?: Record<string, any>;
    };
}

export interface CursorPaginationOptions {
    cursor?: string;
    limit: number;
    sortBy: string;
    sortOrder?: 'ASC' | 'DESC';
    filters?: Record<string, any>;
}

export interface CursorPaginatedResult<T> {
    data: T[];
    pagination: {
        nextCursor?: string;
        prevCursor?: string;
        hasNext: boolean;
        hasPrev: boolean;
        limit: number;
    };
}

export class PaginationService {
    private pool: ConnectionPool;

    constructor(pool: ConnectionPool) {
        this.pool = pool;
    }

    async paginate<T>(
        baseQuery: string,
        countQuery: string,
        params: any[],
        options: PaginationOptions
    ): Promise<PaginatedResult<T>> {
        const { page, limit, sortBy, sortOrder = 'ASC' } = options;
        const offset = (page - 1) * limit;

        try {
            // Get total count
            const countResult = await this.pool.query(countQuery, params);
            const total = parseInt(countResult.rows[0]?.count || '0', 10);

            // Build paginated query
            let paginatedQuery = baseQuery;

            if (sortBy) {
                paginatedQuery += ` ORDER BY ${sortBy} ${sortOrder}`;
            }

            paginatedQuery += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

            const paginatedParams = [...params, limit, offset];

            // Execute paginated query
            const dataResult = await this.pool.query<T>(paginatedQuery, paginatedParams);

            const totalPages = Math.ceil(total / limit);

            return {
                data: dataResult.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
                meta: {
                    sortBy,
                    sortOrder,
                    search: options.search,
                    filters: options.filters,
                },
            };
        } catch (error) {
            logger.error('Pagination error:', error);
            throw error;
        }
    }

    async cursorPaginate<T>(
        baseQuery: string,
        params: any[],
        options: CursorPaginationOptions
    ): Promise<CursorPaginatedResult<T>> {
        const { cursor, limit, sortBy, sortOrder = 'ASC' } = options;

        try {
            let query = baseQuery;
            let queryParams = [...params];

            // Add cursor condition if provided
            if (cursor) {
                const operator = sortOrder === 'ASC' ? '>' : '<';
                query += ` AND ${sortBy} ${operator} $${queryParams.length + 1}`;
                queryParams.push(cursor);
            }

            // Add ordering and limit
            query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${queryParams.length + 1}`;
            queryParams.push(limit + 1); // Fetch one extra to check if there's a next page

            const result = await this.pool.query<T>(query, queryParams);
            const rows = result.rows;

            const hasNext = rows.length > limit;
            const data = hasNext ? rows.slice(0, limit) : rows;

            let nextCursor: string | undefined;
            let prevCursor: string | undefined;

            if (data.length > 0) {
                nextCursor = hasNext ? (data[data.length - 1] as any)[sortBy] : undefined;
                prevCursor = cursor ? (data[0] as any)[sortBy] : undefined;
            }

            return {
                data,
                pagination: {
                    nextCursor,
                    prevCursor,
                    hasNext,
                    hasPrev: !!cursor,
                    limit,
                },
            };
        } catch (error) {
            logger.error('Cursor pagination error:', error);
            throw error;
        }
    }

    // Specialized pagination methods
    async paginateProblems(options: PaginationOptions & {
        difficulty?: string;
        tags?: string[];
        category?: string;
    }): Promise<PaginatedResult<any>> {
        let whereConditions: string[] = [];
        let params: any[] = [];
        let paramIndex = 1;

        // Add filters
        if (options.difficulty) {
            whereConditions.push(`difficulty = $${paramIndex++}`);
            params.push(options.difficulty);
        }

        if (options.tags && options.tags.length > 0) {
            whereConditions.push(`tags && $${paramIndex++}`);
            params.push(options.tags);
        }

        if (options.category) {
            whereConditions.push(`category = $${paramIndex++}`);
            params.push(options.category);
        }

        if (options.search) {
            whereConditions.push(`(title ILIKE $${paramIndex++} OR description ILIKE $${paramIndex++})`);
            params.push(`%${options.search}%`, `%${options.search}%`);
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        const baseQuery = `
      SELECT id, title, difficulty, tags, category, acceptance_rate, created_at
      FROM problems
      ${whereClause}
    `;

        const countQuery = `
      SELECT COUNT(*) as count
      FROM problems
      ${whereClause}
    `;

        return this.paginate(baseQuery, countQuery, params, options);
    }

    async paginateSubmissions(
        userId: string,
        options: PaginationOptions & {
            status?: string;
            language?: string;
            problemId?: string;
        }
    ): Promise<PaginatedResult<any>> {
        let whereConditions = ['user_id = $1'];
        let params: any[] = [userId];
        let paramIndex = 2;

        if (options.status) {
            whereConditions.push(`status = $${paramIndex++}`);
            params.push(options.status);
        }

        if (options.language) {
            whereConditions.push(`language = $${paramIndex++}`);
            params.push(options.language);
        }

        if (options.problemId) {
            whereConditions.push(`problem_id = $${paramIndex++}`);
            params.push(options.problemId);
        }

        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

        const baseQuery = `
      SELECT id, problem_id, language, status, execution_time, memory_used, submitted_at
      FROM submissions
      ${whereClause}
    `;

        const countQuery = `
      SELECT COUNT(*) as count
      FROM submissions
      ${whereClause}
    `;

        return this.paginate(baseQuery, countQuery, params, {
            ...options,
            sortBy: options.sortBy || 'submitted_at',
            sortOrder: options.sortOrder || 'DESC',
        });
    }

    async paginateLeaderboard(
        contestId: string,
        options: Omit<PaginationOptions, 'sortBy' | 'sortOrder'>
    ): Promise<PaginatedResult<any>> {
        const params = [contestId];

        const baseQuery = `
      SELECT 
        cp.user_id,
        u.username,
        u.avatar_url,
        cp.score,
        cp.penalty,
        cp.solved_count,
        cp.last_submission_time,
        RANK() OVER (ORDER BY cp.score DESC, cp.penalty ASC, cp.last_submission_time ASC) as rank
      FROM contest_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.contest_id = $1
    `;

        const countQuery = `
      SELECT COUNT(*) as count
      FROM contest_participants
      WHERE contest_id = $1
    `;

        return this.paginate(baseQuery, countQuery, params, {
            ...options,
            sortBy: 'score',
            sortOrder: 'DESC',
        });
    }

    // Infinite scroll support
    async getInfiniteScroll<T>(
        baseQuery: string,
        params: any[],
        lastId?: string,
        limit = 20
    ): Promise<{ data: T[]; hasMore: boolean; lastId?: string }> {
        let query = baseQuery;
        let queryParams = [...params];

        if (lastId) {
            query += ` AND id > $${queryParams.length + 1}`;
            queryParams.push(lastId);
        }

        query += ` ORDER BY id ASC LIMIT $${queryParams.length + 1}`;
        queryParams.push(limit + 1);

        const result = await this.pool.query<T>(query, queryParams);
        const rows = result.rows;

        const hasMore = rows.length > limit;
        const data = hasMore ? rows.slice(0, limit) : rows;
        const newLastId = data.length > 0 ? (data[data.length - 1] as any).id : undefined;

        return {
            data,
            hasMore,
            lastId: newLastId,
        };
    }
}

// Utility functions for pagination
export class PaginationUtils {
    static validatePaginationOptions(options: Partial<PaginationOptions>): PaginationOptions {
        const page = Math.max(1, parseInt(String(options.page || 1), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(options.limit || 20), 10)));

        return {
            page,
            limit,
            sortBy: options.sortBy,
            sortOrder: options.sortOrder === 'DESC' ? 'DESC' : 'ASC',
            search: options.search,
            filters: options.filters,
        };
    }

    static createPaginationLinks(
        baseUrl: string,
        pagination: PaginatedResult<any>['pagination'],
        query: Record<string, any> = {}
    ): {
        first?: string;
        prev?: string;
        next?: string;
        last?: string;
    } {
        const createUrl = (page: number) => {
            const params = new URLSearchParams({ ...query, page: page.toString() });
            return `${baseUrl}?${params.toString()}`;
        };

        const links: any = {};

        if (pagination.page > 1) {
            links.first = createUrl(1);
            links.prev = createUrl(pagination.page - 1);
        }

        if (pagination.hasNext) {
            links.next = createUrl(pagination.page + 1);
            links.last = createUrl(pagination.totalPages);
        }

        return links;
    }

    static calculatePaginationStats(pagination: PaginatedResult<any>['pagination']): {
        showing: string;
        range: { start: number; end: number };
    } {
        const start = (pagination.page - 1) * pagination.limit + 1;
        const end = Math.min(pagination.page * pagination.limit, pagination.total);

        return {
            showing: `Showing ${start}-${end} of ${pagination.total} results`,
            range: { start, end },
        };
    }
}