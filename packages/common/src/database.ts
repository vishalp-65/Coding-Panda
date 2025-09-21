export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  connectionTimeout?: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
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
}

export class DatabaseUtils {
  static calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  static createPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static getConnectionString(config: DatabaseConfig): string {
    const { host, port, database, username, password, ssl } = config;
    const sslParam = ssl ? '?ssl=true' : '';
    return `postgresql://${username}:${password}@${host}:${port}/${database}${sslParam}`;
  }
}
