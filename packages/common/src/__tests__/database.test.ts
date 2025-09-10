import { ConnectionPool, QueryBuilder } from '../database/connection-pool';
import { PaginationService, PaginationUtils } from '../database/pagination';

// Mock pg module
const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0,
    on: jest.fn(),
};

const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
};

jest.mock('pg', () => ({
    Pool: jest.fn(() => mockPool),
}));

describe('ConnectionPool', () => {
    let pool: ConnectionPool;

    beforeEach(() => {
        jest.clearAllMocks();
        pool = new ConnectionPool({
            host: 'localhost',
            port: 5432,
            database: 'test',
            user: 'test',
            password: 'test',
        });
    });

    describe('query', () => {
        it('should execute query and return formatted result', async () => {
            const mockResult = {
                rows: [{ id: 1, name: 'test' }],
                rowCount: 1,
                command: 'SELECT',
            };
            mockPool.query.mockResolvedValue(mockResult);

            const result = await pool.query('SELECT * FROM users WHERE id = $1', [1]);

            expect(result).toEqual({
                rows: [{ id: 1, name: 'test' }],
                rowCount: 1,
                command: 'SELECT',
            });
            expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
        });

        it('should handle query errors', async () => {
            const error = new Error('Database error');
            mockPool.query.mockRejectedValue(error);

            await expect(pool.query('INVALID SQL')).rejects.toThrow('Database error');
        });

        it('should handle null rowCount', async () => {
            const mockResult = {
                rows: [],
                rowCount: null,
                command: 'SELECT',
            };
            mockPool.query.mockResolvedValue(mockResult);

            const result = await pool.query('SELECT * FROM empty_table');

            expect(result.rowCount).toBe(0);
        });
    });

    describe('transaction', () => {
        beforeEach(() => {
            mockPool.connect.mockResolvedValue(mockClient);
            mockClient.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'BEGIN' });
        });

        it('should execute transaction successfully', async () => {
            const mockResult = { rows: [{ id: 1 }], rowCount: 1, command: 'INSERT' };
            mockClient.query
                .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN' })
                .mockResolvedValueOnce(mockResult)
                .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'COMMIT' });

            const result = await pool.transaction(async (trx) => {
                const insertResult = await trx.query('INSERT INTO users (name) VALUES ($1) RETURNING *', ['test']);
                return insertResult.rows[0];
            });

            expect(result).toEqual({ id: 1 });
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should rollback transaction on error', async () => {
            const error = new Error('Transaction error');
            mockClient.query
                .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN' })
                .mockRejectedValueOnce(error)
                .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'ROLLBACK' });

            await expect(pool.transaction(async (trx) => {
                await trx.query('INVALID SQL');
            })).rejects.toThrow('Transaction error');

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('healthCheck', () => {
        it('should return true when database is healthy', async () => {
            mockPool.query.mockResolvedValue({
                rows: [{ health: 1 }],
                rowCount: 1,
                command: 'SELECT',
            });

            const result = await pool.healthCheck();

            expect(result).toBe(true);
            expect(mockPool.query).toHaveBeenCalledWith('SELECT 1 as health', undefined);
        });

        it('should return false when database is unhealthy', async () => {
            mockPool.query.mockRejectedValue(new Error('Connection failed'));

            const result = await pool.healthCheck();

            expect(result).toBe(false);
        });
    });

    describe('getPoolStats', () => {
        it('should return pool statistics', async () => {
            const stats = await pool.getPoolStats();

            expect(stats).toEqual({
                totalCount: 10,
                idleCount: 5,
                waitingCount: 0,
            });
        });
    });
});

describe('QueryBuilder', () => {
    describe('SelectQueryBuilder', () => {
        it('should build simple select query', () => {
            const { query, params } = QueryBuilder
                .select('users')
                .build();

            expect(query).toBe('SELECT * FROM users');
            expect(params).toEqual([]);
        });

        it('should build select query with specific columns', () => {
            const { query, params } = QueryBuilder
                .select('users', ['id', 'name', 'email'])
                .build();

            expect(query).toBe('SELECT id, name, email FROM users');
            expect(params).toEqual([]);
        });

        it('should build select query with where conditions', () => {
            const { query, params } = QueryBuilder
                .select('users')
                .where('age > $1', 18)
                .where('status = $2', 'active')
                .build();

            expect(query).toBe('SELECT * FROM users WHERE age > $1 AND status = $2');
            expect(params).toEqual([18, 'active']);
        });

        it('should build select query with order by', () => {
            const { query, params } = QueryBuilder
                .select('users')
                .orderBy('created_at', 'DESC')
                .build();

            expect(query).toBe('SELECT * FROM users ORDER BY created_at DESC');
            expect(params).toEqual([]);
        });

        it('should build select query with limit and offset', () => {
            const { query, params } = QueryBuilder
                .select('users')
                .limit(10)
                .offset(20)
                .build();

            expect(query).toBe('SELECT * FROM users LIMIT $1 OFFSET $2');
            expect(params).toEqual([10, 20]);
        });

        it('should build complex select query', () => {
            const { query, params } = QueryBuilder
                .select('users', ['id', 'name'])
                .where('age > $1', 18)
                .where('city = $2', 'New York')
                .orderBy('name', 'ASC')
                .limit(5)
                .offset(10)
                .build();

            expect(query).toBe('SELECT id, name FROM users WHERE age > $1 AND city = $2 ORDER BY name ASC LIMIT $3 OFFSET $4');
            expect(params).toEqual([18, 'New York', 5, 10]);
        });
    });

    describe('InsertQueryBuilder', () => {
        it('should build insert query', () => {
            const { query, params } = QueryBuilder
                .insert('users')
                .values({ name: 'John', email: 'john@example.com', age: 25 })
                .build();

            expect(query).toBe('INSERT INTO users (name, email, age) VALUES ($1, $2, $3) RETURNING *');
            expect(params).toEqual(['John', 'john@example.com', 25]);
        });
    });

    describe('UpdateQueryBuilder', () => {
        it('should build update query', () => {
            const { query, params } = QueryBuilder
                .update('users')
                .set('name', 'Jane')
                .set('age', 26)
                .where('id = $3', 1)
                .build();

            expect(query).toBe('UPDATE users SET name = $1, age = $2 WHERE id = $3 RETURNING *');
            expect(params).toEqual(['Jane', 26, 1]);
        });
    });

    describe('DeleteQueryBuilder', () => {
        it('should build delete query', () => {
            const { query, params } = QueryBuilder
                .delete('users')
                .where('id = $1', 1)
                .build();

            expect(query).toBe('DELETE FROM users WHERE id = $1');
            expect(params).toEqual([1]);
        });
    });
});

describe('PaginationService', () => {
    let paginationService: PaginationService;
    let mockPool: jest.Mocked<ConnectionPool>;

    beforeEach(() => {
        mockPool = {
            query: jest.fn(),
        } as any;

        paginationService = new PaginationService(mockPool);
    });

    describe('paginate', () => {
        it('should return paginated results', async () => {
            // Mock count query
            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{ count: '25' }],
                    rowCount: 1,
                    command: 'SELECT',
                })
                // Mock data query
                .mockResolvedValueOnce({
                    rows: [
                        { id: 1, name: 'Item 1' },
                        { id: 2, name: 'Item 2' },
                    ],
                    rowCount: 2,
                    command: 'SELECT',
                });

            const result = await paginationService.paginate(
                'SELECT * FROM items',
                'SELECT COUNT(*) as count FROM items',
                [],
                { page: 1, limit: 10, sortBy: 'name', sortOrder: 'ASC' }
            );

            expect(result).toEqual({
                data: [
                    { id: 1, name: 'Item 1' },
                    { id: 2, name: 'Item 2' },
                ],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 25,
                    totalPages: 3,
                    hasNext: true,
                    hasPrev: false,
                },
                meta: {
                    sortBy: 'name',
                    sortOrder: 'ASC',
                    search: undefined,
                    filters: undefined,
                },
            });

            expect(mockPool.query).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM items', []);
            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT * FROM items ORDER BY name ASC LIMIT $1 OFFSET $2',
                [10, 0]
            );
        });

        it('should handle pagination for middle page', async () => {
            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{ count: '25' }],
                    rowCount: 1,
                    command: 'SELECT',
                })
                .mockResolvedValueOnce({
                    rows: [],
                    rowCount: 0,
                    command: 'SELECT',
                });

            const result = await paginationService.paginate(
                'SELECT * FROM items',
                'SELECT COUNT(*) as count FROM items',
                [],
                { page: 2, limit: 10 }
            );

            expect(result.pagination).toEqual({
                page: 2,
                limit: 10,
                total: 25,
                totalPages: 3,
                hasNext: true,
                hasPrev: true,
            });

            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT * FROM items LIMIT $1 OFFSET $2',
                [10, 10]
            );
        });
    });

    describe('cursorPaginate', () => {
        it('should return cursor paginated results without cursor', async () => {
            mockPool.query.mockResolvedValue({
                rows: [
                    { id: 1, name: 'Item 1' },
                    { id: 2, name: 'Item 2' },
                ],
                rowCount: 2,
                command: 'SELECT',
            });

            const result = await paginationService.cursorPaginate(
                'SELECT * FROM items WHERE active = true',
                [true],
                { limit: 5, sortBy: 'id', sortOrder: 'ASC' }
            );

            expect(result).toEqual({
                data: [
                    { id: 1, name: 'Item 1' },
                    { id: 2, name: 'Item 2' },
                ],
                pagination: {
                    nextCursor: undefined,
                    prevCursor: undefined,
                    hasNext: false,
                    hasPrev: false,
                    limit: 5,
                },
            });

            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT * FROM items WHERE active = true ORDER BY id ASC LIMIT $2',
                [true, 6] // limit + 1
            );
        });

        it('should return cursor paginated results with cursor', async () => {
            mockPool.query.mockResolvedValue({
                rows: [
                    { id: 6, name: 'Item 6' },
                    { id: 7, name: 'Item 7' },
                    { id: 8, name: 'Item 8' },
                ],
                rowCount: 3,
                command: 'SELECT',
            });

            const result = await paginationService.cursorPaginate(
                'SELECT * FROM items WHERE active = true',
                [true],
                { cursor: '5', limit: 2, sortBy: 'id', sortOrder: 'ASC' }
            );

            expect(result).toEqual({
                data: [
                    { id: 6, name: 'Item 6' },
                    { id: 7, name: 'Item 7' },
                ],
                pagination: {
                    nextCursor: 7,
                    prevCursor: 6,
                    hasNext: true,
                    hasPrev: true,
                    limit: 2,
                },
            });

            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT * FROM items WHERE active = true AND id > $2 ORDER BY id ASC LIMIT $3',
                [true, '5', 3]
            );
        });
    });

    describe('specialized pagination methods', () => {
        it('should paginate problems with filters', async () => {
            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{ count: '10' }],
                    rowCount: 1,
                    command: 'SELECT',
                })
                .mockResolvedValueOnce({
                    rows: [{ id: 1, title: 'Problem 1', difficulty: 'easy' }],
                    rowCount: 1,
                    command: 'SELECT',
                });

            const result = await paginationService.paginateProblems({
                page: 1,
                limit: 10,
                difficulty: 'easy',
                tags: ['array', 'sorting'],
                search: 'binary',
            });

            expect(result.data).toHaveLength(1);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE difficulty = $1 AND tags && $2 AND (title ILIKE $3 OR description ILIKE $4)'),
                ['easy', ['array', 'sorting'], '%binary%', '%binary%']
            );
        });

        it('should paginate user submissions', async () => {
            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{ count: '5' }],
                    rowCount: 1,
                    command: 'SELECT',
                })
                .mockResolvedValueOnce({
                    rows: [{ id: 1, problem_id: 'prob1', status: 'accepted' }],
                    rowCount: 1,
                    command: 'SELECT',
                });

            const result = await paginationService.paginateSubmissions('user123', {
                page: 1,
                limit: 10,
                status: 'accepted',
                language: 'python',
            });

            expect(result.data).toHaveLength(1);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE user_id = $1 AND status = $2 AND language = $3'),
                ['user123', 'accepted', 'python']
            );
        });
    });
});

describe('PaginationUtils', () => {
    describe('validatePaginationOptions', () => {
        it('should validate and normalize pagination options', () => {
            const result = PaginationUtils.validatePaginationOptions({
                page: '2',
                limit: '50',
                sortOrder: 'DESC',
            } as any);

            expect(result).toEqual({
                page: 2,
                limit: 50,
                sortBy: undefined,
                sortOrder: 'DESC',
                search: undefined,
                filters: undefined,
            });
        });

        it('should handle invalid values', () => {
            const result = PaginationUtils.validatePaginationOptions({
                page: 0,
                limit: 200,
                sortOrder: 'INVALID',
            } as any);

            expect(result).toEqual({
                page: 1, // minimum 1
                limit: 100, // maximum 100
                sortBy: undefined,
                sortOrder: 'ASC', // default
                search: undefined,
                filters: undefined,
            });
        });
    });

    describe('createPaginationLinks', () => {
        it('should create pagination links', () => {
            const pagination = {
                page: 2,
                limit: 10,
                total: 50,
                totalPages: 5,
                hasNext: true,
                hasPrev: true,
            };

            const links = PaginationUtils.createPaginationLinks(
                '/api/items',
                pagination,
                { search: 'test' }
            );

            expect(links).toEqual({
                first: '/api/items?search=test&page=1',
                prev: '/api/items?search=test&page=1',
                next: '/api/items?search=test&page=3',
                last: '/api/items?search=test&page=5',
            });
        });

        it('should not include prev/first links for first page', () => {
            const pagination = {
                page: 1,
                limit: 10,
                total: 50,
                totalPages: 5,
                hasNext: true,
                hasPrev: false,
            };

            const links = PaginationUtils.createPaginationLinks('/api/items', pagination);

            expect(links).toEqual({
                next: '/api/items?page=2',
                last: '/api/items?page=5',
            });
        });
    });

    describe('calculatePaginationStats', () => {
        it('should calculate pagination statistics', () => {
            const pagination = {
                page: 2,
                limit: 10,
                total: 25,
                totalPages: 3,
                hasNext: true,
                hasPrev: true,
            };

            const stats = PaginationUtils.calculatePaginationStats(pagination);

            expect(stats).toEqual({
                showing: 'Showing 11-20 of 25 results',
                range: { start: 11, end: 20 },
            });
        });

        it('should handle last page correctly', () => {
            const pagination = {
                page: 3,
                limit: 10,
                total: 25,
                totalPages: 3,
                hasNext: false,
                hasPrev: true,
            };

            const stats = PaginationUtils.calculatePaginationStats(pagination);

            expect(stats).toEqual({
                showing: 'Showing 21-25 of 25 results',
                range: { start: 21, end: 25 },
            });
        });
    });
});